import { describe, expect, it } from "vitest"

import { imageUrl, namespaceUrl, parsePath, parsePathname } from "./urls"

describe("imageUrl", () => {
  it("wraps simple repo name with _/", () => {
    expect(imageUrl("nginx")).toBe("/images/_/nginx")
  })

  it("preserves namespaced repo", () => {
    expect(imageUrl("library/nginx")).toBe("/images/library/nginx")
  })

  it("appends tag segment without tag", () => {
    expect(imageUrl("nginx", "latest")).toBe("/images/_/nginx/tags/latest")
  })

  it("encodes special chars in repo", () => {
    expect(imageUrl("my app")).toBe("/images/_/my%20app")
  })

  it("encodes special chars in tag", () => {
    expect(imageUrl("nginx", "v1 beta")).toBe("/images/_/nginx/tags/v1%20beta")
  })

  it("handles namespaced repo with tag", () => {
    expect(imageUrl("library/nginx", "1.21")).toBe(
      "/images/library/nginx/tags/1.21",
    )
  })

  it("handles empty string repo", () => {
    expect(imageUrl("")).toBe("/images/_/")
  })
})

describe("namespaceUrl", () => {
  it("builds namespace URL", () => {
    expect(namespaceUrl("library")).toBe("/images/library")
  })

  it("encodes special chars in namespace", () => {
    expect(namespaceUrl("my namespace")).toBe("/images/my%20namespace")
  })

  it("handles empty namespace", () => {
    expect(namespaceUrl("")).toBe("/images/")
  })
})

describe("parsePath", () => {
  it("single segment → namespace", () => {
    expect(parsePath(["library"])).toEqual({
      type: "namespace",
      namespace: "library",
    })
  })

  it("_/repo → no-namespace image without tag", () => {
    expect(parsePath(["_", "nginx"])).toEqual({
      type: "image",
      repo: "nginx",
      tag: null,
    })
  })

  it("_/repo/tags/latest → image with tag", () => {
    expect(parsePath(["_", "nginx", "tags", "latest"])).toEqual({
      type: "image",
      repo: "nginx",
      tag: "latest",
    })
  })

  it("ns/repo → namespaced image without tag", () => {
    expect(parsePath(["library", "nginx"])).toEqual({
      type: "image",
      repo: "library/nginx",
      tag: null,
    })
  })

  it("ns/repo/tags/v1 → namespaced image with tag", () => {
    expect(parsePath(["library", "nginx", "tags", "v1"])).toEqual({
      type: "image",
      repo: "library/nginx",
      tag: "v1",
    })
  })

  it("handles multi-part tags with slashes", () => {
    expect(parsePath(["library", "nginx", "tags", "v1", "beta"])).toEqual({
      type: "image",
      repo: "library/nginx",
      tag: "v1/beta",
    })
  })

  it("_/repo/extra → image without tag (no tags segment)", () => {
    expect(parsePath(["_", "nginx", "extra"])).toEqual({
      type: "image",
      repo: "nginx",
      tag: null,
    })
  })
})

describe("parsePathname", () => {
  it("returns nulls for non-images path", () => {
    expect(parsePathname("/")).toEqual({ repo: null, tag: null })
  })

  it("returns nulls for other paths", () => {
    expect(parsePathname("/api/something")).toEqual({ repo: null, tag: null })
  })

  it("namespace segment → nulls (namespace not image)", () => {
    expect(parsePathname("/images/library")).toEqual({ repo: null, tag: null })
  })

  it("parses no-namespace image path", () => {
    expect(parsePathname("/images/_/nginx")).toEqual({
      repo: "nginx",
      tag: null,
    })
  })

  it("parses namespaced image path", () => {
    expect(parsePathname("/images/library/nginx")).toEqual({
      repo: "library/nginx",
      tag: null,
    })
  })

  it("parses tag from no-namespace path", () => {
    expect(parsePathname("/images/_/nginx/tags/latest")).toEqual({
      repo: "nginx",
      tag: "latest",
    })
  })

  it("parses tag from namespace path", () => {
    expect(parsePathname("/images/library/nginx/tags/latest")).toEqual({
      repo: "library/nginx",
      tag: "latest",
    })
  })

  it("handles multi-part tags in pathname", () => {
    expect(parsePathname("/images/library/nginx/tags/v1/beta")).toEqual({
      repo: "library/nginx",
      tag: "v1/beta",
    })
  })

  it("handles encoded characters in pathname", () => {
    expect(parsePathname("/images/library/my%20app")).toEqual({
      repo: "library/my%20app",
      tag: null,
    })
  })
})
