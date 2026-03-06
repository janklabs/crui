import { env } from "~/env"
import type { Credentials } from "~/lib/session"

const REGISTRY_URL = (env.REGISTRY_URL ?? "").replace(/\/$/, "")

const MANIFEST_ACCEPT_HEADERS = [
  "application/vnd.oci.image.index.v1+json",
  "application/vnd.oci.image.manifest.v1+json",
  "application/vnd.docker.distribution.manifest.v2+json",
  "application/vnd.docker.distribution.manifest.list.v2+json",
  "application/vnd.docker.distribution.manifest.v1+prettyjws",
].join(", ")

function buildAuthHeader(
  credentials: Credentials | null,
): Record<string, string> {
  if (!credentials) return {}
  const token = Buffer.from(
    `${credentials.username}:${credentials.password}`,
  ).toString("base64")
  return { Authorization: `Basic ${token}` }
}

export interface RegistryStatus {
  connected: boolean
  requiresAuth: boolean
  authenticated: boolean
  registryUrl: string
  error?: string
}

export async function checkRegistryStatus(
  credentials: Credentials | null,
): Promise<RegistryStatus> {
  const base: RegistryStatus = {
    connected: false,
    requiresAuth: false,
    authenticated: false,
    registryUrl: REGISTRY_URL,
  }

  try {
    const res = await fetch(`${REGISTRY_URL}/v2/`, {
      method: "GET",
      headers: {},
      cache: "no-store",
    })

    if (res.ok) {
      return {
        ...base,
        connected: true,
        requiresAuth: false,
        authenticated: true,
      }
    }

    if (res.status === 401) {
      if (!credentials) {
        return {
          ...base,
          connected: true,
          requiresAuth: true,
          authenticated: false,
        }
      }

      const authRes = await fetch(`${REGISTRY_URL}/v2/`, {
        method: "GET",
        headers: {
          ...buildAuthHeader(credentials),
        },
        cache: "no-store",
      })

      if (authRes.ok) {
        return {
          ...base,
          connected: true,
          requiresAuth: true,
          authenticated: true,
        }
      }

      return {
        ...base,
        connected: true,
        requiresAuth: true,
        authenticated: false,
        error: "Invalid credentials",
      }
    }

    return {
      ...base,
      connected: true,
      error: `Registry returned status ${res.status}`,
    }
  } catch (err) {
    return {
      ...base,
      error:
        err instanceof Error
          ? `Cannot connect to registry: ${err.message}`
          : "Cannot connect to registry",
    }
  }
}

export interface CatalogResponse {
  repositories: string[]
  hasMore: boolean
  last?: string
}

export async function listRepositories(
  credentials: Credentials | null,
  n = 100,
  last?: string,
): Promise<CatalogResponse> {
  const params = new URLSearchParams({ n: n.toString() })
  if (last) params.set("last", last)

  const res = await fetch(`${REGISTRY_URL}/v2/_catalog?${params.toString()}`, {
    headers: {
      ...buildAuthHeader(credentials),
    },
    cache: "no-store",
  })

  if (!res.ok) {
    throw new Error(`Failed to list repositories: ${res.status}`)
  }

  const data = (await res.json()) as { repositories: string[] | null }
  const repositories = data.repositories ?? []

  const linkHeader = res.headers.get("Link")
  const hasMore = !!linkHeader && linkHeader.includes('rel="next"')

  return {
    repositories,
    hasMore,
    last:
      repositories.length > 0
        ? repositories[repositories.length - 1]
        : undefined,
  }
}

export interface TagsResponse {
  name: string
  tags: string[]
}

export async function listTags(
  name: string,
  credentials: Credentials | null,
): Promise<TagsResponse> {
  const res = await fetch(`${REGISTRY_URL}/v2/${name}/tags/list`, {
    headers: {
      ...buildAuthHeader(credentials),
    },
    cache: "no-store",
  })

  if (!res.ok) {
    throw new Error(`Failed to list tags for ${name}: ${res.status}`)
  }

  const data = (await res.json()) as { name: string; tags: string[] | null }
  return {
    name: data.name,
    tags: data.tags ?? [],
  }
}

