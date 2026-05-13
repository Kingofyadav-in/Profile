"use strict";

/* ======================================================
   hi-assistant.js — HI AI Chat Panel  (Phase 5)
   Claude knows your full life context.
   API: POST /api/jarvis-chat  { message, history }
   Depends on: hi-storage.js, hi-context.js
====================================================== */

var HI_CHAT_STORE     = "chat";
var HI_CHAT_SESSION   = "session-" + new Date().toISOString().slice(0,10);
var HI_CHAT_ENDPOINT  = (
  location.hostname === "localhost" || location.hostname === "127.0.0.1"
) ? "http://127.0.0.1:5050/api/jarvis-chat" : "/api/jarvis-chat";

var _hiChatHistory    = [];   /* [{ role, content }] */
var _hiContextLoaded  = false;
var _hiContextStr     = "";
var _hiSending        = false;

function hiLocalOperatorReply(userText) {
  var text = (userText || "").toLowerCase();
  var hasContext = _hiContextLoaded && _hiContextStr;
  var base =
    "Local operator mode is active. The live AI backend is not reachable, but I can still guide your HI Life OS from this page.\n\n";

  if (text.indexOf("identity") >= 0 || text.indexOf("hdi") >= 0 || text.indexOf("profile") >= 0) {
    return base +
      "Identity priority:\n" +
      "1. Open Create Identity and complete name, roles, location, tagline, and mission.\n" +
      "2. Confirm the HDI code appears in the hero panel.\n" +
      "3. Use the License after identity is saved so ownership records connect to the right person.\n\n" +
      (hasContext ? "Your local HI context is loaded, so saved identity data is available in this browser." : "Your local HI context is not loaded yet. Save identity first.");
  }

  if (text.indexOf("today") >= 0 || text.indexOf("focus") >= 0 || text.indexOf("task") >= 0 || text.indexOf("goal") >= 0) {
    return base +
      "Today command plan:\n" +
      "1. Check identity and HDI status.\n" +
      "2. Pick the top 3 actions from goals, projects, and people.\n" +
      "3. Record one useful note after each completed action.\n" +
      "4. End the day with a short review: done, blocked, next.\n\n" +
      "When the backend is online, I will turn this into a deeper personalized plan.";
  }

  if (text.indexOf("license") >= 0 || text.indexOf("ownership") >= 0 || text.indexOf("certificate") >= 0) {
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

var HI_SUGGESTIONS = [
  "What should I focus on today?",
  "Review my goals and suggest next steps",
  "How am I doing this week?",
  "Plan my professional priorities",
  "What habits am I missing today?"
];

/* ── Panel open / close ── */

function hiOpenChat() {
  var panel = document.getElementById("hi-chat-panel");
  if (!panel) return;
  var backdrop = document.getElementById("hi-chat-backdrop");
  if (backdrop) backdrop.hidden = false;
  panel.classList.add("open");
  panel.setAttribute("aria-hidden", "false");
  document.body.classList.add("hi-chat-open");

  var btn = document.getElementById("hiAiBtn");
  if (btn) btn.setAttribute("aria-expanded", "true");

  /* Load context once per session */
  if (!_hiContextLoaded) hiLoadChatContext();

  /* Load stored history */
  hiLoadChatHistory().then(function() {
    var input = document.getElementById("hi-chat-input");
    if (input) input.focus();
  });
}

function hiCloseChat() {
  var panel = document.getElementById("hi-chat-panel");
  if (!panel) return;
  var backdrop = document.getElementById("hi-chat-backdrop");
  panel.classList.remove("open");
  panel.setAttribute("aria-hidden", "true");
  if (backdrop) backdrop.hidden = true;
  document.body.classList.remove("hi-chat-open");
  var btn = document.getElementById("hiAiBtn");
  if (btn) btn.setAttribute("aria-expanded", "false");
}

/* ── Context ── */

async function hiLoadChatContext() {
  var statusEl = document.getElementById("hi-chat-context-status");
  if (statusEl) statusEl.textContent = "Loading your context…";

  try {
    _hiContextStr = await hiBuildAIContext();
    _hiContextLoaded = true;
    if (statusEl) {
      statusEl.textContent = "Context loaded · Your life data is ready";
      setTimeout(function() {
        if (statusEl) statusEl.style.opacity = "0";
      }, 3000);
    }
  } catch(e) {
    _hiContextStr = "";
    _hiContextLoaded = true;
    if (statusEl) statusEl.textContent = "No context — set up your identity first";
  }
}

/* ── History ── */

async function hiLoadChatHistory() {
  try {
    var record = await hiGet(HI_CHAT_STORE, HI_CHAT_SESSION);
    _hiChatHistory = record ? (record.messages || []) : [];
  } catch(e) {
    _hiChatHistory = [];
  }
  hiRenderMessages();
}

async function hiSaveChatHistory() {
  try {
    await hiPut(HI_CHAT_STORE, {
      id: HI_CHAT_SESSION,
      messages: _hiChatHistory.slice(-40), /* keep last 40 turns */
      updatedAt: Date.now()
    });
  } catch(e) {}
}

/* ── Render messages ── */

function hiRenderMessages() {
  var container = document.getElementById("hi-chat-messages");
  if (!container) return;

  if (!_hiChatHistory.length) {
    container.innerHTML =
      '<div class="hi-chat-welcome">' +
        '<div class="hi-chat-welcome-icon">&#x1F9E0;</div>' +
        '<p>I know your identity, tasks, goals, and projects.<br>Ask me anything about your life and work.</p>' +
      '</div>';
    return;
  }

  container.innerHTML = _hiChatHistory.map(function(msg) {
    var isUser = msg.role === "user";
    return '<div class="hi-chat-bubble ' + (isUser ? "user" : "assistant") + '">' +
      '<div class="hi-bubble-content">' + hiFormatMessage(msg.content) + '</div>' +
    '</div>';
  }).join("");

  container.scrollTop = container.scrollHeight;
}

function hiFormatMessage(text) {
  return hiEsc(text)
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/\n/g, "<br>");
}

function hiAppendMessage(role, content) {
  _hiChatHistory.push({ role: role, content: content });
  hiRenderMessages();
}

function hiShowTyping() {
  var container = document.getElementById("hi-chat-messages");
  if (!container) return;
  var el = document.createElement("div");
  el.className = "hi-chat-bubble assistant hi-typing-indicator";
  el.id = "hi-typing-bubble";
  el.innerHTML = '<div class="hi-bubble-content"><span class="hi-dot"></span><span class="hi-dot"></span><span class="hi-dot"></span></div>';
  container.appendChild(el);
  container.scrollTop = container.scrollHeight;
}

function hiHideTyping() {
  var el = document.getElementById("hi-typing-bubble");
  if (el) el.remove();
}

/* ── Send message ── */

async function hiSendMessage(userText) {
  if (!userText.trim() || _hiSending) return;
  _hiSending = true;

  var input  = document.getElementById("hi-chat-input");
  var sendBtn= document.getElementById("hi-chat-send");
  if (input)   input.value = "";
  if (sendBtn) sendBtn.disabled = true;
  hiAutoResizeInput();

  /* Build the message — inject context on first message of session */
  var messageToSend = userText;
  if (_hiContextLoaded && _hiContextStr && _hiChatHistory.length === 0) {
    messageToSend = _hiContextStr + "\n\nUser question: " + userText;
  }

  hiAppendMessage("user", userText);  /* show clean text to user */
  hiShowTyping();

  /* Build history for API (exclude context injection from visible messages) */
  var apiHistory = _hiChatHistory.slice(0, -1).map(function(m) {
    return { role: m.role, content: m.content };
  });

  try {
    var response = await fetch(HI_CHAT_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: messageToSend, history: apiHistory })
    });

    hiHideTyping();

    if (!response.ok) throw new Error("HTTP " + response.status);
    var data    = await response.json();
    var reply   = data.reply || data.response || data.message || "I didn't get a response. Try again.";
    hiAppendMessage("assistant", reply);
  } catch(err) {
    hiHideTyping();
    hiAppendMessage("assistant", hiLocalOperatorReply(userText));
  }

  await hiSaveChatHistory();
  _hiSending = false;
  if (sendBtn) sendBtn.disabled = false;
  if (input) input.focus();
}

