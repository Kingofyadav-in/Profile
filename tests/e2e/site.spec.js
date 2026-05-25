// @ts-check
const { test, expect } = require("@playwright/test");

// ── Helpers ────────────────────────────────────────────────────────────────

async function noConsoleErrors(page) {
  const errors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  return errors;
}

// ── Homepage ───────────────────────────────────────────────────────────────

test.describe("Homepage", () => {
  test("loads and has correct title", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Amit Ku Yadav/i);
  });

  test("shows hero heading", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1").first()).toBeVisible();
  });

  test("has canonical meta tag", async ({ page }) => {
    await page.goto("/");
    const canonical = page.locator('link[rel="canonical"]');
    await expect(canonical).toHaveAttribute("href", /kingofyadav\.in/);
  });

  test("has OG image meta tag", async ({ page }) => {
    await page.goto("/");
    const og = page.locator('meta[property="og:image"]');
    await expect(og).toHaveAttribute("content", /og-image/);
  });

  test("loads on mobile without horizontal scroll", async ({ page }) => {
    await page.goto("/");
    const bodyWidth  = await page.evaluate(() => document.body.scrollWidth);
    const innerWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyWidth).toBeLessThanOrEqual(innerWidth + 5);
  });
});

// ── Key pages load ──────────────────────────────────────────────────────────

const KEY_PAGES = [
  { path: "/pages/about.html",        titlePattern: /about|Amit/i },
  { path: "/pages/services.html",     titlePattern: /service/i },
  { path: "/pages/contact.html",      titlePattern: /contact/i },
  { path: "/pages/blog.html",         titlePattern: /blog|writing/i },
  { path: "/pages/professional.html", titlePattern: /professional|work/i },
  { path: "/pages/personal.html",     titlePattern: /personal|Amit/i },
  { path: "/pages/login.html",        titlePattern: /login|sign/i },
];

for (const { path, titlePattern } of KEY_PAGES) {
  test(`${path} loads with correct title`, async ({ page }) => {
    const res = await page.goto(path);
    expect(res.status()).toBeLessThan(400);
    await expect(page).toHaveTitle(titlePattern);
  });
}

// ── Navigation ─────────────────────────────────────────────────────────────

test.describe("Navigation", () => {
  test("nav links are present on homepage", async ({ page }) => {
    await page.goto("/");
    const links = page.locator("nav a, header a");
    await expect(links.first()).toBeVisible();
  });

  test("clicking About navigates correctly", async ({ page }) => {
    await page.goto("/");
    const aboutLink = page
      .locator("a")
      .filter({ hasText: /^about$/i })
      .first();
    if (await aboutLink.count() > 0) {
      await aboutLink.click();
      await expect(page).toHaveURL(/about/i);
    } else {
      test.skip();
    }
  });
});

// ── Contact page ───────────────────────────────────────────────────────────

test.describe("Contact page", () => {
  test("has a form or contact details", async ({ page }) => {
    await page.goto("/pages/contact.html");
    const hasForm    = (await page.locator("form").count()) > 0;
    const hasEmail   = (await page.locator("a[href^='mailto:']").count()) > 0;
    const hasPhone   = (await page.locator("a[href^='tel:']").count()) > 0;
    expect(hasForm || hasEmail || hasPhone).toBe(true);
  });
});

// ── Login page ─────────────────────────────────────────────────────────────

test.describe("Login page", () => {
  test("has phone or email input", async ({ page }) => {
    await page.goto("/pages/login.html");
    const input = page.locator('input[type="tel"], input[type="email"], input[type="text"]').first();
    await expect(input).toBeVisible();
  });

  test("has a submit button", async ({ page }) => {
    await page.goto("/pages/login.html");
    await expect(page.locator(".auth-submit").first()).toBeVisible();
  });
});

// ── Static assets ──────────────────────────────────────────────────────────

test.describe("Static assets", () => {
  test("favicon loads", async ({ page }) => {
    await page.goto("/");
    const res = await page.request.get("/favicon/favicon.ico");
    expect(res.status()).toBeLessThan(400);
  });

  test("manifest.json is valid JSON", async ({ page }) => {
    const res  = await page.request.get("/manifest.json");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("name");
  });

  test("robots.txt exists", async ({ page }) => {
    const res = await page.request.get("/robots.txt");
    expect(res.status()).toBe(200);
  });
});