export interface ManifestLayer {
  mediaType: string
  size: number
  digest: string
}

export interface ManifestConfig {
  mediaType: string
  size: number
  digest: string
}

export interface PlatformInfo {
  architecture: string
  os: string
  variant?: string
}

export interface ManifestDetail {
  mediaType: string
  schemaVersion: number
  digest: string
  totalSize: number
  layers: ManifestLayer[]
  config?: ManifestConfig
  platform?: PlatformInfo
  created?: string
}

export interface ManifestListEntry {
  mediaType: string
  size: number
  digest: string
  platform: PlatformInfo
}

export interface ManifestResult {
  type: "manifest" | "manifestList"
  manifest?: ManifestDetail
  manifests?: ManifestListEntry[]
  digest: string
  mediaType: string
}

export async function getManifest(
  name: string,
  reference: string,
  credentials: Credentials | null,
): Promise<ManifestResult> {
  const res = await fetch(`${REGISTRY_URL}/v2/${name}/manifests/${reference}`, {
    headers: {
      Accept: MANIFEST_ACCEPT_HEADERS,
      ...buildAuthHeader(credentials),
    },
    cache: "no-store",
  })

  if (!res.ok) {
    throw new Error(
      `Failed to get manifest for ${name}:${reference}: ${res.status}`,
    )
  }

  const digest = res.headers.get("Docker-Content-Digest") ?? reference
  const contentType = res.headers.get("Content-Type") ?? ""

  const data = (await res.json()) as Record<string, unknown>

  if (
    contentType.includes("manifest.list") ||
    contentType.includes("image.index") ||
    data.mediaType ===
      "application/vnd.docker.distribution.manifest.list.v2+json" ||
    data.mediaType === "application/vnd.oci.image.index.v1+json"
  ) {
    const manifestEntries = (
      data.manifests as Array<{
        mediaType: string
        size: number
        digest: string
        platform?: { architecture: string; os: string; variant?: string }
      }>
    ).map((m) => ({
      mediaType: m.mediaType,
      size: m.size,
      digest: m.digest,
      platform: m.platform ?? { architecture: "unknown", os: "unknown" },
    }))

    return {
      type: "manifestList",
      manifests: manifestEntries,
      digest,
      mediaType: (data.mediaType as string) ?? contentType,
    }
  }

  const layers = (
    (data.layers as Array<{
      mediaType: string
      size: number
      digest: string
    }>) ?? []
  ).map((l) => ({
    mediaType: l.mediaType,
    size: l.size,
    digest: l.digest,
  }))

  const config = data.config as
    | { mediaType: string; size: number; digest: string }
    | undefined

  const totalSize = layers.reduce((acc, l) => acc + l.size, 0)

  const manifest: ManifestDetail = {
    mediaType: (data.mediaType as string) ?? contentType,
    schemaVersion: (data.schemaVersion as number) ?? 2,
    digest,
    totalSize,
    layers,
    config: config
      ? {
          mediaType: config.mediaType,
          size: config.size,
          digest: config.digest,
        }
      : undefined,
  }

  if (config?.digest) {
    try {
      const configData = await fetchConfigBlob(name, config.digest, credentials)
      if (configData) {
        manifest.platform = {
          architecture: configData.architecture ?? "unknown",
          os: configData.os ?? "unknown",
          variant: configData.variant,
        }
        manifest.created = configData.created
      }
    } catch {
      /* config blob fetch is optional */
    }
  }

  return {
    type: "manifest",
    manifest,
    digest,
    mediaType: manifest.mediaType,
  }
}

interface ConfigBlobData {
  architecture?: string
  os?: string
  variant?: string
  created?: string
}

async function fetchConfigBlob(
  name: string,
  digest: string,
  credentials: Credentials | null,
): Promise<ConfigBlobData | null> {
  const res = await fetch(`${REGISTRY_URL}/v2/${name}/blobs/${digest}`, {
    headers: {
      ...buildAuthHeader(credentials),
    },
    cache: "no-store",
  })

  if (!res.ok) return null

  const data = (await res.json()) as ConfigBlobData
  return data
}
