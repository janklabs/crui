"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

import { useRouter } from "next/navigation"

import { Search, Tag } from "lucide-react"

import { fetchTagsAction } from "~/app/actions"
import { Badge } from "~/components/ui/badge"
import { Input } from "~/components/ui/input"
import { Skeleton } from "~/components/ui/skeleton"
import { imageUrl } from "~/lib/urls"
import { cn } from "~/lib/utils"

interface TagListProps {
  repoName: string
  selectedTag: string | null
}

export function TagList({ repoName, selectedTag }: TagListProps) {
  const router = useRouter()
  const [tags, setTags] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  const loadTags = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetchTagsAction(repoName)
      setTags(result.tags)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tags")
    } finally {
      setLoading(false)
    }
  }, [repoName])

  useEffect(() => {
    void loadTags()
  }, [loadTags])

  const filteredTags = useMemo(() => {
    if (!searchQuery) return tags
    const query = searchQuery.toLowerCase()
    return tags.filter((tag) => tag.toLowerCase().includes(query))
  }, [tags, searchQuery])

  if (loading) {
    return (
      <div className="space-y-3">
        <h3 className="text-muted-foreground flex items-center gap-2 text-sm font-medium">
          <Tag className="h-4 w-4" />
          Tags
        </h3>
        <Skeleton className="h-9 w-full" />
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-7 w-20" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-2">
        <h3 className="text-muted-foreground flex items-center gap-2 text-sm font-medium">
          <Tag className="h-4 w-4" />
          Tags
        </h3>
        <p className="text-destructive text-sm">{error}</p>
        <button
          onClick={() => void loadTags()}
          className="text-primary text-sm underline underline-offset-2 hover:no-underline"
        >
          Retry
        </button>
      </div>
    )
  }

  if (tags.length === 0) {
    return (
      <div className="space-y-2">
        <h3 className="text-muted-foreground flex items-center gap-2 text-sm font-medium">
          <Tag className="h-4 w-4" />
          Tags
        </h3>
        <p className="text-muted-foreground text-sm">No tags found</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <h3 className="text-muted-foreground flex items-center gap-2 text-sm font-medium">
        <Tag className="h-4 w-4" />
        Tags
        <Badge variant="secondary" className="ml-1">
          {searchQuery
            ? `${filteredTags.length} / ${tags.length}`
            : tags.length}
        </Badge>
      </h3>
      <div className="relative">
        <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
        <Input
          placeholder="Filter tags..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>
      {filteredTags.length === 0 ? (
        <p className="text-muted-foreground py-4 text-center text-sm">
          No tags matching &ldquo;{searchQuery}&rdquo;
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {filteredTags.map((tag) => (
            <button
              key={tag}
              onClick={() => router.push(imageUrl(repoName, tag))}
              className={cn(
                "hover:bg-accent inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                selectedTag === tag
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-foreground",
              )}
            >
              {tag}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
