import { Box, WifiOff } from "lucide-react"

import { Header } from "~/components/header"
import { LoginForm } from "~/components/login-form"
import { MobileSidebar } from "~/components/mobile-sidebar"
import { RepoSidebar } from "~/components/repo-sidebar"
import { env } from "~/env"
import { checkRegistryStatus } from "~/lib/registry"
import { getSession } from "~/lib/session"

export const dynamic = "force-dynamic"

export default async function RegistryLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const credentials = await getSession()
  const status = await checkRegistryStatus(credentials)
  const displayUrl =
    env.DISPLAY_REGISTRY_URL ?? env.REGISTRY_URL.replace(/^https?:\/\//, "")

  // Registry not connected
  if (!status.connected) {
    return (
      <div className="flex h-screen flex-col">
        <Header registryUrl={displayUrl} isAuthenticated={false} />
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-4 text-center">
          <div className="bg-destructive/10 flex h-16 w-16 items-center justify-center rounded-full">
            <WifiOff className="text-destructive h-8 w-8" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">
              Cannot Connect to Registry
            </h2>
            <p className="text-muted-foreground mt-1 max-w-md text-sm">
              {status.error ?? `Unable to reach ${displayUrl}`}
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Requires auth and not authenticated
  if (status.requiresAuth && !status.authenticated) {
    return (
      <div className="flex h-screen flex-col">
        <Header registryUrl={displayUrl} isAuthenticated={false} />
        <LoginForm registryUrl={displayUrl} />
      </div>
    )
  }

  // Authenticated or no auth required
  return (
    <div className="flex h-screen flex-col">
      <Header registryUrl={displayUrl} isAuthenticated={status.requiresAuth} />
      <div className="flex flex-1 overflow-hidden">
        <aside className="border-border hidden w-72 shrink-0 border-r md:block">
          <RepoSidebar />
        </aside>
        <MobileSidebar />
        <main className="flex-1 overflow-hidden">{children}</main>
      </div>
    </div>
  )
}
