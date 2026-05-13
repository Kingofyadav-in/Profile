<div align="center">

<img src="logo/night-logo.png" alt="Amit Ku Yadav" width="110" />

# Amit Ku Yadav

### Personal platform, venture pages, public writing, and HI Life OS

[![Live Site](https://img.shields.io/badge/Live-kingofyadav.in-046A38?style=flat-square&logo=vercel&logoColor=white)](https://kingofyadav.in)
[![Node](https://img.shields.io/badge/Node-20%2B-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Stack](https://img.shields.io/badge/Stack-HTML%20%2F%20CSS%20%2F%20JS-111111?style=flat-square)](https://developer.mozilla.org/)
[![PWA](https://img.shields.io/badge/PWA-Installable-5A0FC8?style=flat-square&logo=pwa&logoColor=white)](https://developer.mozilla.org/)

</div>

## Overview

`kingofyadav.in` is a framework-free, production-oriented personal platform for Amit Ku Yadav. It combines a public website, a long-form blog, venture landing pages, and a protected HI Life OS dashboard in one codebase.

The site is designed around three clear layers:

| Layer | Purpose |
|---|---|
| Public site | Home, about, services, contact, blog, gallery, collaboration |
| Venture pages | Brand and initiative pages for projects and businesses |
| HI Life OS | Private dashboard, identity, wallet, vault, license, assistant |

## What Makes It Different

- One codebase for public identity and private life systems
- Vanilla HTML, CSS, and JavaScript only
- Local-first HI data stored in IndexedDB
- Static pages plus lightweight Node.js APIs where needed
- PWA support, offline fallback, and deployment hardening

## Key Entry Points

- [index.html](./index.html) - public homepage
- [pages/personal.html](./pages/personal.html) - HI Life OS command center
- [pages/hi-license.html](./pages/hi-license.html) - License system
- [pages/wallet.html](./pages/wallet.html) - HI Wallet
- [pages/vault.html](./pages/vault.html) - HI Vault
- [pages/merchant.html](./pages/merchant.html) - HI Merchant
- [pages/blog.html](./pages/blog.html) - blog index
- [pages/services.html](./pages/services.html) - services
- [pages/contact.html](./pages/contact.html) - contact

## Stack

- HTML for structure and content
- CSS for shared system styling and page-specific layouts
- Vanilla JavaScript for navigation, rendering, auth, storage, and UI behavior
- IndexedDB for private HI records
- Node.js for local auth and API support
- Vercel for deployment

## Development

Requires Node.js 20 or newer.

```bash
npm install
npm start
```

`npm start` runs `server/otp-server.js`, which supports the local auth and API flow used by the site.

## Runtime Structure

| Area | Files |
|---|---|
| Shared UI | `css/base.css`, `css/components.css`, `js/script.js` |
| Public pages | `index.html`, `pages/*.html`, `blog/*.html`, `brands/*.html` |
| HI system | `js/hi-app.js`, `js/hi-personal.js`, `js/hi-professional.js`, `js/hi-social.js`, `js/hi-license.js`, `js/hi-sync.js`, `js/hi-context.js`, `js/hi-assistant.js` |
| Storage and auth | `js/hi-storage.js`, `js/auth.js`, `server/otp-server.js` |
| APIs | `api/`, `api-static/`, `functions/api/` |
| Deployment | `vercel.json`, `service-worker.js`, `manifest.json` |

## Site Areas

- Public portfolio: home, about, professional, services, contact, collaboration
- Writing system: blog index plus individual article pages
- Venture pages: brands and business-facing landing pages
- HI Life OS: private profile, personal pages, wallet, vault, merchant, marketplace, license
- Live classroom: a separate real-time board experience

## Notes

- The site intentionally avoids frontend frameworks.
- The HI system is local-first by design.
- The `hi-license.html` route remains for compatibility, while the user-facing label is `License`.
