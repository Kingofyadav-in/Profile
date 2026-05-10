"use strict";

/* ======================================================
   personal-data.js
   Dynamic card CMS for personal.html
   Storage: localStorage (ak_pd)
   Sections: details | values | people
====================================================== */

const PD_KEY = "ak_pd";

/* ── Default seed data (used on first load) ── */
const PD_DEFAULTS = {
  details: [
    { id: "dob",        title: "Date of Birth", value: "25 December 1999" },
    { id: "age",        title: "Age",            value: "26 Years" },
    { id: "city",       title: "City",           value: "Bhagalpur, Bihar, India" },
    { id: "work",       title: "Work Direction", value: "Digital Systems · Business · Public & Community Work" },
    { id: "approach",   title: "Approach",       value: "Learning, building, coordinating, and improving step by step" },
    { id: "focus",      title: "Current Focus",  value: "Trust, useful work, clear communication, and long-term credibility" }
  ],
  values: [
    { id: "discipline",     title: "Discipline",     desc: "Daily structure, patience, and steady work matter more than temporary attention." },
    { id: "accountability", title: "Accountability", desc: "If my name is connected to something, I should be reachable, responsible, and clear." },
    { id: "trust",          title: "Trust",          desc: "Trust should be earned through action, consistency, and honest communication." }
  ],
  people: [
    { id: "aniket",   name: "Aniket Ku Yadav",  role: "Community Representative", phone: "+919939875791", whatsapp: "+919939875791" },
    { id: "abhishek", name: "Abhishek Ku Yadav", role: "Community Coordinator",   phone: "+919801249451", whatsapp: "+919801249451" }
  ]
};

/* ======================================================
   STORAGE
====================================================== */

function pdLoad() {
  try {
    const raw = localStorage.getItem(PD_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      return {
        details: Array.isArray(p.details) ? p.details : [],
        values:  Array.isArray(p.values)  ? p.values  : [],
        people:  Array.isArray(p.people)  ? p.people  : []
      };
    }
  } catch {}
  return JSON.parse(JSON.stringify(PD_DEFAULTS));
}

function pdSave(data) {
  try {
    localStorage.setItem(PD_KEY, JSON.stringify(data));
    return true;
  } catch (e) {
    console.error("[pd] save:", e);
    return false;
  }
}

function pdUpsertDetail(details, id, title, value) {
  const cleanValue = String(value || "").trim();
  const idx = details.findIndex(item => item.id === id);
  if (!cleanValue) {
    if (idx >= 0) details.splice(idx, 1);
    return;
  }
  const next = { id, title, value: cleanValue, source: "identity" };
  if (idx >= 0) details[idx] = Object.assign({}, details[idx], next);
  else details.unshift(next);
}

function pdSyncIdentityDetails(identity) {
  if (!identity) return;
  const data = pdLoad();
  const phone = identity.phone
    ? ((identity.phoneCode || "") + " " + identity.phone).trim()
    : "";

  pdUpsertDetail(data.details, "identity_name", "Full Name", identity.name);
  pdUpsertDetail(data.details, "identity_username", "Username", identity.username ? "@" + identity.username : "");
  pdUpsertDetail(data.details, "identity_email", "Email", identity.email);
  pdUpsertDetail(data.details, "identity_mobile", "Mobile", phone);
  pdUpsertDetail(data.details, "identity_hdi", "HDI", identity.hdi);
  pdUpsertDetail(data.details, "identity_location", "Location", identity.location);
  pdUpsertDetail(data.details, "identity_roles", "Roles", Array.isArray(identity.roles) ? identity.roles.join(" · ") : identity.roles);

  pdSave(data);
  pdRenderDetails(data);
}

window.pdSyncIdentityDetails = pdSyncIdentityDetails;

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

/* ======================================================
   DUPLICATE CHECKS
====================================================== */

function pdDupTitle(arr, title, excludeId) {
  return arr.some(item =>
    item.id !== excludeId &&
    item.title.trim().toLowerCase() === title.trim().toLowerCase()
  );
}

