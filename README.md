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
  guneet/crui:latest
```

Then open [http://localhost:3000](http://localhost:3000).

## Environment Variables

| Variable               | Required | Description                                                                                                                          |
| ---------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `REGISTRY_URL`         | Yes      | URL of the Docker registry. `https://` is assumed if no protocol is provided.                                                        |
| `SESSION_SECRET`       | Yes      | Secret for session encryption (min 32 characters). Generate with `openssl rand -base64 32`.                                          |
| `REGISTRY_USERNAME`    | No       | Default username for registry auth. If not set, users are prompted to log in.                                                        |
| `REGISTRY_PASSWORD`    | No       | Default password for registry auth.                                                                                                  |
| `DISPLAY_REGISTRY_URL` | No       | Override the registry URL shown in the UI. Useful when the server-side URL differs from what users access (e.g., Docker networking). |
