"use strict";

const MAX_BODY_BYTES = 65536;
const MAX_HISTORY = 6;

const SITE_FACTS = [
  {
    keys: ["who", "king", "amit", "yadav", "about"],
    reply: "King Yadav, also shown as Amit Ku Yadav on the site, is building a personal digital platform around identity, writing, services, ventures, collaboration, and the HI life OS."
  },
  {
    keys: ["service", "services", "work", "offer", "build"],
    reply: "The services section covers digital identity, websites, automation, AI assistant workflows, content systems, and collaboration support. Open the Services page for the current public offer and contact form."
  },
  {
    keys: ["collab", "collaboration", "partner", "partnership"],
    reply: "For collaboration, use the Collaboration page or Contact page. Share who you are, the idea, timeline, and what kind of help or partnership you want."
  },
  {
    keys: ["contact", "email", "message", "reach"],
    reply: "Use the Contact page for direct messages. Include your name, email, subject, and a clear description so Amit can respond properly."
  },
  {
    keys: ["blog", "article", "write", "writing"],
    reply: "The Blog page contains long-form writing on technology, leadership, youth, governance, privacy, AI, education, entrepreneurship, and future systems."
  },
  {
    keys: ["brand", "venture", "royal", "heritage", "jhon", "aamit", "national", "youth"],
    reply: "The public venture pages include Royal Heritage Resort, Jhon Aamit LLP, and National Youth Force. Each brand page explains the public identity and direction for that venture."
  },
  {
    keys: ["hi", "dashboard", "life", "os", "personal"],
    reply: "HI is the private life OS layer of the platform. It includes identity, personal dashboard features, tasks, notes, contacts, goals, and assistant context stored in the browser."
  }
];

function send(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.end(JSON.stringify(payload));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", chunk => {
      raw += chunk;
      if (raw.length > MAX_BODY_BYTES) {
        const err = new Error("Request body too large");
        err.status = 413;
        reject(err);
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (err) {
        err.status = 400;
        err.message = "Invalid JSON";
        reject(err);
      }
    });
    req.on("error", reject);
  });
}

function normalizeBackendBase(req) {
  const raw = String(process.env.JARVIS_API_BASE || process.env.JARVIS_BACKEND_URL || "").trim();
  if (!raw) return "";

  let parsed;
  try {
    parsed = new URL(raw);
  } catch (err) {
    return "";
  }

  const host = String(req.headers.host || "").toLowerCase();
  if (parsed.host.toLowerCase() === host) return "";
  return parsed.toString().replace(/\/+$/, "");
}

async function proxyToBackend(req, res, body) {
  const base = normalizeBackendBase(req);
  if (!base) return false;

  const response = await fetch(`${base}/api/jarvis-chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Forwarded-Host": String(req.headers.host || ""),
      "X-Forwarded-For": String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || ""),
      "X-Forwarded-Proto": "https"
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(65000)
  });

  const text = await response.text();
  res.statusCode = response.status;
  res.setHeader("Content-Type", response.headers.get("content-type") || "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.end(text);
  return true;
}

function fallbackReply(message) {
  const q = String(message || "").toLowerCase();
  const scored = SITE_FACTS
    .map(item => ({
      item,
      score: item.keys.reduce((total, key) => total + (q.includes(key) ? 1 : 0), 0)
    }))
    .sort((a, b) => b.score - a.score)[0];

  if (scored && scored.score > 0) return scored.item.reply;

  return "I can help with questions about King Yadav, services, collaboration, brands, the blog, contact, and the HI platform. For a direct reply from Amit, use the Contact page.";
}

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Allow", "POST, OPTIONS");
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    send(res, 405, { ok: false, error: "Method not allowed" });
    return;
  }

  let body;
  try {
    body = await readBody(req);
  } catch (err) {
    send(res, err.status || 400, { ok: false, error: err.message || "Invalid request" });
    return;
  }

  const message = String(body.message || "").trim().slice(0, 1200);
  if (!message) {
    send(res, 400, { ok: false, error: "message is required" });
    return;
  }

  const payload = {
    message,
    history: Array.isArray(body.history) ? body.history.slice(-MAX_HISTORY) : []
  };

  try {
    if (await proxyToBackend(req, res, payload)) return;
  } catch (err) {
    // Keep the public widget useful even if the home Jarvis backend is down.
  }

  send(res, 200, {
    ok: true,
    mode: "fallback",
    reply: fallbackReply(message)
  });
};
