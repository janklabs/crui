"use client"

import { useState } from "react"

import { Menu } from "lucide-react"

import { RepoSidebar } from "@/components/repo-sidebar"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

export function MobileSidebar() {
  const [open, setOpen] = useState(false)

  return (
    <div className="fixed bottom-4 left-4 z-40 md:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button size="icon" className="h-12 w-12 rounded-full shadow-lg">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Open repositories</span>
          </Button>
        </SheetTrigger>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Repositories</SheetTitle>
            <SheetDescription>Select a repository to browse</SheetDescription>
          </SheetHeader>
          <div className="mt-4 h-[calc(100vh-8rem)]">
            <RepoSidebar onNavigate={() => setOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
