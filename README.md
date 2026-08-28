# ITDB Server Monitor — Web Console

The web dashboard for the **ITDB (Innovation and Technology Bureau) Server Monitoring System**.
It is the operator-facing console: a React single-page application that talks to the Server-Monitor
backend API to display server health, alerts, backups, thresholds, reports, users, and audit logs.

> This app is the **console only**. It does not collect metrics itself. Metrics are pushed to the
> backend by **agents** installed on each monitored server; this frontend reads and manages that data
> through the backend's REST API.



---

## Table of contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Getting started](#getting-started)
- [Configuration](#configuration)
- [Available scripts](#available-scripts)
- [Project structure](#project-structure)
- [Architecture at a glance](#architecture-at-a-glance)
- [Authentication & permissions](#authentication--permissions)
- [Theming](#theming)
- [Backend API](#backend-api)
- [Building & deployment](#building--deployment)
- [Notes on dependencies](#notes-on-dependencies)
- [Further reading](#further-reading)

---

## Features

- **Dashboard** — at-a-glance estate summary: server counts, agent verification status, open/critical
  alert counts, criticality mix, and the most recent open alerts.
- **Server inventory** — searchable, filterable table of all servers and grouping containers; create,
  edit, and remove servers; rotate agent tokens.
- **Server detail** — per-server (or per-group roll-up) health charts (CPU / memory / disk over 7 or
  30 days), backup history with staleness warnings, and related open alerts.
- **Alerts** — filterable, paginated alert log with acknowledge / resolve actions and deep-linking
  from a specific server.
- **Thresholds** — define the warning/critical rules (CPU, memory, disk, backup age) that raise alerts,
  globally or per server.
- **Reports** — generate and download Health or Backups reports (PDF / Excel) by range and scope.
- **Users** *(admin)* — manage accounts and roles, with secure password generation and one-time
  credential hand-off.
- **Audit logs** *(admin)* — read-only record of privileged actions with full metadata.
- **Settings** — profile & permissions overview, light/dark theme, and agent-onboarding reference.
- **Role-based access control** — the UI shows only what your permissions allow; the backend enforces
  it on every request.
- **Light & dark themes** with no flash-on-load, and a responsive layout down to mobile.

---

## Tech stack

| Concern | Choice |
|---|---|
| UI library | **React 19** |
| Language | **TypeScript 5.8** |
| Build tool / dev server | **Vite 6** |
| Styling | **Tailwind CSS 4** (via `@tailwindcss/vite`) |
| Icons | **lucide-react** |
| Charts | **recharts** |
| Animation | **motion** |
| Routing | Custom hash router (`src/router.ts`) — no external router |
| Data fetching | Custom `useApi` hook + a hand-written `fetch` client — no external data library |
| State | React Context (auth, theme, toasts) — no Redux |

---

## Prerequisites

- **Node.js 18+** (20+ recommended) and **npm**.
- Network access to a running Server-Monitor **backend** (or use the default hosted instance).

---

## Getting started

```bash
# 1. Install dependencies
npm install

# 2. (Optional) point the app at a specific backend
cp .env.example .env
#   then edit VITE_API_BASE_URL in .env

# 3. Start the dev server (http://localhost:3000)
npm run dev
```

Sign in with credentials issued by a backend administrator. There is **no public self-registration** —
accounts are created by admins from the Users screen.

> **First request may be slow.** If you use the default hosted backend (a free tier), the first API
> call after it has been idle can take 30–60 seconds while the instance cold-starts. Subsequent
> requests are fast. This is a backend hosting characteristic, not a bug in the app.

---

## Configuration

All configuration is via a single environment variable, read at build time by Vite.

| Variable | Required | Default | Description |
|---|---|---|---|
| `VITE_API_BASE_URL` | No | `https://server-monitor-skil.onrender.com` | Base URL of the Server-Monitor backend API. |

- Copy `.env.example` → `.env` and set the value to your backend's URL (no trailing slash needed —
  it's stripped automatically).
- Because Vite inlines `VITE_*` variables at build time, **rebuild** after changing this for a
  production bundle. In dev, restart `npm run dev`.
- The resolved value and its fallback live in [src/api/client.ts](src/api/client.ts).

---

## Available scripts

| Script | Command | What it does |
|---|---|---|
| `npm run dev` | `vite --port=3000 --host=0.0.0.0` | Start the dev server with hot-reload on port 3000 (bound to all interfaces). |
| `npm run build` | `vite build` | Produce the optimized production bundle in `dist/`. |
| `npm run preview` | `vite preview` | Serve the built `dist/` locally to verify the production build. |
| `npm run lint` | `tsc --noEmit` | Type-check the whole project. **Run this to confirm nothing is broken.** |
| `npm run clean` | `rm -rf dist server.js` | Remove build artifacts. |

There is currently no unit-test suite; `npm run lint` (the TypeScript compiler in no-emit mode) is the
project's correctness gate.

---

## Project structure

```
src/
├── main.tsx              Entry point — mounts <App/>
├── App.tsx               Root: providers, login gate, route → page switch
├── index.css             Tailwind import, theme tokens, global polish
├── types.ts              All data shapes (mirrors the backend contract)
├── router.ts             Hash router: parseHash / navigate / useRoute
├── navigation.ts         NAV_ITEMS — single source of truth for menu + guards
│
├── api/                  Backend communication
│   ├── client.ts         fetch wrapper: envelope unwrap, 401 refresh+retry, ApiError
│   ├── tokenStore.ts     localStorage token persistence
│   └── auth · servers · alerts · thresholds · users · audit · reports
│
├── context/              App-wide state (React Context)
│   ├── AuthContext.tsx   user, status, login/logout, can()
│   ├── ThemeContext.tsx  light/dark
│   └── ToastContext.tsx  transient notifications
│
├── hooks/useApi.ts       Reusable data-fetch hook (data/loading/error/reload)
│
├── utils/
│   ├── formatters.ts     Human-readable dates, bytes, %, badge-variant mappers
│   └── validation.ts     Email / IP-or-hostname checks
│
├── components/
│   ├── Auth/             LoginPage
│   ├── Layout/           Layout, Sidebar, Header (the app frame)
│   ├── Common/           Badge, Modal, Spinner, EmptyState, ErrorState,
│   │                     ConfirmDialog, Pagination, ToastContainer, ITDBLogo
│   ├── Dashboard/        DashboardOverview
│   ├── Inventory/        ServerInventoryView
│   └── Servers/          ServerForm, AgentTokenModal, verification badge
│
└── pages/                Top-level screens
    ├── Servers/          ServerDetailView
    ├── Alerts/ · Thresholds/ · Reports/ · Users/ · Audit/ · Settings/
```

See [WALKTHROUGH.md](WALKTHROUGH.md) for a narrated tour of each of these.

---

## Architecture at a glance

- **Single-page app.** One HTML shell ([index.html](index.html)); [src/main.tsx](src/main.tsx) mounts
  [src/App.tsx](src/App.tsx), which composes three providers (Theme → Auth → Toast) around an
  `AppShell` that gates on auth state and renders the routed page.
- **Hash routing.** [src/router.ts](src/router.ts) maps `#/tab` and `#/tab/id` to a
  `{ tab, id }` route. `navigate()` changes the hash; `useRoute()` re-renders on change. No page reloads.
- **One nav source of truth.** [src/navigation.ts](src/navigation.ts) (`NAV_ITEMS`) drives both the
  sidebar menu and the per-route permission guard in `App.tsx`, so they can't drift apart.
- **Typed API layer.** Components never write raw URLs; they call typed functions in `src/api/*` that
  go through [src/api/client.ts](src/api/client.ts).
- **Consistent data flow.** List screens use [useApi](src/hooks/useApi.ts) and the
  loading → error → empty → data pattern; filters live in one object and drive re-fetch via
  dependency changes.

---

## Authentication & permissions

- **Login** issues an **access token** (short-lived, sent as `Authorization: Bearer` on every request)
  and a **refresh token**, persisted in `localStorage` by [src/api/tokenStore.ts](src/api/tokenStore.ts).
- **Session restore.** On reload, the app re-hydrates from stored tokens by calling `GET /auth/me`
  (a brief "Restoring your session…" screen).
- **Transparent refresh.** A `401` triggers a **single-flight** `POST /auth/refresh` and one automatic
  retry; if refresh fails, tokens are cleared and the user is returned to login — see
  [src/api/client.ts](src/api/client.ts).
- **RBAC.** `/auth/me` returns a permission map; `can('resource:action')` in
  [AuthContext](src/context/AuthContext.tsx) gates menu items, routes, and write actions. The frontend
  guard is UX only — the backend is the real authority.

Roles: **ADMIN**, **OPERATOR**, **VIEWER**.

---

## Theming

- Light/dark, persisted in `localStorage` (`govmonitor_theme`), defaulting to the OS preference.
- A small inline script in [index.html](index.html) applies the saved theme **before** React loads to
  prevent a flash of the wrong theme (FOUC). The same logic lives in
  [ThemeContext](src/context/ThemeContext.tsx) — keep the two in sync if you change it.
- Theme tokens and global polish (scrollbars, focus rings, font smoothing) are in
  [src/index.css](src/index.css).

---

## Backend API

- The client targets the backend root path and unwraps the standard `{ success, data }` envelope,
  raising a typed `ApiError` (tolerant of both nested and flat error shapes) on failure.
- **Agent-only endpoints** (`POST /api/v1/agent/register`, `POST /api/v1/health`) are how servers
  report in and are **never** called from this browser app, by design.
- Some backend capabilities referenced by the domain (e.g. email delivery of credentials) are not
  built server-side; the UI reflects this honestly (e.g. one-time manual credential hand-off in Users)
  rather than pretending the feature exists.

The full set of data shapes the frontend expects is in [src/types.ts](src/types.ts).

---

## Building & deployment

```bash
npm run build     # → dist/  (static assets)
npm run preview   # verify the production build locally
```

The output in `dist/` is a fully static bundle — deploy it to any static host or CDN (Netlify, Vercel,
S3+CloudFront, nginx, etc.). Two things to remember:

1. Set `VITE_API_BASE_URL` **before** building for the target environment (it's inlined at build time).
2. Routing is hash-based (`/#/servers`), so **no server-side rewrite rules are required** — every URL
   is served by the same `index.html`.

---

## Notes on dependencies

This project was scaffolded from an AI Studio template, which left a few packages in
[package.json](package.json) that the application **does not import or use**:

- `@google/genai`, `express`, `dotenv` (dependencies)
- `@types/express`, `tsx` (devDependencies)

They are safe to remove if you want a leaner install; the app builds and runs without them.

A production build currently emits a chunk-size warning (~850 kB) driven by `recharts` and `motion`.
It's functional as-is; code-splitting those routes would address the warning if desired.

---


