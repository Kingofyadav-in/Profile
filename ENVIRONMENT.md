# Environment Setup

This repo uses one shared environment contract across local development,
GitHub Actions, Vercel, and Railway.

## Files

| File | Commit? | Purpose |
|---|---:|---|
| `.env.example` | Yes | Complete variable reference with safe placeholders |
| `.env` | No | Real local secrets for this checkout |
| `.env.local` | No | Local machine overrides only |

Load order for Node scripts is `.env` then `.env.local`. Values that already
come from the shell or a hosting platform are not overwritten by these files.

## Local

```bash
cp .env.example .env
npm install
npm start
```

`npm start` runs the OTP API on `http://127.0.0.1:5050/api` by default.

Use `.env.local` only for machine-specific overrides, for example:

```bash
DATABASE_SSL=false
PORT=5050
```

## GitHub Actions

CI uses non-secret placeholder values directly in
`.github/workflows/ci.yml` so tests can run on forks and pull requests.

For production deployment workflows, set these in GitHub repository
`Settings -> Secrets and variables -> Actions` instead of committing them:

```text
AUTH_JWT_SECRET
DATABASE_SSL
DATABASE_URL
HI_API_KEY
JARVIS_API_BASE
JARVIS_BRIDGE_SECRET
LIVE_CLASS_TOKEN
MSG91_AUTHKEY
MSG91_TEMPLATE_ID
OPENAI_API_KEY
OPENAI_BASE_URL
OPENAI_MODEL
OTP_API_BASE
VAPID_PRIVATE_KEY
VAPID_PUBLIC_KEY
VAPID_SUBJECT
```

## Vercel

Set production and preview values in:

```text
Vercel Project -> Settings -> Environment Variables
```

Required for the current API surface:

```text
AUTH_JWT_SECRET
DATABASE_SSL
DATABASE_URL
HI_API_KEY
JARVIS_API_BASE
JARVIS_BRIDGE_SECRET
LIVE_CLASS_TOKEN
MSG91_AUTHKEY
MSG91_TEMPLATE_ID
OPENAI_API_KEY
OPENAI_MODEL
VAPID_PRIVATE_KEY
VAPID_PUBLIC_KEY
VAPID_SUBJECT
```

Optional compatibility aliases:

```text
AUTH_API_BASE
JARVIS_BACKEND_URL
OPENAI_BASE_URL
OTP_API_BASE
```

Do not commit `.vercel/.env.*.local` or Vercel CLI OIDC tokens.

## Railway

Use Railway for the OTP service and/or Postgres. Set variables in:

```text
Railway Service -> Variables
```

Minimum OTP service variables:

```text
AUTH_JWT_SECRET
CORS_ORIGIN
MSG91_AUTHKEY
MSG91_TEMPLATE_ID
MSG91_OTP_LENGTH
MSG91_OTP_EXPIRY_MINUTES
PORT
```

For Railway Postgres, set `DATABASE_URL` from the Railway Postgres plugin and
keep `DATABASE_SSL=true` for deployed services.

## Rotation

Rotate any value that was copied into the wrong system, exposed in logs, or
shared outside the hosting provider. Generate new bearer secrets with:

```bash
openssl rand -hex 32
```
