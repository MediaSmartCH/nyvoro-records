# Nyvoro Records

## Overview
Nyvoro Records is a bilingual (EN/FR) Node.js web platform for an independent music label.
The V1 includes:
- artist and release showcase,
- a detailed "Join the Label" application form,
- anti-spam protections (Turnstile + honeypot + rate limiting),
- legal pages (legal notice, privacy policy, terms).

## Stack
- Frontend: React + Vite + TypeScript + React Router
- Backend: Node.js + Express + TypeScript
- Validation: Zod (shared schema)
- Persistence: SQLite (`apps/api/data/nyvoro.db`)
- Email: Nodemailer (SMTP compatible, ProtonMail bridge ready)
- Monorepo: pnpm workspaces
- Local containers: Docker Compose (`web`, `api`, `mailhog`)
- CI: GitHub Actions

## Architecture
- `apps/web`: UI, localized routes (`/en`, `/fr`), join form
- `apps/api`: REST API, security middleware, SQLite storage, SMTP notifications
- `packages/content`: JSON-driven content (artists, releases, translations, legal pages)
- `packages/shared-types`: shared schemas and TypeScript types used by web and API

The API can serve the built frontend in production (`SERVE_WEB_DIST=true`), which matches a single-process Node deployment on Infomaniak.

## Prerequisites
- Node.js 20+
- pnpm 10+
- Docker + Docker Compose (for containerized local run)

## Setup (Local)
1. Clone the repository.
2. Install dependencies:
   ```bash
   make install
   ```
3. Create local environment file:
   ```bash
   make env
   ```
4. Validate environment:
   ```bash
   make check-env
   ```

## Run (Local)
1. Start web + API in development:
   ```bash
   make dev
   ```
2. Open frontend: `http://localhost:5173`
3. API health check: `http://localhost:4000/api/v1/health`
4. MailHog UI (if using Docker SMTP target): `http://localhost:8025`

## Run (Docker)
1. Ensure `.env` exists:
   ```bash
   make env
   ```
2. Start stack:
   ```bash
   make docker-up
   ```
3. Follow logs:
   ```bash
   make docker-logs
   ```
4. Stop stack:
   ```bash
   make docker-down
   ```
5. Reset stack + volumes:
   ```bash
   make docker-reset
   ```

## Environment Variables
Copy `.env.example` to `.env` and update values.

Key variables:
- `PORT`: API port (default `4000`)
- `API_ALLOWED_ORIGINS`: CORS allowlist
- `DATABASE_URL`: SQLite database file path
- `TURNSTILE_SITE_KEY`: Cloudflare Turnstile site key (frontend)
- `TURNSTILE_SECRET_KEY`: Cloudflare Turnstile secret key (backend)
- `TURNSTILE_BYPASS`: `true` for local/dev bypass only
- `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX`: API anti-abuse settings
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
- `APPLICATION_RECIPIENT_EMAIL`: destination inbox for label applications (default `demo@nyvoro-records.com`)
- `IP_HASH_SALT`: salt for anonymized IP hashing
- `VITE_API_BASE_URL`: API base URL used by frontend
- `VITE_TURNSTILE_SITE_KEY`: same site key exposed to frontend
- `VITE_CONTACT_EMAIL`, `VITE_PRESS_EMAIL`, `VITE_DEMO_EMAIL`: public label emails shown on the contact page
- `VITE_APPLICATION_RECIPIENT_EMAIL`: frontend reference for the application inbox
- Artist inboxes follow `<artist-id>@nyvoro-records.com` (example: `lumeno@nyvoro-records.com`)

## Scripts and Make Targets
Primary Make targets:
- `make help`
- `make setup`
- `make install`
- `make update`
- `make dev`
- `make start`
- `make build`
- `make clean`
- `make test`
- `make lint`
- `make format`
- `make typecheck`
- `make docker-up`
- `make docker-down`
- `make docker-logs`
- `make docker-rebuild`
- `make docker-reset`
- `make env`
- `make check-env`

## Deployment (Infomaniak + GitHub)
This repository is compatible with Infomaniak Node.js advanced install via Git.

Suggested production flow:
1. Push `main` branch to GitHub.
2. In Infomaniak Node setup, choose **Git** source and link repository.
3. Use Node 20 LTS.
4. Build command:
   ```bash
   pnpm install --frozen-lockfile && pnpm build
   ```
5. Start command:
   ```bash
   pnpm start
   ```
6. Set `SERVE_WEB_DIST=true` in Infomaniak environment variables.
7. Configure all production secrets (Turnstile + SMTP + IP salt).

## Testing
Run all checks:
```bash
make lint
make typecheck
make test
make build
```

## Troubleshooting
- **`pnpm` not found**: run `corepack enable` then retry.
- **Captcha fails locally**: set `TURNSTILE_BYPASS=true` in `.env`.
- **No email received**: verify SMTP credentials and check API logs.
- **CORS error**: ensure frontend origin is present in `API_ALLOWED_ORIGINS`.
- **SQLite permission error**: verify write access to `apps/api/data/`.

## Project Structure
```text
.
├── apps
│   ├── api
│   └── web
├── packages
│   ├── content
│   └── shared-types
├── scripts
├── .github/workflows
├── compose.yaml
├── Makefile
└── README.md
```
