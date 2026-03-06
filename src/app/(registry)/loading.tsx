import { Box, Loader2 } from "lucide-react"

import { Separator } from "@/components/ui/separator"

export default function Loading() {
  return (
    <div className="flex h-screen flex-col">
      <header className="border-border flex h-14 shrink-0 items-center justify-between border-b px-4">
        <div className="flex items-center gap-3">
          <Box className="text-primary h-5 w-5" />
          <h1 className="text-lg font-semibold">CRUI</h1>
          <Separator orientation="vertical" className="h-6" />
          <div className="bg-muted hidden h-4 w-40 animate-pulse rounded sm:block" />
        </div>
      </header>
      <div className="flex flex-1 flex-col items-center justify-center gap-4">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
        <p className="text-muted-foreground text-sm">
          Connecting to registry...
        </p>
      </div>
    </div>
  )
}
