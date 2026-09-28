import * as React from "react"
import { CalendarArrowUp, CalendarPlus, Check, ChevronLeft, ChevronRight, Clock, Download, Pencil, X } from "lucide-react"

import { entriesOn, entriesSorted, orgName, overduePlans, planHours, plansSorted, sumHours, upcomingPlans, workItemTitle } from "@/lib/engine"
import { fmtDate, fmtHours, pad, todayISO, toISODate } from "@/lib/format"
import { catalogItem } from "@/lib/content"
import { googleCalendarUrl, icsFor } from "@/lib/calendar"
import { downloadFile } from "@/lib/model"
import { Store, useStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import { useDialogs } from "@/components/dialogs"
import { useToast } from "@/components/toast"
import { Empty, OrgChip, PageHeader, WorkHeader } from "@/components/bits"
import { Badge } from "@zhangqi444/ui/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@zhangqi444/ui/ui/card"

const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

export function PlanRow({ p, compact }) {
  const { openEntry, openPlan } = useDialogs()
  const toast = useToast()
  const done = p.status === "done", skipped = p.status === "skipped"
  const h = planHours(p)
  return (
    <li className={cn("flex flex-wrap items-center gap-2 py-2", (done || skipped) && "opacity-70")} data-testid="plan-row" data-status={p.status}>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn("font-medium", skipped && "line-through")}>{p.title}</span>
          {done ? <Badge variant="success"><Check className="size-3" /> logged</Badge> : skipped ? <Badge variant="secondary">skipped</Badge> : null}
        </div>
        <div className="text-muted-foreground flex flex-wrap items-center gap-x-2 text-xs tabular-nums">
          {!compact ? <span>{fmtDate(p.date, { weekday: "short", month: "short", day: "numeric" })}</span> : null}
          {p.start ? <span><Clock className="mr-0.5 inline size-3" />{p.start}{p.end ? `–${p.end}` : ""}</span> : null}
          {h ? <span>{fmtHours(h)} h</span> : null}
          {p.orgId ? <OrgChip orgId={p.orgId} /> : null}
          {p.workItemId ? <span>· {workItemTitle(p.workItemId)}</span> : null}
          {p.catalogId && catalogItem(p.catalogId) ? <span>· from the catalog</span> : null}
        </div>
        {p.notes ? <div className="text-muted-foreground mt-0.5 text-xs">{p.notes}</div> : null}
      </div>
      {!done && !skipped ? (
        <div className="flex shrink-0 gap-1">
          <Button size="sm" onClick={() => openEntry({ planId: p.id })} data-testid="plan-log"><Check /> Log hours</Button>
          <Button size="sm" variant="ghost" className="size-8 p-0" aria-label="Add to Google Calendar" title="Add to Google Calendar" asChild><a href={googleCalendarUrl(p)} target="_blank" rel="noopener" data-testid="plan-gcal"><CalendarArrowUp /></a></Button>
          <Button size="sm" variant="ghost" className="size-8 p-0" aria-label="Edit plan" onClick={() => openPlan({ id: p.id })}><Pencil /></Button>
          <Button size="sm" variant="ghost" className="size-8 p-0" aria-label="Mark skipped" onClick={() => { Store.setPlanStatus(p.id, "skipped"); toast("Marked skipped") }} data-testid="plan-skip"><X /></Button>
        </div>
      ) : (
        <Button size="sm" variant="ghost" onClick={() => openPlan({ id: p.id })}>Edit</Button>
      )}
    </li>
  )
}

export function UpNextCard({ limit = 4 }) {
  useStore()
  const today = todayISO()
  const up = upcomingPlans(today, limit)
  const late = overduePlans(today)
  return (
    <Card data-testid="up-next">
      <CardHeader>
        <CardTitle>Up next</CardTitle>
        <CardDescription>{up.length ? `${up.length} planned` : "Nothing planned yet"}{late.length ? ` · ${late.length} past ${late.length === 1 ? "plan" : "plans"} to log` : ""}</CardDescription>
      </CardHeader>
      <CardContent>
        {up.length || late.length ? <ul className="divide-y">{[...late, ...up].slice(0, limit + late.length).map((p) => <PlanRow key={p.id} p={p} />)}</ul>
          : <Empty>Plan a time on any of your work and it shows up here.</Empty>}
      </CardContent>
    </Card>
  )
}

