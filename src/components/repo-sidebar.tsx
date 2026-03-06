"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

import {
  Box,
  ChevronRight,
  FolderClosed,
  FolderOpen,
  Search,
  Tag,
} from "lucide-react"

import { fetchRepositoriesAction, fetchTagsAction } from "~/app/actions"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible"
import { Input } from "~/components/ui/input"
import { ScrollArea } from "~/components/ui/scroll-area"
import { Skeleton } from "~/components/ui/skeleton"
import { cn } from "~/lib/utils"

interface RepoSidebarProps {
  selectedRepo: string | null
  selectedTag: string | null
  onSelectRepo: (repo: string) => void
  onSelectTag: (repo: string, tag: string) => void
}

interface NamespaceGroup {
  namespace: string
  images: { name: string; fullName: string }[]
}

function buildTree(repositories: string[]): NamespaceGroup[] {
  const map = new Map<string, { name: string; fullName: string }[]>()

  for (const repo of repositories) {
    const slashIndex = repo.indexOf("/")
    let namespace: string
    let imageName: string

    if (slashIndex === -1) {
      namespace = "_"
      imageName = repo
    } else {
      namespace = repo.substring(0, slashIndex)
      imageName = repo.substring(slashIndex + 1)
    }

    if (!map.has(namespace)) {
      map.set(namespace, [])
    }
    map.get(namespace)!.push({ name: imageName, fullName: repo })
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => {
      // Put "_" first
      if (a === "_") return -1
      if (b === "_") return 1
      return a.localeCompare(b)
    })
    .map(([namespace, images]) => ({
      namespace,
      images: images.sort((a, b) => a.name.localeCompare(b.name)),
    }))
}

function ImageTags({
  fullName,
  selectedRepo,
  selectedTag,
  onSelectTag,
}: {
  fullName: string
  selectedRepo: string | null
  selectedTag: string | null
  onSelectTag: (repo: string, tag: string) => void
}) {
  const [tags, setTags] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)

  const loadTags = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetchTagsAction(fullName)
      setTags(result.tags)
      setLoaded(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tags")
    } finally {
      setLoading(false)
    }
  }, [fullName])

  useEffect(() => {
    if (!loaded) {
      void loadTags()
    }
  }, [loaded, loadTags])

  if (loading) {
    return (
      <div className="space-y-1 py-1 pr-2 pl-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-5 w-full" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="py-1 pr-2 pl-4">
        <p className="text-destructive text-xs">{error}</p>
        <button
          onClick={() => {
            setLoaded(false)
          }}
          className="text-primary text-xs underline underline-offset-2 hover:no-underline"
        >
          Retry
        </button>
      </div>
    )
  }

  if (tags.length === 0) {
    return (
      <div className="py-1 pr-2 pl-4">
        <p className="text-muted-foreground text-xs">No tags found</p>
      </div>
    )
  }

  return (
    <div className="space-y-0.5 py-0.5 pr-2 pl-4">
      {tags.map((tag) => (
        <button
          key={tag}
          onClick={() => onSelectTag(fullName, tag)}
          className={cn(
            "hover:bg-accent flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-left text-xs transition-colors",
            selectedRepo === fullName &&
              selectedTag === tag &&
              "bg-primary/10 text-primary font-medium",
          )}
        >
          <Tag className="text-muted-foreground h-3 w-3 shrink-0" />
          <span className="truncate">{tag}</span>
        </button>
      ))}
    </div>
  )
}

function ImageItem({
  image,
  selectedRepo,
  selectedTag,
  expandedImages,
  onToggleImage,
  onSelectRepo,
  onSelectTag,
}: {
  image: { name: string; fullName: string }
  selectedRepo: string | null
  selectedTag: string | null
  expandedImages: Set<string>
  onToggleImage: (fullName: string) => void
  onSelectRepo: (repo: string) => void
  onSelectTag: (repo: string, tag: string) => void
}) {
  const isExpanded = expandedImages.has(image.fullName)
  const isSelected = selectedRepo === image.fullName

  const handleImageClick = () => {
    onSelectRepo(image.fullName)
    if (!isExpanded) {
      onToggleImage(image.fullName)
    }
  }

  return (
    <Collapsible
      open={isExpanded}
      onOpenChange={() => onToggleImage(image.fullName)}
    >
      <div
        className={cn(
          "hover:bg-accent flex w-full items-center rounded-md transition-colors",
          isSelected && "bg-accent text-accent-foreground",
        )}
      >
        <CollapsibleTrigger asChild>
          <button
            className="flex shrink-0 items-center justify-center p-1.5"
            aria-label={
              isExpanded ? `Collapse ${image.name}` : `Expand ${image.name}`
            }
          >
            <ChevronRight
              className={cn(
                "text-muted-foreground h-3 w-3 transition-transform duration-200",
                isExpanded && "rotate-90",
              )}
            />
          </button>
        </CollapsibleTrigger>
        <button
          onClick={handleImageClick}
          className={cn(
            "flex min-w-0 flex-1 items-center gap-1.5 py-1.5 pr-2 text-left text-xs",
            isSelected && "font-medium",
          )}
        >
          <Box className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{image.name}</span>
        </button>
      </div>
      <CollapsibleContent>
        <ImageTags
          fullName={image.fullName}
          selectedRepo={selectedRepo}
          selectedTag={selectedTag}
          onSelectTag={onSelectTag}
        />
      </CollapsibleContent>
    </Collapsible>
  )
}

