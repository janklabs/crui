# Add Tests + Integrate into CI Workflow

## TL;DR

> **Quick Summary**: Introduce a complete test stack (Vitest + RTL for unit/component/server-action tests, Playwright for E2E) to the crui Next.js 16 / React 19 project, seed sample tests for each layer, and gate the existing release + Docker workflow on `typecheck`, `test`, and `e2e` jobs while opening CI to pull requests.
>
> **Deliverables**:
>
> - Vitest + RTL + Playwright installed and configured
> - `vitest.config.ts`, `vitest.setup.ts`, `playwright.config.ts`
> - Sample tests: 2 lib unit, 1 hook, 2 component (RTL), 1 server action, 1 E2E smoke
> - Updated `package.json` scripts: `test`, `test:watch`, `test:coverage`, `test:e2e`, `test:e2e:ui`
> - Updated `.github/workflows/push.yml`: `pull_request` trigger, new `typecheck` / `test` / `e2e` jobs, release/docker gated on them, concurrency cancel-in-progress
> - Coverage report uploaded as CI artifact (no threshold)
> - README "Testing" section
>
> **Estimated Effort**: Medium
> **Parallel Execution**: YES — 4 waves
> **Critical Path**: T1 (deps+scripts) → T3 (vitest config) → T7 (sample tests prove config) → T15 (CI test job) → T17 (release gating) → F1-F4 → user okay

---

## Context

### Original Request

> "Plan to add tests and add them in workflow as well."

### Interview Summary

**Key Decisions**:

- **Test runner**: Vitest + React Testing Library (Next 16 / React 19 / ESM-native fit)
- **Test scope**: Unit (lib + hooks), Component (RTL), Server actions, E2E (Playwright) — all four layers
- **CI integration**: New `typecheck` + `test` + `e2e` jobs in existing `push.yml`; `release` and `docker-force-push` gated on them; add `pull_request` trigger so PRs run CI
- **Coverage**: Report-only artifact, no failing threshold (establish baseline first)

**Project Profile** (from research):

- Next.js 16, React 19.2, TypeScript 5.8, pnpm@10.32.1
- ESM-only (`"type": "module"`), `moduleResolution: "Bundler"`, `verbatimModuleSyntax: true`, `paths: { "@/*": ["./src/*"] }`
- Existing CI: format-check → release (semantic-release) → docker-push, only on push:main + workflow_dispatch
- Testable surfaces: `src/lib/{registry,session,urls,utils}.ts`, `src/hooks/use-async-data.ts`, `src/app/actions.ts`, `src/components/**`

### Metis Review

**Critical gaps surfaced** (addressed in plan):

- `src/env.js` validates env at module load → tests importing `@/env` (transitively, via `registry.ts`) will throw without `SKIP_ENV_VALIDATION` or fixture env
- `src/lib/registry.ts` reads `env.REGISTRY_URL` at module initialization (top-level side effect) → tests must inject env before import
- `src/lib/session.ts` and `src/app/actions.ts` use `"use server"` + `cookies()` from `next/headers` → cannot run in plain Vitest without mocking `next/headers`
- React Server Components (RSC) cannot render in jsdom → RSC pages tested through Playwright only; only client components are RTL-testable
- ESM + `verbatimModuleSyntax: true` + `moduleResolution: "Bundler"` requires explicit `@/*` alias in Vitest (`vite-tsconfig-paths` recommended)
- React 19 needs `@testing-library/react@^16`
- Mocks needed: `next/navigation`, `next/image`, `next/headers`, `next-themes`
- Playwright: build prod, run against `next start`, cache browsers in CI

---

## Work Objectives

### Core Objective

Add a working multi-layer test infrastructure (Vitest + RTL + Playwright), seed it with one runnable example per layer, and wire it into the existing GitHub Actions workflow so all PRs and pushes run typecheck + tests + E2E before release/docker steps.

### Concrete Deliverables

- `vitest.config.ts` — workspaces or single config supporting jsdom for components, node for server/lib
- `vitest.setup.ts` — `@testing-library/jest-dom` matchers, env defaults, global mocks for `next/navigation`, `next/image`, `next-themes`
- `playwright.config.ts` — runs against `pnpm start` after `pnpm build`, single chromium project for CI, html reporter
- `e2e/smoke.spec.ts` — at least one passing smoke
- Sample tests under `src/**/*.test.ts(x)`:
  - `src/lib/utils.test.ts`
  - `src/lib/urls.test.ts`
  - `src/lib/registry.test.ts` (with `vi.mock` of `@/env` and `fetch`)
  - `src/hooks/use-async-data.test.ts`
  - `src/components/ui/button.test.tsx`
  - `src/components/login-form.test.tsx`
  - `src/app/actions.test.ts` (with mocked `next/headers`)
- `package.json` scripts: `test`, `test:watch`, `test:coverage`, `test:e2e`, `test:e2e:ui`, plus updated `devDependencies`
- `.gitignore` additions: `coverage/`, `playwright-report/`, `test-results/`, `.vitest-cache/`
- `.github/workflows/push.yml`:
  - Triggers: existing `push.main` + `workflow_dispatch` + NEW `pull_request`
  - Jobs: `format-check` (existing) + NEW `typecheck`, `test`, `e2e`
  - `release` and `docker-force-push` gated on `[format-check, typecheck, test, e2e]`
  - `concurrency: { group: ${{ github.workflow }}-${{ github.ref }}, cancel-in-progress: true }`
  - Coverage uploaded as artifact via `actions/upload-artifact`
- README — new "Testing" section with how to run each layer

### Definition of Done

- [ ] `pnpm test` — exits 0, runs ≥7 tests across lib/hooks/components/server-actions
- [ ] `pnpm test:coverage` — exits 0, produces `coverage/index.html`
- [ ] `pnpm test:e2e` — exits 0 after `pnpm build && pnpm start`
- [ ] `pnpm typecheck` — exits 0 with test files included
- [ ] PR opened against `main` triggers `format-check`, `typecheck`, `test`, `e2e` jobs
- [ ] Push to `main` runs CI then release then docker (release blocked if any CI job fails)
- [ ] Coverage artifact downloadable from CI run
- [ ] README has "Testing" section explaining each command

### Must Have

- Vitest config that handles ESM + `verbatimModuleSyntax` + `@/*` alias without errors
- Tests pass in CI on Node 22 with `pnpm install --frozen-lockfile`
- `release` job in `push.yml` blocked when tests fail
- `pull_request` trigger so PRs are tested
- `next/headers` mocked for server-action tests; `next/navigation`, `next/image`, `next-themes` mocked globally
- `SKIP_ENV_VALIDATION=true` (or fixture env) injected before any test imports `@/env`

### Must NOT Have (Guardrails)

- ❌ Coverage thresholds (`thresholds.lines/functions/...`) — report-only per user decision
- ❌ Visual regression / Storybook / Chromatic / mutation testing
- ❌ Removing or modifying the existing `format-check` job, `release` job logic, semantic-release config, or `docker-force-push` step internals (only their `needs:` arrays change)
- ❌ Refactoring source files (`src/**/*`) to make them more testable — only ADD test files alongside
- ❌ Bumping Next.js / React / TypeScript / pnpm versions
- ❌ Migrating to Jest / Mocha / Node test runner
- ❌ Adding a CI matrix across multiple Node versions (stick with Node 22)
- ❌ Writing tests for ALL existing code — seed examples only, breadth not depth
- ❌ Renaming `push.yml` to `ci.yml` (keep filename to preserve workflow_dispatch URLs)
- ❌ Adding `as any` / `@ts-ignore` to silence test errors — fix the cause
- ❌ Generic AI-slop names (`data`, `result`, `temp`, `helper`)
- ❌ Skipping E2E in CI to "save time" — user explicitly opted in

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** — all verification is agent-executed via Bash/Playwright/tmux.

### Test Decision

