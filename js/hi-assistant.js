"use strict";

/* ======================================================
   hi-assistant.js — HI AI Chat Panel  (Phase 5)
   Claude knows your full life context.
   API: POST /api/jarvis-chat  { message, history }
   Depends on: hi-storage.js, hi-context.js
====================================================== */

const HI_CHAT_STORE    = "chat";
const HI_CHAT_SESSION  = `session-${new Date().toISOString().slice(0, 10)}`;
const HI_CHAT_ENDPOINT = (location.hostname === "localhost" || location.hostname === "127.0.0.1")
  ? "http://127.0.0.1:5050/api/jarvis-chat"
  : "/api/jarvis-chat";

let _hiChatHistory   = [];
let _hiContextLoaded = false;
let _hiContextStr    = "";
let _hiSending       = false;

const HI_SUGGESTIONS = [
  "What should I focus on today?",
  "Review my goals and suggest next steps",
  "How am I doing this week?",
  "Plan my professional priorities",
  "What habits am I missing today?",
];

/* ── Local fallback ── */

function hiLocalOperatorReply(userText) {
  const text       = (userText ?? "").toLowerCase();
  const hasContext = _hiContextLoaded && _hiContextStr;
  const base       = "Local operator mode is active. The live AI backend is not reachable, but I can still guide your HI Life OS from this page.\n\n";

  if (text.includes("identity") || text.includes("hdi") || text.includes("profile")) {
    return base +
      "Identity priority:\n" +
      "1. Open Create Identity and complete name, roles, location, tagline, and mission.\n" +
      "2. Confirm the HDI code appears in the hero panel.\n" +
      "3. Use the License after identity is saved so ownership records connect to the right person.\n\n" +
      (hasContext ? "Your local HI context is loaded, so saved identity data is available in this browser." : "Your local HI context is not loaded yet. Save identity first.");
  }

  if (text.includes("today") || text.includes("focus") || text.includes("task") || text.includes("goal")) {
    return base +
      "Today command plan:\n" +
      "1. Check identity and HDI status.\n" +
      "2. Pick the top 3 actions from goals, projects, and people.\n" +
      "3. Record one useful note after each completed action.\n" +
      "4. End the day with a short review: done, blocked, next.\n\n" +
      "When the backend is online, I will turn this into a deeper personalized plan.";
  }

  if (text.includes("license") || text.includes("ownership") || text.includes("certificate")) {
    return base +
      "License flow:\n" +
      "1. Save your identity first.\n" +
      "2. Open License.\n" +
      "3. Claim the content or page you want to protect.\n" +
      "4. Generate and verify the certificate from the ledger.";
  }

  return base +
    "Recommended next actions:\n" +
    "1. Create or update your identity.\n" +
    "2. Review the AI dashboard cards on Personal.\n" +
    "3. Open About, Origin, Haven, Bhagalpur, and License to confirm each page has the right content.\n" +
    "4. Reopen chat after the backend is online for full AI reasoning.\n\n" +
    "Technical note: this fallback protects the user experience when localhost/API/provider connection fails.";
}

/* ── Panel open / close ── */

function hiOpenChat() {
  const panel    = document.getElementById("hi-chat-panel");
  const backdrop = document.getElementById("hi-chat-backdrop");
  if (!panel) return;
  if (backdrop) backdrop.hidden = false;
  panel.classList.add("open");
  panel.setAttribute("aria-hidden", "false");
  document.body.classList.add("hi-chat-open");
  document.getElementById("hiAiBtn")?.setAttribute("aria-expanded", "true");
  if (!_hiContextLoaded) hiLoadChatContext();
  hiLoadChatHistory().then(() => document.getElementById("hi-chat-input")?.focus());
}

function hiCloseChat() {
  const panel    = document.getElementById("hi-chat-panel");
  const backdrop = document.getElementById("hi-chat-backdrop");
  if (!panel) return;
  panel.classList.remove("open");
  panel.setAttribute("aria-hidden", "true");
  if (backdrop) backdrop.hidden = true;
  document.body.classList.remove("hi-chat-open");
  document.getElementById("hiAiBtn")?.setAttribute("aria-expanded", "false");
}

