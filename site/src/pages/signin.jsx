import * as React from "react"
import { Check, HeartHandshake, Moon, Sun } from "lucide-react"

import { useStore } from "@/lib/store"
import { driveBusy } from "@zhangqi444/ui/lib/drive-status"
import { AuthBrand, AuthPoints, AuthScreen, GoogleButton } from "@zhangqi444/ui/app/auth-screen"
import { Button } from "@zhangqi444/ui/ui/button"

const POINTS = [
  "Your data is a JSON file in your own Google Drive. Nothing is stored on a server.",
  "Access to Drive is limited to the one file this app creates.",
  "Works on any device you sign in from, and offline once signed in.",
].map((text) => ({ icon: <Check className="text-primary mt-0.5 size-4 shrink-0" />, text }))

/** The gate: nothing in the app is reachable until Google has signed the volunteer in. */
export function SignIn() {
  const store = useStore()
  const busy = driveBusy(store.status)
  const unavailable = store.status === "unavailable"
  return (
    <AuthScreen
      as="main"
      className="from-accent/60 to-background bg-gradient-to-br px-4 py-10"
      panelClassName="bg-card text-card-foreground gap-0 rounded-2xl border p-8 shadow-lg"
      data-testid="signin"
    >
      <AuthBrand
        icon={<HeartHandshake className="text-primary size-7" />}
        name="Volunteer Tracker"
        className="gap-2"
      >
        <Button variant="ghost" size="icon" className="size-8" onClick={() => store.setTheme(store.dark ? "light" : "dark")} aria-label="Toggle theme">{store.dark ? <Sun /> : <Moon />}</Button>
      </AuthBrand>
      <h1 className="mt-6 text-2xl font-semibold tracking-tight">Keep every hour you give.</h1>
      <p className="text-muted-foreground mt-2 text-sm">Log shifts, track hours per organization and work item, keep memos, and print reports for school, work, or awards.</p>
      <AuthPoints items={POINTS} className="text-muted-foreground mt-5 gap-2" itemClassName="items-start gap-2" />
      <GoogleButton
        variant="outline"
        className="mt-6"
        busy={busy}
        disabled={!store.ready || busy || unavailable}
        onClick={() => store.signIn()}
        data-testid="signin-button"
      >
        {store.status === "connecting" ? "Waiting for Google…" : store.status === "syncing" ? "Loading your data…" : !store.ready && !unavailable ? "Loading Google Sign-In…" : "Sign in with Google"}
      </GoogleButton>
      {(store.status === "error" || unavailable) && store.lastError ? <p role="alert" className="text-destructive mt-3 text-sm" data-testid="signin-error">{store.lastError}</p> : null}
      <p className="text-muted-foreground mt-4 text-center text-xs">Signing in opens a Google window asking permission to see your profile and to manage files this app creates in Drive.</p>
    </AuthScreen>
  )
}
