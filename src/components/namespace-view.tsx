"use client"

import { useMemo, useState } from "react"
import { useEffect } from "react"

import Link from "next/link"

import { Box, ChevronRight, FolderOpen, Search } from "lucide-react"

import { fetchAllRepositoriesAction } from "~/app/actions"
import { GridIcon, ListIcon } from "~/components/icons"
import { RetryButton } from "~/components/retry-button"
import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import { Skeleton } from "~/components/ui/skeleton"
import { useAsyncData } from "~/hooks/use-async-data"
import { imageUrl } from "~/lib/urls"
import { cn } from "~/lib/utils"

const VIEW_MODE_KEY = "crui:namespace-view-mode"

interface NamespaceViewProps {
  namespace: string
}

export function NamespaceView({ namespace }: NamespaceViewProps) {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    const stored = localStorage.getItem(VIEW_MODE_KEY)
    if (stored === "list") setViewMode("list")
  }, [])

  const toggleView = () => {
    const nextView = viewMode === "grid" ? "list" : "grid"
    setViewMode(nextView)
    localStorage.setItem(VIEW_MODE_KEY, nextView)
  }

  const {
    data: images,
    loading,
    error,
    reload,
  } = useAsyncData(
    async () => {
      const allRepos = await fetchAllRepositoriesAction()
      const prefix = `${namespace}/`
      return allRepos
        .filter((repo) => repo.startsWith(prefix))
        .map((repo) => repo.substring(prefix.length))
        .sort((a, b) => a.localeCompare(b))
    },
    [],
    "Failed to load images",
    [namespace],
  )

  const filteredImages = useMemo(() => {
    if (!searchQuery) return images
    const query = searchQuery.toLowerCase()
    return images.filter((image) => image.toLowerCase().includes(query))
  }, [images, searchQuery])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-5 w-32" />
        </div>
        <Skeleton className="h-9 w-full" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
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

  if (images.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
        <div className="bg-muted flex h-16 w-16 items-center justify-center rounded-full">
          <FolderOpen className="text-muted-foreground h-8 w-8" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">No Images Found</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            No images found under the{" "}
            <span className="font-mono">{namespace}</span> namespace
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <FolderOpen className="text-muted-foreground h-5 w-5" />
        <h2 className="text-lg font-semibold">{namespace}</h2>
        <span className="text-muted-foreground shrink-0 text-sm">
          {searchQuery
            ? `${filteredImages.length} of ${images.length} image${images.length === 1 ? "" : "s"}`
            : `${images.length} image${images.length === 1 ? "" : "s"}`}
        </span>
        <div className="relative ml-auto w-full max-w-xs">
          <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
          <Input
            placeholder="Filter images..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="group shrink-0 gap-1"
          onClick={toggleView}
        >
          <span className="relative flex h-4 w-4 items-center justify-center">
            <span
              className={cn(
                "absolute inset-0 flex items-center justify-center",
                {
                  invisible: viewMode !== "grid",
                },
              )}
            >
              <GridIcon />
            </span>
            <span
              className={cn(
                "absolute inset-0 flex items-center justify-center",
                {
                  invisible: viewMode !== "list",
                },
              )}
            >
              <ListIcon />
            </span>
          </span>
          <span className="w-14">
            {viewMode === "grid" ? "Grid View" : "List View"}
          </span>
        </Button>
      </div>

      {filteredImages.length === 0 ? (
        <p className="text-muted-foreground py-8 text-center text-sm">
          No images matching &ldquo;{searchQuery}&rdquo;
        </p>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredImages.map((image) => (
            <Link
              key={image}
              href={imageUrl(`${namespace}/${image}`)}
              className="border-border hover:bg-accent hover:border-accent flex items-center gap-3 rounded-lg border p-4 transition-colors"
            >
              <Box className="text-primary h-5 w-5 shrink-0" />
              <span className="truncate text-sm font-medium">{image}</span>
            </Link>
          ))}
        </div>
      ) : (
        <div className="border-border divide-border divide-y rounded-lg border">
          {filteredImages.map((image) => (
            <Link
              key={image}
              href={imageUrl(`${namespace}/${image}`)}
              className="hover:bg-accent flex items-center gap-3 px-4 py-3 transition-colors"
            >
              <Box className="text-primary h-4 w-4 shrink-0" />
              <span className="truncate text-sm font-medium">{image}</span>
              <ChevronRight className="text-muted-foreground ml-auto h-4 w-4 shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