function NamespaceItem({
  group,
  selectedRepo,
  selectedTag,
  expandedNamespaces,
  expandedImages,
  onToggleNamespace,
  onToggleImage,
  onSelectRepo,
  onSelectTag,
}: {
  group: NamespaceGroup
  selectedRepo: string | null
  selectedTag: string | null
  expandedNamespaces: Set<string>
  expandedImages: Set<string>
  onToggleNamespace: (ns: string) => void
  onToggleImage: (fullName: string) => void
  onSelectRepo: (repo: string) => void
  onSelectTag: (repo: string, tag: string) => void
}) {
  const isExpanded = expandedNamespaces.has(group.namespace)

  return (
    <Collapsible
      open={isExpanded}
      onOpenChange={() => onToggleNamespace(group.namespace)}
    >
      <CollapsibleTrigger asChild>
        <button
          className={cn(
            "hover:bg-accent flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors",
          )}
        >
          <ChevronRight
            className={cn(
              "text-muted-foreground h-3.5 w-3.5 shrink-0 transition-transform duration-200",
              isExpanded && "rotate-90",
            )}
          />
          {isExpanded ? (
            <FolderOpen className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
          ) : (
            <FolderClosed className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
          )}
          <span className="truncate font-medium">
            {group.namespace === "_" ? "(no namespace)" : group.namespace}
          </span>
          <span className="text-muted-foreground ml-auto text-xs">
            {group.images.length}
          </span>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="pl-4">
          {group.images.map((image) => (
            <ImageItem
              key={image.fullName}
              image={image}
              selectedRepo={selectedRepo}
              selectedTag={selectedTag}
              expandedImages={expandedImages}
              onToggleImage={onToggleImage}
              onSelectRepo={onSelectRepo}
              onSelectTag={onSelectTag}
            />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

export function RepoSidebar({
  selectedRepo,
  selectedTag,
  onSelectRepo,
  onSelectTag,
}: RepoSidebarProps) {
  const [repositories, setRepositories] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [expandedNamespaces, setExpandedNamespaces] = useState<Set<string>>(
    new Set(),
  )
  const [expandedImages, setExpandedImages] = useState<Set<string>>(new Set())

  const loadRepositories = useCallback(async () => {
    try {
      setLoading(true)
      const allRepos: string[] = []
      let last: string | undefined

      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      while (true) {
        const result = await fetchRepositoriesAction(last)
        allRepos.push(...result.repositories)
        if (!result.hasMore) break
        last = result.last
      }

      setRepositories(allRepos)
      setError(null)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load repositories",
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadRepositories()
  }, [loadRepositories])

  const toggleNamespace = (ns: string) => {
    setExpandedNamespaces((prev) => {
      const next = new Set(prev)
      if (next.has(ns)) {
        next.delete(ns)
      } else {
        next.add(ns)
      }
      return next
    })
  }

  const toggleImage = (fullName: string) => {
    setExpandedImages((prev) => {
      const next = new Set(prev)
      if (next.has(fullName)) {
        next.delete(fullName)
      } else {
        next.add(fullName)
      }
      return next
    })
  }

  const tree = useMemo(() => buildTree(repositories), [repositories])

  const filteredTree = useMemo(() => {
    if (!searchQuery) return tree

    const query = searchQuery.toLowerCase()
    return tree
      .map((group) => ({
        ...group,
        images: group.images.filter(
          (img) =>
            img.fullName.toLowerCase().includes(query) ||
            img.name.toLowerCase().includes(query) ||
            group.namespace.toLowerCase().includes(query),
        ),
      }))
      .filter((group) => group.images.length > 0)
  }, [tree, searchQuery])

  // Auto-expand namespaces that have search matches
  const displayTree = filteredTree
  const autoExpandedNamespaces = useMemo(() => {
    if (!searchQuery) return expandedNamespaces
    const all = new Set(expandedNamespaces)
    for (const group of filteredTree) {
      all.add(group.namespace)
    }
    return all
  }, [searchQuery, filteredTree, expandedNamespaces])

  const totalImages = repositories.length
  const totalNamespaces = tree.length

  if (loading) {
    return (
      <div className="flex h-full flex-col gap-3 p-3">
        <Skeleton className="h-9 w-full" />
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center">
        <p className="text-destructive text-sm">{error}</p>
        <button
          onClick={() => void loadRepositories()}
          className="text-primary text-sm underline underline-offset-2 hover:no-underline"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <div className="p-3 pb-2">
        <div className="relative">
          <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
          <Input
            placeholder="Search images..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="px-2 pb-2">
          {displayTree.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
              <Box className="text-muted-foreground h-8 w-8" />
              <p className="text-muted-foreground text-sm">
                {searchQuery ? "No matching images" : "No repositories found"}
              </p>
            </div>
          ) : (
            <>
              {displayTree.map((group) => (
                <NamespaceItem
                  key={group.namespace}
                  group={group}
                  selectedRepo={selectedRepo}
                  selectedTag={selectedTag}
                  expandedNamespaces={autoExpandedNamespaces}
                  expandedImages={expandedImages}
                  onToggleNamespace={toggleNamespace}
                  onToggleImage={toggleImage}
                  onSelectRepo={onSelectRepo}
                  onSelectTag={onSelectTag}
                />
              ))}
            </>
          )}
        </div>
      </ScrollArea>
      <div className="border-border border-t px-3 py-2">
        <p className="text-muted-foreground text-xs">
          {totalImages} image{totalImages === 1 ? "" : "s"} across{" "}
          {totalNamespaces} repositor{totalNamespaces === 1 ? "y" : "ies"}
        </p>
      </div>
    </div>
  )
}
