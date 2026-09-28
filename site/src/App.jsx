import * as React from "react"

import { useRoute } from "@/lib/router"
import { DRIVE_ENABLED, useStore } from "@/lib/store"
import { SidebarInset, SidebarProvider } from "@zhangqi444/ui/ui/sidebar"
import { AppShell } from "@zhangqi444/ui/app/app-shell"
import { UiProvider } from "@zhangqi444/ui/app/ui-provider"
import { Button } from "@zhangqi444/ui/ui/button"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { DialogsProvider } from "@/components/dialogs"
import { ToastProvider } from "@/components/toast"
import { Home } from "@/pages/home"
import { WorkDetail, WorkList } from "@/pages/work"
import { Log } from "@/pages/log"
import { Reports } from "@/pages/reports"
import { Settings } from "@/pages/settings"
import { SignIn } from "@/pages/signin"
import { Catalog } from "@/pages/catalog"
import { Calendar } from "@/pages/calendar"
import { Rewards } from "@/pages/rewards"

function Screen({ route }) {
  const [top, a] = route
  if (top === "work" && a) return <WorkDetail key={a} id={a} />
  if (top === "work") return <WorkList />
  if (top === "calendar") return <Calendar />
  if (top === "catalog") return <Catalog />
  if (top === "rewards") return <Rewards />
  if (top === "log") return <Log />
  if (top === "reports") return <Reports />
  if (top === "settings") return <Settings />
  return <Home />
}

class ErrorBoundary extends React.Component {
  constructor(p) { super(p); this.state = { err: null } }
  static getDerivedStateFromError(err) { return { err } }
  componentDidCatch(err) { console.error(err) }
  render() {
    if (!this.state.err) return this.props.children
    return (
      <div className="mx-auto mt-16 flex max-w-md flex-col gap-3 rounded-xl border bg-card p-6 text-center shadow-sm">
        <h2 className="text-xl font-semibold">Something went wrong</h2>
        <p className="text-muted-foreground text-sm">{String((this.state.err && this.state.err.message) || this.state.err)}</p>
        <div className="flex justify-center gap-2">
          <button className="rounded-md border px-3 py-1.5 text-sm" onClick={() => location.reload()}>Reload</button>
        </div>
      </div>
    )
  }
}

/* Which button the shared templates render. This site's is plain shadcn;
 * the package default is the sibling site's sticker button, which leans on six
 * CSS variables (--lift and four --*-press hues) that are not defined here, so
 * adopting it by accident would flatten every shadow in the chrome to nothing.
 * Module-level so the context value keeps its identity across renders. */
const UI = { Button }

export default function App() {
  return (
    <UiProvider value={UI}>
      <Routed />
    </UiProvider>
  )
}

function Routed() {
  const route = useRoute()
  const store = useStore()
  // Signed in once on this device? Then the app opens (offline too); otherwise the gate.
  if (DRIVE_ENABLED && store.status !== "live" && !store.hasSession()) return <SignIn />
  return (
    <ToastProvider>
      <DialogsProvider>
        <AppShell
          sidebar={<AppSidebar variant="inset" route={route} />}
          header={<SiteHeader route={route} />}
          provider={SidebarProvider}
          inset={SidebarInset}
        >
          <ErrorBoundary key={route.join("/")}><Screen route={route} /></ErrorBoundary>
        </AppShell>
      </DialogsProvider>
    </ToastProvider>
  )
}
