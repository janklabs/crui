"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import {
  Check,
  ClipboardCopy,
  Cpu,
  HardDrive,
  Layers,
  Loader2,
} from "lucide-react"

import { fetchManifestAction } from "~/app/actions"
import { RetryButton } from "~/components/retry-button"
import { Badge } from "~/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card"
import { Separator } from "~/components/ui/separator"
import { Skeleton } from "~/components/ui/skeleton"
import { useAsyncData } from "~/hooks/use-async-data"
import type { ManifestResult } from "~/lib/registry"
import { cn, formatBytes, getRelativeTime, shortenDigest } from "~/lib/utils"

interface ManifestDetailProps {
  repoName: string
  tag: string
}

const COPY_FEEDBACK_MS = 2000

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      timeoutRef.current = setTimeout(() => setCopied(false), COPY_FEEDBACK_MS)
    } catch {
      /* clipboard access denied */
    }
  }

  return (
    <button
      onClick={() => void handleCopy()}
      className="text-muted-foreground hover:bg-accent hover:text-foreground inline-flex items-center gap-1 rounded-md p-1 transition-colors"
      title="Copy to clipboard"
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-green-500" />
      ) : (
        <ClipboardCopy className="h-3.5 w-3.5" />
      )}
    </button>
  )
}

export function ManifestDetail({ repoName, tag }: ManifestDetailProps) {
  const [selectedPlatformDigest, setSelectedPlatformDigest] = useState<
    string | null
  >(null)
  const [platformManifest, setPlatformManifest] =
    useState<ManifestResult | null>(null)
  const [platformLoading, setPlatformLoading] = useState(false)

  const {
    data: result,
    loading,
    error,
    reload,
  } = useAsyncData(
    async () => {
      setSelectedPlatformDigest(null)
      setPlatformManifest(null)
      return fetchManifestAction(repoName, tag)
    },
    null as ManifestResult | null,
    "Failed to load manifest",
    [repoName, tag],
  )

  const loadPlatformManifest = useCallback(
    async (digest: string) => {
      setSelectedPlatformDigest(digest)
      setPlatformLoading(true)
      try {
        const data = await fetchManifestAction(repoName, digest)
        setPlatformManifest(data)
      } catch {
        setPlatformManifest(null)
      } finally {
        setPlatformLoading(false)
      }
    },
    [repoName],
  )

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-60 w-full" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
        <p className="text-destructive text-sm">{error}</p>
        <RetryButton onClick={reload} />
      </div>
    )
  }

  if (!result) return null

  if (result.type === "manifestList" && result.manifests) {
    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold">
            {repoName}:{tag}
          </h3>
          <div className="mt-1 flex items-center gap-2">
            <Badge variant="outline">Multi-arch</Badge>
            <span className="text-muted-foreground font-mono text-xs">
              {shortenDigest(result.digest)}
            </span>
            <CopyButton text={result.digest} />
          </div>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Cpu className="h-4 w-4" />
              Platforms
            </CardTitle>
            <CardDescription>
              {result.manifests.length} platform variants available
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {result.manifests.map((entry) => (
                <button
                  key={entry.digest}
                  onClick={() => void loadPlatformManifest(entry.digest)}
                  className={cn(
                    "hover:bg-accent flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition-colors",
                    {
                      "border-primary bg-primary/5":
                        selectedPlatformDigest === entry.digest,
                      "border-border": selectedPlatformDigest !== entry.digest,
                    },
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Cpu className="text-muted-foreground h-4 w-4" />
                    <span className="font-medium">
                      {entry.platform.os}/{entry.platform.architecture}
                      {entry.platform.variant
                        ? `/${entry.platform.variant}`
                        : ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground text-xs">
                      {formatBytes(entry.size)}
                    </span>
                    <span className="text-muted-foreground font-mono text-xs">
                      {shortenDigest(entry.digest)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {selectedPlatformDigest && (
          <>
            <Separator />
            {platformLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
              </div>
            ) : platformManifest?.manifest ? (
              <SingleManifestCard
                manifest={platformManifest.manifest}
                digest={platformManifest.digest}
                repoName={repoName}
              />
            ) : null}
          </>
        )}
      </div>
    )
  }

  if (result.type === "manifest" && result.manifest) {
    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold">
            {repoName}:{tag}
          </h3>
          <div className="mt-1 flex items-center gap-2">
            <Badge variant="outline">Single</Badge>
            <span className="text-muted-foreground font-mono text-xs">
              {shortenDigest(result.digest)}
            </span>
            <CopyButton text={result.digest} />
          </div>
        </div>
        <SingleManifestCard
          manifest={result.manifest}
          digest={result.digest}
          repoName={repoName}
        />
      </div>
    )
  }

  return null
}

function SingleManifestCard({
  manifest,
  digest,
  repoName,
}: {
  manifest: NonNullable<ManifestResult["manifest"]>
  digest: string
  repoName: string
}) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <HardDrive className="h-4 w-4" />
            Manifest Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Digest</dt>
              <dd className="flex items-center gap-1 font-mono text-xs">
                {shortenDigest(digest)}
                <CopyButton text={digest} />
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Media Type</dt>
              <dd className="font-mono text-xs">{manifest.mediaType}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Total Size</dt>
              <dd className="font-semibold">
                {formatBytes(manifest.totalSize)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Schema Version</dt>
              <dd>{manifest.schemaVersion}</dd>
            </div>
            {manifest.platform && (
              <div>
                <dt className="text-muted-foreground">Platform</dt>
                <dd>
                  {manifest.platform.os}/{manifest.platform.architecture}
                  {manifest.platform.variant
                    ? `/${manifest.platform.variant}`
                    : ""}
                </dd>
              </div>
            )}
            {manifest.created && (
              <div>
                <dt className="text-muted-foreground">Created</dt>
                <dd title={manifest.created}>
                  {getRelativeTime(new Date(manifest.created))}
                </dd>
              </div>
            )}
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">Pull Command</dt>
              <dd className="flex items-center gap-1">
                <code className="bg-muted rounded px-2 py-1 font-mono text-xs">
                  docker pull {repoName}@{shortenDigest(digest)}
                </code>
                <CopyButton text={`docker pull ${repoName}@${digest}`} />
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {manifest.layers.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Layers className="h-4 w-4" />
              Layers
              <Badge variant="secondary" className="ml-1">
                {manifest.layers.length}
              </Badge>
            </CardTitle>
            <CardDescription>
              {formatBytes(manifest.totalSize)} total
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {manifest.layers.map((layer, i) => {
                const pct =
                  manifest.totalSize > 0
                    ? (layer.size / manifest.totalSize) * 100
                    : 0
                return (
                  <div
                    key={layer.digest}
                    className="border-border rounded-md border p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <span className="text-muted-foreground shrink-0 text-xs">
                          #{i + 1}
                        </span>
                        <span className="truncate font-mono text-xs">
                          {shortenDigest(layer.digest)}
                        </span>
                        <CopyButton text={layer.digest} />
                      </div>
                      <span className="shrink-0 text-xs font-medium">
                        {formatBytes(layer.size)}
                      </span>
                    </div>
                    <div className="bg-muted mt-2 h-1.5 w-full rounded-full">
                      <div
                        className="bg-primary/60 h-1.5 rounded-full"
                        style={{ width: `${Math.max(pct, 1)}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {manifest.config && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Config</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Media Type</dt>
                <dd className="font-mono text-xs">
                  {manifest.config.mediaType}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Size</dt>
                <dd>{formatBytes(manifest.config.size)}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-muted-foreground">Digest</dt>
                <dd className="flex items-center gap-1 font-mono text-xs">
                  {shortenDigest(manifest.config.digest)}
                  <CopyButton text={manifest.config.digest} />
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
