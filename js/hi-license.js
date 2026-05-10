"use strict";

/* ======================================================
   hi-license.js — Human Digital Identity + Content License
   Phase 10 v2: deterministic hashes · portable certificate
   Depends on: hi-storage.js, hi-app.js
====================================================== */

var HI_LICENSE_VERSION = "2.0";
var HI_LICENSE_SITE = "kingofyadav.in";

var HI_LICENSE_TYPES = {
  personal:      { label: "HI Personal",      desc: "Only you can use this content" },
  share:         { label: "HI Share",          desc: "Others may share with full credit" },
  open:          { label: "HI Open",           desc: "Free to use, credit required" },
  commercial:    { label: "HI Commercial",     desc: "Commercial use requires owner permission" },
  collaboration: { label: "HI Collaboration",  desc: "Joint ownership arrangement" }
};

var HI_CONTENT_TYPES = ["Idea","Blog Post","Project","Goal","Note","Design","Code","Data","Other"];

var HI_EXISTING_CLAIM_SOURCES = {
  "personal:note": {
    store: "personal",
    type: "note",
    contentType: "Note",
    label: function(item) { return item.title || (item.body || "Private Note").slice(0, 60); },
    content: function(item) { return item.body || item.title || "Private Note"; },
    sort: function(a, b) { return (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0); }
  },
  "personal:goal": {
    store: "personal",
    type: "goal",
    contentType: "Goal",
    label: function(item) { return item.title || "Goal"; },
    content: function(item) {
      return [item.title, item.note, item.deadline ? "Deadline: " + item.deadline : "", "Progress: " + (item.progress || 0) + "%"].filter(Boolean).join("\n");
    },
    sort: function(a, b) { return (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0); }
  },
  "professional:project": {
    store: "professional",
    type: "project",
    contentType: "Project",
    label: function(item) { return item.name || "Project"; },
    content: function(item) { return [item.name, "Status: " + (item.status || "active"), "Color: " + (item.color || "")].filter(Boolean).join("\n"); },
    sort: function(a, b) { return (a.name || "").localeCompare(b.name || ""); }
  },
  "professional:protask": {
    store: "professional",
    type: "protask",
    contentType: "Data",
    label: function(item) { return item.title || "Project Task"; },
    content: function(item) { return [item.title, "Priority: " + (item.priority || "normal"), "Done: " + Boolean(item.done)].join("\n"); },
    sort: function(a, b) { return (b.createdAt || 0) - (a.createdAt || 0); }
  },
  "tasks:task": {
    store: "tasks",
    type: null,
    contentType: "Data",
    label: function(item) { return item.title || "Task"; },
    content: function(item) { return [item.title, "Date: " + (item.date || ""), "Done: " + Boolean(item.done)].filter(Boolean).join("\n"); },
    sort: function(a, b) { return (b.createdAt || 0) - (a.createdAt || 0); }
  },
  "social:event": {
    store: "social",
    type: "event",
    contentType: "Data",
    label: function(item) { return item.title || "Event"; },
    content: function(item) {
      return [item.title, "Date: " + (item.date || ""), "Time: " + (item.time || ""), "Type: " + (item.eventType || ""), item.note || ""].filter(Boolean).join("\n");
    },
    sort: function(a, b) { return String(a.date || "").localeCompare(String(b.date || "")); }
  }
};