/* ── Auto-resize textarea ── */

function hiAutoResizeInput() {
  var input = document.getElementById("hi-chat-input");
  if (!input) return;
  input.style.height = "auto";
  input.style.height = Math.min(input.scrollHeight, 120) + "px";
}

/* ── Clear chat ── */

async function hiClearChat() {
  if (!confirm("Clear this conversation?")) return;
  _hiChatHistory = [];
  _hiContextLoaded = false;
  try { await hiDelete(HI_CHAT_STORE, HI_CHAT_SESSION); } catch(e) {}
  hiRenderMessages();
  hiLoadChatContext();
}

/* ── Suggestions ── */

function hiRenderSuggestions() {
  var el = document.getElementById("hi-chat-suggestions");
  if (!el) return;
  el.innerHTML = HI_SUGGESTIONS.map(function(s) {
    return '<button type="button" class="hi-suggestion-chip" data-text="' + hiEsc(s) + '">' + hiEsc(s) + '</button>';
  }).join("");

  el.querySelectorAll(".hi-suggestion-chip").forEach(function(btn) {
    btn.addEventListener("click", function() {
      hiSendMessage(btn.dataset.text);
      el.style.display = "none";
    });
  });
}

/* ── INIT ── */

document.addEventListener("DOMContentLoaded", function() {
  /* Wire AI FAB */
  var aiBtn = document.getElementById("hiAiBtn");
  if (aiBtn) {
    /* Remove old placeholder listener — replace with real chat open */
    var newBtn = aiBtn.cloneNode(true);
    aiBtn.parentNode.replaceChild(newBtn, aiBtn);
    newBtn.addEventListener("click", function() {
      var panel = document.getElementById("hi-chat-panel");
      if (panel && panel.classList.contains("open")) hiCloseChat();
      else hiOpenChat();
    });
  }

  /* Close button */
  var closeBtn = document.getElementById("hi-chat-close");
  if (closeBtn) closeBtn.addEventListener("click", hiCloseChat);

  /* Clear button */
  var clearBtn = document.getElementById("hi-chat-clear");
  if (clearBtn) clearBtn.addEventListener("click", hiClearChat);

  /* Send form */
  var form = document.getElementById("hi-chat-form");
  if (form) {
    form.addEventListener("submit", function(e) {
      e.preventDefault();
      var input = document.getElementById("hi-chat-input");
      var text  = (input ? input.value : "").trim();
      if (text) hiSendMessage(text);
    });
  }

  /* Textarea auto-resize + Enter to send */
  var input = document.getElementById("hi-chat-input");
  if (input) {
    input.addEventListener("input", hiAutoResizeInput);
    input.addEventListener("keydown", function(e) {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        var text = input.value.trim();
        if (text) hiSendMessage(text);
      }
    });
  }

  /* Click backdrop to close */
  var backdrop = document.getElementById("hi-chat-backdrop");
  if (backdrop) backdrop.addEventListener("click", hiCloseChat);

  /* Escape key */
  document.addEventListener("keydown", function(e) {
    if (e.key === "Escape") hiCloseChat();
  });

  hiRenderSuggestions();
});
