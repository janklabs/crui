"use client"

import { Box, LogOut } from "lucide-react"

import { Button } from "~/components/ui/button"
import { Separator } from "~/components/ui/separator"

import { GitHubIcon } from "./icons"
import { ThemeToggle } from "./theme-toggle"

interface HeaderProps {
  registryUrl: string
  isAuthenticated: boolean
  onLogout?: () => void
}

export function Header({
  registryUrl,
  isAuthenticated,
  onLogout,
}: HeaderProps) {
  return (
    <header className="border-border flex h-14 shrink-0 items-center justify-between border-b px-4">
      <div className="flex items-center gap-3">
        <Box className="text-primary h-5 w-5" />
        <h1 className="text-lg font-semibold">CRUI</h1>
        <Separator orientation="vertical" className="h-6" />
        <span className="text-muted-foreground hidden text-sm sm:inline">
          {registryUrl}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground text-xs">
          v{process.env.NEXT_PUBLIC_APP_VERSION}
        </span>
        <Button variant="ghost" size="icon" className="group" asChild>
          <a
            href="https://github.com/guneet-xyz/crui"
            target="_blank"
            rel="noopener noreferrer"
          >
            <GitHubIcon />
            <span className="sr-only">GitHub</span>
          </a>
        </Button>
        <ThemeToggle />
        {isAuthenticated && onLogout && (
          <Button variant="ghost" size="icon" onClick={onLogout}>
            <LogOut className="h-4 w-4" />
            <span className="sr-only">Logout</span>
          </Button>
        )}
      </div>
    </header>
  )
}
