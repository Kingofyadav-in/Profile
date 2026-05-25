<div align="center">

<img src="logo/night-logo.png" alt="Amit Ku Yadav" width="120" />

# Amit Ku Yadav

**Personal platform · HI Life OS · Ventures · Public writing**

[![Live Site](https://img.shields.io/badge/Live-kingofyadav.in-046A38?style=flat-square&logo=vercel&logoColor=white)](https://kingofyadav.in)
[![Node](https://img.shields.io/badge/Node-20%2B-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Stack](https://img.shields.io/badge/Stack-HTML%20%2F%20CSS%20%2F%20JS-111111?style=flat-square&logo=html5&logoColor=white)](https://developer.mozilla.org/)
[![PWA](https://img.shields.io/badge/PWA-Installable-5A0FC8?style=flat-square&logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)
[![License](https://img.shields.io/badge/License-Private-red?style=flat-square)](#)

</div>

---

## What This Is

`kingofyadav.in` is a production-grade personal platform — framework-free, built for longevity. It combines a public portfolio, a long-form writing system, venture landing pages, and a private life operating system (HI Life OS) in a single, maintainable codebase.

```
┌─────────────────────────────────────────────────────────────┐
│                       kingofyadav.in                        │
├───────────────┬──────────────────┬──────────────────────────┤
│  Public Site  │  Ventures / Blog │       HI Life OS         │
│               │                  │                          │
│  Home         │  Brand pages     │  Identity & Profile      │
│  About        │  Blog articles   │  Wallet & Payments       │
│  Services     │  Initiative pages│  Vault & Documents       │
│  Contact      │                  │  License System          │
│  Gallery      │                  │  AI Assistant (Jarvis)   │
│  Collaboration│                  │  Live Classroom          │
└───────────────┴──────────────────┴──────────────────────────┘
         │                                      │
         ▼                                      ▼
   Vercel (static +                    Railway (OTP server
   API functions)                       + PostgreSQL)
```

---

## Key Principles

- **Framework-free** — vanilla HTML, CSS, and JavaScript only; no build pipeline required for the frontend
- **Local-first** — HI data lives in IndexedDB; the backend is optional and additive
- **One codebase** — public identity and private life systems coexist without leaking into each other
- **Production-hardened** — HSTS, strict CSP, immutable asset caching, PWA offline support

---

## Pages & Routes

| Area | URL | Description |
|---|---|---|
| Home | `/` | Public homepage and hero |
| About | `/pages/about.html` | Background and story |
| Services | `/pages/services.html` | Offerings and rates |
| Professional | `/pages/professional.html` | Work history and projects |
| Social | `/pages/social.html` | Community and impact |
| Contact | `/pages/contact.html` | Contact form (Formspree) |
| Gallery | `/pages/gallery.html` | Photo and media gallery |
| Blog index | `/pages/blog.html` | Writing archive |
| Blog articles | `/blog/*.html` | Individual posts (generated) |
| Collaboration | `/pages/collaboration.html` | Partnership page |
| Bhagalpur | `/pages/bhagalpur.html` | City / local initiative |
| HI Life OS | `/pages/personal.html` | Private command center |
| HI Wallet | `/pages/wallet.html` | Payment and finance tracker |
| HI Vault | `/pages/vault.html` | Document storage |
| HI License | `/pages/hi-license.html` | License and credential system |
| Live Class | `/pages/live-class.html` | Real-time classroom board |
| Order | `/pages/order.html` | Product order flow |
| Login | `/pages/login.html` | OTP-based authentication |

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | Vanilla HTML5, CSS3, ES6+ (no bundler) |
| API | Node.js (raw `http` module) — Vercel serverless functions + Railway server |
| Auth | JWT + MSG91 OTP |
| Database | PostgreSQL via `pg` (Railway / Neon) |
| AI | Jarvis (`jarvis.kingofyadav.in`) + OpenAI GPT-4o-mini (live class) |
| Push | Web Push (VAPID) via `web-push` |
| PWA | Service worker, `manifest.json`, offline fallback |
| Deploy | Vercel (static + functions) · Railway (persistent OTP server) |
| Tests | Jest (unit) · Playwright (end-to-end) |

---

## Development Setup

**Prerequisites:** Node.js 20+, npm

```bash
# 1. Clone and install
git clone <repo>
cd Profile
npm install

# 2. Configure environment
cp .env.example .env
# Fill in real values — see ENVIRONMENT.md for full reference

# 3. Start the OTP API server (port 5050)
npm start

# 4. Serve the site
# Option A: VS Code Live Server extension (recommended)
# Option B: npx serve .
# Option C: open index.html directly in browser
```

> See [ENVIRONMENT.md](./ENVIRONMENT.md) for full environment setup across local, GitHub Actions, Vercel, and Railway.

---

## Build Pipeline

All build scripts live in `scripts/`. Run them individually or all at once:

```bash
npm run build:tokens   # brand-tokens.json → css/brand-tokens.css (auto-generated)
npm run build:blog     # Markdown/data → blog/*.html
npm run build:css      # CSS → css/dist/
npm run build:sw       # Bump service worker version string
npm run build          # All of the above in correct order
```

Run `npm run build` before any production deployment if you have changed `brand-tokens.json`, blog content, or the service worker.

---

## Testing

```bash
# Unit tests (Jest)
npm test
npm run test:watch     # watch mode
npm run test:ci        # CI mode with coverage report

# End-to-end tests (Playwright)
npm run test:e2e
npm run test:e2e:ui    # Playwright interactive UI
```

Coverage thresholds enforced in CI:
- Global: 60% lines
- `api/auth/**`: 80% lines
- `api/wallet/**`: 80% lines

---

## Project Structure

```
Profile/
├── index.html                  # Public homepage
├── pages/                      # All subpages
├── blog/                       # Generated blog post HTML
├── brands/                     # Venture and brand landing pages
│
├── css/
│   ├── base.css                # Global tokens, reset, typography, utilities
│   ├── brand-tokens.css        # AUTO-GENERATED — edit brand-tokens.json, not this
│   ├── components.css          # Reusable UI components
│   ├── layout.css              # Shared nav, footer, section scaffolding
│   ├── effects.css             # Animations, scroll reveals, glows
│   └── [page].css              # Page-specific stylesheets
│
├── js/
│   ├── site-init.js            # Runs before paint: theme restore, effects loader
│   ├── script.js               # Main page logic
│   ├── nav.js                  # Navigation and mobile menu
│   ├── effects.js              # Scroll-triggered animations
│   ├── hi-*.js                 # HI Life OS modules
│   └── [feature].js            # Feature-specific modules
│
├── api/                        # Vercel serverless functions
│   ├── auth/                   # JWT + OTP authentication
│   ├── hi/                     # HI API endpoints
│   ├── wallet/                 # Wallet endpoints
│   └── *.js                    # Push, payments, Jarvis proxy, etc.
│
├── server/
│   └── otp-server.js           # Railway persistent OTP server (MSG91)
│
├── scripts/
│   ├── build-brand-tokens.js   # Token compiler
│   ├── build-blog.js           # Blog generator
│   ├── build-css.js            # CSS builder
│   ├── bump-sw-version.js      # Service worker versioner
│   └── migrate.js              # Database migration runner
│
├── api-static/                 # Static JSON API responses (cached 10 min)
├── lib/                        # Shared Node.js utilities
├── migrations/                 # PostgreSQL migration files
├── tests/                      # Jest unit tests
├── tests/e2e/                  # Playwright e2e tests
│
├── brand-tokens.json           # SINGLE SOURCE OF TRUTH for brand design tokens
├── vercel.json                 # Vercel routing, caching, and security headers
├── manifest.json               # PWA manifest
├── service-worker.js           # Offline support and asset caching
├── CLAUDE.md                   # Claude Code project guide
├── ENVIRONMENT.md              # Environment variable reference
└── SECURITY.md                 # Security policy and secret rotation runbook
```

---

## Design System

All visual decisions flow from two files:

| File | Role |
|---|---|
| `brand-tokens.json` | Source of truth — edit to change brand colors/shadows/gradients |
| `css/base.css` | Full CSS custom properties: spacing, typography, radius, z-index, motion, focus |

**Brand palette:**

| Token | Value | Use |
|---|---|---|
| `--brand-green` | `#046A38` | Primary CTAs, links, active states |
| `--brand-orange` | `#FF671F` | Accent, energy, secondary CTAs |
| `--gradient-brand` | green → orange 135deg | Hero gradients, badges |

**To change brand colors:** edit `brand-tokens.json` → `npm run build:tokens`. Never hardcode hex values in CSS.

---

## Deployment

### Vercel (primary)

Static files and `api/` serverless functions deploy automatically on push to `main`.

```bash
# Manual production deploy
npm run build
vercel --prod
```

CSS, JS, and image assets are cached for 1 year (immutable) via `vercel.json`. Always increment the `?v=` query string on `<link>` and `<script>` tags when updating static assets.

### Railway (OTP server)

`server/otp-server.js` runs as a persistent service on Railway. Set environment variables in the Railway dashboard — see [ENVIRONMENT.md](./ENVIRONMENT.md).

### Pre-deploy checklist

- [ ] `npm run build` completed without errors
- [ ] `npm test` passes
- [ ] `?v=` query strings bumped for changed CSS/JS files
- [ ] `npm run build:sw` run if service worker behavior changed
- [ ] New environment variables added to Vercel and Railway dashboards

---

## Security

See [SECURITY.md](./SECURITY.md) for:
- Vulnerability reporting (48h acknowledgement SLA)
- Secret inventory and rotation runbook (JWT, VAPID, database, API keys)
- CSP and security header audit guide
- Observability setup (Vercel Analytics, Sentry, UptimeRobot)

Security headers are enforced globally via `vercel.json`: HSTS, `X-Frame-Options: DENY`, strict CSP, COOP, CORP.

---

## Environment Variables

Full reference: [`.env.example`](./.env.example) · [ENVIRONMENT.md](./ENVIRONMENT.md)

Key variables:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `AUTH_JWT_SECRET` | JWT signing secret (≥32 chars) |
| `MSG91_AUTHKEY` / `MSG91_TEMPLATE_ID` | OTP service |
| `JARVIS_API_BASE` | Jarvis AI backend URL |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | Web Push signing keys |
| `OPENAI_API_KEY` | OpenAI (live class feature) |
| `HI_API_KEY` | HI API bearer token |

Generate secrets:
```bash
openssl rand -hex 32
```

---

<div align="center">

Built by [Amit Ku Yadav](https://kingofyadav.in) · Bhagalpur, India

</div>
