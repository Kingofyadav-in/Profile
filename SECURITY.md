# Security Policy — kingofyadav.in

## Supported Versions

| Version | Supported |
| ------- | --------- |
| current | yes       |
| < 1.0   | no        |

## Reporting a Vulnerability

Email **circle.onelife@gmail.com** with subject `[SECURITY] <short description>`.
Expect acknowledgement within 48 hours and a patch within 14 days for critical issues.
Do **not** open public GitHub issues for security vulnerabilities.

---

## Secrets Inventory and Rotation Runbook

| Secret | Where stored | Rotation period |
|--------|-------------|----------------|
| `DASHBOARD_PASSWORD` (bcrypt hash) | Vercel env var / `.env` | On compromise or every 90 days |
| `DASHBOARD_SESSION_SECRET` (≥32 chars) | Vercel env var | On compromise |
| `JARVIS_API_KEY` | Vercel env var | On compromise or every 90 days |
| `JARVIS_BRIDGE_SECRET` | Vercel env var | On compromise |
| `JARVIS_SYNC_SECRET` | Vercel env var | On compromise |
| `HI_API_KEY` | Vercel env var | On compromise |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | Vercel env var | See VAPID runbook below |
| `DATABASE_URL` (Postgres) | Vercel env var | On compromise or quarterly |

### General Rotation Steps

1. Generate new value (see per-secret instructions below).
2. Update the Vercel environment variable: `vercel env rm SECRET_NAME` then `vercel env add SECRET_NAME`.
3. Redeploy: `vercel --prod` (or merge to `main` to trigger CI/CD).
4. Verify the application starts correctly and the old secret no longer works.
5. Revoke the old secret at its source (DB user, API provider dashboard, etc.).

### DASHBOARD_PASSWORD Rotation

```bash
# Generate a new bcrypt hash (cost factor 12)
python3 -c "import bcrypt; pw = input('New password: ').encode(); print(bcrypt.hashpw(pw, bcrypt.gensalt(12)).decode())"
# Set the output as DASHBOARD_PASSWORD in Vercel env
```

### VAPID Key Rotation Runbook

VAPID keys sign Web Push notifications. Rotating them invalidates all existing push subscriptions — users must re-subscribe.

**When to rotate:** annually, or if the private key is compromised.

**Step-by-step:**

```bash
# 1. Generate new VAPID key pair (requires web-push CLI)
npx web-push generate-vapid-keys --json
# Output: { "publicKey": "...", "privateKey": "..." }

# 2. Update Vercel env vars (production + preview)
vercel env rm VAPID_PUBLIC_KEY production
vercel env rm VAPID_PRIVATE_KEY production
vercel env add VAPID_PUBLIC_KEY production   # paste new publicKey
vercel env add VAPID_PRIVATE_KEY production  # paste new privateKey

# 3. Redeploy
vercel --prod

# 4. Clear old subscriptions from DB — they are now invalid
# Run via psql or Vercel Postgres dashboard:
# DELETE FROM push_subscriptions;

# 5. Notify users (optional): display an in-app banner prompting re-subscribe
```

**Impact:** All push subscribers are unsubscribed. The push icon resets to "off" state. Users who visit the site can re-enable notifications immediately.

### JWT / Session Secret Rotation

```bash
# Generate a new 64-char hex secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Update DASHBOARD_SESSION_SECRET in Vercel env and redeploy
# Effect: all active sessions are invalidated; users must log in again
```

---

## Observability Setup

### Vercel Analytics

1. Enable in Vercel dashboard → Project → Analytics tab.
2. Add the script to every HTML page `<head>`:

```html
<script defer src="/_vercel/insights/script.js"></script>
```

3. Core Web Vitals (LCP, FID, CLS) are collected automatically.

### Error Monitoring with Sentry

```bash
npm install @sentry/browser
```

Add to each page before other scripts:

```html
<script src="https://browser.sentry-cdn.com/7.x.x/bundle.min.js"
        crossorigin="anonymous"></script>
<script>
  Sentry.init({
    dsn: "YOUR_SENTRY_DSN",
    environment: "production",
    tracesSampleRate: 0.2,
    release: "kingofyadav-in@__BUILD_VERSION__"
  });
</script>
```

For the Vercel serverless API layer (Node.js):

```bash
npm install @sentry/node
```

```js
// api/_sentry.js
const Sentry = require("@sentry/node");
Sentry.init({ dsn: process.env.SENTRY_DSN, environment: process.env.APP_ENV });
module.exports = Sentry;
```

Import `require("./_sentry")` at the top of each API handler before any logic.

### Backend Dashboard (work_station) — Sentry for Python

```bash
pip install sentry-sdk
```

In `app/app.py` before `st.set_page_config(...)`:

```python
import sentry_sdk
sentry_sdk.init(
    dsn=os.getenv("SENTRY_DSN", ""),
    traces_sample_rate=0.1,
    environment=os.getenv("APP_ENV", "production"),
)
```

### Uptime Monitoring

Use **UptimeRobot** (free tier) or Vercel's built-in status checks:
- Monitor `https://kingofyadav.in` (HTTP, 5 min interval)
- Monitor `/api/health` if a health endpoint exists
- Alert via email or Slack webhook on downtime

---

## CSP and Header Audit

Current security headers (set in `vercel.json`):

| Header | Value |
|--------|-------|
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` |
| `X-Frame-Options` | `DENY` |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Cross-Origin-Opener-Policy` | `same-origin` |
| `Cross-Origin-Resource-Policy` | `same-site` |
| `Content-Security-Policy` | nonce-based via Edge Middleware |

Run `npx observatory-cli https://kingofyadav.in` quarterly to re-score headers.
