"use strict";

/* Backend-ready profile renderer.
   Reads static JSON today; can read /api/profiles/:slug later without page rewrites. */

(function () {
  const page = document.body.dataset.profilePage;
  if (!page) return;

  const params = new URLSearchParams(window.location.search);
  const slug = (params.get("profile") || "amit").replace(/[^a-z0-9-]/gi, "").toLowerCase() || "amit";

  const apiPath = `/api/profiles/${slug}`;
  const staticPath = `/data/profiles/${slug}.json`;

  function esc(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  async function fetchJson(url) {
    const res = await fetch(url, { headers: { "Accept": "application/json" } });
    if (!res.ok) throw new Error(`${url} returned ${res.status}`);
    return res.json();
  }

  async function loadProfile() {
    try {
      return await fetchJson(apiPath);
    } catch (_) {
      return fetchJson(staticPath);
    }
  }

  function p(text, className) {
    return `<p${className ? ` class="${className}"` : ""}>${esc(text)}</p>`;
  }

  function cards(items, cardClass = "life-card glass") {
    return (items || []).map(item => `
      <article class="${cardClass}">
        <h3>${esc(item.title)}</h3>
        <p>${esc(item.body)}</p>
      </article>
    `).join("");
  }

  function timeline(items) {
    return `<ul class="timeline">${(items || []).map(item => `
      <li>
        <strong>${esc(item.title)}</strong>
        <p>${esc(item.body)}</p>
      </li>
    `).join("")}</ul>`;
  }

  function setBrand(profile) {
    document.querySelectorAll(".personal-name, .brand-name").forEach(el => {
      el.textContent = profile.brand?.name || profile.ownerName || "Profile";
    });
  }

  function renderAbout(main, profile) {
    const data = profile.aboutMe;
    main.className = "about-page";
    main.innerHTML = `
      <section class="personal-section glass" id="people">
        <h1>${esc(data.hero.title)}</h1>
        ${p(data.hero.intro, "personal-intro")}
      </section>
      ${(data.sections || []).map(section => `
        <section class="personal-section glass">
          <h2>${esc(section.title)}</h2>
          ${p(section.body, "personal-intro")}
        </section>
      `).join("")}
      <section class="personal-section glass" id="journey">
        <h2>My Journey</h2>
        ${timeline(data.journey)}
      </section>
      <section class="personal-section glass" id="education">
        <h2>Education</h2>
        ${timeline(data.education)}
      </section>
      <section class="personal-section" id="impact">
        <h2>Where I Contribute</h2>
        <div class="life-grid">${cards(data.impact)}</div>
      </section>
      <section class="personal-section glass" id="connect">
        <h2>Let's Connect</h2>
        ${p("I welcome constructive discussions, collaborations, and meaningful initiatives that support long-term growth.", "personal-intro")}
        <div class="personal-actions">
          <a href="/pages/contact.html" class="life-card glass">Contact</a>
          <a href="/pages/services.html" class="life-card glass">Work & Services</a>
        </div>
      </section>
    `;
  }

  function renderSelf(main, profile) {
    const data = profile.mySelf;
    main.className = "site-main page-intro";
    main.innerHTML = `
      <section class="life-card">
        <h2>${esc(data.hero.title)}</h2>
        ${(data.hero.body || []).map(text => p(text)).join("")}
      </section>
      <section class="life-card">
        <h2>${esc(data.vision.title)}</h2>
        ${p(data.vision.body)}
      </section>
      <section class="services-grid">${cards(data.skills, "service-card")}</section>
      <section class="life-card">
        <h2>${esc(data.philosophy.title)}</h2>
        ${p(data.philosophy.body)}
      </section>
      <section class="life-card">
        <h2>Personal Interests</h2>
        <div class="services-grid">${cards(data.interests, "service-card")}</div>
      </section>
      <section class="life-card">
        <h2>Quick Facts</h2>
        <div class="services-grid">${cards(data.facts, "service-card")}</div>
      </section>
      <section class="life-card">
        <h2>Let's Build Something Meaningful</h2>
        <a href="/pages/contact.html" class="btn-primary">Connect With Me</a>
      </section>
    `;
  }

  function renderHome(main, profile) {
    const data = profile.myHome;
    main.className = "site-main personal-page";
    main.innerHTML = `
      <section class="personal-section glass hero-home">
        <header>
          <h1>${esc(data.hero.title)}</h1>
          ${p(data.hero.intro, "personal-intro")}
        </header>
      </section>
      <section class="personal-section glass" id="foundation">
        <header><h2>${esc(data.foundation.title)}</h2></header>
        <article>${p(data.foundation.body)}</article>
        <aside>${p(data.foundation.meta)}</aside>
      </section>
      <section class="personal-section" id="digital-home">
        <header><h2>Digital Home Infrastructure</h2></header>
        <div class="life-grid">${cards(data.infrastructure)}</div>
      </section>
      <section class="personal-section glass">
        <header><h2>Daily Structure</h2></header>
        ${timeline(data.dailyStructure)}
      </section>
      <section class="personal-section glass" id="location">
        <header><h2>${esc(data.location.title)}</h2></header>
        <address>${esc(data.location.body)}<br><time>${esc(data.location.meta)}</time></address>
      </section>
      <section class="personal-section glass" id="community">
        <header><h2>${esc(data.community.title)}</h2></header>
        ${p(data.community.body, "personal-intro")}
      </section>
    `;
  }

  function renderCity(main, profile) {
    const data = profile.myCity;
    main.className = "city-page";
    main.innerHTML = `
      <section class="city-hero glass">
        <h1>${esc(data.hero.title)}</h1>
        ${p(data.hero.intro, "city-intro")}
      </section>
      ${(data.sections || []).slice(0, 1).map(section => `
        <section class="city-section">
          <h2>${esc(section.title)}</h2>
          ${p(section.body)}
        </section>
      `).join("")}
      <section class="city-section">
        <h2>City Highlights</h2>
        <div class="city-grid">${cards(data.highlights, "city-card")}</div>
      </section>
      ${(data.sections || []).slice(1).map(section => `
        <section class="city-section">
          <h2>${esc(section.title)}</h2>
          ${p(section.body)}
        </section>
      `).join("")}
      <section class="city-section">
        <h2>Connectivity</h2>
        <div class="city-grid">${cards(data.connectivity, "city-card")}</div>
      </section>
      <section class="city-section glass">
        <h2>${esc(data.personalNote.title)}</h2>
        ${p(data.personalNote.body)}
        ${p(data.personalNote.meta)}
      </section>
    `;
  }

  document.addEventListener("DOMContentLoaded", async function () {
    const main = document.getElementById("main-content") || document.querySelector("main");
    if (!main) return;

    try {
      const profile = await loadProfile();
      setBrand(profile);
      if (page === "aboutMe") renderAbout(main, profile);
      if (page === "mySelf") renderSelf(main, profile);
      if (page === "myHome") renderHome(main, profile);
      if (page === "myCity") renderCity(main, profile);
    } catch (err) {
      console.warn("[profile-renderer] using static HTML fallback:", err);
    }
  });
})();
