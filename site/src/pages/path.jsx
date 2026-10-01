import * as React from "react"
import { Award, Clock, Flame, Printer, Share2 } from "lucide-react"

import { currentAge } from "@/lib/content"
import { entriesSorted, hoursByOrg, orgById, orgColor, plansSorted, sumHours, workItemStats, workItemTitle, workItemsSorted } from "@/lib/engine"
import { fmtDate, fmtHours, fmtShort, hoursWord, monthKey, plural, round2, todayISO } from "@/lib/format"
import { badgeCounts, badgeState, wallet, weekStreak } from "@/lib/rewards"
import { go } from "@/lib/router"
import { Store, useStore } from "@/lib/store"
import { Empty, OrgChip, PageHeader, Stat } from "@/components/bits"
import { useToast } from "@/components/toast"
import { BadgeIcon, useBadgeSync } from "@/pages/rewards"
import { Timeline, TimelineDot, TimelineRow } from "@zhangqi444/ui/app/timeline"
import { Medallion } from "@zhangqi444/ui/gamify/medallion"
import { Badge } from "@zhangqi444/ui/ui/badge"
import { Button } from "@zhangqi444/ui/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@zhangqi444/ui/ui/card"
import { Progress } from "@zhangqi444/ui/ui/progress"

/* One page that answers "what have you been doing?" without the asker having to learn
 * this app. The record already exists in three places — hours on My work, badges on
 * Rewards, what is coming on the calendar — and each is a working surface with filters
 * and buttons, which is the wrong thing to hand a grandparent or a teacher. So this is
 * the same data laid out as one path: where it started, every day she turned up, the
 * badges that came of it, today, and what she has already said yes to next. Reports
 * stays what it is — the grown-ups' paperwork, with signature rows. This is the story. */

/** The record as one ordered path: months, the days inside them, and what is still ahead. */
function pathOf(s = Store.s) {
  const days = new Map()
  const day = (d) => { if (!days.has(d)) days.set(d, { date: d, entries: [], badges: [] }); return days.get(d) }
  for (const e of s.entries) day(e.date).entries.push(e)
  // A badge is dated when it was earned, which for an imported or sample record is the day
  // the app first noticed; same-day badges collapse into one marker so a catch-up does not
  // bury the work that earned them.
  for (const b of badgeState()) if (b.at) day(b.at.slice(0, 10)).badges.push(b)

  const months = []
  for (const d of [...days.keys()].sort()) {
    const key = monthKey(d)
    if (!months.length || months[months.length - 1].key !== key) months.push({ key, days: [], hours: 0 })
    const m = months[months.length - 1]
    m.days.push(days.get(d))
    m.hours = round2(m.hours + sumHours(days.get(d).entries))
  }
  const today = todayISO()
  const open = plansSorted().filter((p) => p.status === "planned")
  return { months, late: open.filter((p) => p.date < today), next: open.filter((p) => p.date >= today) }
}

/** The short version, for a message or a caption. The page is the long version. */
function summaryText(s = Store.s) {
  const w = wallet()
  const first = entriesSorted("date", "asc")[0]
  const lines = [
    `${(s.settings.profile.name || "Volunteer").trim()} — volunteering so far`,
    `${hoursWord(sumHours(s.entries))} · ${plural(new Set(s.entries.map((e) => e.date)).size, "day")} out · ${plural(hoursByOrg().length, "place")}`,
    first ? `Since ${fmtDate(first.date)}` : "",
    `Level ${w.level.n} — ${w.level.title} · ${badgeCounts().earned} badges`,
    "",
    ...hoursByOrg().map((r) => `${r.name} — ${fmtHours(r.hours)} h`),
  ]
  const { next } = pathOf(s)
  if (next.length) lines.push("", "Next:", ...next.slice(0, 4).map((p) => `${fmtDate(p.date)} — ${p.title}`))
  return lines.filter((l) => l !== undefined).join("\n").replace(/\n{3,}/g, "\n\n")
}

