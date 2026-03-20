# Nyvoro Records

## Overview
Nyvoro Records is a bilingual (EN/FR) Node.js web platform for an independent music label.
The V1 includes:
- artist and release showcase,
- a detailed "Join the Label" application form,
- dual transactional emails on submission (internal structured review + applicant acknowledgement),
- magic-link application profiles (public view link + private edit link),
- role-based login with artist self-registration and internal admin provisioning (password hash + Turnstile + HttpOnly session cookie),
- protected dashboards for admins and artists,
- admin MFA challenge at login when MFA is enabled, with optional artist MFA from account settings,
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
- `apps/web`: UI, localized routes (`/en`, `/fr`), join form, login/register pages, and protected dashboards (`/:locale/admin/dashboard`, `/:locale/artist/dashboard`)
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
5. Create at least one admin account explicitly:
   ```bash
   make auth-create-user ROLE=admin EMAIL='admin@nyvoro-records.com' PASSWORD='AdminStrongPassword!2026'
   ```

## Run (Local)
1. Start web + API in development:
   ```bash
   make dev
   ```
2. Open frontend: `http://localhost:5173`
3. API health check: `http://localhost:4000/api/v1/health`
4. MailHog UI (if using Docker SMTP target): `http://localhost:8025`
5. Login page: `http://localhost:5173/en/login`
6. Artist self-registration page: `http://localhost:5173/en/register`
7. Admin dashboard (protected): `http://localhost:5173/en/admin/dashboard`
8. Artist dashboard (protected): `http://localhost:5173/en/artist/dashboard`

### Local Access Model
- Admin accounts are created internally with `make auth-create-user`.
- Artist accounts can be created from the public `/en/register` page.
- If an admin enables MFA from account settings, the next login requires a 6-digit TOTP code.

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
4. Create an admin account inside the API container:
   ```bash
   docker compose exec api pnpm --filter @nyvoro/api auth:create-user -- --role admin --email admin@nyvoro-records.com --password AdminStrongPassword!2026
   ```
5. Stop stack:
   ```bash
   make docker-down
   ```
6. Reset stack + volumes:
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
- `MAIL_LOGO_URL`: public logo URL rendered in notification emails
- `TRUST_PROXY`: Express trusted proxy setting (`false` locally, or `1`/provider-specific value behind a reverse proxy)
- `IP_HASH_SALT`: salt for anonymized IP hashing
- `MAGIC_LINK_SALT`: salt used to hash application magic-link tokens
- `AUTH_SESSION_SECRET`: secret used to sign secure auth session cookies (set a long random value in production)
- `AUTH_SESSION_TTL_MINUTES`: secure session lifetime
- `AUTH_RATE_LIMIT_WINDOW_MS`, `AUTH_RATE_LIMIT_MAX`: auth endpoint anti-bruteforce settings
- Production startup now fails fast when placeholder values are kept for `TURNSTILE_SECRET_KEY`, `SMTP_USER`, `SMTP_PASS`, `IP_HASH_SALT`, `MAGIC_LINK_SALT`, or `AUTH_SESSION_SECRET`.
- Admin and artist accounts are no longer seeded from environment variables. Create them explicitly with `make auth-create-user` or the public artist register page.
- `PUBLIC_WEB_BASE_URL`: base URL used to generate magic-link profile URLs
- `VITE_API_BASE_URL`: API base URL used by frontend
- `VITE_TURNSTILE_SITE_KEY`: same site key exposed to frontend
- `VITE_TURNSTILE_BYPASS`: set `true` in local development to hide Turnstile widgets on web forms
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
- `make auth-hash-password PASSWORD='YourStrongPassword123!'`
- `make auth-create-user ROLE=admin EMAIL='admin@example.com' PASSWORD='YourStrongPassword123!'`
- `make vercel-link`
- `make vercel-env-pull`
- `make vercel-env-pull-preview`
- `make vercel-env-pull-production`
- `make vercel-pull-preview`
- `make vercel-pull-production`
- `make vercel-deploy-preview`
- `make vercel-deploy-production`

Generate secure password hashes for manual verification or external integrations:
```bash
make auth-hash-password PASSWORD='YourStrongPassword123!'
```

Create explicit auth users from the CLI:
```bash
make auth-create-user ROLE=admin EMAIL='admin@example.com' PASSWORD='YourStrongPassword123!'
make auth-create-user ROLE=artist EMAIL='artist@example.com' PASSWORD='YourStrongPassword123!'
```

