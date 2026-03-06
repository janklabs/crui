import {
  PiGithubLogo,
  PiGithubLogoDuotone,
  PiGridFour,
  PiGridFourDuotone,
  PiList,
  PiListDuotone,
  PiMoon,
  PiMoonDuotone,
  PiSun,
  PiSunDuotone,
} from "react-icons/pi"

import { cn } from "@/lib/utils"

function DynamicIcon({
  className,
  noHover,
  hover,
}: {
  className?: string
  noHover: React.ReactNode
  hover: React.ReactNode
}) {
  return (
    <div className={cn("relative", className)}>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-100 transition-opacity group-hover:opacity-0">
        {noHover}
      </div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100">
        {hover}
      </div>
    </div>
  )
}

export function GitHubIcon() {
  return (
    <DynamicIcon noHover={<PiGithubLogo />} hover={<PiGithubLogoDuotone />} />
  )
}

export function ThemeIcon({ theme }: { theme: string | undefined }) {
  if (theme === "dark") {
    return <DynamicIcon noHover={<PiMoon />} hover={<PiMoonDuotone />} />
  }
  return <DynamicIcon noHover={<PiSun />} hover={<PiSunDuotone />} />
}

export function GridIcon() {
  return <DynamicIcon noHover={<PiGridFour />} hover={<PiGridFourDuotone />} />
}

export function ListIcon() {
  return <DynamicIcon noHover={<PiList />} hover={<PiListDuotone />} />
}
