<div align="center">

<img src="logo/night-logo.png" alt="Amit Ku Yadav" width="110" />

# Amit Ku Yadav — Digital Platform

### Personal Portfolio · Professional Profile · Social Identity · AI Life OS

[![Live Site](https://img.shields.io/badge/Live-kingofyadav.in-046A38?style=flat-square&logo=vercel&logoColor=white)](https://kingofyadav.in)
[![PWA](https://img.shields.io/badge/PWA-Installable-5A0FC8?style=flat-square&logo=pwa&logoColor=white)](https://kingofyadav.in)
[![SEO](https://img.shields.io/badge/SEO-89%2F100-FF671F?style=flat-square)](https://kingofyadav.in)
[![Lighthouse](https://img.shields.io/badge/Performance-A%E2%88%92-046A38?style=flat-square)](https://kingofyadav.in)
[![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat-square&logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/HTML)
[![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat-square&logo=css3&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/CSS)
[![Vanilla JS](https://img.shields.io/badge/JavaScript-Vanilla-F7DF1E?style=flat-square&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Vercel](https://img.shields.io/badge/Deployed-Vercel-000000?style=flat-square&logo=vercel)](https://vercel.com)

**[kingofyadav.in](https://kingofyadav.in)** — Built from scratch. Zero frameworks. Zero dependencies.

</div>

---

## What This Is

`kingofyadav.in` is a complete personal digital platform and life operating system for **Amit Ku Yadav** — digital systems builder, founder, and community leader from Bhagalpur, Bihar, India.

It is not a template. It is not WordPress. It is a hand-crafted, production-grade system that serves three parallel purposes simultaneously:

| Layer | What It Does |
|---|---|
| **Public Portfolio** | Personal story, professional work, ventures, blog, services |
| **Social Identity** | Verified social presence, community work, HDI (Human Digital Identity) |
| **Private Life OS** | HI App — personal dashboard, AI assistant, tasks, contacts, goals |

All three layers share one codebase, one design system, and zero framework overhead.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    kingofyadav.in                           │
│                                                             │
│  ┌──────────┐  ┌──────────────┐  ┌─────────────────────┐  │
│  │  PUBLIC  │  │ PROFESSIONAL │  │      SOCIAL          │  │
│  │  SITE    │  │  PORTFOLIO   │  │      LAYER           │  │
│  │          │  │              │  │                       │  │
│  │ index    │  │ professional │  │ social · blog        │  │
│  │ about │  │ services     │  │ 20 blog posts        │  │
│  │ brands   │  │ collaboration│  │ blog-data.json       │  │
│  └──────────┘  └──────────────┘  └─────────────────────┘  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              HI APP  (Private Dashboard)            │   │
│  │                                                     │   │
│  │  personal.html  ←  requireAuth()                   │   │
│  │       │                                             │   │
│  │  ┌────┴──────────────────────────────────────┐     │   │
│  │  │            hi-storage.js (IndexedDB)       │     │   │
│  │  │  identity · personal · professional        │     │   │
│  │  │  social · chat · tasks · licenses          │     │   │
│  │  └───────────────────────────────────────────┘     │   │
│  │       │                                             │   │
│  │  hi-app.js · hi-personal.js · hi-professional.js   │   │
│  │  hi-social.js · hi-assistant.js · hi-license.js    │   │
│  │  hi-context.js · hi-sync.js                        │   │
│  │                                                     │   │
│  │  AI Assistant ──→ POST /api/jarvis-chat             │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              LIVE CLASSROOM                          │   │
│  │  live-class.html ←→ /api/live-class (Vercel Fn)    │   │
│  │  Teacher terminal → board.js → POST with token      │   │
│  │  Students → browser → real-time polling (1.5s)      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌──────────────────┐  ┌──────────────────────────────┐   │
│  │  SERVICE WORKER  │  │       VERCEL EDGE             │   │
│  │  App Shell       │  │  HTTPS redirect               │   │
│  │  Network-first   │  │  CSP headers                  │   │
│  │  HTML + assets   │  │  X-Frame-Options              │   │
│  │  Offline page    │  │  Immutable CSS/JS caching     │   │
│  └──────────────────┘  └──────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
kingofyadav.in/
│
├── index.html                    # Homepage: hero, ventures, blog preview, about
│
├── pages/
│   ├── about.html             # Personal story, timeline, philosophy
│   ├── blog.html                 # Blog listing (JSON-driven, client-rendered)
│   ├── collaboration.html        # Partnership and community hub
│   ├── contact.html              # Contact form (Formspree backend)
│   ├── hi-license.html           # HDI certificate and digital license viewer
│   ├── live-class.html           # Real-time live classroom board
│   ├── login.html                # Auth gateway (local PBKDF2)
│   ├── origin.html               # Private: personal origin story
│   ├── haven.html                # Private: home life
│   ├── bhagalpur.html            # Private: Bhagalpur city roots
│   ├── personal.html             # Protected: HI App dashboard
│   ├── professional.html         # Career, ventures, execution philosophy
│   ├── services.html             # Services offered + pricing structure
│   └── social.html               # Social presence and verified profiles
│
├── blog/                         # 20 long-form article pages (2500–3000 words each)
│   ├── ai-future-of-work.html
│   ├── building-digital-identity.html
│   ├── climate-crisis-2025.html
│   ├── community-leadership-principles.html
│   ├── creator-economy-power-shift.html
│   ├── digital-privacy-surveillance.html
│   ├── electric-vehicles-clean-energy.html
│   ├── entrepreneurship-mindset-2025.html
│   ├── future-of-education.html
│   ├── geopolitics-2025.html
│   ├── governance-digital-age.html
│   ├── india-rising-global-superpower.html
│   ├── leadership-modern-era.html
│   ├── long-term-thinking.html
│   ├── mental-health-global-epidemic.html
│   ├── ngos-modern-india.html
│   ├── technology-future-systems.html
│   ├── web3-decentralized-future.html
│   ├── youth-leadership-new-era.html
│   └── youth-structured-guidance.html
│
├── brands/                       # Venture landing pages
│   ├── royal-heritage-resort.html      # Hospitality (Schema: Hotel)
│   ├── jhon-aamit-llp.html             # Finance (Schema: FinancialService)
│   └── national-youth-force.html       # NGO (Schema: NGO)
│
├── css/
│   ├── base.css                  # Design tokens, reset, dark/light themes [CRITICAL]
│   ├── components.css            # Shared UI: nav, cards, buttons, footer
│   ├── hi-app.css                # HI dashboard + identity + modal system
│   ├── hi-guide.css              # Onboarding guide component
│   ├── live-class.css            # Live classroom full redesign
│   ├── index.css                 # Homepage layout
│   ├── blog.css / blog-post.css  # Blog listing + article
│   ├── auth.css                  # Login/signup
│   ├── brand.css                 # Venture pages shared
│   ├── collaboration.css         # Collaboration hub
│   ├── professional.css          # Professional profile
│   ├── personal.css              # Personal section shell
│   ├── social.css                # Social presence
│   ├── services.css              # Services page
│   ├── contact.css               # Contact form
│   ├── about.css                 # About me page
│   ├── personal-pages.css        # Origin / Haven / Bhagalpur sub-pages
│   ├── myself.css                # Personal identity sub-page
│   ├── myhome.css / mycity.css   # Home and city sub-pages
│   └── live-class.css            # Live classroom
│
├── js/
│   ├── script.js                 # Core: theme, nav, blog render, forms, PWA
│   ├── auth.js                   # PBKDF2 login/signup/session/guard
│   ├── personal-data.js          # Legacy personal CRUD (localStorage)
│   ├── profile-renderer.js       # Dynamic profile card builder
│   ├── live-class.js             # Live classroom client (polling, board, toast)
│   │
│   ├── hi-storage.js             # IndexedDB wrapper (7 stores)
│   ├── hi-app.js                 # HI identity card, tabs, greeting, HDI
│   ├── hi-personal.js            # Habits, goals, notes, personal details
│   ├── hi-professional.js        # Projects, tasks, professional stats
│   ├── hi-social.js              # Contacts, events, upcoming panel
│   ├── hi-context.js             # AI context builder (reads all HI stores)
│   ├── hi-assistant.js           # AI chat panel (Claude via Jarvis API)
│   ├── hi-license.js             # HDI generator + certificate system
│   ├── hi-sync.js                # Backup / restore (export/import JSON)
│   └── hi-guide.js               # Interactive onboarding guide
│
├── api/                          # Local Node.js dev server API handlers
│   ├── live-class.js             # Live class board (GET state / POST commands)
│   └── profiles/[slug].js        # Dynamic profile API
│
├── functions/api/                # Vercel Serverless Functions (production)
│   └── live-class.js             # Same logic as api/live-class.js (ES module)
│
├── tools/
│   ├── board.js                  # CLI tool: post commands to live board
│   └── live-server.js            # Local dev server (static + API)
│
├── api-static/
│   └── jarvis-widget.js          # Floating Jarvis AI widget (public pages)
│
├── blog-data.json                # Blog post metadata (title, date, tags, slug)
├── service-worker.js             # PWA: App Shell + smart caching strategy
├── manifest.json                 # PWA manifest (icons, shortcuts, display)
├── vercel.json                   # Vercel: headers, redirects, cache rules
├── .env.example                  # Environment variable template
├── sitemap.xml                   # SEO sitemap (32 URLs)
├── robots.txt                    # Crawler rules + sitemap pointer
├── 404.html                      # Custom not-found page
├── offline.html                  # PWA offline fallback
└── og-image.png                  # Social share card (1200×630)
```

---

## Features

### Public Portfolio & Personal Brand

- **Homepage** — hero, life grid (Personal / Professional / Social), ventures showcase, blog preview, about card, CTA
- **About Me** — personal timeline, origin story, values, philosophy
- **Professional Profile** — career history, digital systems work, execution philosophy, venture overview
- **Services** — detailed service catalog with pricing tiers, process steps, FAQ (Schema: Person + Offers)
- **Collaboration** — community and partnership opportunities
- **Social** — verified social profiles, YouTube integration, community presence

### Blog Engine (20 Articles)

- Articles average **2500–3000 words** — original, research-backed, long-form writing
- Topics: AI, geopolitics, mental health, India, leadership, entrepreneurship, climate, education, NGOs
- Driven by `blog-data.json` — no CMS, no database
- Full OG + Twitter card + Article schema on every post
- Individual post pages with reading progress indicator

### Brand Pages (3 Ventures)

| Venture | Type | Schema |
|---|---|---|
| Royal Heritage Resort | Hospitality | `Hotel` |
| Jhon Aamit LLP | Finance / Brokerage | `FinancialService` |
| National Youth Force | National NGO | `NGO` |

### HI App — Human Intelligence Dashboard

A private, local-first personal life operating system. Auth-protected. No cloud sync. All data stays in the browser.

**7 IndexedDB stores:**

| Store | Contents |
|---|---|
| `identity` | Name, tagline, roles, mission, HDI code |
| `personal` | Details, values, goals, notes, habits |
| `professional` | Projects, tasks, skills, priorities |
| `social` | Contacts, events, follow-ups |
| `chat` | AI conversation history (by date) |
| `tasks` | Cross-domain task list |
| `licenses` | HDI certificate claims |

**HI Features:**
- Identity card with auto-generated **HDI** (Human Digital Identity) — unique code derived from identity hash
- Today view: greeting, mood/energy dots, task focus
- Personal tab: habits tracker, goals with progress, notes & reflections
- Professional tab: project cards, per-project task lists, stats bar
- Social tab: upcoming 14-day view, contacts list, events log
- AI Assistant: Claude-powered chat with full HI context injection
- License system: digital content ownership certificates
- Backup/restore: full JSON export of all 7 IndexedDB stores

### Live Classroom

Real-time teacher-controlled board for live sessions. Teacher posts blocks from the terminal; students see updates every 1.5 seconds.

**Board block types:** `heading` · `text` · `code` · `list` · `quote` · `homework` · `link` · `image` · `divider`

**Features:** Blackboard/Whiteboard themes · Fullscreen mode · Live learner list · Toast notifications · Mobile join drawer · Auto-scroll · Keyboard shortcuts

### HDI — Human Digital Identity

Every piece of content on `kingofyadav.in` is claimed under a Human Digital Identity code (`AKY-YYYY-XXXXX`). The license page at `/pages/hi-license.html` displays the active certificate, claim metadata, and content hash for verification.

### Progressive Web App

- **App Shell + Network-first HTML** — loads instantly, works offline
- **Stale-while-revalidate** for images, CSS, JS
- **Offline page** when disconnected
- **Installable** on Android, iOS, and desktop Chrome
- **Auto-update banner** when a new service worker version is deployed
- **PWA shortcuts**: Dashboard · Blog · Contact

---

## Design System

**Palette** — inspired by the Indian tricolour:

| Token | Value | Usage |
|---|---|---|
| `--brand-green` | `#046A38` | Forest Green — headings, CTAs, accents |
| `--brand-orange` | `#FF671F` | Saffron Orange — highlights, hover states |
| `--dark-bg` | `#0a0a0b` | Dark mode background |
| `--light-bg` | `#ffffff` | Light mode background |
| `--glass` | `rgba(255,255,255,.08)` | Glass morphism cards |

**Typography** — system-native, no external fonts loaded:
```
System UI → -apple-system → BlinkMacSystemFont → Segoe UI → Roboto → Arial
```

**Theming** — dark/light toggle with `localStorage` persistence. Flash-free: theme script runs before `<body>` paints.

**Responsive** — mobile-first. Breakpoints at `620px`, `768px`, `900px`, `1100px`.

---

## Environment Variables

Two environment variables are required for backend features. Everything else works without them.

### `LIVE_CLASS_TOKEN`

Authenticates teacher commands on the live classroom board.

```bash
# On Vercel (production)
vercel env add LIVE_CLASS_TOKEN production
# Enter any strong random string, e.g.: openssl rand -hex 32

# Local dev
export LIVE_CLASS_TOKEN="your-local-secret"
node tools/live-server.js
```

Without this set, `POST /api/live-class` returns `503` for teacher commands. Student join and board viewing (`GET`) always work without it.

### `OTP_API_BASE`

Public base URL for the OTP service. In production, point Vercel's `/api/auth/*` proxy at the Railway service here.

```bash
# On Vercel
vercel env add OTP_API_BASE production

# Example value
https://your-railway-service.up.railway.app/api
```

### `JARVIS_API_KEY`

API key for the Jarvis AI backend that powers the HI Assistant chat on the private dashboard.

```bash
# On Vercel
vercel env add JARVIS_API_KEY production

# Local dev — not needed if Jarvis is running on 127.0.0.1:5050
# hi-assistant.js auto-detects localhost and uses http://127.0.0.1:5050/api/jarvis-chat
```

### Setup via Vercel Dashboard

1. Go to [vercel.com/dashboard](https://vercel.com) → Project `hi`
2. **Settings → Environment Variables**
3. Add `LIVE_CLASS_TOKEN` — set for **Production** + **Preview**
4. Add `JARVIS_API_KEY` — set for **Production**
5. Add `OTP_API_BASE` — set for **Production** and point it at the Railway OTP service
6. Redeploy

---

## Local Development

```bash
# Clone
git clone https://github.com/kingofyadav/hi.git
cd hi

# Copy env template
cp .env.example .env
# Fill in LIVE_CLASS_TOKEN at minimum

# Start local server (serves static files + /api/live-class)
LIVE_CLASS_TOKEN=local-secret node tools/live-server.js
# → http://127.0.0.1:8787

# Or use any static server for the public site only
npx serve .
python3 -m http.server 8080
```

No install step. No build step. No transpilation. Open and go.

---

## Live Classroom — Teacher Guide

### Start a session

```bash
# Set your token once per terminal session
export LIVE_CLASS_TOKEN="your-secret"
export LIVE_CLASS_ENDPOINT="https://kingofyadav.in/api/live-class"

# Or for local dev (token not required on localhost)
export LIVE_CLASS_ENDPOINT="http://127.0.0.1:8787/api/live-class"
```

### Board commands

```bash
node tools/board.js title "How Computers Help People"
node tools/board.js subtitle "A practical introduction"

node tools/board.js heading "Topic 1 — What is a Computer?"
node tools/board.js write "A computer processes information to solve problems."
node tools/board.js code js "console.log('Hello, World!')"
node tools/board.js list "1. Input\n2. Process\n3. Output"
node tools/board.js quote "The computer is the most remarkable tool we've ever built."
node tools/board.js homework "Write 5 ways computers help your daily life."
node tools/board.js link "MDN Web Docs" "https://developer.mozilla.org"
node tools/board.js image "Computer diagram" "https://example.com/diagram.png"
node tools/board.js divider

node tools/board.js focus 3           # Highlight block #3
node tools/board.js undo              # Remove last block
node tools/board.js clear             # Clear the board
node tools/board.js theme light       # Switch to whiteboard mode
node tools/board.js teacher "Amit Ku Yadav"
node tools/board.js room "Future Computer Class"
node tools/board.js status "Class is live"
node tools/board.js reset             # Restore default state
```

### Command reference

| Command | Arguments | Effect |
|---|---|---|
| `title` | `"text"` | Set main board title |
| `subtitle` | `"text"` | Set subtitle line |
| `heading` | `"text"` | Add large section heading |
| `write` / `w` | `"text"` | Add text block |
| `code` | `lang "text"` | Add syntax-highlighted code block |
| `list` | `"line1\nline2"` | Add preformatted list |
| `quote` | `"text"` | Add styled quote block |
| `homework` | `"text"` | Add homework assignment panel |
| `link` | `"label" "url"` | Add clickable link block |
| `image` | `"caption" "url"` | Add image block |
| `divider` | — | Add horizontal separator |
| `focus` | `n` or `id` | Highlight block by number or ID |
| `undo` | — | Remove last block |
| `clear` | — | Clear all content |
| `theme` | `dark` / `light` | Switch board theme |
| `teacher` | `"name"` | Update teacher name |
| `room` | `"name"` | Update room name |
| `status` | `"text"` | Update status line |
| `reset` | — | Restore default board state |

### Student keyboard shortcuts

| Key | Action |
|---|---|
| `T` | Toggle Blackboard / Whiteboard |
| `F` | Toggle Fullscreen |
| `J` | Jump to Join Name field |
| `Esc` | Close mobile join drawer |

---

## Deployment

### Vercel (recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Link and deploy
vercel --prod

# Set environment variables
vercel env add LIVE_CLASS_TOKEN production
vercel env add JARVIS_API_KEY production
```

The `vercel.json` config handles:
- HTTP → HTTPS permanent redirect
- 1-year immutable cache for `/css/*` and `/js/*` (version params used for busting)
- No-cache for `service-worker.js`
- Security headers: CSP · X-Frame-Options · X-Content-Type-Options · Referrer-Policy · Permissions-Policy

### Self-hosted (Nginx + Cloudflare)

```
Cloudflare HTTPS
    → Nginx :80
        → /                  static files from /home/kingofyadav/HI
        → /api/jarvis-chat   proxied to Jarvis API :5050
        → /api/live-class    proxied to live-server :8787
```

```bash
# Start Jarvis AI API
bash /home/kingofyadav/jarvis-platform/scripts/start_api.sh

# Reload Nginx after config changes
sudo bash /home/kingofyadav/jarvis-platform/scripts/install-nginx.sh

# Enable autostart
bash /home/kingofyadav/jarvis-platform/scripts/install-systemd.sh
loginctl enable-linger "$USER"
systemctl --user start jarvis-kingofyadav jarvis-api

# Verify production health
bash /home/kingofyadav/jarvis-platform/scripts/public-health.sh
curl -I https://kingofyadav.in/
```

---

## Security

| Layer | Mechanism |
|---|---|
| HTTPS | Cloudflare + Vercel HTTPS-only redirect |
| Auth | PBKDF2-SHA-256 (client-side, local admin only) |
| CSP | Strict allowlist: scripts, styles, images, connect, frame |
| Live Class | Bearer token on all teacher `POST` commands |
| Clickjacking | `X-Frame-Options: DENY` + `frame-ancestors: none` |
| MIME sniffing | `X-Content-Type-Options: nosniff` |
| Referrer | `strict-origin-when-cross-origin` |
| Permissions | Camera, mic, geolocation, FLoC all denied |
| HI Data | Stays in browser only — IndexedDB + localStorage, never transmitted |

> **Auth scope note:** The login system is a **local admin gate** for Amit's private dashboard — not a multi-user account system. PBKDF2 runs client-side on a stored hash.

---

## Performance

| Metric | Value |
|---|---|
| External JS dependencies | **0** |
| External fonts | **0** (system-ui stack) |
| Build step | **None** |
| CSS/JS cache TTL | **1 year** (immutable, version-param busted) |
| Script loading | All deferred or async |
| Images | `loading="lazy"`, `fetchpriority="high"` on LCP, width/height set |
| PWA cache | App Shell + SWR for assets + Network-first for HTML |
| Preconnect | `formspree.io` · `static.cloudflareinsights.com` |

---

## SEO

| Signal | Status |
|---|---|
| Indexable pages | **32** (sitemap.xml) |
| Schema markup | Person · Article · Hotel · FinancialService · NGO · ContactPoint · Offer |
| Article rich results | All 20 blog posts have `@type: Article` JSON-LD |
| Open Graph | 100% coverage on all public pages |
| Twitter cards | `summary_large_image` on all public pages |
| Canonical tags | Every page |
| Sitemap | Auto-submitted at `/sitemap.xml` |

---

## Browser Support

| Browser | Support |
|---|---|
| Chrome / Edge 90+ | Full — including PWA install |
| Firefox 90+ | Full |
| Safari 15+ | Full — PWA via "Add to Home Screen" |
| Samsung Internet | Full |
| IE 11 | Not supported |

---

## Author

<div align="center">

**Amit Ku Yadav**
Bhagalpur, Bihar, India

Digital Systems Builder · Community Leader · Social Entrepreneur

Founder of **Royal Heritage Resort** · **Jhon Aamit LLP** · **National Youth Force**

[kingofyadav.in](https://kingofyadav.in) · [circle.onelife@gmail.com](mailto:circle.onelife@gmail.com) · [+91 95235 28114](tel:+919523528114)

---

*Designed, written, and coded by Amit Ku Yadav.*
*No templates. No page builders. No frameworks. Built by hand.*

</div>