/* ── Context ── */

async function hiLoadChatContext() {
  const statusEl = document.getElementById("hi-chat-context-status");
  if (statusEl) statusEl.textContent = "Loading your context…";
  try {
    _hiContextStr    = await hiBuildAIContext();
    _hiContextLoaded = true;
    if (statusEl) {
      statusEl.textContent = "Context loaded · Your life data is ready";
      setTimeout(() => { if (statusEl) statusEl.style.opacity = "0"; }, 3_000);
    }
  } catch {
    _hiContextStr    = "";
    _hiContextLoaded = true;
    if (statusEl) statusEl.textContent = "No context — set up your identity first";
  }
}

/* ── History ── */

async function hiLoadChatHistory() {
  try {
    const record   = await hiGet(HI_CHAT_STORE, HI_CHAT_SESSION);
    _hiChatHistory = record?.messages ?? [];
  } catch {
    _hiChatHistory = [];
  }
  hiRenderMessages();
}

async function hiSaveChatHistory() {
  try {
    await hiPut(HI_CHAT_STORE, { id: HI_CHAT_SESSION, messages: _hiChatHistory.slice(-40), updatedAt: Date.now() });
  } catch { /* non-critical */ }
}

/* ── Render messages ── */

function hiRenderMessages() {
  const container = document.getElementById("hi-chat-messages");
  if (!container) return;

  if (!_hiChatHistory.length) {
    container.textContent = "";
    const welcome = document.createElement("div");
    welcome.className = "hi-chat-welcome";
    const icon = Object.assign(document.createElement("div"), { className: "hi-chat-welcome-icon", textContent: "🧠" });
    const msg  = Object.assign(document.createElement("p"),   { textContent: "I know your identity, tasks, goals, and projects. Ask me anything about your life and work." });
    welcome.appendChild(icon);
    welcome.appendChild(msg);
    container.appendChild(welcome);
    return;
  }

  container.innerHTML = _hiChatHistory.map(m =>
    `<div class="hi-chat-bubble ${m.role === "user" ? "user" : "assistant"}">` +
      `<div class="hi-bubble-content">${hiFormatMessage(m.content)}</div>` +
    `</div>`
  ).join("");

  container.scrollTop = container.scrollHeight;
}

function hiFormatMessage(text) {
  return hiEsc(text)
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g,     "<em>$1</em>")
    .replace(/\n/g,            "<br>");
}

function hiAppendMessage(role, content) {
  _hiChatHistory.push({ role, content });
  hiRenderMessages();
}

function hiShowTyping() {
  const container = document.getElementById("hi-chat-messages");
  if (!container) return;
  const el     = document.createElement("div");
  el.className = "hi-chat-bubble assistant hi-typing-indicator";
  el.id        = "hi-typing-bubble";
  const bubble = document.createElement("div");
  bubble.className = "hi-bubble-content";
  for (let i = 0; i < 3; i++) {
    bubble.appendChild(Object.assign(document.createElement("span"), { className: "hi-dot" }));
  }
  el.appendChild(bubble);
  container.appendChild(el);
  container.scrollTop = container.scrollHeight;
}

function hiHideTyping() { document.getElementById("hi-typing-bubble")?.remove(); }

/* ── Send message ── */

