/* Small shared pieces: org chip, status badge, stat tile, empty state, page header, a Select that allows "none". */
import * as React from "react"
import { CalendarPlus, Download, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { go } from "@/lib/router"
import { orgColor, orgName } from "@/lib/engine"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { NativeSelect } from "@/components/ui/native-select"

export function OrgChip({ orgId, className }) {
  return (
    <span className={cn("bg-secondary text-secondary-foreground inline-flex max-w-full items-center gap-1.5 rounded-full py-0.5 pr-2.5 pl-2 text-xs font-medium", className)} data-testid="org-chip">
      <span className="size-2 shrink-0 rounded-full" style={{ background: orgColor(orgId) }} />
      <span className="truncate">{orgName(orgId)}</span>
    </span>
  )
}

export function StatusBadge({ status, className }) {
  const v = status === "active" ? "default" : status === "paused" ? "warning" : "secondary"
  return <Badge variant={v} className={cn("capitalize", className)} data-testid="status">{status}</Badge>
}

export function Stat({ label, value, sub, testid }) {
  return (
    <Card className="@container/card gap-1 py-4" data-testid={testid}>
      <CardHeader className="gap-1">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">{value}</CardTitle>
        {sub ? <div className="text-muted-foreground text-xs">{sub}</div> : null}
      </CardHeader>
    </Card>
  )
}

export function Empty({ children, action, className }) {
  return (
    <div className={cn("text-muted-foreground flex flex-col items-center gap-3 rounded-lg border border-dashed px-6 py-10 text-center text-sm", className)}>
      <div>{children}</div>
      {action}
    </div>
  )
}

/** My work is one page with two groupings: by activity, or by date. The two used to be
 *  separate pages showing the same entries and plans, which made them look like different
 *  things. The hash still distinguishes them so either view can be linked to. */
export function ViewToggle({ view }) {
  const opt = (v, label, to) => (
    <button key={v} type="button" onClick={() => go(to)} data-testid={`view-${v}`} aria-pressed={view === v}
      className={cn("rounded-sm px-3 py-1 text-sm transition", view === v ? "bg-background text-foreground shadow-sm font-medium" : "text-muted-foreground hover:text-foreground")}>
      {label}
    </button>
  )
  return <div className="bg-muted inline-flex rounded-md p-0.5" role="group" aria-label="View">{opt("list", "List", "/work")}{opt("month", "Calendar", "/calendar")}</div>
}

/** The header both views of My work share. They show the same records, so they offer the
 *  same things to do with them: a plan for what is coming, hours for what happened, and the
 *  export of what is still planned. A view that could do less than its twin was the bug. */
export function WorkHeader({ view, onPlan, onLog, onExport, canExport }) {
  return (
    <PageHeader title="My work" description="Everything she has taken on, and every hour given.">
      <ViewToggle view={view} />
      <Button variant="outline" disabled={!canExport} onClick={onExport} data-testid="export-ics"><Download /> Export .ics</Button>
      <Button variant="secondary" onClick={onPlan} data-testid="add-plan"><CalendarPlus /> Plan</Button>
      <Button onClick={onLog} data-testid="page-log-hours"><Plus /> Log hours</Button>
    </PageHeader>
  )
}

export function PageHeader({ title, description, children }) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description ? <p className="text-muted-foreground mt-1 text-sm">{description}</p> : null}
      </div>
      {children ? <div className="flex flex-wrap items-center gap-2">{children}</div> : null}
    </div>
  )
}

const NONE = "__none__"
const coarsePointer = () => typeof window !== "undefined" && window.matchMedia && window.matchMedia("(pointer: coarse)").matches

/** Select with an optional "none" choice (Radix forbids an empty-string item value).
 *  Touch devices get the platform's own picker; an empty list says so instead of opening blank. */
export function Pick({ value, onChange, options, placeholder = "Choose…", noneLabel = null, emptyLabel = "Nothing to choose yet", className, disabled, testid, size }) {
  if (coarsePointer()) {
    return (
      <NativeSelect value={value || ""} onChange={(e) => onChange(e.target.value)} disabled={disabled} className={className} size={size} data-testid={testid} aria-label={placeholder}>
        {noneLabel !== null ? <option value="">{noneLabel}</option> : <option value="" disabled>{options.length ? placeholder : emptyLabel}</option>}
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </NativeSelect>
    )
  }
  return (
    <Select value={value ? value : noneLabel !== null ? NONE : undefined} onValueChange={(v) => onChange(v === NONE ? "" : v)} disabled={disabled}>
      <SelectTrigger className={cn("w-full", className)} data-testid={testid} size={size}><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>
        {noneLabel !== null && <SelectItem value={NONE}>{noneLabel}</SelectItem>}
        {options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        {!options.length && noneLabel === null ? <div className="text-muted-foreground px-2 py-1.5 text-sm">{emptyLabel}</div> : null}
      </SelectContent>
    </Select>
  )
}

export function Field({ label, children, hint, className, required }) {
  return (
    <label className={cn("flex flex-col gap-1.5 text-sm", className)}>
      <span className="text-muted-foreground font-medium">{label}{required ? <span className="text-destructive"> *</span> : null}</span>
      {children}
      {hint ? <span className="text-muted-foreground text-xs">{hint}</span> : null}
    </label>
  )
}
