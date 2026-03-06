import { cn } from "@/lib/utils"

interface RetryButtonProps {
  onClick: () => void
  className?: string
}

export function RetryButton({ onClick, className }: RetryButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "text-primary text-sm underline underline-offset-2 hover:no-underline",
        className,
      )}
    >
      Retry
    </button>
  )
}