- **Infrastructure exists**: NO (we're creating it — this plan IS the infrastructure)
- **Automated tests**: YES — the deliverable is the test suite itself
- **Framework**: Vitest 2.x + React Testing Library 16.x + Playwright 1.x
- **TDD application**: For each sample test, write the test first against the existing source file, run RED (fail because test infra not yet wired), GREEN (config wired correctly so test passes), no REFACTOR needed for samples

### QA Policy

Every task includes agent-executed QA scenarios. Evidence saved to `.sisyphus/evidence/task-{N}-{slug}.{ext}`.

- **Config tasks (T1-T6)**: Bash — run `pnpm install`, `pnpm test --run --reporter=verbose`, capture stdout
- **Test sample tasks (T7-T13)**: Bash — run targeted `pnpm vitest run <file>`, assert exit 0 + N tests passed
- **E2E task (T14)**: Bash — `pnpm build && pnpm test:e2e --reporter=list`, capture report
- **CI tasks (T15-T18)**: Bash — `actionlint .github/workflows/push.yml` for syntax, plus YAML diff inspection
- **Doc task (T19)**: Bash — grep README for required headings

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Foundation — 6 tasks parallel, ~quick each):
├── T1: Install Vitest + RTL + coverage deps; add scripts          [quick]
├── T2: Install Playwright; add scripts; .gitignore                [quick]
├── T3: vitest.config.ts (jsdom + node projects, alias)            [quick]
├── T4: vitest.setup.ts (jest-dom, env, next/* mocks)              [quick]
├── T5: playwright.config.ts (chromium, build+start, html report)  [quick]
└── T6: tsconfig adjustments + types entry for tests               [quick]

Wave 2 (Sample tests — 7 tasks parallel, depend on Wave 1):
├── T7:  src/lib/utils.test.ts                                     [quick]
├── T8:  src/lib/urls.test.ts                                      [quick]
├── T9:  src/lib/registry.test.ts (mocked env + fetch)             [unspecified-high]
├── T10: src/hooks/use-async-data.test.tsx                         [quick]
├── T11: src/components/ui/button.test.tsx                         [quick]
├── T12: src/components/login-form.test.tsx (RTL + user-event)     [unspecified-high]
├── T13: src/app/actions.test.ts (mocked next/headers)             [unspecified-high]
└── T14: e2e/smoke.spec.ts                                         [quick]

Wave 3 (CI integration — sequential, depends on Wave 2):
├── T15: Add `pull_request` trigger + concurrency block             [quick]
├── T16: Add `typecheck` and `test` jobs to push.yml                [unspecified-high]
├── T17: Add `e2e` job with Playwright browser cache                [unspecified-high]
└── T18: Gate `release` + `docker-force-push` on new jobs           [quick]

Wave 4 (Docs + cleanup — 1 task):
└── T19: README "Testing" section                                   [writing]

Wave FINAL (4 parallel reviews → user okay):
├── F1: Plan compliance audit                  (oracle)
├── F2: Code quality review                    (unspecified-high)
├── F3: Real manual QA                         (unspecified-high)
└── F4: Scope fidelity check                   (deep)

Critical Path: T1 → T3 → T7 → T15 → T16 → T18 → F1-F4 → user okay
Parallel Speedup: ~65% vs sequential
Max Concurrent: 7 (Wave 2)
```

### Dependency Matrix

- **T1**: deps for Vitest/RTL — blocks T3, T4, T6, T7-T13
- **T2**: deps for Playwright — blocks T5, T6, T14, T17
- **T3**: vitest.config.ts — needs T1; blocks T7-T13
- **T4**: vitest.setup.ts — needs T1, T3; blocks T7-T13
- **T5**: playwright.config.ts — needs T2; blocks T14, T17
- **T6**: tsconfig — needs T1, T2; blocks T7-T14 (typecheck of test files)
- **T7-T13**: sample tests — need T3, T4, T6
- **T14**: e2e smoke — needs T5, T6
- **T15**: CI triggers — independent of T1-T14 (config only); blocks T16-T18
- **T16**: typecheck+test jobs — needs T15, all of T7-T13 working locally; blocks T18
- **T17**: e2e job — needs T15, T14 working locally; blocks T18
- **T18**: gate release — needs T16, T17
- **T19**: README — independent, only needs final scripts (T1+T2)
- **F1-F4**: need all T1-T19

### Agent Dispatch Summary

- **Wave 1**: 6 — T1-T6 → `quick`
- **Wave 2**: 7 — T7,T8,T10,T11,T14 → `quick`; T9,T12,T13 → `unspecified-high`
- **Wave 3**: 4 — T15,T18 → `quick`; T16,T17 → `unspecified-high`
- **Wave 4**: 1 — T19 → `writing`
- **FINAL**: 4 — F1 → `oracle`; F2 → `unspecified-high`; F3 → `unspecified-high`; F4 → `deep`

---

## TODOs

- [x] 1. Install Vitest + RTL + coverage devDependencies and add scripts

  **What to do**:
  - Run `pnpm add -D vitest @vitest/coverage-v8 jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event vite-tsconfig-paths @vitejs/plugin-react`
  - Pin to current major versions: `vitest@^2`, `@testing-library/react@^16` (React 19 support), `@testing-library/jest-dom@^6`, `@testing-library/user-event@^14`, `jsdom@^25`
  - Add scripts to `package.json` (preserve existing scripts and order):
    - `"test": "vitest run"`
    - `"test:watch": "vitest"`
    - `"test:coverage": "vitest run --coverage"`
  - Verify `pnpm install` completes and `pnpm-lock.yaml` updates

  **Must NOT do**:
  - Do NOT add Playwright deps here (that's T2)
  - Do NOT add coverage thresholds — script is plain `vitest run --coverage`
  - Do NOT change existing scripts (`build`, `dev`, `preview`, `start`, `typecheck`, `format:write`, `format:check`)
  - Do NOT bump existing dependencies

  **Recommended Agent Profile**:
  - **Category**: `quick` — single-file edit + package install
  - **Skills**: none

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T2)
  - **Parallel Group**: Wave 1
  - **Blocks**: T3, T4, T6, T7-T13
  - **Blocked By**: None

  **References**:
  - `package.json:5-12` — existing scripts block; preserve formatting and key order
  - `package.json:34-46` — existing devDependencies; insert new ones alphabetically
  - `pnpm-lock.yaml` — must regenerate via `pnpm install`
  - External: https://vitest.dev/guide/ — `vitest run` semantics
  - External: https://testing-library.com/docs/react-testing-library/intro — React 19 requires `@testing-library/react@^16`

  **Acceptance Criteria**:
  - [ ] `pnpm install --frozen-lockfile` exits 0 (after lockfile commit) — locally re-run via `pnpm install` first
  - [ ] `package.json` has all 3 new scripts
  - [ ] `package.json.devDependencies` lists `vitest`, `@vitest/coverage-v8`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `vite-tsconfig-paths`, `@vitejs/plugin-react`
  - [ ] No new entries in `dependencies`

  **QA Scenarios**:

  ```
  Scenario: Scripts present and install succeeds
    Tool: Bash
    Preconditions: Clean working tree on branch, no node_modules removed
    Steps:
      1. Run `pnpm install` and capture exit code → must be 0
      2. Run `node -e "const p=require('./package.json'); for (const s of ['test','test:watch','test:coverage']) if(!p.scripts[s]) {process.exit(1)}; console.log('OK')"` → must print OK exit 0
      3. Run `node -e "const p=require('./package.json'); for (const d of ['vitest','@vitest/coverage-v8','jsdom','@testing-library/react','@testing-library/jest-dom','@testing-library/user-event','vite-tsconfig-paths','@vitejs/plugin-react']) if(!p.devDependencies[d]) {console.error('missing',d); process.exit(1)}; console.log('OK')"` → exit 0
    Expected Result: All 3 commands succeed
    Failure Indicators: Missing script, missing devDep, install fails
    Evidence: .sisyphus/evidence/task-1-install-vitest.txt

  Scenario: No production deps added
    Tool: Bash
    Preconditions: T1 changes staged
    Steps:
      1. Run `git diff HEAD -- package.json | grep -E '^\\+' | grep -v devDependencies | grep -E '"(vitest|jsdom|testing-library|vite-tsconfig-paths|vitejs)"'` → must be empty
    Expected Result: No matches (no test deps in `dependencies`)
    Evidence: .sisyphus/evidence/task-1-no-prod-deps.txt
  ```

  **Commit**: YES
  - Message: `chore(test): install vitest + react testing library`
  - Files: `package.json`, `pnpm-lock.yaml`
  - Pre-commit: `pnpm install --frozen-lockfile`

- [x] 2. Install Playwright and add e2e scripts + .gitignore entries

  **What to do**:
  - Run `pnpm add -D @playwright/test` (pin `^1.48`)
  - Run `pnpm exec playwright install --with-deps chromium` locally to verify install (CI will install browsers separately)
  - Add scripts to `package.json`:
    - `"test:e2e": "playwright test"`
    - `"test:e2e:ui": "playwright test --ui"`
  - Append to `.gitignore` (after existing entries, group under `# tests`):
    ```
    # tests
    coverage/
    playwright-report/
    test-results/
    .vitest-cache/
    ```

  **Must NOT do**:
  - Do NOT install all browsers — only chromium (CI minimization)
  - Do NOT commit `playwright-report/` or `test-results/` directories if they exist
  - Do NOT add `playwright.config.ts` here (T5)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: none

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T1)
  - **Parallel Group**: Wave 1
  - **Blocks**: T5, T6, T14, T17
  - **Blocked By**: None

  **References**:
  - `.gitignore:1-30` — existing entries; append new section at the end
  - `package.json:5-12` — scripts block
  - External: https://playwright.dev/docs/intro — `@playwright/test` install
  - External: https://playwright.dev/docs/ci-intro — CI browser caching pattern (used in T17)

  **Acceptance Criteria**:
  - [ ] `package.json.devDependencies["@playwright/test"]` exists
  - [ ] Scripts `test:e2e` and `test:e2e:ui` present
  - [ ] `.gitignore` contains `coverage/`, `playwright-report/`, `test-results/`, `.vitest-cache/`
  - [ ] `pnpm exec playwright --version` exits 0

  **QA Scenarios**:

  ```
  Scenario: Playwright installed and gitignore updated
    Tool: Bash
    Steps:
      1. `pnpm exec playwright --version` → exit 0, prints version
      2. `grep -E '^(coverage|playwright-report|test-results|\\.vitest-cache)/$' .gitignore | wc -l` → output `4`
      3. `node -e "const p=require('./package.json'); for (const s of ['test:e2e','test:e2e:ui']) if(!p.scripts[s]) process.exit(1); console.log('OK')"` → exit 0, prints OK
    Expected Result: All three checks pass
    Evidence: .sisyphus/evidence/task-2-playwright-install.txt
  ```

  **Commit**: YES
  - Message: `chore(test): install playwright`
  - Files: `package.json`, `pnpm-lock.yaml`, `.gitignore`
  - Pre-commit: `pnpm exec playwright --version`

- [x] 3. Create `vitest.config.ts` with jsdom env, alias, and setup file

  **What to do**:
  - Create `vitest.config.ts` at repo root:

    ```ts
    import react from "@vitejs/plugin-react"
    import tsconfigPaths from "vite-tsconfig-paths"
    import { defineConfig } from "vitest/config"

    export default defineConfig({
      plugins: [react(), tsconfigPaths()],
      test: {
        environment: "jsdom",
        globals: true,
        setupFiles: ["./vitest.setup.ts"],
        include: ["src/**/*.test.{ts,tsx}"],
        exclude: ["e2e/**", "node_modules/**", ".next/**"],
        coverage: {
          provider: "v8",
          reporter: ["text", "html", "lcov"],
          exclude: [
            "**/*.config.*",
            "**/*.d.ts",
            "src/env.js",
            "e2e/**",
            "src/**/*.test.{ts,tsx}",
            ".next/**",
            "next-env.d.ts",
          ],
        },
      },
    })
    ```

  - Note: `globals: true` removes need to import `describe/it/expect`; if user prefers explicit imports, leave as `false` — default to `true` for ergonomics

  **Must NOT do**:
  - Do NOT add `coverage.thresholds` (report-only per user)
  - Do NOT include `e2e/**` (Playwright owns that path)
  - Do NOT use `happy-dom` (jsdom chosen for broader compat with React 19 + Radix)
  - Do NOT introduce a `vite.config.ts` — keep `vitest.config.ts` only

  **Recommended Agent Profile**:
  - **Category**: `quick` — config file creation
  - **Skills**: none

  **Parallelization**:
  - **Can Run In Parallel**: YES — independent file
  - **Parallel Group**: Wave 1
  - **Blocks**: T7-T13
  - **Blocked By**: T1

  **References**:
  - `tsconfig.json:14-18` — `paths: { "@/*": ["./src/*"] }`; `vite-tsconfig-paths` reads this so we don't duplicate alias config
  - `tsconfig.json:8` — `moduleResolution: "Bundler"` confirmed Vite-compatible
  - `package.json:4` — `"type": "module"` requires ESM imports in config
  - External: https://vitest.dev/config/ — `defineConfig` shape
  - External: https://github.com/aleclarson/vite-tsconfig-paths — reuses tsconfig paths
  - External: https://vitest.dev/guide/coverage — v8 provider config

  **Acceptance Criteria**:
  - [ ] File `vitest.config.ts` exists at repo root
  - [ ] `pnpm vitest --run --reporter=verbose` runs without "config error" (no tests yet → "no test files" is acceptable, exit code 0 with `--passWithNoTests` OR fail-soft until T7)
  - [ ] Config uses `tsconfigPaths()` so `@/*` resolves
  - [ ] `coverage.thresholds` is absent (grep)

  **QA Scenarios**:

  ```
  Scenario: Vitest reads config without errors
    Tool: Bash
    Preconditions: T1 deps installed
    Steps:
      1. `pnpm vitest run --passWithNoTests --reporter=verbose 2>&1 | tee .sisyphus/evidence/task-3-vitest-config.txt`
      2. Assert exit 0
      3. Assert output contains "Vitest" and does not contain "ConfigError" or "Cannot find module"
    Expected Result: Vitest loads config and reports zero tests (acceptable until T7)
    Evidence: .sisyphus/evidence/task-3-vitest-config.txt

  Scenario: Coverage thresholds absent
    Tool: Bash
    Steps:
      1. `grep -E "thresholds?\\s*:" vitest.config.ts` → must exit 1 (no match)
    Expected Result: No threshold key in config
    Evidence: .sisyphus/evidence/task-3-no-thresholds.txt
  ```

  **Commit**: YES
  - Message: `chore(test): add vitest config`
  - Files: `vitest.config.ts`
  - Pre-commit: `pnpm vitest run --passWithNoTests`

- [x] 4. Create `vitest.setup.ts` with jest-dom matchers, env defaults, and Next.js mocks

  **What to do**:
  - Create `vitest.setup.ts` at repo root:

    ```ts
    import "@testing-library/jest-dom/vitest"

    import { cleanup } from "@testing-library/react"
    import { afterEach, vi } from "vitest"

    // Ensure env validation never throws during unit tests
    process.env.SKIP_ENV_VALIDATION = "true"
    process.env.REGISTRY_URL ??= "https://registry.test.local"

    afterEach(() => cleanup())

    // Mock next/navigation router APIs used by client components
    vi.mock("next/navigation", () => ({
      useRouter: () => ({
        push: vi.fn(),
        replace: vi.fn(),
        back: vi.fn(),
        refresh: vi.fn(),
        prefetch: vi.fn(),
      }),
      usePathname: () => "/",
      useSearchParams: () => new URLSearchParams(),
      redirect: vi.fn(),
      notFound: vi.fn(),
    }))

    // Mock next/image to render a plain img tag
    vi.mock("next/image", () => ({
      default: (props: Record<string, unknown>) => {
        const React = require("react")
        return React.createElement("img", props)
      },
    }))

    // Mock next-themes to avoid window matchMedia issues
    vi.mock("next-themes", () => ({
      ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
      useTheme: () => ({
        theme: "light",
        setTheme: vi.fn(),
        resolvedTheme: "light",
      }),
    }))
    ```

  - Note: Use ESM-friendly `vi.mock` factories. Avoid `require()` where possible — use dynamic `import()` if linter complains.

  **Must NOT do**:
  - Do NOT mock `next/headers` here globally — that's per-test in T13 (server actions only)
  - Do NOT call `vi.resetModules()` globally (breaks ESM caches)
  - Do NOT add Storybook / MSW setup
  - Do NOT use `happy-dom`

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: none

  **Parallelization**:
  - **Can Run In Parallel**: YES — same wave as T3
  - **Parallel Group**: Wave 1
  - **Blocks**: T7-T13
  - **Blocked By**: T1, T3

  **References**:
  - `src/env.js:1-30` — env validation logic; honors `SKIP_ENV_VALIDATION`
  - `src/lib/registry.ts:4` — reads `env.REGISTRY_URL` at module init; needs default value or skip flag
  - `src/components/theme-provider.tsx` — wraps `next-themes`
  - External: https://github.com/testing-library/jest-dom#with-vitest — `@testing-library/jest-dom/vitest` import
  - External: https://nextjs.org/docs/app/api-reference/functions/use-router — APIs to mock

  **Acceptance Criteria**:
  - [ ] File exists at repo root
  - [ ] Imports compile under TypeScript
  - [ ] After T7 lands, `pnpm test` runs cleanup between tests with no leakage

  **QA Scenarios**:

  ````
  Scenario: Setup file syntactically valid + env default applied
    Tool: Bash
    Preconditions: T1 + T3 done
    Steps:
      1. `pnpm tsc --noEmit vitest.setup.ts || true` (informational)
      2. Write a temp test `src/__setup-check.test.ts` with content:
         ```ts
         import { test, expect } from "vitest";
         test("setup applies env default", () => {
           expect(process.env.SKIP_ENV_VALIDATION).toBe("true");
           expect(process.env.REGISTRY_URL).toBeTruthy();
         });
         ```
      3. `pnpm vitest run src/__setup-check.test.ts --reporter=verbose 2>&1 | tee .sisyphus/evidence/task-4-setup.txt`
      4. Assert "1 passed"
      5. Delete temp file
    Expected Result: Test passes, proving setup file loads
    Evidence: .sisyphus/evidence/task-4-setup.txt
  ````

  **Commit**: YES
  - Message: `chore(test): add vitest setup with global mocks`
  - Files: `vitest.setup.ts`
  - Pre-commit: `pnpm vitest run --passWithNoTests`

- [x] 5. Create `playwright.config.ts` with chromium project and prod-build webserver

  **What to do**:
  - Create `playwright.config.ts` at repo root:

    ```ts
    import { defineConfig, devices } from "@playwright/test"

    const PORT = Number(process.env.PORT ?? 3000)
    const baseURL = `http://localhost:${PORT}`

    export default defineConfig({
      testDir: "./e2e",
      fullyParallel: true,
      forbidOnly: !!process.env.CI,
      retries: process.env.CI ? 2 : 0,
      workers: process.env.CI ? 1 : undefined,
      reporter: process.env.CI
        ? [["html", { open: "never" }], ["github"]]
        : "list",
      use: {
        baseURL,
        trace: "on-first-retry",
        screenshot: "only-on-failure",
      },
      projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
      webServer: {
        command: "pnpm start",
        url: baseURL,
        timeout: 120_000,
        reuseExistingServer: !process.env.CI,
        env: {
          REGISTRY_URL:
            process.env.REGISTRY_URL ?? "https://registry.test.local",
          SKIP_ENV_VALIDATION: "true",
        },
      },
    })
    ```

  - Create `e2e/.gitkeep` to establish directory (real spec lands in T14)

  **Must NOT do**:
  - Do NOT use `pnpm dev` as `webServer.command` — production parity matters; CI runs `pnpm build` then `pnpm start`
  - Do NOT add firefox/webkit projects — chromium only per scope
  - Do NOT enable visual snapshots (`expect.toHaveScreenshot`) — out of scope

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: none

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T3, T4)
  - **Parallel Group**: Wave 1
  - **Blocks**: T14, T17
  - **Blocked By**: T2

  **References**:
  - `package.json:7` — `"start": "next start"` is the command Playwright invokes
  - `package.json:6` — `"build": "next build"` must precede start; CI handles ordering in T17
  - `src/env.js` — accepts `SKIP_ENV_VALIDATION=true`
  - External: https://playwright.dev/docs/test-webserver — `webServer` block contract
  - External: https://playwright.dev/docs/test-configuration — `defineConfig` shape

  **Acceptance Criteria**:
  - [ ] File `playwright.config.ts` exists
  - [ ] `pnpm exec playwright test --list 2>&1` exits 0 once T14 adds a spec (acceptable to fail with "no tests" until then)
  - [ ] Config references `pnpm start` as webServer

  **QA Scenarios**:

  ```
  Scenario: Playwright config loads
    Tool: Bash
    Preconditions: T2 deps installed
    Steps:
      1. `pnpm exec playwright test --list 2>&1 | tee .sisyphus/evidence/task-5-pw-config.txt`
      2. Exit code must be 0 OR output contains "No tests found" (acceptable; spec arrives in T14)
      3. `grep "pnpm start" playwright.config.ts` → exit 0
      4. `grep "chromium" playwright.config.ts` → exit 0
    Expected Result: Config parseable; webServer command and project set
    Evidence: .sisyphus/evidence/task-5-pw-config.txt
  ```

  **Commit**: YES
  - Message: `chore(test): add playwright config`
  - Files: `playwright.config.ts`, `e2e/.gitkeep`
  - Pre-commit: `pnpm exec playwright test --list || true`

- [x] 6. Update tsconfig to include test files and Vitest/Playwright types

  **What to do**:
  - Read `tsconfig.json`. Currently `include` is likely `["**/*.ts", "**/*.tsx"]` or similar. Verify it.
  - If `include` already covers test files (e.g., `**/*.ts`), no change needed there
  - Add to `compilerOptions.types` (create the array if missing): `["vitest/globals", "@testing-library/jest-dom"]`
  - Add `"vitest.config.ts"`, `"vitest.setup.ts"`, `"playwright.config.ts"`, `"e2e/**/*.ts"` to `include`
  - Verify `pnpm typecheck` still passes after changes

  **Must NOT do**:
  - Do NOT change `target`, `module`, `moduleResolution`, `verbatimModuleSyntax`, `paths`, or `strict` settings
  - Do NOT add `@types/jest` (would conflict with Vitest globals + jest-dom)
  - Do NOT add `allowJs: true` if it's currently false — env.js is already handled by Next

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: none

  **Parallelization**:
  - **Can Run In Parallel**: YES — independent of T3-T5
  - **Parallel Group**: Wave 1
  - **Blocks**: T7-T14 (tests need types resolved)
  - **Blocked By**: T1, T2

  **References**:
  - `tsconfig.json` (read entire file before editing)
  - External: https://vitest.dev/guide/features.html#globals — `vitest/globals` types entry
  - External: https://github.com/testing-library/jest-dom#types — `@testing-library/jest-dom` triple-slash alternative

  **Acceptance Criteria**:
  - [ ] `tsconfig.json` includes vitest config files and e2e/
  - [ ] `compilerOptions.types` contains `vitest/globals` and `@testing-library/jest-dom`
  - [ ] `pnpm typecheck` exits 0 (run after T7-T14 land too — re-verify in F2)

  **QA Scenarios**:

  ```
  Scenario: Typecheck still green
    Tool: Bash
    Steps:
      1. `pnpm typecheck 2>&1 | tee .sisyphus/evidence/task-6-typecheck.txt`
      2. Assert exit 0
      3. `node -e "const t=require('./tsconfig.json'); const ty=t.compilerOptions.types||[]; if(!ty.includes('vitest/globals')||!ty.includes('@testing-library/jest-dom')) process.exit(1); console.log('OK')"` → exit 0
    Expected Result: Typecheck passes; required types present
    Evidence: .sisyphus/evidence/task-6-typecheck.txt
  ```

  **Commit**: YES
  - Message: `chore(test): include test files in tsconfig`
  - Files: `tsconfig.json`
  - Pre-commit: `pnpm typecheck`

- [x] 7. Sample unit tests for `src/lib/utils.ts`

  **What to do**:
  - Read `src/lib/utils.ts` first to understand exported functions (likely `cn()` from `clsx` + `tailwind-merge`)
  - Create `src/lib/utils.test.ts`:

    ```ts
    import { describe, expect, it } from "vitest"

    import { cn } from "./utils"

    describe("cn", () => {
      it("merges class names", () => {
        expect(cn("a", "b")).toBe("a b")
      })
      it("dedupes conflicting tailwind classes (tailwind-merge wins)", () => {
        expect(cn("p-2", "p-4")).toBe("p-4")
      })
      it("handles falsy values", () => {
        expect(cn("a", false && "b", null, undefined, "c")).toBe("a c")
      })
    })
    ```

  - Adjust assertions if `utils.ts` exports more (e.g., add a `describe` per export)

  **Must NOT do**:
  - Do NOT modify `src/lib/utils.ts`
  - Do NOT use `as any`
  - Do NOT generic-name variables

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: none

  **Parallelization**:
  - **Can Run In Parallel**: YES (T7-T13 all parallel)
  - **Parallel Group**: Wave 2
  - **Blocks**: T16
  - **Blocked By**: T3, T4, T6

  **References**:
  - `src/lib/utils.ts` — read entire file before writing assertions
  - External: https://github.com/dcastil/tailwind-merge#getting-started — merge precedence rules

  **Acceptance Criteria**:
  - [ ] File `src/lib/utils.test.ts` exists
  - [ ] `pnpm vitest run src/lib/utils.test.ts` exits 0 with ≥3 tests passed

  **QA Scenarios**:

  ```
  Scenario: Utils tests pass
    Tool: Bash
    Steps:
      1. `pnpm vitest run src/lib/utils.test.ts --reporter=verbose 2>&1 | tee .sisyphus/evidence/task-7-utils-test.txt`
      2. Assert exit 0
      3. `grep -E "Tests\\s+[3-9]\\d* passed" .sisyphus/evidence/task-7-utils-test.txt` → exit 0
    Expected Result: All tests pass
    Evidence: .sisyphus/evidence/task-7-utils-test.txt
  ```

  **Commit**: YES
  - Message: `test(lib): unit tests for utils`
  - Files: `src/lib/utils.test.ts`
  - Pre-commit: `pnpm vitest run src/lib/utils.test.ts`

- [x] 8. Sample unit tests for `src/lib/urls.ts`

  **What to do**:
  - Read `src/lib/urls.ts` to identify exported helpers (URL builders for registry paths)
  - Create `src/lib/urls.test.ts` with one `describe` per export and 2-3 cases each (happy path + edge case like trailing slash, empty input, special chars in image name)
  - Use exact function names and signatures from the file — do NOT invent

  **Must NOT do**:
  - Do NOT modify source
  - Do NOT skip edge cases (empty strings, slashes)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: none

  **Parallelization**:
  - Wave 2; blocks T16; blocked by T3, T4, T6

  **References**:
  - `src/lib/urls.ts` — full file read required

  **Acceptance Criteria**:
  - [ ] File `src/lib/urls.test.ts` exists
  - [ ] `pnpm vitest run src/lib/urls.test.ts` exits 0 with ≥2 tests passed

  **QA Scenarios**:

  ```
  Scenario: Urls tests pass
    Tool: Bash
    Steps:
      1. `pnpm vitest run src/lib/urls.test.ts --reporter=verbose 2>&1 | tee .sisyphus/evidence/task-8-urls-test.txt`
      2. Assert exit 0
    Expected Result: All tests pass
    Evidence: .sisyphus/evidence/task-8-urls-test.txt
  ```

  **Commit**: YES
  - Message: `test(lib): unit tests for urls`
  - Files: `src/lib/urls.test.ts`
  - Pre-commit: `pnpm vitest run src/lib/urls.test.ts`

- [x] 9. Sample unit tests for `src/lib/registry.ts` with mocked env + fetch

  **What to do**:
  - Read `src/lib/registry.ts` to identify the public API (likely fetchers like `getCatalog`, `getTags`, `getManifest`)
  - Create `src/lib/registry.test.ts`:
    - Top of file: `vi.stubEnv("REGISTRY_URL", "https://registry.test.local")` (vitest >=1)
    - For each exported fetcher: 1 happy path with `vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify(...), { status: 200 }))` + 1 error path (404 / network error)
    - Use `beforeEach(() => vi.restoreAllMocks())`
  - Pattern reference: https://vitest.dev/guide/mocking.html#globals
  - If `registry.ts` uses Basic Auth headers, assert request headers via `expect((globalThis.fetch as any).mock.calls[0][1].headers).toMatchObject({ Authorization: expect.stringMatching(/^Basic /) })`

  **Must NOT do**:
  - Do NOT use `nock` or `msw` — keep deps minimal
  - Do NOT modify `registry.ts`
  - Do NOT use `as any` outside of mock-call introspection (allowed only there for typing)
  - Do NOT make real network calls

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high` — careful mocking required
  - **Skills**: none

  **Parallelization**:
  - Wave 2; blocks T16; blocked by T3, T4, T6

  **References**:
  - `src/lib/registry.ts` — full file read required to enumerate exports and request shapes
  - `src/env.js` — `REGISTRY_URL` semantic
  - External: https://vitest.dev/guide/mocking.html#globals — `vi.spyOn` on `fetch`
  - External: https://vitest.dev/api/vi.html#vi-stubenv — env stubbing

  **Acceptance Criteria**:
  - [ ] `pnpm vitest run src/lib/registry.test.ts` exits 0 with ≥2 tests passed
  - [ ] No real network call made (verified by mock not installed = test fails fast)

  **QA Scenarios**:

  ```
  Scenario: Registry tests pass with fetch mocked
    Tool: Bash
    Steps:
      1. `pnpm vitest run src/lib/registry.test.ts --reporter=verbose 2>&1 | tee .sisyphus/evidence/task-9-registry-test.txt`
      2. Assert exit 0
      3. Verify no warnings about "Cannot find module @/env" or "Network error"
    Expected Result: All tests pass; no network access
    Evidence: .sisyphus/evidence/task-9-registry-test.txt

  Scenario: Test fails when fetch mock returns 500 (negative path proven)
    Tool: Bash
    Preconditions: registry.test.ts contains an error-path test
    Steps:
      1. Confirm test file has at least one `expect(...).toThrow()` or `await expect(...).rejects` for HTTP error
    Expected Result: Error path test exists
    Evidence: .sisyphus/evidence/task-9-error-path.txt
  ```

  **Commit**: YES
  - Message: `test(lib): unit tests for registry client`
  - Files: `src/lib/registry.test.ts`
  - Pre-commit: `pnpm vitest run src/lib/registry.test.ts`