async function hiSendMessage(userText) {
  if (!userText.trim() || _hiSending) return;
  _hiSending = true;

  const input   = document.getElementById("hi-chat-input");
  const sendBtn = document.getElementById("hi-chat-send");
  if (input)   input.value = "";
  if (sendBtn) sendBtn.disabled = true;
  hiAutoResizeInput();

  /* Local RAG: search vault context */
  let searchContext = "";
  if (typeof window.hiSearch === "function") {
    try {
      const results = await window.hiSearch(userText);
      if (results?.length) {
        searchContext = "\n\n--- LOCAL VAULT SEARCH RESULTS ---\n";
        for (const r of results) {
          searchContext += `[${r.type}] ${r.title}${r.date ? ` (${r.date.split("T")[0]})` : ""}\n${r.snippet}...\n\n`;
        }
      }
    } catch (err) {
      console.warn("Search failed", err);
    }
  }

  /* Inject context on first message of session */
  let messageToSend = userText;
  if (_hiContextLoaded && _hiContextStr && _hiChatHistory.length === 0) {
    messageToSend = `${_hiContextStr}${searchContext}\n\nUser question: ${userText}`;
  } else if (searchContext) {
    messageToSend = `${searchContext}User question: ${userText}`;
  }

  hiAppendMessage("user", userText);
  hiShowTyping();

  const apiHistory = _hiChatHistory.slice(0, -1).map(m => ({ role: m.role, content: m.content }));

  const controller = new AbortController();
  const timeout    = setTimeout(() => controller.abort(), 30_000);
  try {
    const response = await fetch(HI_CHAT_ENDPOINT, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ message: messageToSend, history: apiHistory }),
      signal:  controller.signal,
    });
    hiHideTyping();
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data  = await response.json();
    const reply = data.reply ?? data.response ?? data.message ?? "I didn't get a response. Try again.";
    hiAppendMessage("assistant", reply);
  } catch (err) {
    hiHideTyping();
    if (err.name === "AbortError") console.warn("[HI Chat] Request timed out after 30s");
    else console.warn("[HI Chat] Backend unavailable:", err.message ?? err);
    hiAppendMessage("assistant", hiLocalOperatorReply(userText));
  } finally {
    clearTimeout(timeout);
  }

  await hiSaveChatHistory();
  _hiSending = false;
  if (sendBtn) sendBtn.disabled = false;
  input?.focus();
}

/* ── Auto-resize textarea ── */

function hiAutoResizeInput() {
  const input = document.getElementById("hi-chat-input");
  if (!input) return;
  input.style.height = "auto";
  input.style.height = `${Math.min(input.scrollHeight, 120)}px`;
}

/* ── Clear chat ── */

async function hiClearChat() {
  if (!confirm("Clear this conversation?")) return;
  _hiChatHistory   = [];
  _hiContextLoaded = false;
  try { await hiDelete(HI_CHAT_STORE, HI_CHAT_SESSION); } catch { /* ignore */ }
  hiRenderMessages();
  hiLoadChatContext();
}

/* ── Suggestions ── */

function hiRenderSuggestions() {
  const el = document.getElementById("hi-chat-suggestions");
  if (!el) return;
  el.innerHTML = HI_SUGGESTIONS.map(s =>
    `<button type="button" class="hi-suggestion-chip" data-text="${hiEsc(s)}">${hiEsc(s)}</button>`
  ).join("");

  el.querySelectorAll(".hi-suggestion-chip").forEach(btn => {
    btn.addEventListener("click", () => {
      hiSendMessage(btn.dataset.text);
      el.style.display = "none";
    });
  });
}

/* ── INIT ── */

document.addEventListener("DOMContentLoaded", () => {
  const aiBtn = document.getElementById("hiAiBtn");
  if (aiBtn) {
    aiBtn.addEventListener("click", () => {
      const panel = document.getElementById("hi-chat-panel");
      if (panel?.classList.contains("open")) hiCloseChat();
      else hiOpenChat();
    });
  }

  document.getElementById("hi-chat-close")?.addEventListener("click", hiCloseChat);
  document.getElementById("hi-chat-clear")?.addEventListener("click", hiClearChat);

  document.getElementById("hi-chat-form")?.addEventListener("submit", e => {
    e.preventDefault();
    const text = (document.getElementById("hi-chat-input")?.value ?? "").trim();
    if (text) hiSendMessage(text);
  });

  const input = document.getElementById("hi-chat-input");
  if (input) {
    input.addEventListener("input", hiAutoResizeInput);
    input.addEventListener("keydown", e => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        const text = input.value.trim();
        if (text) hiSendMessage(text);
      }
    });
  }

  document.getElementById("hi-chat-backdrop")?.addEventListener("click", hiCloseChat);
  document.addEventListener("keydown", e => { if (e.key === "Escape") hiCloseChat(); });

  hiRenderSuggestions();
}, { once: true });
