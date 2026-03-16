"use client"

import { useRouter } from "next/navigation"

import { Box, LogOut } from "lucide-react"

import { logoutAction } from "@/app/actions"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { GitHubIcon } from "./icons"
import { ThemeToggle } from "./theme-toggle"

interface HeaderProps {
  registryUrl: string
  isAuthenticated: boolean
}

export function Header({ registryUrl, isAuthenticated }: HeaderProps) {
  const router = useRouter()

  const handleLogout = async () => {
    await logoutAction()
    router.refresh()
  }

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
        <TooltipProvider delayDuration={0}>
          <span className="text-muted-foreground text-xs">
            v{process.env.NEXT_PUBLIC_APP_VERSION}
          </span>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="group" asChild>
                <a
                  href="https://github.com/janklabs/crui"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <GitHubIcon />
                  <span className="sr-only">GitHub</span>
                </a>
              </Button>
            </TooltipTrigger>
            <TooltipContent>GitHub</TooltipContent>
          </Tooltip>
          <ThemeToggle />
          {isAuthenticated && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => void handleLogout()}
                >
                  <LogOut className="h-4 w-4" />
                  <span className="sr-only">Logout</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Logout</TooltipContent>
            </Tooltip>
          )}
        </TooltipProvider>
      </div>
    </header>
  )
}