- [x] 10. Sample test for `src/hooks/use-async-data.ts`

  **What to do**:
  - Read the hook to determine its signature (likely `(fetcher: () => Promise<T>) => { data, error, loading, retry }`)
  - Create `src/hooks/use-async-data.test.tsx`:
    - Use `renderHook` + `act` from `@testing-library/react`
    - Test 1: resolves → `loading: false`, `data` set
    - Test 2: rejects → `error` set, `data` undefined
    - Test 3 (if `retry` exists): calling `retry()` re-runs the fetcher
  - Use `waitFor` for async state transitions

  **Must NOT do**:
  - Do NOT modify the hook source
  - Do NOT use timers (`vi.useFakeTimers()`) unless the hook uses delays
  - Do NOT bypass React act warnings (fix them, don't suppress)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: none

  **Parallelization**: Wave 2; blocks T16; blocked by T3, T4, T6

  **References**:
  - `src/hooks/use-async-data.ts` — full file read
  - External: https://testing-library.com/docs/react-testing-library/api/#renderhook
  - External: https://vitest.dev/api/expect.html#tobeundefined

  **Acceptance Criteria**:
  - [ ] `pnpm vitest run src/hooks/use-async-data.test.tsx` exits 0 with ≥2 tests passed
  - [ ] No "act" warnings in stderr

  **QA Scenarios**:

  ```
  Scenario: Hook tests pass
    Tool: Bash
    Steps:
      1. `pnpm vitest run src/hooks/use-async-data.test.tsx --reporter=verbose 2>&1 | tee .sisyphus/evidence/task-10-hook-test.txt`
      2. Assert exit 0
      3. `grep -i "act(...) is not supported" .sisyphus/evidence/task-10-hook-test.txt` → must exit 1 (no warning)
    Expected Result: Tests pass without act warnings
    Evidence: .sisyphus/evidence/task-10-hook-test.txt
  ```

  **Commit**: YES
  - Message: `test(hooks): unit tests for use-async-data`
  - Files: `src/hooks/use-async-data.test.tsx`
  - Pre-commit: `pnpm vitest run src/hooks/use-async-data.test.tsx`

- [x] 11. Component test for `src/components/ui/button.tsx`

  **What to do**:
  - Read button component (Radix slot + cva based)
  - Create `src/components/ui/button.test.tsx`:
    - Test 1: renders text content; `screen.getByRole("button", { name: /submit/i })` present
    - Test 2: variant prop applies expected class (e.g., `variant="destructive"` → class contains `bg-destructive`)
    - Test 3: `asChild` prop renders child element (`<a>`) instead of `<button>`
    - Test 4: click handler invoked via `userEvent.click()`
  - Use `userEvent.setup()` per test, not module-level

  **Must NOT do**:
  - Do NOT modify Button source
  - Do NOT assert exact full className strings (brittle); assert substrings/`toHaveClass`
  - Do NOT use `fireEvent` when `userEvent` is appropriate

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: none

  **Parallelization**: Wave 2; blocks T16; blocked by T3, T4, T6

  **References**:
  - `src/components/ui/button.tsx` — full file (cva variants, slot pattern)
  - External: https://testing-library.com/docs/queries/about/#priority — prefer `getByRole`
  - External: https://github.com/testing-library/user-event#api — `setup()` pattern

  **Acceptance Criteria**:
  - [ ] `pnpm vitest run src/components/ui/button.test.tsx` exits 0 with ≥3 tests passed

  **QA Scenarios**:

  ```
  Scenario: Button tests pass
    Tool: Bash
    Steps:
      1. `pnpm vitest run src/components/ui/button.test.tsx --reporter=verbose 2>&1 | tee .sisyphus/evidence/task-11-button-test.txt`
      2. Assert exit 0
    Expected Result: All tests pass
    Evidence: .sisyphus/evidence/task-11-button-test.txt
  ```

  **Commit**: YES
  - Message: `test(ui): component tests for button`
  - Files: `src/components/ui/button.test.tsx`
  - Pre-commit: `pnpm vitest run src/components/ui/button.test.tsx`

- [x] 12. Component test for `src/components/login-form.tsx` (RTL + user-event)

  **What to do**:
  - Read login-form to identify field names, submit button label, form action / `onSubmit`
  - Create `src/components/login-form.test.tsx`:
    - Test 1: renders username + password fields and submit button (use `getByLabelText` or `getByRole("textbox")`)
    - Test 2: `userEvent.type` fills inputs; on submit, the action handler is invoked with expected payload (mock the action import, e.g., `vi.mock("@/app/actions", () => ({ login: vi.fn() }))`)
    - Test 3 (negative): submit empty form → either client-side validation message appears OR action is not called (whichever the component implements)
  - Wrap render in `<form>`-aware setup if component uses Server Action `action={...}` prop — use the form mock pattern: pass a mock `action` prop or wrap with `<form action={mock}>`

  **Must NOT do**:
  - Do NOT modify login-form source
  - Do NOT assert against implementation details (state internals); use accessible queries
  - Do NOT silence missing-label warnings — fix the test query

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high` — server action interaction in form requires careful mocking
  - **Skills**: none

  **Parallelization**: Wave 2; blocks T16; blocked by T3, T4, T6

  **References**:
  - `src/components/login-form.tsx` — full file
  - `src/app/actions.ts` — to know what action shape to mock
  - External: https://testing-library.com/docs/ecosystem-user-event/

  **Acceptance Criteria**:
  - [ ] `pnpm vitest run src/components/login-form.test.tsx` exits 0 with ≥2 tests passed (1 happy + 1 negative)

  **QA Scenarios**:

  ```
  Scenario: Login form happy path
    Tool: Bash
    Steps:
      1. `pnpm vitest run src/components/login-form.test.tsx --reporter=verbose 2>&1 | tee .sisyphus/evidence/task-12-login-form-test.txt`
      2. Assert exit 0
      3. Confirm output mentions both happy + negative test names
    Expected Result: At least 2 tests pass
    Evidence: .sisyphus/evidence/task-12-login-form-test.txt
  ```

  **Commit**: YES
  - Message: `test(components): component tests for login form`
  - Files: `src/components/login-form.test.tsx`
  - Pre-commit: `pnpm vitest run src/components/login-form.test.tsx`

- [x] 13. Server action test for `src/app/actions.ts` with mocked `next/headers`

  **What to do**:
  - Read `src/app/actions.ts` to enumerate exported actions (likely `login`, `logout`)
  - Create `src/app/actions.test.ts`:
    - Per-test mock of `next/headers`:
      ```ts
      const cookieStore = { get: vi.fn(), set: vi.fn(), delete: vi.fn() }
      vi.mock("next/headers", () => ({
        cookies: () => Promise.resolve(cookieStore),
      }))
      ```
      (Note: in Next 15+, `cookies()` returns a Promise — verify the version's API and align)
    - Test login: providing valid creds calls `cookieStore.set` with session value; invalid creds throws / returns error
    - Test logout: calls `cookieStore.delete` with session key
  - Mock `redirect` from `next/navigation` if used (already mocked globally in setup)

  **Must NOT do**:
  - Do NOT modify `actions.ts`
  - Do NOT call real `next/headers` (would fail outside RSC context)
  - Do NOT make HTTP calls to a real registry (mock fetch)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high` — server action + cookies API needs precise mocking
  - **Skills**: none

  **Parallelization**: Wave 2; blocks T16; blocked by T3, T4, T6

  **References**:
  - `src/app/actions.ts` — full file (read first to confirm action signatures)
  - `src/lib/session.ts` — cookie-key constants used by actions
  - External: https://nextjs.org/docs/app/api-reference/functions/cookies — Promise-based API in Next 15+

  **Acceptance Criteria**:
  - [ ] `pnpm vitest run src/app/actions.test.ts` exits 0 with ≥2 tests passed

  **QA Scenarios**:

  ```
  Scenario: Server actions test pass
    Tool: Bash
    Steps:
      1. `pnpm vitest run src/app/actions.test.ts --reporter=verbose 2>&1 | tee .sisyphus/evidence/task-13-actions-test.txt`
      2. Assert exit 0
    Expected Result: All tests pass
    Evidence: .sisyphus/evidence/task-13-actions-test.txt

  Scenario: No real cookies module loaded
    Tool: Bash
    Steps:
      1. `grep -E "vi\\.mock\\([\"']next/headers[\"']" src/app/actions.test.ts` → exit 0
    Expected Result: Mock present
    Evidence: .sisyphus/evidence/task-13-mock-check.txt
  ```

  **Commit**: YES
  - Message: `test(actions): tests for server actions`
  - Files: `src/app/actions.test.ts`
  - Pre-commit: `pnpm vitest run src/app/actions.test.ts`

- [x] 14. E2E smoke spec: home page renders + login form interaction

  **What to do**:
  - Create `e2e/smoke.spec.ts`:

    ```ts
    import { expect, test } from "@playwright/test"

    test.describe("smoke", () => {
      test("home page loads", async ({ page }) => {
        await page.goto("/")
        await expect(page).toHaveTitle(/.+/)
        // Basic content check — header should render
        await expect(page.locator("header")).toBeVisible({ timeout: 10_000 })
      })

      test("login form is reachable and rejects empty submit", async ({
        page,
      }) => {
        await page.goto("/")
        // If login form is on home page (registry not authed), interact there.
        // Otherwise navigate to wherever it appears. Adjust selector after reading login-form.tsx.
        const submitButton = page.getByRole("button", {
          name: /sign in|log in|login/i,
        })
        if (await submitButton.count()) {
          await submitButton.click()
          // Expect either an HTML5 validation message (browser native) or a visible error
          // Don't assert specific text — just that we didn't crash
          await expect(page).not.toHaveURL(/error/)
        } else {
          test.skip(true, "No login form on home — covered elsewhere")
        }
      })
    })
    ```

  - Adjust selectors after reading `src/components/login-form.tsx` and route layout
  - Delete `e2e/.gitkeep` once spec exists (optional, but cleaner)

  **Must NOT do**:
  - Do NOT use brittle `nth-child` selectors
  - Do NOT hardcode production registry URLs — Playwright config injects fixture env
  - Do NOT do visual screenshot diffing (out of scope)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `playwright`

  **Parallelization**: Wave 2; blocks T17; blocked by T2, T5, T6

  **References**:
  - `src/app/(registry)/page.tsx` — home page entry
  - `src/components/header.tsx` — header presence
  - `src/components/login-form.tsx` — submit button label
  - External: https://playwright.dev/docs/test-assertions

  **Acceptance Criteria**:
  - [ ] `pnpm build && pnpm test:e2e` exits 0 locally
  - [ ] At least 1 spec passes; the second may skip if no login form on home

  **QA Scenarios**:

  ```
  Scenario: E2E smoke runs against built app
    Tool: Bash
    Steps:
      1. `pnpm build 2>&1 | tail -20 | tee .sisyphus/evidence/task-14-build.txt` → assert exit 0
      2. `SKIP_ENV_VALIDATION=true REGISTRY_URL=https://registry.test.local pnpm test:e2e --reporter=list 2>&1 | tee .sisyphus/evidence/task-14-e2e.txt`
      3. Assert exit 0; output shows "1 passed" or "2 passed" (skip allowed for 2nd)
    Expected Result: At least 1 E2E spec passes
    Evidence: .sisyphus/evidence/task-14-e2e.txt + task-14-build.txt

  Scenario: Spec doesn't depend on real registry
    Tool: Bash
    Steps:
      1. `grep -E "registry\\.example\\.com|hub\\.docker\\.com" e2e/smoke.spec.ts` → must exit 1 (no real URLs)
    Expected Result: No real registry URLs hardcoded
    Evidence: .sisyphus/evidence/task-14-no-real-urls.txt
  ```

  **Commit**: YES
  - Message: `test(e2e): smoke test for home and login`
  - Files: `e2e/smoke.spec.ts`, possibly remove `e2e/.gitkeep`
  - Pre-commit: `pnpm build && pnpm test:e2e`

- [x] 15. Add `pull_request` trigger and concurrency block to `push.yml`

  **What to do**:
  - Edit `.github/workflows/push.yml`:
    - Update `on:` block to add `pull_request: { branches: [main] }` alongside existing `push`/`workflow_dispatch`
    - Add top-level `concurrency` block:
      ```yaml
      concurrency:
        group: ${{ github.workflow }}-${{ github.ref }}
        cancel-in-progress: ${{ github.event_name == 'pull_request' }}
      ```
      (Don't cancel pushes to main — they trigger releases)
  - Verify YAML still parses

  **Must NOT do**:
  - Do NOT change `name` field
  - Do NOT remove `workflow_dispatch` or `push.branches.main`
  - Do NOT cancel-in-progress for `push` events (would interrupt releases)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: none

  **Parallelization**:
  - **Can Run In Parallel**: NO — sequential with T16-T18
  - **Parallel Group**: Wave 3 (sequential)
  - **Blocks**: T16, T17, T18
  - **Blocked By**: None (independent of test work, but ordered for clean diff)

  **References**:
  - `.github/workflows/push.yml:1-13` — existing `name`/`on` block
  - External: https://docs.github.com/en/actions/using-jobs/using-concurrency
  - External: https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#pull_request

  **Acceptance Criteria**:
  - [ ] `on:` includes `push`, `pull_request`, `workflow_dispatch`
  - [ ] Top-level `concurrency:` block present
  - [ ] `actionlint .github/workflows/push.yml` (or `npx -y action-validator`) passes

  **QA Scenarios**:

  ```
  Scenario: YAML valid + triggers correct
    Tool: Bash
    Steps:
      1. `pnpm dlx yaml-lint .github/workflows/push.yml || npx -y action-validator .github/workflows/push.yml 2>&1 | tee .sisyphus/evidence/task-15-yaml.txt`
      2. `yq '.on | keys' .github/workflows/push.yml` → output contains `pull_request`, `push`, `workflow_dispatch`
      3. `yq '.concurrency.group' .github/workflows/push.yml` → not null
    Expected Result: YAML valid; triggers and concurrency present
    Evidence: .sisyphus/evidence/task-15-yaml.txt
  ```

  **Commit**: YES
  - Message: `ci: add pull_request trigger and concurrency`
  - Files: `.github/workflows/push.yml`
  - Pre-commit: `npx -y action-validator .github/workflows/push.yml`

- [x] 16. Add `typecheck` and `test` jobs to `push.yml`

  **What to do**:
  - Append two new jobs after `format-check`:

    ```yaml
    typecheck:
      name: TypeScript Typecheck
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v6
        - uses: pnpm/action-setup@v4
        - uses: actions/setup-node@v6
          with:
            node-version: 22
            cache: pnpm
        - run: pnpm install --frozen-lockfile
        - run: pnpm typecheck

    test:
      name: Unit + Component Tests
      runs-on: ubuntu-latest
      env:
        SKIP_ENV_VALIDATION: "true"
        REGISTRY_URL: "https://registry.test.local"
      steps:
        - uses: actions/checkout@v6
        - uses: pnpm/action-setup@v4
        - uses: actions/setup-node@v6
          with:
            node-version: 22
            cache: pnpm
        - run: pnpm install --frozen-lockfile
        - run: pnpm test:coverage
        - uses: actions/upload-artifact@v4
          if: always()
          with:
            name: coverage-report
            path: coverage/
            retention-days: 7
    ```

  - Reuse existing pnpm + node setup pattern from `format-check` for consistency

  **Must NOT do**:
  - Do NOT add coverage thresholds
  - Do NOT bump `actions/checkout` or `actions/setup-node` versions (mirror existing `@v6`)
  - Do NOT remove or modify the `format-check` job

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high` — careful YAML, must mirror existing patterns
  - **Skills**: none

  **Parallelization**:
  - Wave 3; depends on T15

  **References**:
  - `.github/workflows/push.yml:14-26` — `format-check` job pattern to mirror
  - `.github/workflows/push.yml:21-24` — pnpm/node setup pattern
  - External: https://github.com/actions/upload-artifact

  **Acceptance Criteria**:
  - [ ] `jobs.typecheck` exists
  - [ ] `jobs.test` exists with `pnpm test:coverage` step + artifact upload
  - [ ] Both jobs use Node 22 + pnpm cache (matching `format-check`)
  - [ ] YAML syntactically valid

  **QA Scenarios**:

  ```
  Scenario: Jobs added with correct shape
    Tool: Bash
    Steps:
      1. `yq '.jobs | keys' .github/workflows/push.yml` → contains `typecheck`, `test`
      2. `yq '.jobs.test.steps[] | select(.run == "pnpm test:coverage") | .run' .github/workflows/push.yml` → output `pnpm test:coverage`
      3. `yq '.jobs.test.steps[] | select(.uses == "actions/upload-artifact@v4")' .github/workflows/push.yml` → not empty
      4. `npx -y action-validator .github/workflows/push.yml` → exit 0
    Expected Result: Both jobs present, coverage uploaded
    Evidence: .sisyphus/evidence/task-16-jobs.txt

  Scenario: format-check unchanged
    Tool: Bash
    Steps:
      1. `git show HEAD:.github/workflows/push.yml > /tmp/before.yml || true`
      2. `yq '.jobs."format-check"' .github/workflows/push.yml` → must equal pre-T16 content (manual eyeball during review; record diff)
      3. `git diff HEAD -- .github/workflows/push.yml | grep -E "^[-+].*format-check" | tee .sisyphus/evidence/task-16-format-untouched.txt`
      4. The diff for `format-check` job body must show no logic changes (only context lines)
    Expected Result: format-check job body untouched
    Evidence: .sisyphus/evidence/task-16-format-untouched.txt
  ```

  **Commit**: YES
  - Message: `ci: add typecheck and test jobs`
  - Files: `.github/workflows/push.yml`
  - Pre-commit: `npx -y action-validator .github/workflows/push.yml`

- [x] 17. Add `e2e` job with Playwright browser cache

  **What to do**:
  - Append `e2e` job to `push.yml`:
    ```yaml
    e2e:
      name: Playwright E2E
      runs-on: ubuntu-latest
      timeout-minutes: 20
      env:
        SKIP_ENV_VALIDATION: "true"
        REGISTRY_URL: "https://registry.test.local"
      steps:
        - uses: actions/checkout@v6
        - uses: pnpm/action-setup@v4
        - uses: actions/setup-node@v6
          with:
            node-version: 22
            cache: pnpm
        - run: pnpm install --frozen-lockfile
        - name: Get installed Playwright version
          id: pw-version
          run: echo "version=$(node -e "console.log(require('@playwright/test/package.json').version)")" >> "$GITHUB_OUTPUT"
        - name: Cache Playwright browsers
          id: pw-cache
          uses: actions/cache@v4
          with:
            path: ~/.cache/ms-playwright
            key: playwright-${{ runner.os }}-${{ steps.pw-version.outputs.version }}
        - if: steps.pw-cache.outputs.cache-hit != 'true'
          run: pnpm exec playwright install --with-deps chromium
        - if: steps.pw-cache.outputs.cache-hit == 'true'
          run: pnpm exec playwright install-deps chromium
        - run: pnpm build
        - run: pnpm test:e2e
        - uses: actions/upload-artifact@v4
          if: always()
          with:
            name: playwright-report
            path: playwright-report/
            retention-days: 7
    ```

  **Must NOT do**:
  - Do NOT install firefox/webkit (chromium only)
  - Do NOT skip browser cache (saves ~1min per run)
  - Do NOT run E2E against `pnpm dev`

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high` — multi-step CI job with caching nuance
  - **Skills**: none

  **Parallelization**: Wave 3; depends on T15

  **References**:
  - `.github/workflows/push.yml:14-26` — base pattern
  - External: https://playwright.dev/docs/ci-intro#caching-browsers — official cache pattern
  - External: https://github.com/actions/cache

  **Acceptance Criteria**:
  - [ ] `jobs.e2e` exists with build + test:e2e steps
  - [ ] Playwright browser cache step present
  - [ ] Report uploaded as artifact
  - [ ] `timeout-minutes: 20` set

  **QA Scenarios**:

  ```
  Scenario: e2e job shape correct
    Tool: Bash
    Steps:
      1. `yq '.jobs.e2e.steps[] | .run' .github/workflows/push.yml` → output contains `pnpm build` and `pnpm test:e2e`
      2. `yq '.jobs.e2e.steps[] | select(.uses == "actions/cache@v4")' .github/workflows/push.yml` → not empty
      3. `yq '.jobs.e2e.steps[] | select(.name == "Cache Playwright browsers") | .with.path' .github/workflows/push.yml` → output `~/.cache/ms-playwright`
      4. `yq '.jobs.e2e."timeout-minutes"' .github/workflows/push.yml` → output `20`
      5. `npx -y action-validator .github/workflows/push.yml` → exit 0
    Expected Result: All checks pass
    Evidence: .sisyphus/evidence/task-17-e2e-job.txt
  ```

  **Commit**: YES
  - Message: `ci: add playwright e2e job`
  - Files: `.github/workflows/push.yml`
  - Pre-commit: `npx -y action-validator .github/workflows/push.yml`

- [x] 18. Gate `release` and `docker-force-push` on new jobs

  **What to do**:
  - Edit `.github/workflows/push.yml`:
    - `jobs.release.needs`: change from `format-check` to `[format-check, typecheck, test, e2e]`
    - `jobs.docker-force-push.needs`: change from `format-check` to `[format-check, typecheck, test, e2e]`
    - Do NOT modify any other field of these jobs (steps, env, permissions, if conditions)

  **Must NOT do**:
  - Do NOT change `release.permissions` block
  - Do NOT change `release.if` (`github.event_name == 'push'`) or `docker-force-push.if`
  - Do NOT touch `docker-push.needs` (it already chains via `release`)
  - Do NOT add new env vars to existing release steps

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: none

  **Parallelization**: Wave 3; depends on T16, T17

  **References**:
  - `.github/workflows/push.yml:31` — `release.needs: format-check`
  - `.github/workflows/push.yml:83` — `docker-force-push.needs: format-check`
  - External: https://docs.github.com/en/actions/using-jobs/using-jobs-in-a-workflow#defining-prerequisite-jobs

  **Acceptance Criteria**:
  - [ ] `jobs.release.needs` is `[format-check, typecheck, test, e2e]`
  - [ ] `jobs.docker-force-push.needs` is `[format-check, typecheck, test, e2e]`
  - [ ] `actionlint` / `action-validator` passes
  - [ ] Diff shows ONLY `needs:` line changes for these two jobs

  **QA Scenarios**:

  ```
  Scenario: needs arrays updated
    Tool: Bash
    Steps:
      1. `yq '.jobs.release.needs | sort' .github/workflows/push.yml` → output `["e2e","format-check","test","typecheck"]`
      2. `yq '.jobs."docker-force-push".needs | sort' .github/workflows/push.yml` → output `["e2e","format-check","test","typecheck"]`
      3. `git diff HEAD~1 -- .github/workflows/push.yml | grep -E "^[-+]" | grep -v "^[-+]{3}" | grep -vE "needs:" | grep -vE "^[-+]\\s*$" | tee .sisyphus/evidence/task-18-diff.txt`
      4. The filtered diff should be empty or contain only context — flag if release/docker-force-push body changed
    Expected Result: Only needs arrays changed
    Evidence: .sisyphus/evidence/task-18-diff.txt

  Scenario: Workflow valid
    Tool: Bash
    Steps:
      1. `npx -y action-validator .github/workflows/push.yml 2>&1 | tee .sisyphus/evidence/task-18-validator.txt` → exit 0
    Expected Result: Valid
    Evidence: .sisyphus/evidence/task-18-validator.txt
  ```

  **Commit**: YES
  - Message: `ci: gate release and docker on test jobs`
  - Files: `.github/workflows/push.yml`
  - Pre-commit: `npx -y action-validator .github/workflows/push.yml`

- [x] 19. Add "Testing" section to README

  **What to do**:
  - Read existing `README.md`
  - Append a `## Testing` section after existing content:

    ```markdown
    ## Testing

    This project uses **Vitest** for unit / component / server-action tests and **Playwright** for end-to-end tests.

    ### Commands

    | Command              | Purpose                                           |
    | -------------------- | ------------------------------------------------- |
    | `pnpm test`          | Run unit + component tests once                   |
    | `pnpm test:watch`    | Run Vitest in watch mode                          |
    | `pnpm test:coverage` | Run tests with V8 coverage; outputs `coverage/`   |
    | `pnpm test:e2e`      | Run Playwright E2E (builds the app and starts it) |
    | `pnpm test:e2e:ui`   | Run Playwright in UI mode for debugging           |

    ### Layout

    - `src/**/*.test.{ts,tsx}` — Vitest unit + component tests, colocated with source
    - `e2e/*.spec.ts` — Playwright end-to-end specs

    ### CI

    On every pull request and push to `main`, GitHub Actions runs `format-check`, `typecheck`, `test`, and `e2e` jobs.
    Coverage and Playwright reports are uploaded as workflow artifacts (7-day retention).
    Releases and Docker pushes only run after all four checks pass.
    ```

  - Do NOT remove or rewrite existing README content

  **Must NOT do**:
  - Do NOT change project description, install instructions, or screenshots
  - Do NOT add badges (out of scope)
  - Do NOT add language other than English

  **Recommended Agent Profile**:
  - **Category**: `writing`
  - **Skills**: none

  **Parallelization**: Wave 4; independent (only requires final scripts to be settled)

  **References**:
  - `README.md` — read full file before appending

  **Acceptance Criteria**:
  - [ ] `README.md` contains heading `## Testing`
  - [ ] All 5 scripts mentioned
  - [ ] CI behavior described

  **QA Scenarios**:

  ```
  Scenario: README has testing section
    Tool: Bash
    Steps:
      1. `grep -E "^## Testing$" README.md` → exit 0
      2. `for cmd in test test:watch test:coverage test:e2e test:e2e:ui; do grep -F "pnpm $cmd" README.md || (echo "missing $cmd" && exit 1); done` → exit 0
    Expected Result: Heading and all 5 scripts mentioned
    Evidence: .sisyphus/evidence/task-19-readme.txt
  ```

  **Commit**: YES
  - Message: `docs: add testing section to README`
  - Files: `README.md`
  - Pre-commit: none

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.
> **Do NOT auto-proceed after verification. Wait for user's explicit approval.**

- [ ] F1. **Plan Compliance Audit** — `oracle`
      Read this plan end-to-end. For each "Must Have": verify it exists (read file, run command). For each "Must NOT Have": grep codebase for forbidden patterns — reject with file:line if found (especially: coverage thresholds in vitest.config.ts, removed `format-check` job, modified semantic-release config, `as any` in test files, Next/React/TS version bumps, renamed `push.yml`). Verify evidence files exist in `.sisyphus/evidence/`. Compare deliverables against plan.
      Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
      Run `pnpm typecheck`, `pnpm format:check`, `pnpm test --run`, `pnpm test:e2e`. Review all new files for: `as any`/`@ts-ignore`, empty catches, console.log, commented-out code, unused imports, generic names (`data/result/item/temp/helper`), excessive comments, premature abstraction. Verify YAML syntax via `actionlint .github/workflows/push.yml` (install if missing).
      Output: `Typecheck [PASS/FAIL] | Format [PASS/FAIL] | Tests [N/N] | E2E [N/N] | actionlint [PASS/FAIL] | Files [N clean/N issues] | VERDICT`

- [ ] F3. **Real Manual QA** — `unspecified-high`
      From clean state: `rm -rf node_modules .next && pnpm install --frozen-lockfile`. Execute every QA scenario from every task in order. Cross-task integration: confirm `pnpm test --coverage` produces `coverage/`, `pnpm test:e2e` produces `playwright-report/`, both gitignored. Edge cases: run `pnpm test` with `REGISTRY_URL` unset (must still pass via `SKIP_ENV_VALIDATION` or fixture). Save evidence to `.sisyphus/evidence/final-qa/`.
      Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`
      For each task: read "What to do", read actual git diff. Verify 1:1 — every spec item built, nothing beyond spec built. Check "Must NOT do" compliance — flag any source file under `src/**/*.{ts,tsx}` (non-test) modified, any `package.json` `dependencies` changed (only `devDependencies` should grow, plus `scripts`), any change to existing CI jobs `format-check` / `release` body / `docker-force-push` body beyond their `needs:` array. Detect cross-task contamination.
      Output: `Tasks [N/N compliant] | Source Untouched [Y/N] | Existing Jobs Intact [Y/N] | Contamination [CLEAN/N issues] | VERDICT`

---

## Commit Strategy

One commit per task, conventional-commits style (semantic-release-compatible):

- **T1**: `chore(test): install vitest + react testing library`
- **T2**: `chore(test): install playwright`
- **T3**: `chore(test): add vitest config`
- **T4**: `chore(test): add vitest setup with global mocks`
- **T5**: `chore(test): add playwright config`
- **T6**: `chore(test): include test files in tsconfig`
- **T7**: `test(lib): unit tests for utils`
- **T8**: `test(lib): unit tests for urls`
- **T9**: `test(lib): unit tests for registry client`
- **T10**: `test(hooks): unit tests for use-async-data`
- **T11**: `test(ui): component tests for button`
- **T12**: `test(components): component tests for login form`
- **T13**: `test(actions): tests for server actions`
- **T14**: `test(e2e): smoke test for home and login`
- **T15**: `ci: add pull_request trigger and concurrency`
- **T16**: `ci: add typecheck and test jobs`
- **T17**: `ci: add playwright e2e job`
- **T18**: `ci: gate release and docker on test jobs`
- **T19**: `docs: add testing section to README`

Pre-commit gate per task: `pnpm typecheck && pnpm test --run` (E2E only on T14, T17, F-jobs).

---

## Success Criteria

### Verification Commands

```bash
# Install clean
rm -rf node_modules && pnpm install --frozen-lockfile         # Expected: success

# All test layers
pnpm typecheck                                                # Expected: exit 0
pnpm test --run                                               # Expected: ≥7 tests pass
pnpm test:coverage                                            # Expected: coverage/ exists
pnpm build && pnpm test:e2e                                   # Expected: ≥1 spec pass

# CI workflow syntax
npx -y action-validator .github/workflows/push.yml            # Expected: valid
# Or:
npx -y @action-validator/cli .github/workflows/push.yml

# Workflow shape
yq '.on | keys' .github/workflows/push.yml                    # Expected: includes pull_request
yq '.jobs.release.needs' .github/workflows/push.yml           # Expected: contains test, typecheck, e2e
yq '.jobs | keys' .github/workflows/push.yml                  # Expected: includes typecheck, test, e2e

# Source untouched
git diff main -- 'src/**/*.ts' 'src/**/*.tsx' ':!src/**/*.test.*'  # Expected: empty
```

### Final Checklist

- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent
- [ ] `pnpm test` runs ≥7 tests, all pass
- [ ] `pnpm test:e2e` runs ≥1 spec, all pass
- [ ] `pnpm typecheck` includes test files, exit 0
- [ ] `push.yml` has `pull_request` trigger
- [ ] `release` job depends on `[format-check, typecheck, test, e2e]`
- [ ] Coverage artifact uploaded in CI
- [ ] README has "Testing" section
- [ ] No `src/**/*` non-test files modified
- [ ] No production `dependencies` added
- [ ] Existing `format-check`, `release`, `docker-push`, `docker-force-push` job bodies unchanged (only `needs:` arrays updated)
