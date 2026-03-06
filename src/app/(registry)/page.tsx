import { Box } from "lucide-react"

import { ScrollArea } from "@/components/ui/scroll-area"

export default function RegistryHome() {
  return (
    <ScrollArea className="h-full">
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-4 text-center md:p-6">
        <div className="bg-muted flex h-16 w-16 items-center justify-center rounded-full">
          <Box className="text-muted-foreground h-8 w-8" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Select a Repository</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Choose a repository from the sidebar to view its tags and manifests
          </p>
        </div>
      </div>
    </ScrollArea>
  )
}
