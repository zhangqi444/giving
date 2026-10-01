import * as React from "react"
import { Moon, Sun } from "lucide-react"

import { workItemById } from "@/lib/engine"
import { go } from "@/lib/router"
import { DRIVE_ENABLED, useStore } from "@/lib/store"
import { DriveChip } from "@zhangqi444/ui/app/drive-chip"
import { SiteHeaderTemplate } from "@zhangqi444/ui/app/site-header"
import { Button } from "@zhangqi444/ui/ui/button"
import { SidebarTrigger } from "@zhangqi444/ui/ui/sidebar"
import { CHIP_LABEL, STATUS_LABEL } from "@/components/nav-user"

const LABEL = { calendar: "My work", catalog: "Find something", work: "My work", path: "My path", log: "Hours", rewards: "Rewards", reports: "Reports", settings: "Settings" }

/** Breadcrumb trail for the current hash route: every crumb is a real link, so there is always a way out. */
function crumbs(route) {
  const [top, a] = route
  const out = [{ label: "Dashboard", path: "/" }]
  if (LABEL[top]) out.push({ label: LABEL[top], path: "/" + top })
  if (top === "work" && a) { const w = workItemById(a); out.push({ label: w ? w.title : "Work item", path: `/work/${a}` }) }
  return out
}

/** What the Drive chip's tooltip says here — the part the shared chip
 *  deliberately refuses to guess. */
function driveTip(status, store) {
  if (status === "live") return `Saved to volunteer-tracker-data.json in your Google Drive${store.email ? " (" + store.email + ")" : ""}. Click for Drive settings.`
  if (status === "error") return store.lastError || "Google Drive could not be reached."
  if (status === "expired") return "Google sign-ins last an hour. Click to reconnect; no consent screen this time, and everything on this device is safe meanwhile."
  if (status === "unavailable") return store.lastError || "Google Sign-In did not load."
  return "Sign in with Google to save to the file this app keeps in your Drive."
}

export function SiteHeader({ route }) {
  const store = useStore()
  const status = DRIVE_ENABLED ? store.status : null
  const isDark = store.dark
  /* Connected, this opens the settings page; it used to sign her out.
   *
   * A chip that reads "Saved to Drive" is a status light, and one tap on it
   * revoked the token, cleared this device and dropped her back at the gate.
   * The tooltip did say so — but a tooltip needs a pointer, and on a phone
   * this control collapses to an icon whose entire accessible name is "Saved
   * to Google Drive". There was nothing to read before the tap and nothing
   * asked after it. Signing out is still there, on the settings page this now
   * opens, under a heading, beside the sentence saying the file keeps
   * everything. Not connected, one tap to connect is the right thing and
   * stays. */
  const act = () => (status === "live" ? go("/settings") : store.signIn())

  return (
    <SiteHeaderTemplate
      trail={crumbs(route)}
      onNavigate={go}
      trigger={<SidebarTrigger className="-ml-1" />}
      className="print:hidden"
      crumbPageClassName="max-w-[40vw] truncate"
    >
      <DriveChip
        status={status}
        onAct={act}
        tooltip={driveTip(status, store)}
        labels={CHIP_LABEL}
        statusLabels={STATUS_LABEL}
        data-testid="drive-button"
      />
      <Button variant="ghost" size="icon" className="size-8" onClick={() => store.setTheme(isDark ? "light" : "dark")} aria-label="Toggle theme" data-testid="theme-toggle">
        {isDark ? <Sun /> : <Moon />}
      </Button>
    </SiteHeaderTemplate>
  )
}