export function Calendar() {
  useStore()
  const { openPlan, openEntry } = useDialogs()
  const today = todayISO()
  const [cursor, setCursor] = React.useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() } })
  const [selected, setSelected] = React.useState(today)
  const first = new Date(cursor.y, cursor.m, 1)
  const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate()
  const lead = (first.getDay() + 6) % 7                       // Monday-first grid
  const cells = []
  for (let i = 0; i < lead; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(`${cursor.y}-${pad(cursor.m + 1)}-${pad(d)}`)
  while (cells.length % 7) cells.push(null)
  const monthKey = `${cursor.y}-${pad(cursor.m + 1)}`
  const byDay = new Map()
  const put = (iso, v) => { if (!byDay.has(iso)) byDay.set(iso, []); byDay.get(iso).push(v) }
  for (const e of entriesSorted()) if (e.date.startsWith(monthKey)) put(e.date, { kind: "done", id: e.id, label: e.activity, hours: e.hours })
  // a plan that was carried out is already on the square as the entry it became
  for (const p of plansSorted()) if (p.date.startsWith(monthKey) && p.status !== "done") put(p.date, { kind: p.status === "skipped" ? "skipped" : "planned", id: p.id, label: p.title })
  // a square shows at most a few things, so put what still needs doing above what is done:
  // an afternoon she has already logged must never hide the shift she has not
  const RANK = { planned: 0, done: 1, skipped: 2 }
  for (const list of byDay.values()) list.sort((a, b) => RANK[a.kind] - RANK[b.kind])
  const monthEntries = entriesSorted().filter((e) => e.date.startsWith(monthKey))
  const monthPlans = plansSorted().filter((p) => p.date.startsWith(monthKey) && p.status === "planned")
  const loggedH = sumHours(monthEntries)
  const plannedH = monthPlans.reduce((s, p) => s + planHours(p), 0)
  const dayPlans = plansSorted().filter((p) => p.date === selected && p.status !== "done")
  const dayEntries = entriesOn(selected)
  const late = overduePlans(today)
  const shift = (n) => setCursor((c) => { const d = new Date(c.y, c.m + n, 1); return { y: d.getFullYear(), m: d.getMonth() } })

  return (
    <div className="flex flex-col gap-4">
      <WorkHeader view="month"
        onPlan={() => openPlan({ date: selected })}
        onLog={() => openEntry({ date: selected })}
        onExport={() => downloadFile(`volunteer-plans-${today}.ics`, icsFor(upcomingPlans(today, 999)), "text/calendar")}
        canExport={upcomingPlans(today, 999).length > 0} />

      <div className="grid gap-4 @3xl/main:grid-cols-[3fr_2fr]">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>{first.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</CardTitle>
              <CardDescription className="tabular-nums">{[loggedH ? `${fmtHours(loggedH)} h given` : "", plannedH ? `${fmtHours(plannedH)} h still planned` : ""].filter(Boolean).join(" · ") || "Nothing this month yet"}</CardDescription>
            </div>
            <div className="flex gap-1">
              <Button variant="outline" size="icon" className="size-8" onClick={() => shift(-1)} aria-label="Previous month" data-testid="cal-prev"><ChevronLeft /></Button>
              <Button variant="outline" size="sm" onClick={() => { const d = new Date(); setCursor({ y: d.getFullYear(), m: d.getMonth() }); setSelected(today) }}>Today</Button>
              <Button variant="outline" size="icon" className="size-8" onClick={() => shift(1)} aria-label="Next month" data-testid="cal-next"><ChevronRight /></Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">{DOW.map((d) => <div key={d} className="py-1">{d}</div>)}</div>
            <div className="grid grid-cols-7 gap-1" data-testid="cal-grid">
              {cells.map((iso, i) => {
                if (!iso) return <div key={i} />
                const ds = byDay.get(iso) || []
                const isToday = iso === today, isSel = iso === selected
                return (
                  <button key={iso} type="button" onClick={() => setSelected(iso)} onDoubleClick={() => openPlan({ date: iso })} data-date={iso}
                    className={cn("flex min-h-16 flex-col items-start gap-1 rounded-md border p-1.5 text-left text-xs transition hover:bg-accent @lg/main:min-h-20", isSel && "ring-2 ring-primary", isToday && "bg-primary/5 border-primary/40")}>
                    <span className={cn("tabular-nums", isToday && "text-primary font-semibold")}>{Number(iso.slice(8))}</span>
                    {ds.slice(0, 3).map((d) => (
                      <span key={d.kind + d.id} data-kind={d.kind} className={cn("w-full truncate rounded px-1 py-0.5", d.kind === "done" ? "bg-success-soft text-success" : d.kind === "skipped" ? "bg-muted text-muted-foreground line-through" : iso < today ? "bg-warning-soft text-warning" : "bg-primary/10 text-primary")} title={d.kind === "done" ? `${d.label} · ${fmtHours(d.hours)} h` : d.label}>{d.label}</span>
                    ))}
                    {ds.length > 3 ? <span className="text-muted-foreground">+{ds.length - 3}</span> : null}
                  </button>
                )
              })}
            </div>
            <p className="text-muted-foreground mt-2 text-xs">Click a day to see it; double-click to plan something on it. Each plan can be added to Google Calendar, or export them all as an .ics file for any calendar.</p>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>{fmtDate(selected, { weekday: "long", month: "long", day: "numeric" })}</CardTitle>
              <CardDescription>{[dayEntries.length ? `${fmtHours(sumHours(dayEntries))} h given` : "", dayPlans.length ? `${dayPlans.length} planned` : ""].filter(Boolean).join(" · ") || "Nothing on this day"}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {dayEntries.length ? (
                <ul className="divide-y" data-testid="day-entries">
                  {dayEntries.map((e) => (
                    <li key={e.id} className="py-2">
                      <button type="button" className="flex w-full items-center gap-2 text-left" onClick={() => openEntry({ id: e.id })}>
                        <Check className="text-success size-4 shrink-0" />
                        <span className="min-w-0 flex-1 truncate">{e.activity}</span>
                        <span className="text-muted-foreground shrink-0 text-xs tabular-nums">{fmtHours(e.hours)} h</span>
                      </button>
                      {e.orgId ? <div className="mt-0.5 pl-6"><OrgChip orgId={e.orgId} /></div> : null}
                    </li>
                  ))}
                </ul>
              ) : null}
              {dayPlans.length ? <ul className="divide-y" data-testid="day-plans">{dayPlans.map((p) => <PlanRow key={p.id} p={p} compact />)}</ul> : null}
              {!dayEntries.length && !dayPlans.length ? <Button variant="outline" size="sm" onClick={() => openPlan({ date: selected })}><CalendarPlus /> Plan work on this day</Button> : null}
            </CardContent>
          </Card>
          {late.length ? (
            <Card className="border-warning/50">
              <CardHeader><CardTitle>Past plans to log</CardTitle><CardDescription>Log the hours, or mark them skipped.</CardDescription></CardHeader>
              <CardContent><ul className="divide-y" data-testid="overdue-plans">{late.map((p) => <PlanRow key={p.id} p={p} />)}</ul></CardContent>
            </Card>
          ) : null}
          <Card>
            <CardHeader><CardTitle>Coming up</CardTitle></CardHeader>
            <CardContent>
              {upcomingPlans(today, 8).length ? <ul className="divide-y">{upcomingPlans(today, 8).map((p) => <PlanRow key={p.id} p={p} />)}</ul> : <Empty>Nothing planned ahead.</Empty>}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
