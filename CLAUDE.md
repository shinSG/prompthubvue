# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PromptHub is a local-first, cross-platform AI prompt and skill management platform. It exists as two deployable apps (desktop Electron + self-hosted web) sharing a common database and types layer.

- **License:** AGPL-3.0
- **Package Manager:** pnpm 9.15+ (monorepo workspaces)

## Monorepo Structure

```
apps/
  desktop/     # Electron desktop app (main + renderer processes)
  web/         # Self-hosted web app (Hono server + React SPA)
packages/
  db/          # Shared database layer (schema, adapter, CRUD classes)
  shared/      # Shared TypeScript types and constants
```

## Key Commands

### Desktop App (apps/desktop)

```bash
pnpm electron:dev          # Start dev server (Vite + Electron)
pnpm build                 # Build for production
pnpm test -- --run         # Run all unit tests (Vitest)
pnpm test -- <path> --run  # Run single test file
pnpm lint                  # Run ESLint
pnpm format                # Format with Prettier
pnpm typecheck             # TypeScript type checking
```

### Web App (apps/web)

```bash
pnpm dev:web               # Start dev (Hono server + Vite client)
pnpm build:web             # Build client + server
pnpm test:web              # Run tests (Vitest)
pnpm lint:web              # Run ESLint
pnpm typecheck:web         # TypeScript type checking
pnpm verify:web            # Full verification (lint + typecheck + test + build)
```

### Running Web App Tests

```bash
# From monorepo root
pnpm test:web

# From apps/web directory
pnpm test

# Single file
cd apps/web && pnpm test -- src/routes/auth.test.ts
```

## Architecture

### Desktop App (Electron)

Standard Electron process model:
- **Main Process** (`src/main/`): SQLite database, IPC handlers, security (AES-256-GCM encryption), services
- **Renderer Process** (`src/renderer/`): React SPA, Zustand stores, frontend services
- **Preload** (`src/preload/`): Bridges main/renderer via `contextBridge`
- **IPC Pattern**: `window.api.method()` → `ipcRenderer.invoke(channel)` → `ipcMain.handle(channel, handler)`

### Web App (Hono Server + React)

- **Server** (`src/`): Hono HTTP framework, JWT auth, rate limiting, security headers
- **Client** (`src/client/`): React SPA with React Router, protected routes
- **Auth**: JWT access/refresh tokens, bcrypt password hashing, rate limiting per endpoint
- **Database**: SQLite via `node-sqlite3-wasm` (WASM-based, no native dependencies)

### Shared Packages

- **@prompthub/db**: Database adapter, schema definitions, CRUD classes (PromptDB, FolderDB, SkillDB). Uses `node-sqlite3-wasm` for web, `better-sqlite3` for desktop.
- **@prompthub/shared**: TypeScript types and constants (IPC channels, platforms, skill registry)

### Data Layer

- SQLite with FTS5 for full-text search
- Schema migrations in `packages/db/src/init.ts`
- Web app uses JWT-based auth with refresh tokens
- Desktop app uses master password encryption

## Key Conventions

### Internationalization (i18n)

- **All user-facing strings must use i18n** via `react-i18next`
- Supported locales: `en`, `zh`, `zh-TW`, `ja`, `fr`, `de`, `es`
- Use `const { t } = useTranslation()` and dot-notation keys (e.g., `folder.create`)
- When adding a new key, update ALL 7 locale files

### TypeScript

- Strict mode, no `any` type (ESLint enforced)
- No `@ts-ignore` or `@ts-expect-error` — fix the underlying issue
- Explicit return types on exported functions
- Path aliases: `@/` for main, `@renderer/` for renderer, `@shared/` for shared types

### Styling

- Tailwind CSS exclusively (no inline styles)
- Design tokens: `bg-card`, `text-muted-foreground`, `border-border`
- Dark/light mode via CSS variables and `dark:` prefix
- Icons: `lucide-react` only

### IPC Development (Desktop Only)

When adding a new IPC endpoint:
1. Define channel in `packages/shared/constants/ipc-channels.ts`
2. Define types in `packages/shared/types/`
3. Implement handler in `apps/desktop/src/main/ipc/`
4. Expose in preload (`apps/desktop/src/preload/index.ts`)
5. Call from renderer via `window.api.newMethod()`

### Database

- All SQL queries must use parameterized placeholders (`?`)
- Foreign keys enforced with explicit `ON DELETE` behavior
- Multi-step operations wrapped in `db.transaction()`
- FTS index kept in sync when updating prompts
- Schema changes require migration in `packages/db/src/init.ts`

### Testing

- **Desktop**: Vitest (unit), Playwright (E2E)
- **Web**: Vitest with `node` environment (server tests), `jsdom` environment (client tests)
- Database tests MUST use real in-memory SQLite, not mocks
- No `expect(result).toBeDefined()` — assert specific values
- Run full suite after changes: `pnpm test -- --run` (desktop) or `pnpm test:web` (web)

### Documentation System

Non-trivial work requires change folders under `spec/changes/active/<change-key>/` with:
1. `proposal.md` — why the change exists
2. `specs/<domain>/spec.md` — behavior delta
3. `design.md` — technical approach
4. `tasks.md` — implementation checklist
5. `implementation.md` — what actually shipped

### Git & Commits

- Conventional Commits: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`
- Imperative mood: "add feature" not "added feature"
- All tests and lint must pass before committing
- Never auto-commit without explicit user instruction

## Known Gotchas

- **SQLite null bytes**: `node-sqlite3-wasm` truncates at `\x00` — strip from user input
- **FTS5 operators**: Search queries with `AND`, `OR`, `NOT`, `NEAR`, `*`, `^`, `"` are FTS5 operators and may cause syntax errors if not escaped
- **Electron IPC**: Objects are serialized (structured clone) — functions/class instances cannot cross IPC boundary
- **Web auth**: First admin created via `/setup` endpoint, not registration (registration disabled by default)
- **Database drivers**: Desktop uses `better-sqlite3` (native), web uses `node-sqlite3-wasm` (WASM). SQL must be compatible with both.
