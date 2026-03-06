import { RegistryPage } from "~/components/registry-page"
import { env } from "~/env"
import { checkRegistryStatus } from "~/lib/registry"
import { getSession } from "~/lib/session"

export const dynamic = "force-dynamic"

export default async function Home() {
  const credentials = await getSession()
  const status = await checkRegistryStatus(credentials)

  const displayUrl =
    env.DISPLAY_REGISTRY_URL ?? env.REGISTRY_URL.replace(/^https?:\/\//, "")

  return <RegistryPage initialStatus={status} registryUrl={displayUrl} />
}
