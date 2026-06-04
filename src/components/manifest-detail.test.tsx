import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { fetchManifestAction } from "@/app/actions"
import { ManifestDetail } from "./manifest-detail"

vi.mock("@/app/actions", () => ({
  fetchManifestAction: vi.fn(),
}))

const mockFetchManifestAction = vi.mocked(fetchManifestAction)

describe("ManifestDetail", () => {
  it("shows single-image manifest metadata", async () => {
    mockFetchManifestAction.mockResolvedValue({
      type: "manifest",
      digest: "sha256:abcdef1234567890abcdef1234567890",
      mediaType: "application/vnd.oci.image.manifest.v1+json",
      manifest: {
        mediaType: "application/vnd.oci.image.manifest.v1+json",
        schemaVersion: 2,
        digest: "sha256:abcdef1234567890abcdef1234567890",
        totalSize: 3072,
        platform: { os: "linux", architecture: "amd64" },
        created: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        layers: [
          {
            mediaType: "application/vnd.oci.image.layer.v1.tar+gzip",
            size: 1024,
            digest: "sha256:11111111111111111111111111111111",
          },
          {
            mediaType: "application/vnd.oci.image.layer.v1.tar+gzip",
            size: 2048,
            digest: "sha256:22222222222222222222222222222222",
          },
        ],
        config: {
          mediaType: "application/vnd.oci.image.config.v1+json",
          size: 512,
          digest: "sha256:33333333333333333333333333333333",
        },
      },
    })

    render(<ManifestDetail repoName="library/nginx" tag="latest" />)

    expect(
      await screen.findByRole("heading", { name: "library/nginx:latest" }),
    ).toBeInTheDocument()
    expect(screen.getByText("Single")).toBeInTheDocument()
    expect(screen.getAllByText("sha256:abcdef123456").length).toBeGreaterThan(0)
    expect(screen.getByText("3 KB")).toBeInTheDocument()
    expect(screen.getAllByText("3 KB total").length).toBeGreaterThan(0)
    expect(screen.getByText("linux/amd64")).toBeInTheDocument()
    expect(screen.getAllByText("2").length).toBeGreaterThan(0)
    expect(
      screen.getByText("docker pull library/nginx@sha256:abcdef123456"),
    ).toBeInTheDocument()
    expect(screen.getByText("sha256:111111111111")).toBeInTheDocument()
    expect(screen.getByText("1 KB")).toBeInTheDocument()
    expect(screen.getByText("sha256:222222222222")).toBeInTheDocument()
    expect(screen.getByText("2 KB")).toBeInTheDocument()
  })

  it("shows multi-arch image metadata for each platform", async () => {
    mockFetchManifestAction.mockResolvedValue({
      type: "manifestList",
      digest: "sha256:aaaaaaaaaaaa99999999999999999999",
      mediaType: "application/vnd.oci.image.index.v1+json",
      manifests: [
        {
          mediaType: "application/vnd.oci.image.manifest.v1+json",
          size: 4096,
          digest: "sha256:bbbbbbbbbbbb11111111111111111111",
          platform: { os: "linux", architecture: "amd64" },
        },
        {
          mediaType: "application/vnd.oci.image.manifest.v1+json",
          size: 8192,
          digest: "sha256:cccccccccccc22222222222222222222",
          platform: { os: "linux", architecture: "arm64", variant: "v8" },
        },
      ],
    })

    render(<ManifestDetail repoName="library/nginx" tag="latest" />)

    expect(
      await screen.findByRole("heading", { name: "library/nginx:latest" }),
    ).toBeInTheDocument()
    expect(screen.getByText("Multi-arch")).toBeInTheDocument()
    expect(
      screen.getByText("2 platform variants available"),
    ).toBeInTheDocument()
    expect(screen.getByText("linux/amd64")).toBeInTheDocument()
    expect(screen.getByText("linux/arm64/v8")).toBeInTheDocument()
    expect(screen.getByText("4 KB")).toBeInTheDocument()
    expect(screen.getByText("8 KB")).toBeInTheDocument()
    expect(screen.getByText("sha256:bbbbbbbbbbbb")).toBeInTheDocument()
    expect(screen.getByText("sha256:cccccccccccc")).toBeInTheDocument()
  })
})
