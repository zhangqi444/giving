import * as React from "react"
import { Cloud, CloudOff, HardDrive, MonitorSmartphone, Moon, MoreVertical, Settings2, Sun } from "lucide-react"

import { go } from "@/lib/router"
import { DRIVE_ENABLED, useStore } from "@/lib/store"
import { DRIVE_CHIP_LABEL, DRIVE_STATUS_LABEL, driveBusy, driveLabels } from "@zhangqi444/ui/lib/drive-status"
import { AccountIdentity, AccountMenu } from "@zhangqi444/ui/app/account-menu"
import {
  DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator,
} from "@zhangqi444/ui/ui/dropdown-menu"
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar"

/* Six of these seven sentences are the shared ones and are no longer written
 * out here. `local` is the exception, and it is a real difference rather than
 * a wording preference: nothing in this app works until Google has said who
 * you are, so being un-connected is "Not signed in", where the sibling site
 * goes on saving to the device and calls the same state "Saved on this
 * device". */
export const STATUS_LABEL = driveLabels(DRIVE_STATUS_LABEL, { local: "Not signed in" })
export const CHIP_LABEL = driveLabels(DRIVE_CHIP_LABEL, { local: "Sign in" })

export function NavUser() {
  const store = useStore()
  const { isMobile } = useSidebar()
  const status = DRIVE_ENABLED ? store.status : "local"
  const live = status === "live" || status === "syncing"
  const name = (live || status === "expired") && (store.name || store.email) ? (store.name || store.email) : "Volunteer"
  const theme = store.s.theme || "system"
  const busy = driveBusy(status)
  const who = { name, sub: STATUS_LABEL[status], picture: live ? store.picture : "" }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <AccountMenu
          {...who}
          isMobile={isMobile}
          trigger={
            <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground" data-testid="nav-user">
              <AccountIdentity {...who} />
              <MoreVertical className="ml-auto size-4" />
            </SidebarMenuButton>
          }
        >
          <DropdownMenuGroup>
            {DRIVE_ENABLED ? (
              live ? (
                /* One way in, not four.
                 *
                 * This menu grew an entry at a time — sync, the file, sign out
                 * — because there was nowhere else to put them. There has been
                 * somewhere else for a while: the settings page already holds
                 * all three, under a Google Drive heading, next to the name of
                 * the file and a sentence about what the permission does and
                 * does not allow. Keeping both meant three entries that each
                 * did a fraction of one page, and asked her to know which
                 * fraction she wanted before she had seen any of them.
                 *
                 * Sign out is the one that had to move rather than merely be
                 * duplicated. It reads like a tidy-up and it clears the device,
                 * and it sat one tap under a row that says the work is safe. */
                <DropdownMenuItem onSelect={() => go("/settings")} data-testid="drive-settings-link">
                  <Settings2 /> Drive settings
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onSelect={() => store.signIn()} disabled={busy}>
                  {status === "error" ? <CloudOff /> : <Cloud />}
                  {status === "error" ? "Retry Google Drive" : status === "expired" ? "Reconnect Google Drive" : "Sign in with Google"}
                </DropdownMenuItem>
              )
            ) : (
              <DropdownMenuItem disabled><HardDrive /> Drive is not configured</DropdownMenuItem>
            )}
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-muted-foreground text-xs">Theme</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={theme} onValueChange={(v) => store.setTheme(v === "system" ? undefined : v)}>
            <DropdownMenuRadioItem value="light"><Sun /> Light</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="dark"><Moon /> Dark</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="system"><MonitorSmartphone /> System</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </AccountMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
