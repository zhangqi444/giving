/* Small formatting and date helpers shared by the store, the engine and the pages. */

export const pad = (n) => String(n).padStart(2, "0")
export const round2 = (n) => Math.round(n * 100) / 100

export function toISODate(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }
export function todayISO() { return toISODate(new Date()) }
export function isISODate(s) { return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s)) }
export function parseISO(iso) { const [y, m, d] = iso.split("-").map(Number); return new Date(y, m - 1, d) }
export function monthKey(iso) { return iso.slice(0, 7) }

/** Timestamp of an `at` value that may be an ISO string, a number, or missing. */
export function ts(v) { if (typeof v === "number") return v; const n = Date.parse(v || ""); return isNaN(n) ? 0 : n }

export function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8) }

/** Dates render through here everywhere so they look the same on every page. */
export function fmtDate(iso, opts = { month: "short", day: "numeric", year: "numeric" }) {
  return isISODate(iso) ? parseISO(iso).toLocaleDateString(undefined, opts) : (iso || "")
}
export function fmtShort(iso) { return fmtDate(iso, { month: "short", day: "numeric" }) }

export function fmtHours(n) {
  const v = round2(Number(n) || 0)
  if (Number.isInteger(v)) return String(v)
  return v.toFixed((v * 10) % 1 === 0 ? 1 : 2)
}
export function hoursWord(n) { return `${fmtHours(n)} ${Number(n) === 1 ? "hour" : "hours"}` }
/** What an entry handed over: "4 blankets", "$50 raised". The unit is the family's own word for it. */
export function fmtGave(g) { return !g ? "" : g.unit === "dollars" ? `$${fmtHours(g.count)} raised` : `${fmtHours(g.count)} ${g.unit}` }
/** Several units in one phrase: "9 blankets, 3 bags of food". */
export function givenWord(list) { return list.map((g) => fmtGave(g)).join(", ") }
export function plural(n, one, many = one + "s") { return `${n} ${n === 1 ? one : many}` }
