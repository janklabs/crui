# CRUI

A simple, read-only web UI for browsing Docker container registries.

## Features

- Browse repositories and tags
- View image manifests and layer details
- Dark mode
- Optional authentication (prompts users to log in if the registry requires it)

## Quick Start (Docker)

```bash
docker run -d \
  -p 3000:3000 \
  -e REGISTRY_URL=https://registry.example.com \
  -e SESSION_SECRET=$(openssl rand -base64 32) \
  kvqn/crui:latest
```

Then open [http://localhost:3000](http://localhost:3000).

## Docker Compose

```yaml
services:
  crui:
    image: kvqn/crui:latest
    ports:
      - "3000:3000"
    environment:
      - REGISTRY_URL=https://registry.example.com
      - SESSION_SECRET=your-secret-here-min-32-characters
      # Optional: provide default credentials so users aren't prompted to log in
      # - REGISTRY_USERNAME=admin
      # - REGISTRY_PASSWORD=password
      # Optional: override the registry URL shown in the UI
      # - DISPLAY_REGISTRY_URL=registry.example.com
```

```bash
docker compose up -d
```

## Environment Variables

| Variable               | Required | Description                                                                                                                          |
| ---------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `REGISTRY_URL`         | Yes      | URL of the Docker registry. `https://` is assumed if no protocol is provided.                                                        |
| `SESSION_SECRET`       | Yes      | Secret for session encryption (min 32 characters). Generate with `openssl rand -base64 32`.                                          |
| `REGISTRY_USERNAME`    | No       | Default username for registry auth. If not set, users are prompted to log in.                                                        |
| `REGISTRY_PASSWORD`    | No       | Default password for registry auth.                                                                                                  |
| `DISPLAY_REGISTRY_URL` | No       | Override the registry URL shown in the UI. Useful when the server-side URL differs from what users access (e.g., Docker networking). |

## Testing

This project uses **Vitest** for unit / component / server-action tests and **Playwright** for end-to-end tests.

### Commands

| Command | Purpose |
| --- | --- |
| `pnpm test` | Run unit + component tests once |
| `pnpm test:watch` | Run Vitest in watch mode |
| `pnpm test:coverage` | Run tests with V8 coverage; outputs `coverage/` |
| `pnpm test:e2e` | Run Playwright E2E (requires `pnpm build` first) |
| `pnpm test:e2e:ui` | Run Playwright in UI mode for debugging |

### Layout

- `src/**/*.test.{ts,tsx}` — Vitest unit + component tests, colocated with source
- `e2e/*.spec.ts` — Playwright end-to-end specs

### CI

On every pull request and push to `main`, GitHub Actions runs `format-check`, `typecheck`, `test`, and `e2e` jobs.
Coverage and Playwright reports are uploaded as workflow artifacts (7-day retention).
Releases and Docker pushes only run after all four checks pass.
