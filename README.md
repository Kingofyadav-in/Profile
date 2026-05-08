<div align="center">

<img src="logo/night-logo.png" alt="Amit Ku Yadav" width="120" />

# Amit Ku Yadav — Official Digital Platform

**Personal · Professional · Social**

[![Live](https://img.shields.io/badge/Live-kingofyadav.in-046A38?style=flat-square&logo=vercel&logoColor=white)](https://kingofyadav.in)
[![PWA](https://img.shields.io/badge/PWA-Enabled-5A0FC8?style=flat-square&logo=pwa&logoColor=white)](https://kingofyadav.in)
[![License](https://img.shields.io/badge/License-MIT-FF671F?style=flat-square)](LICENSE)
[![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat-square&logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/HTML)
[![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat-square&logo=css3&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/CSS)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)

</div>

---

## What This Is

A personal digital platform built from scratch — no frameworks, no dependencies, pure craft. It covers three dimensions of life:

| Dimension | Pages | Purpose |
|---|---|---|
| **Personal** | MySelf · MyHome · MyCity | Values, roots, and identity |
| **Professional** | Professional · Services · Collaboration | Work, skills, and partnerships |
| **Social** | Social · Blog · About Me | Writing, presence, and community |

Plus three brand pages: **Royal Heritage Resort**, **Jhon Aamit LLP**, and **National Youth Force**.

---

## Tech Stack

```
Vanilla HTML5 + CSS3 + JavaScript    — zero build step, zero frameworks
PWA (Service Worker + Web Manifest)  — installable, works offline
Client-side Local Admin Auth         — protects personal dashboard
JSON-driven Blog                     — 20+ posts, no CMS needed
Formspree                            — contact form backend
Vercel                               — hosting and deployment
```

No React. No Vue. No Webpack. Intentionally lean.

---

## Project Structure

```
kingofyadav.in/
│
├── index.html                  # Homepage (hero, life grid, blog preview)
│
├── pages/
│   ├── about-me.html           # Personal story
│   ├── blog.html               # Blog listing (rendered from JSON)
│   ├── collaboration.html      # Partnership opportunities
│   ├── contact.html            # Contact form (Formspree)
│   ├── login.html              # Auth gate (login + signup)
│   ├── my-city.html            # Bhagalpur — roots
│   ├── my-home.html            # Home life
│   ├── my-self.html            # Personal values
│   ├── personal.html           # Protected dashboard (requires auth)
│   ├── professional.html       # Career & achievements
│   ├── services.html           # Services offered
│   └── social.html             # Social media + YouTube
│
├── blog/                       # 20 individual blog post pages
│   ├── ai-future-of-work.html
│   ├── building-digital-identity.html
│   └── ...
│
├── brands/
│   ├── royal-heritage-resort.html
│   ├── jhon-aamit-llp.html
│   └── national-youth-force.html
│
├── css/
│   ├── base.css                # Design tokens, reset, themes (critical)
│   ├── components.css          # Reusable UI components
│   ├── index.css               # Homepage-specific
│   ├── blog.css / blog-post.css
│   ├── auth.css
│   └── [page].css              # One stylesheet per page
│
├── js/
│   ├── script.js               # Core: theme, nav, blog render, forms, PWA
│   ├── auth.js                 # Login/signup/session/guard logic
│   └── personal-data.js        # Personal dashboard CRUD
│
├── blog-data.json              # Blog metadata (title, date, tags, excerpt)
├── service-worker.js           # PWA: App Shell + smart caching
├── manifest.json               # PWA manifest
├── sitemap.xml                 # SEO sitemap (40+ URLs)
├── robots.txt                  # Crawler rules
├── 404.html                    # Custom not-found page
├── offline.html                # Offline fallback
└── og-image.png                # Social share preview
```

---

## Key Features

### Progressive Web App
- **App Shell caching** — instant repeat loads
- **Network-first HTML**, stale-while-revalidate images, cache-first assets
- **Offline fallback** page when disconnected
- **Installable** on Android, iOS, and desktop Chrome
- Auto update banner when new version is deployed

### Design System
- CSS custom properties for colors, spacing, typography
- Dark / light theme toggle with `localStorage` persistence
- India-coded palette: Forest Green `#046A38` + Saffron `#FF671F`
- Glass-morphism cards, animated gradients, scroll-reveal
- Fully responsive — mobile-first layout

### Authentication
- PBKDF2-SHA-256 hashing for new local admin accounts, with legacy SHA-256 compatibility
- Session token with 24-hour expiry
- Remember-me option (30-day localStorage token)
- Route guard (`requireAuth()`) on personal dashboard

### Blog Engine
- 20 posts driven from `blog-data.json`
- Rendered client-side — no server required
- Tags, dates, reading time, featured images
- Individual post pages with table of contents

### Performance
- Zero external JS dependencies
- Deferred and preloaded stylesheets
- `IntersectionObserver` for scroll animations and lazy loading
- Animated counters, back-to-top with scroll progress bar

---

## Running Locally

```bash
# Clone
git clone https://github.com/kingofyadav/profile.git
cd profile

# Serve (any static server works)
npx serve .
# or
python3 -m http.server 8080
# or open index.html directly in browser
```

No install step. No build step. Open and go.

---

## Deploying

The live `kingofyadav.in` deployment currently runs from this repo on the Jarvis machine through Nginx and Cloudflare. Vercel config is kept for portability, but the active production path is:

```text
Cloudflare HTTPS -> Nginx origin on :80 -> /home/kingofyadav/Profile
                                  -> /api/* proxied to Jarvis API :5050
```

Production checklist:

```bash
# 1. Start or restart Jarvis API
bash /home/kingofyadav/jarvis-platform/scripts/start_api.sh

# 2. Install/reload Nginx config after config changes
sudo bash /home/kingofyadav/jarvis-platform/scripts/install-nginx.sh

# 3. Verify public health
bash /home/kingofyadav/jarvis-platform/scripts/public-health.sh

# 4. Verify key headers/assets
curl -I https://kingofyadav.in/
curl -I 'https://kingofyadav.in/css/base.css?v=20260501-csp-fix'
```

After CSS/JS changes, purge Cloudflare cache or bump the query-string version on changed assets.

For autostart and monitoring:

```bash
bash /home/kingofyadav/jarvis-platform/scripts/install-systemd.sh
loginctl enable-linger "$USER"
systemctl --user start jarvis-kingofyadav jarvis-api jarvis-dashboard
systemctl --user start jarvis-watchdog.timer jarvis-doctor.timer
```

If deploying to Vercel later, environment variables and serverless API routing must be configured separately.

---

## Configuration

These values must be set before the site works fully. Currently some are placeholders.

| Variable / Location | Where | Status |
|---|---|---|
| Formspree Form ID | `js/script.js` line ~403 | ⚠️ Replace `YOUR_FORM_ID` |
| Enquiry API endpoint | `js/script.js` line ~473 | ⚠️ Not implemented |
| YouTube API key | `pages/social.html` | ⚠️ Configure or proxy |
| HTTPS enforcement | Server / Vercel config | ⚠️ Required for secure auth |
| CSP headers | `vercel.json` or `.htaccess` | ⚠️ Not set |

---

## Known Issues & What to Fix Next

These are documented from the pre-launch audit. Fix in priority order.

### 🔴 Critical — Fix Before Launch

- [x] **Formspree Form ID** — configured as `xwvaodjy` in `contact.html`.
- [x] **Enquiry API endpoint** — routed through Formspree (`xwvaodjy`), no missing backend.
- [x] **Login rate limiting** — added to `js/auth.js`: 5 attempts max, 15-minute lockout via sessionStorage.
- [x] **HTTPS enforcement** — redirect rule added in `vercel.json`.
- [x] **Content Security Policy** — CSP + security headers added via `vercel.json`.

> **Remaining auth note:** This is local-admin browser auth, not a production multi-user identity system. For public profile accounts, migrate to backend auth such as Firebase Auth, Clerk, Supabase Auth, or server sessions.

### 🟠 High — Fix Within a Week

- [x] **Duplicate service worker** — `/js/service-worker.js` deleted. Root `/service-worker.js` is the only one.
- [x] **Inline `onclick` handlers** — `onclick="logout()"` and `onclick="location.reload()"` replaced with `addEventListener`. Blog TOC placeholders now use the real `#article` anchor across all 20 posts.
- [x] **Security headers** — `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` added via `vercel.json`.
- [ ] **Logo image too large** — `logo/night-logo.png` is 308 KB. Compress to <80 KB using TinyPNG or Squoosh. Large logos hurt FCP.
- [ ] **YouTube API key** — if using YouTube Data API, proxy through a Vercel function at `/api/youtube.js`.

### 🟡 Medium — Fix Before Store Launch

- [x] **Password toggle uses emoji** — `👁` / `🙈` replaced with SVG eye icons in `pages/login.html`.
- [ ] **Blog images missing width/height** — causes cumulative layout shift (CLS). Add explicit dimensions to all `<img>` tags in blog posts.
- [ ] **No analytics** — add Plausible or Google Analytics to measure traffic before adding a store.
- [ ] **No pagination on blog** — all 20 posts load at once. Add pagination or infinite scroll before the list grows further.
- [ ] **WCAG color contrast not verified** — run the green `#046A38` / saffron `#FF671F` palette through a contrast checker (APCA or WCAG AA).
- [ ] **`aria-current="page"`** — add to the active nav link on each page for screen reader users.

### 🔵 Nice to Have — Future Work

- [ ] Add blog search (client-side JSON filtering)
- [ ] Implement email obfuscation to reduce spam harvesting
- [ ] Add a newsletter/mailing list (Mailchimp, ConvertKit, Loops)
- [ ] Build admin UI for adding blog posts without editing JSON manually
- [ ] Add comment system (Giscus via GitHub Discussions is free)
- [ ] Set up Plausible / GA4 dashboard for store conversion tracking

---

## Browser Support

| Browser | Support |
|---|---|
| Chrome / Edge 90+ | Full |
| Firefox 90+ | Full |
| Safari 15+ | Full (PWA install via Add to Home Screen) |
| Samsung Internet | Full |
| IE 11 | Not supported |

---

## Design Language

| Token | Value | Usage |
|---|---|---|
| `--color-primary` | `#046A38` | Forest Green — headings, CTAs |
| `--color-accent` | `#FF671F` | Saffron Orange — highlights, hover |
| `--font-heading` | System sans-serif stack | Headings |
| `--font-body` | System serif stack | Body copy |
| `--radius-card` | `16px` | Card corners |
| `--shadow-glass` | Glass morphism blur | Cards, nav |

Inspired by the colors of the Indian flag. Minimalist, readable, fast.

---

## Author

**Amit Ku Yadav**
Bhagalpur, Bihar, India

Founder of Jhon Aamit LLP · Royal Heritage Resort · National Youth Force

[kingofyadav.in](https://kingofyadav.in) · [circle.onelife@gmail.com](mailto:circle.onelife@gmail.com)

---

<div align="center">

Designed, written, and coded by Amit Ku Yadav.
No templates. No page builders. Built by hand.

</div>