## Deployment (Vercel + GitHub)
The repository now includes `vercel.json` at root to lock build/runtime behavior for Vercel:
- install: `pnpm install --frozen-lockfile`
- build: `pnpm --filter @nyvoro/web build`
- output: `apps/web/dist`

Important project settings in Vercel:
1. Root Directory: repository root (`.`)
2. Production Branch: `main`
3. Node.js version: `20.x` or `22.x` LTS

### Environment model on Vercel
Vercel uses Local, Preview, and Production environments by default.

1. Local development:
   ```bash
   make vercel-link
   make vercel-env-pull
   make dev
   ```
   This links your local folder and pulls variables into `apps/web/.env.local`.

   Optional local files for parity checks:
   ```bash
   make vercel-env-pull-preview
   make vercel-env-pull-production
   ```

2. Preview deployments:
   - automatic on pull requests and non-`main` branch pushes
   - manual with:
     ```bash
     make vercel-deploy-preview
     ```

3. Production deployments:
   - automatic on push/merge to `main`
   - manual with:
     ```bash
     make vercel-deploy-production
     ```

4. Custom environments (`staging`, `qa`, etc.):
   - available on Pro and Enterprise plans
   - CLI examples:
     ```bash
     pnpm dlx vercel@latest deploy --target=staging
     pnpm dlx vercel@latest pull --environment=staging
     pnpm dlx vercel@latest env add MY_KEY staging
     ```

### Variables to set in Vercel (Web project)
These variables should be set per environment (Preview and Production can have different values):
- `VITE_API_BASE_URL`
- `VITE_TURNSTILE_SITE_KEY`
- `VITE_CONTACT_EMAIL`
- `VITE_PRESS_EMAIL`
- `VITE_DEMO_EMAIL`
- `VITE_APPLICATION_RECIPIENT_EMAIL`

Notes:
- `VITE_API_BASE_URL` should point to your live API base URL.
- Keep Turnstile production keys only in the Production environment.

## Deployment (Infomaniak + GitHub)
Infomaniak instructions are kept for reference (legacy deployment path).

### Automated API deployment to Infomaniak (SSH on push)
The repository includes `.github/workflows/deploy-api-infomaniak.yml` to upload the API workspace payload to Infomaniak over SSH/rsync on every push to `main` (and via manual `workflow_dispatch`).

Required GitHub repository secrets:
- `INFOMANIAK_SSH_HOST` (example: `57-108184.ssh.hosting-ik.com`)
- `INFOMANIAK_SSH_PORT` (usually `22`)
- `INFOMANIAK_SSH_USERNAME`
- `INFOMANIAK_TARGET_DIR` (absolute path on remote host where files should be mirrored, for example `/srv/customer/sites/api.nyvoro-records.com`)

Authentication:
- Recommended: `INFOMANIAK_SSH_PRIVATE_KEY` (private key for the SSH user)
- Fallback: `INFOMANIAK_SSH_PASSWORD` (used only if private key is not set)

Optional secret:
- `INFOMANIAK_RESTART_COMMAND` (shell command executed remotely after successful post-deploy build, for automatic runtime reload)

Post-deploy command executed automatically over SSH:
```bash
corepack enable && rm -rf node_modules apps/api/node_modules packages/shared-types/node_modules package-lock.json && pnpm install --frozen-lockfile && pnpm --filter @nyvoro/api build
```

Then configure your Infomaniak Node.js runtime entrypoint to:
```bash
node apps/api/dist/server.js
```

If your runtime does not auto-reload new builds, set `INFOMANIAK_RESTART_COMMAND` with the command required by your Infomaniak setup (examples: process restart command, reload script, or panel-compatible restart hook).

## Testing
Run all checks:
```bash
make lint
make typecheck
make test
make build
pnpm audit --prod
pnpm audit --dev
```

## Troubleshooting
- **`pnpm` not found**: run `corepack enable` then retry.
- **Captcha fails locally**: set `TURNSTILE_BYPASS=true` in `.env`.
- **No email received**: verify SMTP credentials and check API logs.
- **Old/plain email template still received**: confirm the API runtime was redeployed (web-only deployments do not update API email templates).
- **CORS error**: ensure frontend origin is present in `API_ALLOWED_ORIGINS`.
- **SQLite permission error**: verify write access to `apps/api/data/`.
- **Login always denied**: verify that the account was created with `make auth-create-user`, the selected role matches, and the API is reachable.
- **Admin login asks for a code unexpectedly**: MFA is enabled for that admin account; complete the TOTP step or disable MFA from account settings after a successful login.

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
