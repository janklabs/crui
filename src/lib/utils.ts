import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getErrorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback
}

const BYTES_UNITS = ["B", "KB", "MB", "GB", "TB"]
const BYTES_BASE = 1024

export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return "0 B"

  const dm = Math.max(0, decimals)
  const i = Math.floor(Math.log(bytes) / Math.log(BYTES_BASE))

  return `${parseFloat((bytes / Math.pow(BYTES_BASE, i)).toFixed(dm))} ${BYTES_UNITS[i]}`
}

const DIGEST_HASH_LENGTH = 12
const DIGEST_FALLBACK_LENGTH = 19

export function shortenDigest(digest: string): string {
  if (!digest) return ""
  const parts = digest.split(":")
  if (parts.length === 2) {
    return `${parts[0]}:${parts[1]!.substring(0, DIGEST_HASH_LENGTH)}`
  }
  return digest.substring(0, DIGEST_FALLBACK_LENGTH)
}

const DAYS_PER_MONTH = 30
const DAYS_PER_YEAR = 365

export function getRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)
  const diffMonths = Math.floor(diffDays / DAYS_PER_MONTH)
  const diffYears = Math.floor(diffDays / DAYS_PER_YEAR)

  if (diffYears > 0) return `${diffYears}y ago`
  if (diffMonths > 0) return `${diffMonths}mo ago`
  if (diffDays > 0) return `${diffDays}d ago`
  if (diffHours > 0) return `${diffHours}h ago`
  if (diffMins > 0) return `${diffMins}m ago`
  return "just now"
}
