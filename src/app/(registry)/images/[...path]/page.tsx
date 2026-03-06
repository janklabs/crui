import { ManifestDetail } from "~/components/manifest-detail"
import { NamespaceView } from "~/components/namespace-view"
import { TagList } from "~/components/tag-list"
import { ScrollArea } from "~/components/ui/scroll-area"
import { Separator } from "~/components/ui/separator"
import { parsePath } from "~/lib/urls"

export default async function ImagePage({
  params,
}: {
  params: Promise<{ path: string[] }>
}) {
  const { path } = await params
  const parsed = parsePath(path)

  if (parsed.type === "namespace") {
    return (
      <ScrollArea className="h-full">
        <div className="p-4 md:p-6">
          <NamespaceView namespace={parsed.namespace} />
        </div>
      </ScrollArea>
    )
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-6 p-4 md:p-6">
        <TagList repoName={parsed.repo} selectedTag={parsed.tag} />
        {parsed.tag && (
          <>
            <Separator />
            <ManifestDetail repoName={parsed.repo} tag={parsed.tag} />
          </>
        )}
      </div>
    </ScrollArea>
  )
}