function hiLicenseEsc(str) {
  if (typeof hiEsc === "function") return hiEsc(str);
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function hiStableStringify(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(hiStableStringify).join(",") + "]";
  return "{" + Object.keys(value).sort().map(function(key) {
    return JSON.stringify(key) + ":" + hiStableStringify(value[key]);
  }).join(",") + "}";
}

async function hiHashContent(text) {
  var source = String(text || "");
  try {
    var enc = new TextEncoder();
    var buf = await crypto.subtle.digest("SHA-256", enc.encode(source));
    return Array.from(new Uint8Array(buf)).map(function(b) {
      return b.toString(16).padStart(2, "0");
    }).join("");
  } catch(e) {
    var h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (var i = 0; i < source.length; i++) {
      var ch = source.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (h2 >>> 0).toString(16).padStart(8, "0") + (h1 >>> 0).toString(16).padStart(8, "0") + source.length.toString(16);
  }
}

function hiBuildClaimPayload(data) {
  return {
    title: String(data.title || "").trim(),
    contentType: String(data.contentType || "Idea").trim(),
    licenseType: String(data.licenseType || "personal").trim(),
    content: String(data.content || "").trim(),
    sourceStore: data.sourceStore || "",
    sourceType: data.sourceType || "",
    sourceId: data.sourceId || ""
  };
}

function hiFormatLicenseDate(ms) {
  return new Date(ms).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function hiLicensePrefix(identity) {
  var raw = identity.hdi || identity.name || "HI";
  return String(raw).replace(/[^A-Za-z0-9]/g, "").slice(0, 6).toUpperCase() || "HI";
}

function hiLicenseTypeLabel(type) {
  var meta = HI_LICENSE_TYPES[type] || null;
  return meta ? meta.label : (type || "HI License");
}

function hiHashChunks(hash, size, limit) {
  var text = String(hash || "");
  var chunks = [];
  for (var i = 0; i < text.length; i += size) chunks.push(text.slice(i, i + size));
  return chunks.slice(0, limit || chunks.length);
}

function hiRenderHashSeal(hash) {
  var source = String(hash || "hi").padEnd(64, "0");
  var cells = "";
  for (var i = 0; i < 49; i++) {
    var n = parseInt(source.charAt(i % source.length), 16);
    cells += '<span class="' + (n % 3 === 0 ? "on strong" : n % 2 === 0 ? "on" : "") + '"></span>';
  }
  return '<div class="hi-cert-seal-grid" aria-hidden="true">' + cells + '</div>';
}

async function hiBuildLicenseCertificate(identity, license) {
  var verification = {
    protocol: "HI-License",
    version: HI_LICENSE_VERSION,
    licenseId: license.licenseId,
    ownerName: license.ownerName,
    ownerHDI: license.ownerHDI,
    title: license.title,
    contentType: license.contentType,
    licenseType: license.licenseType,
    contentHashAlgorithm: license.contentHashAlgorithm,
    contentHash: license.contentHash,
    issuedAt: license.issuedAt,
    site: HI_LICENSE_SITE
  };
  var verificationHash = await hiHashContent(hiStableStringify(verification));
  return {
    protocol: "HI Human Digital Identity License Certificate",
    version: HI_LICENSE_VERSION,
    issuer: HI_LICENSE_SITE,
    owner: {
      name: identity.name || license.ownerName,
      hdi: identity.hdi || license.ownerHDI || "",
      roles: identity.roles || [],
      location: identity.location || "",
      tagline: identity.tagline || ""
    },
    claim: {
      licenseId: license.licenseId,
      title: license.title,
      contentType: license.contentType,
      licenseType: license.licenseType,
      contentHashAlgorithm: license.contentHashAlgorithm,
      contentHash: license.contentHash,
      sourceRef: license.sourceRef || null,
      issuedAt: license.issuedAt,
      issuedAtLabel: license.createdAtStr
    },
    verification: verification,
    verificationHash: verificationHash,
    status: "Locally issued",
    notice: "This certificate records a HI App proof-of-claim and license assertion. It is local-first evidence, not a government copyright registration."
  };
}

async function hiClaimContent(data, options) {
  var identity = await hiGet("identity", "primary");
  if (!identity || !identity.name) throw new Error("Set up your identity first");

  var opts = options || {};
  var payload = hiBuildClaimPayload(data || {});
  if (!payload.title) throw new Error("Title is required");

  var now = Date.now();
  var licenses = await hiGetAll("licenses");
  var sourceRef = payload.sourceStore && payload.sourceId
    ? { store: payload.sourceStore, type: payload.sourceType || payload.contentType, id: payload.sourceId }
    : null;
  var existing = null;

  if (sourceRef) {
    existing = licenses.find(function(lic) {
      return lic.sourceRef &&
        lic.sourceRef.store === sourceRef.store &&
        lic.sourceRef.id === sourceRef.id;
    }) || null;
  }

  var claimHashPayload = {
    title: payload.title,
    contentType: payload.contentType,
    licenseType: payload.licenseType,
    content: payload.content
  };
  var contentHash = await hiHashContent(hiStableStringify(claimHashPayload));
  var issuedAt = existing ? (existing.issuedAt || existing.createdAt || now) : now;
  var seq = existing ? 0 : licenses.length + 1;
  var dateStr = new Date(issuedAt).toISOString().slice(0, 10).replace(/-/g, "");
  var licenseId = existing ? existing.licenseId : "LIC-" + hiLicensePrefix(identity) + "-" + dateStr + "-" + String(seq).padStart(3, "0");

  var license = Object.assign({}, existing || {}, {
    id: existing ? existing.id : hiGenId(),
    licenseId: licenseId,
    protocolVersion: HI_LICENSE_VERSION,
    ownerName: identity.name,
    ownerHDI: identity.hdi || "",
    title: payload.title,
    contentType: payload.contentType,
    licenseType: payload.licenseType,
    contentHashAlgorithm: "SHA-256",
    contentHash: contentHash,
    contentHashPreview: contentHash.slice(0, 16),
    sourceRef: sourceRef,
    autoClaim: Boolean(opts.autoClaim),
    issuedAt: issuedAt,
    createdAt: issuedAt,
    updatedAt: now,
    createdAtStr: hiFormatLicenseDate(issuedAt)
  });

  license.certificate = await hiBuildLicenseCertificate(identity, license);
  license.verification = license.certificate.verification;
  license.verificationHash = license.certificate.verificationHash;

  await hiPut("licenses", license);
  return license;
}

async function hiAutoClaimRecord(store, record, config) {
  try {
    if (!record || !record.id || typeof hiClaimContent !== "function") return null;
    var cfg = config || {};
    var title = cfg.title || record.title || record.name;
    if (!title) return null;
    var content = cfg.content || [
      record.body || "",
      record.note || "",
      record.mission || "",
      record.deadline ? "Deadline: " + record.deadline : "",
      record.progress !== undefined ? "Progress: " + record.progress + "%" : ""
    ].filter(Boolean).join("\n");
    return await hiClaimContent({
      title: title,
      contentType: cfg.contentType || record.contentType || record.type || "Data",
      licenseType: cfg.licenseType || record.licenseType || "personal",
      content: content || title,
      sourceStore: store,
      sourceType: record.type || cfg.contentType || "",
      sourceId: record.id
    }, { autoClaim: true });
  } catch(e) {
    console.warn("[HI License] Auto-claim skipped:", e.message || e);
    return null;
  }
}

function hiDownloadJSON(filename, data) {
  var blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  var url = URL.createObjectURL(blob);
  var a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
}

async function hiCopyText(text, btn, label) {
  try {
    await navigator.clipboard.writeText(text);
    if (btn) {
      var original = btn.textContent;
      btn.textContent = label || "Copied";
      setTimeout(function() { btn.textContent = original; }, 1400);
    }
  } catch(e) {
    window.prompt("Copy this value", text);
  }
}

function hiRenderLicenseCertificateMarkup(license) {
  var cert = license.certificate || {};
  var owner = cert.owner || {};
  var claim = cert.claim || {};
  var fullHash = claim.contentHash || license.contentHash || "";
  var verifyHash = cert.verificationHash || license.verificationHash || "";
  var hashRows = hiHashChunks(fullHash, 16, 4).map(function(chunk) {
    return '<span>' + hiLicenseEsc(chunk) + '</span>';
  }).join("");
  var verifyRows = hiHashChunks(verifyHash, 16, 4).map(function(chunk) {
    return '<span>' + hiLicenseEsc(chunk) + '</span>';
  }).join("");
  var source = claim.sourceRef || license.sourceRef;

  return '<article class="hi-pro-cert hi-print-target" data-license-id="' + hiLicenseEsc(license.licenseId) + '">' +
    '<div class="hi-pro-cert-ribbon"></div>' +
    '<header class="hi-pro-cert-head">' +
      '<div class="hi-pro-cert-brand">' +
        '<div class="hi-pro-cert-logo">HI</div>' +
        '<div>' +
          '<div class="hi-pro-cert-kicker">Human Intelligence App</div>' +
          '<h3>Digital Ownership Certificate</h3>' +
        '</div>' +
      '</div>' +
      '<div class="hi-pro-cert-status">' +
        '<span>Verified Record</span>' +
        '<strong>' + hiLicenseEsc(license.protocolVersion || HI_LICENSE_VERSION) + '</strong>' +
      '</div>' +
    '</header>' +
    '<section class="hi-pro-cert-hero">' +
      '<div>' +
        '<div class="hi-pro-cert-label">License ID</div>' +
        '<div class="hi-pro-cert-id">' + hiLicenseEsc(license.licenseId) + '</div>' +
        '<h4>' + hiLicenseEsc(claim.title || license.title) + '</h4>' +
        '<p>' + hiLicenseEsc(hiLicenseTypeLabel(claim.licenseType || license.licenseType)) + ' · ' + hiLicenseEsc(claim.contentType || license.contentType) + '</p>' +
      '</div>' +
      '<div class="hi-pro-cert-seal">' +
        hiRenderHashSeal(verifyHash || fullHash) +
        '<span>HI Seal</span>' +
      '</div>' +
    '</section>' +
    '<section class="hi-pro-cert-grid">' +
      '<div class="hi-pro-cert-block">' +
        '<span>Issued To</span>' +
        '<strong>' + hiLicenseEsc(owner.name || license.ownerName) + '</strong>' +
        '<code>' + hiLicenseEsc(owner.hdi || license.ownerHDI || "HDI pending") + '</code>' +
      '</div>' +
      '<div class="hi-pro-cert-block">' +
        '<span>Issued By</span>' +
        '<strong>' + hiLicenseEsc(HI_LICENSE_SITE) + '</strong>' +
        '<code>HI-License Protocol</code>' +
      '</div>' +
      '<div class="hi-pro-cert-block">' +
        '<span>Issued At</span>' +
        '<strong>' + hiLicenseEsc(claim.issuedAtLabel || license.createdAtStr) + '</strong>' +
        '<code>Asia/Kolkata</code>' +
      '</div>' +
      '<div class="hi-pro-cert-block">' +
        '<span>Source</span>' +
        '<strong>' + hiLicenseEsc(source ? source.store + " / " + source.type : "Manual Claim") + '</strong>' +
        '<code>' + hiLicenseEsc(source ? source.id : "direct") + '</code>' +
      '</div>' +
    '</section>' +
    '<section class="hi-pro-cert-hashes">' +
      '<div>' +
        '<span>Content SHA-256</span>' +
        '<code>' + hashRows + '</code>' +
      '</div>' +
      '<div>' +
        '<span>Certificate Verification Hash</span>' +
        '<code>' + verifyRows + '</code>' +
      '</div>' +
    '</section>' +
    '<footer class="hi-pro-cert-foot">' +
      '<p>This certificate is a local-first HI App proof-of-claim and license assertion. Verify by matching the exported JSON, license ID, owner HDI, and hashes.</p>' +
      '<div>' +
        '<span>Protocol</span>' +
        '<strong>HI-License ' + hiLicenseEsc(license.protocolVersion || HI_LICENSE_VERSION) + '</strong>' +
      '</div>' +
    '</footer>' +
  '</article>';
}

async function hiShowLicenseCertificate(id, printAfterRender) {
  var license = await hiGet("licenses", id);
  var section = document.getElementById("hi-license-certificate-section");
  var target = document.getElementById("hi-license-certificate");
  if (!license || !section || !target) return;
  target.innerHTML = hiRenderLicenseCertificateMarkup(license);
  section.hidden = false;
  if (!printAfterRender) section.scrollIntoView({ behavior: "smooth", block: "start" });
  if (printAfterRender) {
    document.body.classList.add("hi-printing-license");
    window.print();
  }
}

async function hiPrintLicense(id) {
  document.querySelectorAll(".hi-print-target").forEach(function(el) {
    el.classList.remove("hi-print-target");
  });
  document.body.classList.remove("hi-printing-license", "hi-printing-hdi");
  if (id) {
    await hiShowLicenseCertificate(id, true);
    return;
  }
  else {
    await hiRenderHDICertificate(true);
    document.body.classList.add("hi-printing-hdi");
  }
  window.print();
}

async function hiExportLicenseJSON(id) {
  var license = await hiGet("licenses", id);
  if (!license) return;
  hiDownloadJSON(license.licenseId + ".hi-license.json", license.certificate || license);
}

async function hiExportHDICertificateJSON() {
  var identity = await hiGet("identity", "primary");
  if (!identity) return;
  var payload = await hiBuildHDICertificate(identity);
  hiDownloadJSON((identity.hdi || "HI-HDI") + ".certificate.json", payload);
}

async function hiBuildHDICertificate(identity) {
  var licenses = await hiGetAll("licenses");
  var claims = licenses.map(function(lic) {
    return {
      licenseId: lic.licenseId,
      title: lic.title,
      contentType: lic.contentType,
      licenseType: lic.licenseType,
      contentHash: lic.contentHash || "",
      verificationHash: lic.verificationHash || "",
      issuedAt: lic.issuedAt || lic.createdAt || 0
    };
  });
  var payload = {
    protocol: "HI Human Digital Identity Certificate",
    version: HI_LICENSE_VERSION,
    issuer: HI_LICENSE_SITE,
    exportedAt: new Date().toISOString(),
    issuedAt: identity.createdAt || Date.now(),
    issuedAtLabel: hiFormatLicenseDate(identity.createdAt || Date.now()),
    identity: {
      name: identity.name || "",
      username: identity.username || "",
      email: identity.email || "",
      phoneCode: identity.phoneCode || "",
      phone: identity.phone || "",
      hdi: identity.hdi || "",
      tagline: identity.tagline || "",
      roles: identity.roles || [],
      location: identity.location || "",
      mission: identity.mission || ""
    },
    claims: claims,
    claimCount: claims.length,
    status: "Locally issued",
    notice: "This HDI certificate identifies the local HI App owner and summarizes locally issued content/license claims."
  };
  payload.verificationHash = await hiHashContent(hiStableStringify(payload));
  return payload;
}

function hiRenderHDICertificateMarkup(cert) {
  var identity = cert.identity || {};
  var roles = Array.isArray(identity.roles) ? identity.roles.join(" · ") : "";
  var initials = String(identity.name || "HI").split(" ").map(function(w) { return w.charAt(0); }).join("").slice(0, 3).toUpperCase();
  var claimPreview = (cert.claims || []).slice(0, 5).map(function(claim) {
    return '<div class="hi-hdi-claim-row">' +
      '<span>' + hiLicenseEsc(claim.licenseId) + '</span>' +
      '<strong>' + hiLicenseEsc(claim.title || "Untitled") + '</strong>' +
      '<code>' + hiLicenseEsc((claim.verificationHash || claim.contentHash || "").slice(0, 18)) + '</code>' +
    '</div>';
  }).join("");
  if (!claimPreview) {
    claimPreview = '<p class="hi-empty">No content claims yet. Claim content to attach licenses to this HDI.</p>';
  }

  return '<article class="hi-hdi-pro-cert hi-print-target">' +
    '<div class="hi-pro-cert-ribbon"></div>' +
    '<header class="hi-pro-cert-head">' +
      '<div class="hi-pro-cert-brand">' +
        '<div class="hi-pro-cert-logo">HI</div>' +
        '<div>' +
          '<div class="hi-pro-cert-kicker">Human Intelligence App</div>' +
          '<h3>Human Digital Identity Certificate</h3>' +
        '</div>' +
      '</div>' +
      '<div class="hi-pro-cert-status"><span>Identity Record</span><strong>' + hiLicenseEsc(cert.version || HI_LICENSE_VERSION) + '</strong></div>' +
    '</header>' +
    '<section class="hi-hdi-hero">' +
      '<div class="hi-hdi-avatar-large">' + hiLicenseEsc(initials) + '</div>' +
      '<div class="hi-hdi-main">' +
        '<div class="hi-pro-cert-label">Owner</div>' +
        '<h4>' + hiLicenseEsc(identity.name || "Unnamed Identity") + '</h4>' +
        (identity.username ? '<p>@' + hiLicenseEsc(identity.username) + '</p>' : '') +
        (identity.tagline ? '<p>' + hiLicenseEsc(identity.tagline) + '</p>' : '') +
        (roles ? '<p>' + hiLicenseEsc(roles) + '</p>' : '') +
        '<div class="hi-hdi-code">' + hiLicenseEsc(identity.hdi || "HDI pending") + '</div>' +
      '</div>' +
      '<div class="hi-pro-cert-seal">' + hiRenderHashSeal(cert.verificationHash || identity.hdi || identity.name) + '<span>HDI Seal</span></div>' +
    '</section>' +
    '<section class="hi-pro-cert-grid">' +
      '<div class="hi-pro-cert-block"><span>Issued By</span><strong>' + hiLicenseEsc(HI_LICENSE_SITE) + '</strong><code>HI Identity Protocol</code></div>' +
      '<div class="hi-pro-cert-block"><span>Issued At</span><strong>' + hiLicenseEsc(cert.issuedAtLabel) + '</strong><code>Asia/Kolkata</code></div>' +
      '<div class="hi-pro-cert-block"><span>Location</span><strong>' + hiLicenseEsc(identity.location || "Not set") + '</strong><code>Owner declared</code></div>' +
      '<div class="hi-pro-cert-block"><span>Contact</span><strong>' + hiLicenseEsc(identity.email || ((identity.phoneCode || "") + " " + (identity.phone || "")).trim() || "Not set") + '</strong><code>Owner declared</code></div>' +
      '<div class="hi-pro-cert-block"><span>Total Claims</span><strong>' + hiLicenseEsc(cert.claimCount) + '</strong><code>Linked licenses</code></div>' +
    '</section>' +
    (identity.mission ? '<section class="hi-hdi-mission"><span>Mission</span><p>' + hiLicenseEsc(identity.mission) + '</p></section>' : '') +
    '<section class="hi-hdi-claims"><div class="hi-pro-cert-label">Linked Claim Preview</div>' + claimPreview + '</section>' +
    '<section class="hi-pro-cert-hashes">' +
      '<div><span>HDI</span><code><span>' + hiLicenseEsc(identity.hdi || "pending") + '</span></code></div>' +
      '<div><span>Certificate Verification Hash</span><code>' + hiHashChunks(cert.verificationHash || "", 16, 4).map(function(chunk) { return '<span>' + hiLicenseEsc(chunk) + '</span>'; }).join("") + '</code></div>' +
    '</section>' +
    '<footer class="hi-pro-cert-foot"><p>' + hiLicenseEsc(cert.notice) + '</p><div><span>Protocol</span><strong>HI Identity ' + hiLicenseEsc(cert.version || HI_LICENSE_VERSION) + '</strong></div></footer>' +
  '</article>';
}

async function hiRenderLicenses() {
  var list = document.getElementById("hi-license-list");
  if (!list) return;

  var licenses = (await hiGetAll("licenses")).sort(function(a, b) {
    return (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0);
  });

  if (!licenses.length) {
    list.innerHTML = '<p class="hi-empty">No content claimed yet. Use the form above to claim your first piece.</p>';
    return;
  }

  list.innerHTML = licenses.map(function(lic) {
    var lt = HI_LICENSE_TYPES[lic.licenseType] || { label: lic.licenseType || "HI License", desc: "" };
    var fullHash = lic.contentHash || "";
    return '<div class="hi-lic-card glass" data-license-id="' + hiLicenseEsc(lic.licenseId) + '">' +
      '<div class="hi-lic-top">' +
        '<div>' +
          '<div class="hi-lic-id">' + hiLicenseEsc(lic.licenseId) + '</div>' +
          '<div class="hi-lic-title">' + hiLicenseEsc(lic.title) + '</div>' +
        '</div>' +
        '<span class="hi-lic-type-badge">' + hiLicenseEsc(lt.label) + '</span>' +
      '</div>' +
      '<div class="hi-lic-meta">' +
        '<span>' + hiLicenseEsc(lic.contentType) + '</span>' +
        '<span>SHA-256: <code title="' + hiLicenseEsc(fullHash) + '">' + hiLicenseEsc(fullHash.slice(0, 20)) + (fullHash.length > 20 ? "..." : "") + '</code></span>' +
        '<span>Verify: <code>' + hiLicenseEsc((lic.verificationHash || "").slice(0, 16)) + '</code></span>' +
        '<span>' + hiLicenseEsc(lic.createdAtStr || "") + '</span>' +
        (lic.sourceRef ? '<span>Source: ' + hiLicenseEsc(lic.sourceRef.store + "/" + lic.sourceRef.type) + '</span>' : '') +
      '</div>' +
      '<div class="hi-lic-actions">' +
        '<button type="button" class="hi-contact-btn hi-lic-view" data-id="' + hiLicenseEsc(lic.id) + '">View Certificate</button>' +
        '<button type="button" class="hi-contact-btn hi-lic-copy-id" data-id="' + hiLicenseEsc(lic.licenseId) + '">Copy ID</button>' +
        '<button type="button" class="hi-contact-btn hi-lic-copy-json" data-id="' + hiLicenseEsc(lic.id) + '">Copy Verify JSON</button>' +
        '<button type="button" class="hi-contact-btn hi-lic-export" data-id="' + hiLicenseEsc(lic.id) + '">Export JSON</button>' +
        '<button type="button" class="hi-contact-btn hi-lic-print" data-id="' + hiLicenseEsc(lic.id) + '">Print</button>' +
        '<button type="button" class="hi-icon-btn hi-lic-del" data-id="' + hiLicenseEsc(lic.id) + '">&#x2715; Delete</button>' +
      '</div>' +
    '</div>';
  }).join("");

  list.querySelectorAll(".hi-lic-copy-id").forEach(function(btn) {
    btn.addEventListener("click", function() { hiCopyText(btn.dataset.id, btn, "Copied"); });
  });
  list.querySelectorAll(".hi-lic-view").forEach(function(btn) {
    btn.addEventListener("click", function() { hiShowLicenseCertificate(btn.dataset.id, false); });
  });
  list.querySelectorAll(".hi-lic-copy-json").forEach(function(btn) {
    btn.addEventListener("click", async function() {
      var lic = await hiGet("licenses", btn.dataset.id);
      if (lic) hiCopyText(JSON.stringify(lic.verification || lic.certificate || lic, null, 2), btn, "Copied");
    });
  });
  list.querySelectorAll(".hi-lic-export").forEach(function(btn) {
    btn.addEventListener("click", function() { hiExportLicenseJSON(btn.dataset.id); });
  });
  list.querySelectorAll(".hi-lic-print").forEach(function(btn) {
    btn.addEventListener("click", function() { hiPrintLicense(btn.dataset.id); });
  });
  list.querySelectorAll(".hi-lic-del").forEach(function(btn) {
    btn.addEventListener("click", async function() {
      if (!confirm("Delete this license record?")) return;
      await hiDelete("licenses", btn.dataset.id);
      hiRenderLicenses();
      hiRenderHDICertificate();
    });
  });
}

async function hiRenderHDICertificate(printMode) {
  var el = document.getElementById("hi-hdi-certificate");
  if (!el) return;

  var identity = await hiGet("identity", "primary");
  if (!identity) {
    el.innerHTML = '<p class="hi-empty" style="text-align:center;padding:40px">Set up your identity first to generate your HDI certificate.</p>';
    return;
  }

  var hdiCert = await hiBuildHDICertificate(identity);
  var licCount = hdiCert.claimCount;
  var issued = new Date(identity.createdAt || Date.now()).toLocaleDateString("en-IN", { day:"numeric", month:"long", year:"numeric" });

  el.innerHTML =
    '<div class="hi-cert-card">' +
      '<div class="hi-cert-header">' +
        '<div class="hi-cert-logo">HI</div>' +
        '<div class="hi-cert-label">Human Digital Identity Certificate</div>' +
      '</div>' +
      '<div class="hi-cert-body">' +
        '<div class="hi-cert-avatar">' + hiLicenseEsc((identity.name || "H").charAt(0)) + '</div>' +
        '<h2 class="hi-cert-name">' + hiLicenseEsc(identity.name) + '</h2>' +
        (Array.isArray(identity.roles) && identity.roles.length ? '<p class="hi-cert-roles">' + hiLicenseEsc(identity.roles.join(" · ")) + '</p>' : '') +
        (identity.location ? '<p class="hi-cert-location">&#x1F4CD; ' + hiLicenseEsc(identity.location) + '</p>' : '') +
        '<div class="hi-cert-hdi">' + hiLicenseEsc(identity.hdi || "—") + '</div>' +
      '</div>' +
      '<div class="hi-cert-footer">' +
        '<div class="hi-cert-stat"><span class="hi-cert-stat-val">' + licCount + '</span><span class="hi-cert-stat-lbl">Claims</span></div>' +
        '<div class="hi-cert-stat"><span class="hi-cert-stat-val">' + hiLicenseEsc(issued) + '</span><span class="hi-cert-stat-lbl">Issued</span></div>' +
        '<div class="hi-cert-stat"><span class="hi-cert-stat-val">kingofyadav.in</span><span class="hi-cert-stat-lbl">Verified at</span></div>' +
      '</div>' +
    '</div>' +
    '<div class="hi-cert-actions">' +
      '<button type="button" class="hi-contact-btn" id="hiExportHDIJsonBtn">Export HDI JSON</button>' +
      '<button type="button" class="hi-contact-btn" id="hiPrintHDIBtn">Print HDI</button>' +
    '</div>' +
    '<div id="hi-hdi-pro-certificate" class="hi-hdi-pro-wrap">' +
      hiRenderHDICertificateMarkup(hdiCert) +
    '</div>';

  var exportBtn = document.getElementById("hiExportHDIJsonBtn");
  if (exportBtn) exportBtn.addEventListener("click", hiExportHDICertificateJSON);
  var printBtn = document.getElementById("hiPrintHDIBtn");
  if (printBtn) printBtn.addEventListener("click", function() { hiPrintLicense(""); });
  if (!printMode) {
    var pro = document.querySelector(".hi-hdi-pro-cert");
    if (pro) pro.classList.remove("hi-print-target");
  }
}

function hiInitClaimForm() {
  var form = document.getElementById("hi-claim-form");
  if (!form) return;

  var typeSelect = document.getElementById("hi-claim-license-type");
  if (typeSelect) {
    typeSelect.innerHTML = Object.entries(HI_LICENSE_TYPES).map(function(entry) {
      return '<option value="' + entry[0] + '">' + entry[1].label + ' - ' + entry[1].desc + '</option>';
    }).join("");
  }

  form.addEventListener("submit", async function(e) {
    e.preventDefault();
    var title = (document.getElementById("hi-claim-title").value || "").trim();
    var contentType = (document.getElementById("hi-claim-content-type").value || "Idea");
    var licenseType = (document.getElementById("hi-claim-license-type").value || "personal");
    var content = (document.getElementById("hi-claim-content").value || "").trim();
    var errEl = document.getElementById("hi-claim-err");
    var successEl = document.getElementById("hi-claim-success");

    if (!title) { if (errEl) errEl.textContent = "Title is required."; return; }
    if (errEl) errEl.textContent = "";

    try {
      var license = await hiClaimContent({ title: title, contentType: contentType, licenseType: licenseType, content: content });
      if (successEl) {
        successEl.innerHTML =
          '<div class="hi-claim-result">' +
            '<div class="hi-claim-result-id">' + hiLicenseEsc(license.licenseId) + '</div>' +
            '<p>Content claimed. Full certificate and verification JSON are now saved locally.</p>' +
            '<button type="button" class="hi-btn-primary" id="hiClaimCopyLatest">Copy License ID</button>' +
          '</div>';
        successEl.hidden = false;
        var copyBtn = document.getElementById("hiClaimCopyLatest");
        if (copyBtn) copyBtn.addEventListener("click", function() { hiCopyText(license.licenseId, copyBtn, "Copied"); });
      }
      form.reset();
      hiRenderLicenses();
      hiRenderHDICertificate();
    } catch(err) {
      if (errEl) errEl.textContent = err.message || "Failed to claim content.";
    }
  });
}

async function hiLoadExistingClaimOptions(sourceKey) {
  var source = HI_EXISTING_CLAIM_SOURCES[sourceKey];
  if (!source) return [];
  var rows = await hiGetAll(source.store);
  return rows
    .filter(function(item) { return item && item.id && (!source.type || item.type === source.type); })
    .sort(source.sort);
}

function hiSetExistingClaimStatus(message, type) {
  var el = document.getElementById("hi-existing-claim-status");
  if (!el) return;
  el.textContent = message || "";
  el.className = "hi-sync-status" + (type ? " " + type : "");
}

async function hiRenderExistingClaimRecords() {
  var sourceEl = document.getElementById("hi-existing-source");
  var recordEl = document.getElementById("hi-existing-record");
  if (!sourceEl || !recordEl) return;

  var source = HI_EXISTING_CLAIM_SOURCES[sourceEl.value];
  var rows = await hiLoadExistingClaimOptions(sourceEl.value);
  recordEl.innerHTML = rows.length
    ? rows.map(function(item) {
        return '<option value="' + hiLicenseEsc(item.id) + '">' + hiLicenseEsc(source.label(item)) + '</option>';
      }).join("")
    : '<option value="">No saved content found</option>';
}

async function hiClaimExistingSelectedContent() {
  var sourceEl = document.getElementById("hi-existing-source");
  var recordEl = document.getElementById("hi-existing-record");
  var licenseTypeEl = document.getElementById("hi-existing-license-type");
  if (!sourceEl || !recordEl || !recordEl.value) {
    hiSetExistingClaimStatus("Select saved content first.", "error");
    return;
  }

  var source = HI_EXISTING_CLAIM_SOURCES[sourceEl.value];
  if (!source) return;
  var item = await hiGet(source.store, recordEl.value);
  if (!item) {
    hiSetExistingClaimStatus("Selected content was not found.", "error");
    return;
  }

  var title = source.label(item);
  var license = await hiClaimContent({
    title: title,
    contentType: source.contentType,
    licenseType: licenseTypeEl ? licenseTypeEl.value : "personal",
    content: source.content(item),
    sourceStore: source.store,
    sourceType: source.type || item.type || "task",
    sourceId: item.id
  });

  hiSetExistingClaimStatus("Certificate generated: " + license.licenseId);
  await hiRenderLicenses();
  await hiRenderHDICertificate();
  await hiShowLicenseCertificate(license.id, false);
}

function hiInitExistingClaimPicker() {
  var sourceEl = document.getElementById("hi-existing-source");
  var licenseTypeEl = document.getElementById("hi-existing-license-type");
  var btn = document.getElementById("hiClaimExistingBtn");
  if (!sourceEl) return;

  if (licenseTypeEl) {
    licenseTypeEl.innerHTML = Object.entries(HI_LICENSE_TYPES).map(function(entry) {
      return '<option value="' + entry[0] + '">' + entry[1].label + ' - ' + entry[1].desc + '</option>';
    }).join("");
  }

  sourceEl.addEventListener("change", function() {
    hiSetExistingClaimStatus("");
    hiRenderExistingClaimRecords();
  });
  if (btn) {
    btn.addEventListener("click", function() {
      hiClaimExistingSelectedContent().catch(function(err) {
        hiSetExistingClaimStatus(err.message || "Certificate generation failed.", "error");
      });
    });
  }
  hiRenderExistingClaimRecords();
}

document.addEventListener("DOMContentLoaded", function() {
  hiRenderHDICertificate();
  hiRenderLicenses();
  hiInitClaimForm();
  hiInitExistingClaimPicker();
});

window.addEventListener("afterprint", function() {
  document.body.classList.remove("hi-printing-license", "hi-printing-hdi");
  document.querySelectorAll(".hi-print-target").forEach(function(el) {
    el.classList.remove("hi-print-target");
  });
});
