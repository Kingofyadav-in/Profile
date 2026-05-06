"use strict";

const DEFAULT_STATE = {
  revision: 1,
  theme: "dark",
  title: "Live Future Class",
  subtitle: "How computers, AI, and human intelligence can help people.",
  status: "Waiting for teacher",
  teacher: "Amit Ku Yadav",
  room: "Future Computer Class",
  focusId: "welcome",
  viewers: {},
  blocks: [
    {
      id: "welcome",
      type: "text",
      text: "Welcome. This board updates live from the teacher terminal.",
      createdAt: Date.now()
    }
  ],
  updatedAt: Date.now()
};

function getState() {
  if (!globalThis.__HI_LIVE_CLASS_STATE) {
    globalThis.__HI_LIVE_CLASS_STATE = {
      ...DEFAULT_STATE,
      blocks: DEFAULT_STATE.blocks.slice(),
      viewers: {}
    };
  }
  return globalThis.__HI_LIVE_CLASS_STATE;
}

function send(status, payload) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store, max-age=0"
    }
  });
}

function sanitizeText(value, limit) {
  return String(value || "").replace(/\r/g, "").trim().slice(0, limit || 5000);
}

function cleanupViewers(state) {
  const now = Date.now();
  const viewers = state.viewers || {};
  Object.keys(viewers).forEach(id => {
    if (now - viewers[id].lastSeen > 70000) delete viewers[id];
  });
  state.viewers = viewers;
}

function publicState(state) {
  cleanupViewers(state);
  return {
    ...state,
    viewers: Object.values(state.viewers || {})
      .sort((a, b) => b.lastSeen - a.lastSeen)
      .slice(0, 80)
  };
}

function tokenFrom(request, body) {
  const auth = String(request.headers.get("authorization") || "");
  if (auth.toLowerCase().startsWith("bearer ")) return auth.slice(7).trim();
  return String(request.headers.get("x-live-class-token") || body.token || "").trim();
}

function clientIp(request) {
  return String(
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for") ||
    "unknown"
  ).split(",")[0].trim() || "unknown";
}

function maskIp(ip) {
  if (!ip || ip === "unknown") return "unknown";
  if (ip.includes(":")) return ip.split(":").slice(0, 3).join(":") + ":...";
  const parts = ip.split(".");
  if (parts.length === 4) return `${parts[0]}.${parts[1]}.${parts[2]}.x`;
  return ip.slice(0, 8) + "...";
}

function nextId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function addBlock(state, type, text, extra) {
  const block = {
    id: nextId(),
    type,
    text: sanitizeText(text, type === "code" ? 12000 : 5000),
    createdAt: Date.now(),
    ...(extra || {})
  };
  if (!block.text && type !== "divider") return;
  state.blocks.push(block);
  state.focusId = block.id;
  if (state.blocks.length > 80) state.blocks = state.blocks.slice(-80);
}

function mutate(state, body) {
  const action = sanitizeText(body.action, 40).toLowerCase();
  const value = sanitizeText(body.value ?? body.text ?? "", 12000);

  if (action === "state") {
    return state;
  }

  if (action === "title") {
    state.title = value || state.title;
    if (body.subtitle !== undefined) state.subtitle = sanitizeText(body.subtitle, 500);
  } else if (action === "subtitle") {
    state.subtitle = value;
  } else if (action === "teacher") {
    state.teacher = value || state.teacher;
  } else if (action === "room") {
    state.room = value || state.room;
  } else if (action === "status") {
    state.status = value || "Live";
  } else if (action === "theme") {
    state.theme = value === "light" ? "light" : "dark";
  } else if (action === "write" || action === "text" || action === "w") {
    addBlock(state, "text", value);
  } else if (action === "heading" || action === "h") {
    addBlock(state, "heading", value);
  } else if (action === "code") {
    addBlock(state, "code", value, { language: sanitizeText(body.language || "text", 40) });
  } else if (action === "list") {
    addBlock(state, "list", value);
  } else if (action === "quote") {
    addBlock(state, "quote", value);
  } else if (action === "homework") {
    addBlock(state, "homework", value);
  } else if (action === "link") {
    addBlock(state, "link", sanitizeText(body.label || value, 500), { url: sanitizeText(body.url || value, 2000) });
  } else if (action === "image") {
    addBlock(state, "image", sanitizeText(body.caption || "", 500), { url: sanitizeText(body.url || value, 2000) });
  } else if (action === "divider") {
    addBlock(state, "divider", "");
  } else if (action === "focus") {
    const index = parseInt(value, 10);
    const target = Number.isFinite(index) ? state.blocks[index - 1] : state.blocks.find(block => block.id === value);
    if (target) state.focusId = target.id;
  } else if (action === "undo") {
    state.blocks.pop();
    state.focusId = state.blocks.length ? state.blocks[state.blocks.length - 1].id : "";
  } else if (action === "clear") {
    state.blocks = [];
    state.focusId = "";
  } else if (action === "reset") {
    const fresh = { ...DEFAULT_STATE, blocks: DEFAULT_STATE.blocks.slice(), viewers: {}, updatedAt: Date.now() };
    globalThis.__HI_LIVE_CLASS_STATE = fresh;
    return fresh;
  } else {
    const err = new Error("Unknown action");
    err.status = 400;
    throw err;
  }

  state.revision += 1;
  state.updatedAt = Date.now();
  if (action !== "status") state.status = "Live now";
  return state;
}

function joinViewer(state, body, request) {
  cleanupViewers(state);
  const now = Date.now();
  const deviceId = sanitizeText(body.deviceId || nextId(), 120).replace(/[^a-z0-9_.:-]/gi, "").slice(0, 120) || nextId();
  const name = sanitizeText(body.name || "Guest Learner", 80) || "Guest Learner";
  const device = sanitizeText(body.device || "Browser", 120);
  const ip = clientIp(request);

  state.viewers = state.viewers || {};
  state.viewers[deviceId] = {
    id: deviceId,
    name,
    device,
    ip: maskIp(ip),
    joinedAt: state.viewers[deviceId] ? state.viewers[deviceId].joinedAt : now,
    lastSeen: now
  };
  state.updatedAt = now;
  return state;
}

async function readBody(request) {
  try {
    return await request.json();
  } catch (err) {
    return {};
  }
}

export async function onRequest({ request, env }) {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: { "Allow": "GET, POST, OPTIONS" }
    });
  }

  if (request.method === "GET") {
    return send(200, publicState(getState()));
  }

  if (request.method !== "POST") {
    return send(405, { error: "Method not allowed" });
  }

  const body = await readBody(request);
  if (String(body.action || "").toLowerCase() === "join") {
    return send(200, publicState(joinViewer(getState(), body, request)));
  }

  const expected = String(env.LIVE_CLASS_TOKEN || "").trim();
  if (!expected) {
    return send(503, { error: "LIVE_CLASS_TOKEN is not configured on the server." });
  }

  if (tokenFrom(request, body) !== expected) {
    return send(401, { error: "Unauthorized live class command." });
  }

  try {
    return send(200, publicState(mutate(getState(), body)));
  } catch (err) {
    return send(err.status || 500, { error: err.message || "Live class update failed." });
  }
}