function EntryRow({ e }) {
  return (
    <TimelineRow dot={<TimelineDot color={orgColor(e.orgId)} />} data-testid="path-entry">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="text-sm font-medium">{e.activity}</span>
        <span className="text-muted-foreground text-xs tabular-nums">{fmtShort(e.date)}</span>
        <Badge variant="secondary" className="tabular-nums">{fmtHours(e.hours)} h</Badge>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        {e.orgId ? <OrgChip orgId={e.orgId} /> : null}
        {e.workItemId ? (
          <button type="button" onClick={() => go(`/work/${e.workItemId}`)} className="text-muted-foreground hover:text-foreground text-xs underline-offset-2 hover:underline print:no-underline">
            {workItemTitle(e.workItemId)}
          </button>
        ) : null}
      </div>
      {e.reflection ? <p className="mt-1.5 text-sm italic">“{e.reflection}”</p> : null}
    </TimelineRow>
  )
}

function PlanRow({ p, late }) {
  return (
    <TimelineRow dot={<TimelineDot variant="dashed" />} data-testid="path-plan">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="text-sm font-medium">{p.title}</span>
        <span className="text-muted-foreground text-xs tabular-nums">{fmtShort(p.date)}{p.start ? ` · ${p.start}` : ""}</span>
        {late ? <Badge variant="warning">still to log</Badge> : null}
      </div>
      {p.orgId ? <div className="mt-1"><OrgChip orgId={p.orgId} /></div> : null}
    </TimelineRow>
  )
}