function pdDupPerson(arr, name, phone, excludeId) {
  const normPhone = phone ? phone.replace(/\D/g, "") : "";
  return arr.some(p => {
    if (p.id === excludeId) return false;
    const sameName  = p.name.trim().toLowerCase() === name.trim().toLowerCase();
    const samePhone = normPhone && p.phone && p.phone.replace(/\D/g, "") === normPhone;
    return sameName || samePhone;
  });
}

/* ======================================================
   HTML ESCAPE
====================================================== */

function esc(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* ======================================================
   RENDER
====================================================== */

function pdRenderDetails(data) {
  const grid = document.getElementById("pd-details-grid");
  if (!grid) return;
  if (!data.details.length) {
    grid.innerHTML = '<p class="pd-empty">No details yet. Click "+ Add Detail" to start.</p>';
    return;
  }
  grid.innerHTML = data.details.map(d => `
    <div class="life-card glass pd-card" data-section="details" data-id="${esc(d.id)}"
         tabindex="0" role="button" aria-label="Edit ${esc(d.title)}">
      <span class="pd-edit-badge" aria-hidden="true">✏️ Edit</span>
      <div class="pd-card-head">
        <h3>${esc(d.title)}</h3>
        ${d.source === "identity" ? '<span class="pd-link-badge" aria-hidden="true">Linked</span>' : ''}
      </div>
      <p>${esc(d.value)}</p>
    </div>
  `).join("");
}

function pdRenderValues(data) {
  const grid = document.getElementById("pd-values-grid");
  if (!grid) return;
  if (!data.values.length) {
    grid.innerHTML = '<p class="pd-empty">No values yet. Click "+ Add Value" to start.</p>';
    return;
  }
  grid.innerHTML = data.values.map(v => `
    <div class="life-card glass pd-card" data-section="values" data-id="${esc(v.id)}"
         tabindex="0" role="button" aria-label="Edit ${esc(v.title)}">
      <span class="pd-edit-badge" aria-hidden="true">✏️ Edit</span>
      <h3>${esc(v.title)}</h3>
      <p>${esc(v.desc)}</p>
    </div>
  `).join("");
}

function pdRenderPeople(data) {
  const grid = document.getElementById("pd-people-grid");
  if (!grid) return;
  if (!data.people.length) {
    grid.innerHTML = '<p class="pd-empty">No people yet. Click "+ Add Person" to start.</p>';
    return;
  }
  grid.innerHTML = data.people.map(p => `
    <div class="life-card glass pd-card" data-section="people" data-id="${esc(p.id)}"
         tabindex="0" role="button" aria-label="Edit ${esc(p.name)}">
      <span class="pd-edit-badge" aria-hidden="true">✏️ Edit</span>
      <h3>${esc(p.name)}</h3>
      <p>${esc(p.role)}</p>
      <div class="life-actions">
        ${p.phone
          ? `<a href="tel:${esc(p.phone)}" class="life-action" onclick="event.stopPropagation()">📞 Call</a>`
          : ""}
        ${p.whatsapp
          ? `<a href="https://wa.me/${p.whatsapp.replace(/\D/g,"")}" target="_blank" rel="noopener noreferrer" class="life-action" onclick="event.stopPropagation()">💬 WhatsApp</a>`
          : ""}
      </div>
    </div>
  `).join("");
}

function pdRenderAll() {
  const data = pdLoad();
  pdRenderDetails(data);
  pdRenderValues(data);
  pdRenderPeople(data);
  pdBindCards();
}

/* ======================================================
   MODAL STATE
====================================================== */

let _section = null;
let _id      = null;

function pdOpenModal(section, id) {
  _section = section;
  _id      = id || null;

  const data   = pdLoad();
  const isNew  = !id;
  const modal  = document.getElementById("pdModal");
  const title  = document.getElementById("pdModalTitle");
  const body   = document.getElementById("pdModalBody");
  const delBtn = document.getElementById("pdDeleteBtn");

  title.textContent    = isNew ? "Add Card" : "Edit Card";
  delBtn.style.display = isNew ? "none" : "";

  /* Build form fields for this section */
  if (section === "details") {
    const item = isNew ? {} : (data.details.find(d => d.id === id) || {});
    body.innerHTML = `
      <div class="pd-field">
        <label for="pd-f-title">Label <span class="pd-req">*</span></label>
        <input id="pd-f-title" type="text" value="${esc(item.title || "")}"
          placeholder="e.g. Education" maxlength="60" autocomplete="off" />
      </div>
      <div class="pd-field">
        <label for="pd-f-value">Value <span class="pd-req">*</span></label>
        <input id="pd-f-value" type="text" value="${esc(item.value || "")}"
          placeholder="e.g. B.Tech, Computer Science" maxlength="200" autocomplete="off" />
      </div>
    `;

  } else if (section === "values") {
    const item = isNew ? {} : (data.values.find(v => v.id === id) || {});
    body.innerHTML = `
      <div class="pd-field">
        <label for="pd-f-title">Value Name <span class="pd-req">*</span></label>
        <input id="pd-f-title" type="text" value="${esc(item.title || "")}"
          placeholder="e.g. Integrity" maxlength="60" autocomplete="off" />
      </div>
      <div class="pd-field">
        <label for="pd-f-desc">Description <span class="pd-req">*</span></label>
        <textarea id="pd-f-desc" rows="4" maxlength="400"
          placeholder="Describe this value…">${esc(item.desc || "")}</textarea>
      </div>
    `;

  } else if (section === "people") {
    const item = isNew ? {} : (data.people.find(p => p.id === id) || {});
    body.innerHTML = `
      <div class="pd-field">
        <label for="pd-f-name">Full Name <span class="pd-req">*</span></label>
        <input id="pd-f-name" type="text" value="${esc(item.name || "")}"
          placeholder="e.g. Ravi Kumar Yadav" maxlength="80" autocomplete="off" />
      </div>
      <div class="pd-field">
        <label for="pd-f-role">Role <span class="pd-req">*</span></label>
        <input id="pd-f-role" type="text" value="${esc(item.role || "")}"
          placeholder="e.g. Field Coordinator" maxlength="100" autocomplete="off" />
      </div>
      <div class="pd-field">
        <label for="pd-f-phone">Phone</label>
        <input id="pd-f-phone" type="tel" value="${esc(item.phone || "")}"
          placeholder="+91XXXXXXXXXX" maxlength="20" />
      </div>
      <div class="pd-field">
        <label for="pd-f-wa">WhatsApp <small>(leave blank if same as phone)</small></label>
        <input id="pd-f-wa" type="tel" value="${esc(item.whatsapp || "")}"
          placeholder="+91XXXXXXXXXX" maxlength="20" />
      </div>
    `;
  }

  /* Error slot */
  const errDiv = document.createElement("div");
  errDiv.id        = "pdModalErr";
  errDiv.className = "pd-modal-error";
  body.appendChild(errDiv);

  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";

  /* Focus first field */
  setTimeout(() => {
    const first = body.querySelector("input, textarea");
    if (first) first.focus();
  }, 60);
}

function pdCloseModal() {
  const modal = document.getElementById("pdModal");
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
  _section = null;
  _id      = null;
}

/* ======================================================
   SAVE
====================================================== */

function pdSaveModal() {
  const data  = pdLoad();
  const isNew = !_id;
  const errEl = document.getElementById("pdModalErr");
  if (errEl) errEl.textContent = "";

  if (_section === "details") {
    const title = (document.getElementById("pd-f-title")?.value || "").trim();
    const value = (document.getElementById("pd-f-value")?.value || "").trim();
    if (!title || !value) { showErr("Both Label and Value are required."); return; }
    if (pdDupTitle(data.details, title, _id)) {
      showErr(`A card with label "${title}" already exists.`); return;
    }
    if (isNew) {
      data.details.push({ id: genId(), title, value });
    } else {
      const item = data.details.find(d => d.id === _id);
      if (item) { item.title = title; item.value = value; }
    }

  } else if (_section === "values") {
    const title = (document.getElementById("pd-f-title")?.value || "").trim();
    const desc  = (document.getElementById("pd-f-desc")?.value  || "").trim();
    if (!title || !desc) { showErr("Both Name and Description are required."); return; }
    if (pdDupTitle(data.values, title, _id)) {
      showErr(`A value card named "${title}" already exists.`); return;
    }
    if (isNew) {
      data.values.push({ id: genId(), title, desc });
    } else {
      const item = data.values.find(v => v.id === _id);
      if (item) { item.title = title; item.desc = desc; }
    }

  } else if (_section === "people") {
    const name     = (document.getElementById("pd-f-name")?.value  || "").trim();
    const role     = (document.getElementById("pd-f-role")?.value  || "").trim();
    const phone    = (document.getElementById("pd-f-phone")?.value || "").trim();
    const waRaw    = (document.getElementById("pd-f-wa")?.value    || "").trim();
    const whatsapp = waRaw || phone;
    if (!name || !role) { showErr("Full Name and Role are required."); return; }
    if (pdDupPerson(data.people, name, phone, _id)) {
      showErr("A person with this name or phone number already exists."); return;
    }
    if (isNew) {
      data.people.push({ id: genId(), name, role, phone, whatsapp });
    } else {
      const item = data.people.find(p => p.id === _id);
      if (item) { item.name = name; item.role = role; item.phone = phone; item.whatsapp = whatsapp; }
    }
  }

  if (pdSave(data)) {
    pdRenderAll();
    pdCloseModal();
  } else {
    showErr("Failed to save. Storage may be full.");
  }
}

function showErr(msg) {
  const el = document.getElementById("pdModalErr");
  if (el) el.textContent = msg;
}

/* ======================================================
   DELETE
====================================================== */

function pdDeleteCard() {
  if (!_id || !_section) return;
  const data = pdLoad();

  let label = "";
  if (_section === "details") label = data.details.find(d => d.id === _id)?.title || "this card";
  if (_section === "values")  label = data.values.find(v => v.id === _id)?.title  || "this card";
  if (_section === "people")  label = data.people.find(p => p.id === _id)?.name   || "this person";

  if (!confirm(`Delete "${label}"? This cannot be undone.`)) return;

  if (_section === "details") data.details = data.details.filter(d => d.id !== _id);
  if (_section === "values")  data.values  = data.values.filter(v => v.id  !== _id);
  if (_section === "people")  data.people  = data.people.filter(p => p.id  !== _id);

  pdSave(data);
  pdRenderAll();
  pdCloseModal();
}

/* ======================================================
   BIND CARD CLICKS (re-run after each render)
====================================================== */

function pdBindCards() {
  document.querySelectorAll(".pd-card").forEach(card => {
    const isLinkedIdentity = card.dataset.section === "details" && String(card.dataset.id || "").indexOf("identity_") === 0;
    card.onclick = () => {
      if (isLinkedIdentity && typeof hiOpenIdentityModal === "function" && typeof hiLoadIdentity === "function") {
        hiLoadIdentity().then(identity => hiOpenIdentityModal(identity || null)).catch(() => hiOpenIdentityModal(null));
        return;
      }
      pdOpenModal(card.dataset.section, card.dataset.id);
    };
    card.onkeydown = e => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        card.click();
      }
    };
  });
}

/* ======================================================
   INIT
====================================================== */

document.addEventListener("DOMContentLoaded", function () {
  pdRenderAll();

  /* Modal controls */
  document.getElementById("pdModalClose").addEventListener("click", pdCloseModal);
  document.getElementById("pdCancelBtn").addEventListener("click",  pdCloseModal);
  document.getElementById("pdSaveBtn").addEventListener("click",    pdSaveModal);
  document.getElementById("pdDeleteBtn").addEventListener("click",  pdDeleteCard);

  /* Close on backdrop click */
  document.getElementById("pdModal").addEventListener("click", function (e) {
    if (e.target === this) pdCloseModal();
  });

  /* Close on Escape */
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") pdCloseModal();
  });

  /* Enter key submits modal */
  document.getElementById("pdModal").addEventListener("keydown", function (e) {
    if (e.key === "Enter" && e.target.tagName !== "TEXTAREA" && e.target.tagName !== "BUTTON") {
      e.preventDefault();
      pdSaveModal();
    }
  });

  /* Add buttons */
  document.querySelectorAll("[data-pd-add]").forEach(btn => {
    btn.addEventListener("click", () => pdOpenModal(btn.dataset.pdAdd, null));
  });
});
