# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: site.spec.js >> Homepage >> loads and has correct title
- Location: tests/e2e/site.spec.js:17:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.goto: net::ERR_ABORTED; maybe frame was detached?
Call log:
  - navigating to "https://kingofyadav.in/", waiting until "load"

```

# Test source

```ts
  1   | // @ts-check
  2   | const { test, expect } = require("@playwright/test");
  3   | 
  4   | // ── Helpers ────────────────────────────────────────────────────────────────
  5   | 
  6   | async function noConsoleErrors(page) {
  7   |   const errors = [];
  8   |   page.on("console", (msg) => {
  9   |     if (msg.type() === "error") errors.push(msg.text());
  10  |   });
  11  |   return errors;
  12  | }
  13  | 
  14  | // ── Homepage ───────────────────────────────────────────────────────────────
  15  | 
  16  | test.describe("Homepage", () => {
  17  |   test("loads and has correct title", async ({ page }) => {
> 18  |     await page.goto("/");
      |                ^ Error: page.goto: net::ERR_ABORTED; maybe frame was detached?
  19  |     await expect(page).toHaveTitle(/Amit Ku Yadav/i);
  20  |   });
  21  | 
  22  |   test("shows hero heading", async ({ page }) => {
  23  |     await page.goto("/");
  24  |     await expect(page.locator("h1").first()).toBeVisible();
  25  |   });
  26  | 
  27  |   test("has canonical meta tag", async ({ page }) => {
  28  |     await page.goto("/");
  29  |     const canonical = page.locator('link[rel="canonical"]');
  30  |     await expect(canonical).toHaveAttribute("href", /kingofyadav\.in/);
  31  |   });
  32  | 
  33  |   test("has OG image meta tag", async ({ page }) => {
  34  |     await page.goto("/");
  35  |     const og = page.locator('meta[property="og:image"]');
  36  |     await expect(og).toHaveAttribute("content", /og-image/);
  37  |   });
  38  | 
  39  |   test("loads on mobile without horizontal scroll", async ({ page }) => {
  40  |     await page.goto("/");
  41  |     const bodyWidth  = await page.evaluate(() => document.body.scrollWidth);
  42  |     const innerWidth = await page.evaluate(() => window.innerWidth);
  43  |     expect(bodyWidth).toBeLessThanOrEqual(innerWidth + 5);
  44  |   });
  45  | });
  46  | 
  47  | // ── Key pages load ──────────────────────────────────────────────────────────
  48  | 
  49  | const KEY_PAGES = [
  50  |   { path: "/pages/about.html",        titlePattern: /about|Amit/i },
  51  |   { path: "/pages/services.html",     titlePattern: /service/i },
  52  |   { path: "/pages/contact.html",      titlePattern: /contact/i },
  53  |   { path: "/pages/blog.html",         titlePattern: /blog|writing/i },
  54  |   { path: "/pages/professional.html", titlePattern: /professional|work/i },
  55  |   { path: "/pages/personal.html",     titlePattern: /personal|Amit/i },
  56  |   { path: "/pages/login.html",        titlePattern: /login|sign/i },
  57  | ];
  58  | 
  59  | for (const { path, titlePattern } of KEY_PAGES) {
  60  |   test(`${path} loads with correct title`, async ({ page }) => {
  61  |     const res = await page.goto(path);
  62  |     expect(res.status()).toBeLessThan(400);
  63  |     await expect(page).toHaveTitle(titlePattern);
  64  |   });
  65  | }
  66  | 
  67  | // ── Navigation ─────────────────────────────────────────────────────────────
  68  | 
  69  | test.describe("Navigation", () => {
  70  |   test("nav links are present on homepage", async ({ page }) => {
  71  |     await page.goto("/");
  72  |     const links = page.locator("nav a, header a");
  73  |     await expect(links.first()).toBeVisible();
  74  |   });
  75  | 
  76  |   test("clicking About navigates correctly", async ({ page }) => {
  77  |     await page.goto("/");
  78  |     const aboutLink = page
  79  |       .locator("a")
  80  |       .filter({ hasText: /^about$/i })
  81  |       .first();
  82  |     if (await aboutLink.count() > 0) {
  83  |       await aboutLink.click();
  84  |       await expect(page).toHaveURL(/about/i);
  85  |     } else {
  86  |       test.skip();
  87  |     }
  88  |   });
  89  | });
  90  | 
  91  | // ── Contact page ───────────────────────────────────────────────────────────
  92  | 
  93  | test.describe("Contact page", () => {
  94  |   test("has a form or contact details", async ({ page }) => {
  95  |     await page.goto("/pages/contact.html");
  96  |     const hasForm    = (await page.locator("form").count()) > 0;
  97  |     const hasEmail   = (await page.locator("a[href^='mailto:']").count()) > 0;
  98  |     const hasPhone   = (await page.locator("a[href^='tel:']").count()) > 0;
  99  |     expect(hasForm || hasEmail || hasPhone).toBe(true);
  100 |   });
  101 | });
  102 | 
  103 | // ── Login page ─────────────────────────────────────────────────────────────
  104 | 
  105 | test.describe("Login page", () => {
  106 |   test("has phone or email input", async ({ page }) => {
  107 |     await page.goto("/pages/login.html");
  108 |     const input = page.locator('input[type="tel"], input[type="email"], input[type="text"]').first();
  109 |     await expect(input).toBeVisible();
  110 |   });
  111 | 
  112 |   test("has a submit button", async ({ page }) => {
  113 |     await page.goto("/pages/login.html");
  114 |     await expect(page.locator(".auth-submit").first()).toBeVisible();
  115 |   });
  116 | });
  117 | 
  118 | // ── Static assets ──────────────────────────────────────────────────────────
```