/** Level, points, streak and the badges she has — the part that is about her, not the hours. */
function GrowthCard() {
  const w = wallet()
  const counts = badgeCounts()
  const earned = badgeState().filter((b) => b.done)
  const streak = weekStreak()
  return (
    <Card data-testid="path-growth">
      <CardHeader>
        <CardTitle>How far she has come</CardTitle>
        <CardDescription>Points are for turning up, not for being good at it.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <Medallion b={{ done: true }} size={64} icon={<span className="text-xl font-semibold tabular-nums">{w.level.n}</span>} />
          <div className="min-w-0 flex-1">
            <div className="font-medium">Level {w.level.n} · {w.level.title}</div>
            <div className="text-muted-foreground text-xs tabular-nums" data-testid="path-points">
              {w.lifetime} points{w.level.next ? ` · ${w.level.next.at - w.lifetime} to ${w.level.next.title}` : " · top of the ladder"}
            </div>
            <Progress value={w.level.pct} className="mt-2 h-1.5" aria-label="Progress to the next level" />
          </div>
        </div>
        <div className="grid gap-2 text-sm @sm/card:grid-cols-2">
          <div className="flex items-center gap-2"><Flame className="text-muted-foreground size-4 shrink-0" /><span data-testid="path-streak">{streak ? `${plural(streak, "week")} in a row` : "No run going yet"}</span></div>
          <div className="flex items-center gap-2"><Award className="text-muted-foreground size-4 shrink-0" /><span data-testid="path-badge-count">{counts.earned} of {counts.total} badges</span></div>
        </div>
        {earned.length ? (
          <div className="flex flex-wrap gap-1.5">
            {earned.map((b) => (
              <span key={b.id} title={`${b.name} — ${b.desc}`}>
                <Medallion b={b} size={34} icon={<BadgeIcon name={b.icon} className="size-4" />} />
              </span>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

/** Where the hours went, and what she is still in the middle of. */
function PlacesCard() {
  const byOrg = hoursByOrg()
  const going = workItemsSorted().filter((w) => w.status === "active")
  return (
    <Card data-testid="path-places">
      <CardHeader>
        <CardTitle>Where, and what she is in the middle of</CardTitle>
        <CardDescription>{byOrg.length ? `${plural(byOrg.length, "place")} so far` : "No hours logged yet"}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {byOrg.length ? (
          <ul className="flex flex-col gap-2">
            {byOrg.map((r) => {
              const org = orgById(r.orgId)
              return (
                <li key={r.orgId || "none"} className="flex items-baseline justify-between gap-3 text-sm" data-testid="path-place">
                  <span className="min-w-0">
                    {org && org.website
                      ? <a href={org.website} target="_blank" rel="noreferrer" className="underline-offset-2 hover:underline">{r.name}</a>
                      : r.name}
                  </span>
                  <span className="text-muted-foreground shrink-0 tabular-nums">{fmtHours(r.hours)} h · {plural(r.count, "visit")}</span>
                </li>
              )
            })}
          </ul>
        ) : null}
        {going.length ? (
          <div className="flex flex-col gap-2">
            <div className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Still going</div>
            {going.map((w) => {
              const st = workItemStats(w.id)
              return (
                <div key={w.id} className="flex flex-col gap-1" data-testid="path-going">
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate">{w.title}</span>
                    <span className="text-muted-foreground shrink-0 tabular-nums">{fmtHours(st.hours)}{w.targetHours ? ` / ${fmtHours(w.targetHours)}` : ""} h</span>
                  </div>
                  {st.pct === null ? null : <Progress value={st.pct} className="h-1" aria-label={`${w.title} progress`} />}
                </div>
              )
            })}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

export function Path() {
  const store = useStore()
  const toast = useToast()
  useBadgeSync()
  const s = store.s
  const today = todayISO()
  const { months, late, next } = pathOf(s)
  const total = sumHours(s.entries)
  const dayCount = new Set(s.entries.map((e) => e.date)).size
  const places = hoursByOrg().length
  const first = entriesSorted("date", "asc")[0]
  const who = (s.settings.profile.name || store.name || "").trim()
  const age = currentAge()
  const w = wallet()

  const copy = async () => {
    try { await navigator.clipboard.writeText(summaryText(s)); toast("Summary copied") }
    catch { toast("Could not copy — use Print / Save PDF instead") }
  }

  return (
    <div className="flex flex-col gap-4 @container/path">
      <div className="print:hidden">
        <PageHeader title="My path" description="Everything she has done, how far it has taken her, and what is next — one page to show someone.">
          <Button variant="outline" onClick={copy} data-testid="path-copy"><Share2 /> Copy summary</Button>
          <Button onClick={() => window.print()} data-testid="path-print"><Printer /> Print / Save PDF</Button>
        </PageHeader>
      </div>

      {/* Printed, the page loses the breadcrumb and the heading above, so it says who it is about itself. */}
      <div className="hidden print:block">
        <h1 className="text-xl font-semibold">{who ? `${who} — volunteering so far` : "Volunteering so far"}</h1>
        <p className="text-sm">{first ? `${fmtDate(first.date)} – ${fmtDate(today)}` : fmtDate(today)}</p>
      </div>

      <Card className="from-primary/5 to-card bg-gradient-to-t print:border-0 print:shadow-none" data-testid="path-hero">
        <CardHeader>
          <CardDescription>{who || "Volunteer"}{age ? ` · ${age} years old` : ""}</CardDescription>
          <CardTitle className="text-xl">
            {total ? `${hoursWord(total)} given at ${plural(places, "place")}, across ${plural(dayCount, "day")} out.` : "The path starts with the first hours."}
          </CardTitle>
          <CardDescription>
            {first ? `Since ${fmtDate(first.date)} · Level ${w.level.n}, ${w.level.title}` : "Log a day, or plan one, and it shows up here."}
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
        <Stat label="Hours given" value={fmtHours(total)} sub={plural(s.entries.length, "entry", "entries")} testid="path-stat-hours" />
        <Stat label="Days out" value={String(dayCount)} sub={first ? `first on ${fmtShort(first.date)}` : "none yet"} testid="path-stat-days" />
        <Stat label="Places" value={String(places)} sub={plural(workItemsSorted().filter((w) => w.status === "active").length, "ongoing piece") + " of work"} testid="path-stat-places" />
        <Stat label="Planned" value={String(late.length + next.length)} sub={late.length ? `${late.length} still to log` : next.length ? "ahead of her" : "nothing yet"} testid="path-stat-planned" />
      </div>

      <div className="grid gap-4 @3xl/main:grid-cols-2">
        <GrowthCard />
        <PlacesCard />
      </div>

      <Card className="print:border-0 print:shadow-none">
        <CardHeader>
          <CardTitle>The path, in order</CardTitle>
          <CardDescription>Every day she turned up, the badges that came of it, and what she has said yes to next.</CardDescription>
        </CardHeader>
        <CardContent>
          {months.length || late.length || next.length ? (
            <Timeline data-testid="path-rail">
              {months.map((m) => (
                <React.Fragment key={m.key}>
                  <TimelineRow dot={<TimelineDot className="bg-border border-border size-2.5" />} data-testid="path-month">
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <span className="text-sm font-semibold">{fmtDate(`${m.key}-01`, { month: "long", year: "numeric" })}</span>
                      {m.hours ? <span className="text-muted-foreground text-xs tabular-nums">{hoursWord(m.hours)}</span> : null}
                    </div>
                  </TimelineRow>
                  {m.days.map((d) => (
                    <React.Fragment key={d.date}>
                      {d.entries.map((e) => <EntryRow key={e.id} e={e} />)}
                      {d.badges.length ? (
                        <TimelineRow dot={<TimelineDot variant="solid"><Award className="size-3" /></TimelineDot>} data-testid="path-badge">
                          <div className="flex flex-wrap items-baseline gap-x-2">
                            <span className="text-sm font-medium">{plural(d.badges.length, "badge")} earned</span>
                            <span className="text-muted-foreground text-xs tabular-nums">{fmtShort(d.date)}</span>
                          </div>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {d.badges.map((b) => <Badge key={b.id} variant="secondary" className="gap-1"><BadgeIcon name={b.icon} className="size-3" />{b.name}</Badge>)}
                          </div>
                        </TimelineRow>
                      ) : null}
                    </React.Fragment>
                  ))}
                </React.Fragment>
              ))}

              {late.map((p) => <PlanRow key={p.id} p={p} late />)}

              <TimelineRow dot={<TimelineDot className="border-primary"><span className="bg-primary size-2 rounded-full" /></TimelineDot>} data-testid="path-today">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className="text-sm font-semibold">Today</span>
                  <span className="text-muted-foreground text-xs tabular-nums">{fmtDate(today)}</span>
                </div>
              </TimelineRow>

              {next.length
                ? next.map((p) => <PlanRow key={p.id} p={p} />)
                : (
                  <TimelineRow dot={<TimelineDot variant="dashed" />} data-testid="path-nothing-next">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-muted-foreground text-sm">Nothing planned yet.</span>
                      <Button size="sm" variant="secondary" className="print:hidden" onClick={() => go("/catalog")} data-testid="path-find">Find something</Button>
                    </div>
                  </TimelineRow>
                )}

              {w.level.next ? (
                <TimelineRow dot={<TimelineDot variant="dashed"><Clock className="size-3" /></TimelineDot>}>
                  <div className="text-muted-foreground text-sm">
                    {w.level.next.at - w.lifetime} points to Level {w.level.next.n}, {w.level.next.title} — about {fmtHours(round2((w.level.next.at - w.lifetime) / 10))} more hours.
                  </div>
                </TimelineRow>
              ) : null}
            </Timeline>
          ) : (
            <Empty action={<Button onClick={() => go("/catalog")}>Find something</Button>}>
              Nothing on the path yet. Log an hour, or plan a day, and it starts here.
            </Empty>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
