export function imageUrl(repo: string, tag?: string): string {
  const slashIndex = repo.indexOf("/")
  const prefix = slashIndex === -1 ? `_/${repo}` : repo
  if (tag) return `/images/${encodeURI(prefix)}/tags/${encodeURI(tag)}`
  return `/images/${encodeURI(prefix)}`
}

export function namespaceUrl(namespace: string): string {
  return `/images/${encodeURI(namespace)}`
}

export type ParsedPath =
  | { type: "namespace"; namespace: string }
  | { type: "image"; repo: string; tag: string | null }

export function parsePath(path: string[]): ParsedPath {
  // 1 segment: namespace view (e.g., /images/library)
  if (path.length === 1) {
    return { type: "namespace", namespace: path[0]! }
  }

  // 2+ segments: determine image name
  let repo: string
  let rest: string[]

  if (path[0] === "_") {
    // /images/_/myapp/... → no-namespace image
    repo = path[1]!
    rest = path.slice(2)
  } else {
    // /images/library/nginx/... → namespaced image
    repo = `${path[0]}/${path[1]}`
    rest = path.slice(2)
  }

  // Check for /tags/<tag>
  if (rest.length >= 2 && rest[0] === "tags") {
    return { type: "image", repo, tag: rest.slice(1).join("/") }
  }

  return { type: "image", repo, tag: null }
}

export function parsePathname(pathname: string): {
  repo: string | null
  tag: string | null
} {
  const match = pathname.match(/^\/images\/(.+)/)
  if (!match) return { repo: null, tag: null }

  const segments = match[1]!.split("/")
  const parsed = parsePath(segments)

  if (parsed.type === "namespace") {
    return { repo: null, tag: null }
  }

  return { repo: parsed.repo, tag: parsed.tag }
}
