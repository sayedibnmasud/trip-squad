# web

Blocks starter app: React 18 + Vite + TypeScript, with a real hosted Blocks IAM login and a project-scoped profile page as the landing page.

Every Blocks API call in this app goes through [`@seliseblocks/client`](https://www.npmjs.com/package/@seliseblocks/client) via a single `createBlocksClient()` instance in `src/lib/blocks/client.ts` — there is no hand-written `fetch()` wrapper for Blocks endpoints anywhere in this app. Each SDK module is exercised in context rather than in one dedicated demo panel: `auth` in the hosted login flow, `iam` on the Profile page and user menu, and `localization` in `LocalizationProvider`. Add more pages under `src/features/` as your app needs them.

## Setup

```bash
npm install
npm run dev
```

`.env` already has working defaults for this project — you only need to fill in `VITE_BLOCKS_OIDC_CLIENT_ID` (see below) before login will work.

## Login setup (required)

This app signs users in directly against this project's tenant (no CLI-style account impersonation) through Blocks IAM's hosted IdP controller. Before login will work, register a **public** OIDC client for this app in Blocks IAM with:

- `redirect_uris`: EVERY origin the app is served from, each with `/login/callback` -- your dev origin, and each deployed URL. `blocks release setup` assigns a random-suffixed domain (find it via `blocks release repos list --json`, the `url` field), and until that origin's callback is registered the first login there fails with `redirect_uri_not_registered`; `blocks release deploy --register-callback` registers it for you.
- `client_type`: `public` (no client secret — this is a browser app and cannot keep one; this scaffold never asks for or ships a client secret).
- `tenant_id` used for login: this project's tenant (`VITE_BLOCKS_X_BLOCKS_KEY`).

Then set `VITE_BLOCKS_OIDC_CLIENT_ID` in `.env` to the new client's id. Until then, the login page shows a setup notice instead of failing silently.

## Running locally (no hosts-file changes)

Blocks' hosted login sets a **Secure** session cookie scoped to the project's cookie domain, so the browser has to see the app and the API as one HTTPS site. Local dev does that with Vite's dev-server proxy: the app runs on `https://localhost:5173`, and every Blocks API call goes to `https://localhost:5173/blocks-api/…`, which Vite forwards to `VITE_BLOCKS_API_URL` (see `vite.config.ts`). Cookies come back as localhost cookies. The project's real domain is never remapped, so it always reaches the deployed app.

1. `.env` needs `VITE_BLOCKS_DEV_HOST=localhost`, `VITE_BLOCKS_DEV_PORT=5173` and `VITE_BLOCKS_DEV_PROXY=true` (see `.env.example`).
2. `npm run cert` once, and trust `.cert/dev-cert.pem` in your OS store (the script prints the command). The cert's SAN includes `localhost`.
3. `npm run dev`, then open `https://localhost:5173`.

`https://localhost:5173/login/callback` must be registered on the OIDC client (it is, for this project). The port is part of it, so keep 5173: `strictPort` is on.

The proxy is dev-only. Production builds call the API directly, and `.env.<environment>` (e.g. `.env.dev`) holds the deployed settings.

`.cert/` is gitignored, so each developer generates and trusts their own cert.

## Blocks Release deployment

The scaffold includes `Dockerfile` and `nginx.conf` for Blocks Release. The Release service must pass Docker build arg `ci_build=<environment>` plus the public `VITE_BLOCKS_*` build args documented in the Dockerfile. The generated `package.json` also provides `build:dev`, `build:test`, `build:stg`, `build:iat`, `build:uat`, `build:preprod`, `build:prodshadow`, and `build:prod` scripts for local checks.

During each environment build, `scripts/write-release-env.mjs` writes `dist/env.<environment>` from client-safe Docker build args or local `.env` files. Root `.env` remains gitignored and must not be committed.

## What's included

- `/login` — login page (redirects to Blocks IAM).
- `/login/callback` — completes the hosted IAM callback via `blocksClient.auth.idp.callback()`, then returns to the page you started from.
- `/` and `/profile` — protected; redirect to `/login` when signed out.
- Sidebar + topbar shell matching the `@seliseblocks/blocks-kit` look (icon-only rail on narrow screens, avatar dropdown, notifications menu, active-item accent bar).
- `blocks/localization/*.en.json` local i18n seed files for AI or human edits. Sync them through `blocks localization validate` and `blocks localization push`; the runtime app reads Localization service data through `blocksClient.localization`.

IAM's hosted login sets the session as a **Secure, httpOnly** cookie by default -- this app never reads, stores, or refreshes a token itself. "Signed in" is determined by calling `blocksClient.auth.userInfo()` (`GET /iam/v4/auth/me`), which the browser's cookie authenticates automatically; this is different from `blocksClient.iam.me()`, the full IAM profile call used on the Profile page. Logging out calls `blocksClient.auth.logout()` so IAM ends the session server-side. A cached bearer token (and `blocksClient.auth.oidc.refreshToken()` to refresh it) is only used if a tenant's OIDC config explicitly returns tokens in the response body instead of a cookie.
