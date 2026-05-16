"use strict";

(function () {
  const _roomParam     = new URLSearchParams(window.location.search).get("room") ?? "main";
  const stateUrl       = `/api/live-class?room=${encodeURIComponent(_roomParam)}`;
  let   lastRevision   = 0;
  let   lastBlockCount = 0;
  let   manuallySelectedTheme = false;
  let   autoScroll     = true;
  let   joined         = false;
  let   joinRetryTimer = null;
  let   hasConnectedOnce = false;
  let   pollErrorCount = 0;

  const els = {
    title:           document.getElementById("boardTitle"),
    subtitle:        document.getElementById("boardSubtitle"),
    status:          document.getElementById("boardStatus"),
    mode:            document.getElementById("boardMode"),
    room:            document.getElementById("boardRoom"),
    teacher:         document.getElementById("boardTeacher"),
    revision:        document.getElementById("boardRevision"),
    updated:         document.getElementById("boardUpdated"),
    board:           document.getElementById("liveBoard"),
    connection:      document.getElementById("boardConnection"),
    toggle:          document.getElementById("boardThemeToggle"),
    themeLabel:      document.getElementById("boardThemeLabel"),
    autoScroll:      document.getElementById("boardAutoScroll"),
    fullscreen:      document.getElementById("boardFullscreen"),
    logo:            document.getElementById("liveClassLogo"),
    viewerCount:     document.getElementById("viewerCount"),
    viewerCountMeta: document.getElementById("viewerCountMeta"),
    learnerStatus:   document.getElementById("boardLearnerStatus"),
    viewerList:      document.getElementById("viewerList"),
    joinForm:        document.getElementById("joinClassForm"),
    joinPanel:       document.getElementById("joinClassPanel"),
    joinName:        document.getElementById("joinNameInput"),
    joinStatus:      document.getElementById("joinStatus"),
    copyInvite:      document.getElementById("copyInviteBtn"),
    copyInviteStatus:document.getElementById("copyInviteStatus"),
    statusDot:       document.getElementById("lcStatusDot"),
    statusText:      document.getElementById("lcStatusText"),
    statusViewers:   document.getElementById("lcStatusViewers"),
    statusUpdated:   document.getElementById("lcStatusUpdated"),
    liveDot:         document.getElementById("lcLiveDot"),
    toastArea:       document.getElementById("lcToastArea"),
    mobileJoinBtn:   document.getElementById("lcMobileJoinBtn"),
    drawer:          document.getElementById("lcDrawer"),
    drawerBackdrop:  document.getElementById("lcDrawerBackdrop"),
    drawerClose:     document.getElementById("lcDrawerClose"),
    drawerForm:      document.getElementById("lcDrawerForm"),
    drawerName:      document.getElementById("lcDrawerName"),
    drawerStatus:    document.getElementById("lcDrawerStatus"),
  };

  /* ── Helpers ── */

  function esc(v) {
    return String(v ?? "")
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function formatTime(ms) {
    if (!ms) return "--";
    return new Date(ms).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  function relativeTime(ms) {
    const diff = Math.max(0, Date.now() - Number(ms ?? 0));
    if (diff < 15_000)   return "now";
    if (diff < 60_000)   return `${Math.round(diff / 1_000)}s ago`;
    if (diff < 3_600_000) return `${Math.round(diff / 60_000)}m ago`;
    return formatTime(ms);
  }

  function getDeviceId() {
    try {
      const ex = localStorage.getItem("live_class_device_id");
      if (ex) return ex;
      const id = `device-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
      localStorage.setItem("live_class_device_id", id);
      return id;
    } catch { return `device-${Math.random().toString(36).slice(2, 12)}`; }
  }

  function getStoredName() {
    try { return localStorage.getItem("live_class_name") ?? ""; } catch { return ""; }
  }

  function storeName(name) {
    try { localStorage.setItem("live_class_name", name); } catch { /* non-critical */ }
  }

  function deviceLabel() {
    const ua   = navigator.userAgent ?? "";
    const type = /Mobi|Android/i.test(ua) ? "Mobile" : /Tablet|iPad/i.test(ua) ? "Tablet" : "Desktop";
    const browser = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" :
                    /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Browser";
    return `${type} ${browser}`;
  }

  function initials(name) {
    return String(name ?? "Guest").trim().split(/\s+/).slice(0, 2)
      .map(p => p.charAt(0).toUpperCase()).join("") || "G";
  }

  /* ── Sound Ping ── */

  let audioCtx = null;
  function playPing() {
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc  = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = "sine";
      osc.frequency.value = 660;
      gain.gain.setValueAtTime(0.18, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.45);
      osc.start(audioCtx.currentTime);
      osc.stop(audioCtx.currentTime + 0.45);
    } catch { /* audio not available */ }
  }

  /* ── Toast ── */

  function showToast(msg, icon) {
    if (!els.toastArea) return;
    const toast = document.createElement("div");
    toast.className = "lc-toast";
    toast.innerHTML = `<span class="lc-toast-icon">${icon ?? "📌"}</span><span>${esc(msg)}</span>`;
    els.toastArea.appendChild(toast);
    setTimeout(() => {
      toast.classList.add("lc-toast--out");
      setTimeout(() => toast.remove(), 300);
    }, 3_400);
  }

  /* ── Status Bar ── */

  function setConnectionState(state) {
    if (els.statusDot) els.statusDot.dataset.state = state;
    if (els.liveDot) {
      els.liveDot.classList.toggle("is-live", state === "live");
    }
  }

  function updateStatusBar(viewerCount, updatedAt) {
    if (els.statusViewers) {
      const n = Number(viewerCount) || 0;
      els.statusViewers.textContent = n === 1 ? "1 learner online" : `${n} learners online`;
    }
    if (els.statusUpdated && updatedAt) {
      els.statusUpdated.textContent = `Updated ${relativeTime(updatedAt)}`;
    }
  }

  /* ── Theme ── */

  function setTheme(theme, manual) {
    const selected = theme === "light" ? "light" : "dark";
    document.body.dataset.boardTheme = selected;
    const isLight = selected === "light";
    if (els.mode)       els.mode.textContent      = isLight ? "Whiteboard" : "Blackboard";
    if (els.themeLabel) els.themeLabel.textContent = isLight ? "Blackboard" : "Whiteboard";
    if (els.logo)       els.logo.src = isLight ? "/logo/day-logo.png" : "/logo/night-logo.png";
    if (manual) {
      manuallySelectedTheme = true;
      try { localStorage.setItem("live_class_theme", selected); } catch { /* non-critical */ }
    }
  }

  /* ── Block Rendering ── */

  function renderBlock(block, focusId, index) {
    const text     = esc(block.text ?? "");
    const focusCls = block.id && block.id === focusId ? " is-focus" : "";
    const idx      = `<span class="board-block-index">${String(index + 1).padStart(2, "0")}</span>`;

    if (block.type === "heading")  return `<div class="board-block board-heading${focusCls}">${idx}${text}</div>`;
    if (block.type === "code")     return `<pre class="board-block board-code${focusCls}">${idx}<code>${text}</code></pre>`;
    if (block.type === "list")     return `<div class="board-block board-list${focusCls}">${idx}${text}</div>`;
    if (block.type === "quote")    return `<blockquote class="board-block board-quote${focusCls}">${idx}${text}</blockquote>`;
    if (block.type === "homework") return `<div class="board-block board-homework${focusCls}">${idx}<strong>Homework</strong><p>${text}</p></div>`;
    if (block.type === "divider")  return `<div class="board-block board-divider${focusCls}" aria-hidden="true"></div>`;
    if (block.type === "answer")   return `<div class="board-block board-answer${focusCls}">${idx}<strong>Answer</strong><p>${text}</p></div>`;
    if (block.type === "link") {
      const url = esc(block.url ?? block.text ?? "#");
      return `<div class="board-block board-link${focusCls}">${idx}<a href="${url}" target="_blank" rel="noopener noreferrer">${text}</a><small>${url}</small></div>`;
    }
    if (block.type === "image") {
      const src = esc(block.url ?? "");
      return `<figure class="board-block board-image${focusCls}">${idx}<img src="${src}" alt="${text}" loading="lazy" /><figcaption>${text}</figcaption></figure>`;
    }
    return `<div class="board-block board-text${focusCls}">${idx}${text}</div>`;
  }

  function renderViewers(viewers) {
    const list  = Array.isArray(viewers) ? viewers : [];
    const count = list.length;
    if (els.viewerCount)     els.viewerCount.textContent     = String(count);
    if (els.viewerCountMeta) els.viewerCountMeta.textContent = String(count);
    if (els.learnerStatus)   els.learnerStatus.textContent   = count === 1 ? "1 joined" : `${count} joined`;
    if (!els.viewerList) return;
    if (!count) {
      els.viewerList.innerHTML = '<p class="lc-viewer-empty">No learners joined yet.</p>';
      return;
    }
    els.viewerList.innerHTML = list.map(v => {
      const name   = esc(v.name   ?? "Guest Learner");
      const device = esc(v.device ?? "Browser");
      return `<div class="viewer-item">` +
        `<span class="viewer-avatar">${esc(initials(name))}</span>` +
        `<span><strong class="viewer-name">${name}</strong>` +
        `<span class="viewer-meta">${device} · ${relativeTime(v.lastSeen)}</span></span>` +
      `</div>`;
    }).join("");
  }

  function render(state) {
    if (!state) return;
    if (!manuallySelectedTheme) setTheme(state.theme);
    if (els.title)    els.title.textContent    = state.title    ?? "Live Classroom";
    if (els.subtitle) els.subtitle.textContent = state.subtitle ?? "";
    if (els.status)   els.status.textContent   = state.status   ?? "Live";
    if (els.room)     els.room.textContent     = state.room     ?? "Live Room";
    if (els.teacher)  els.teacher.textContent  = state.teacher  ?? "Teacher";
    if (els.revision) els.revision.textContent = String(state.revision ?? 1);
    if (els.updated)  els.updated.textContent  = formatTime(state.updatedAt);
    if (els.connection) els.connection.textContent = "● Live";
    if (els.statusText) els.statusText.textContent = "Connected to classroom";

    setConnectionState("live");
    updateStatusBar((Array.isArray(state.viewers) ? state.viewers.length : 0), state.updatedAt);
    hasConnectedOnce = true;
    renderViewers(state.viewers);

    const blocks      = Array.isArray(state.blocks) ? state.blocks : [];
    const newCount    = blocks.length;
    const newRevision = state.revision ?? 0;

    if (els.board && newRevision !== lastRevision) {
      const hadContent = lastRevision > 0;
      els.board.innerHTML = blocks.length
        ? blocks.map((b, i) => renderBlock(b, state.focusId, i)).join("")
        : '<p class="board-empty">Board is clear. Waiting for teacher…</p>';

      if (autoScroll) {
        const focus = els.board.querySelector(".is-focus") ?? els.board.lastElementChild;
        if (focus) focus.scrollIntoView({ behavior: "smooth", block: "end" });
      }

      if (window.hljs) {
        els.board.querySelectorAll("pre code").forEach(el => window.hljs.highlightElement(el));
      }

      if (hadContent && newCount > lastBlockCount) {
        playPing();
        const newBlock  = blocks[blocks.length - 1];
        const typeLabel = { heading: "New heading", code: "Code block", list: "New list", quote: "New quote", homework: "Homework posted", link: "New link", image: "Image added", divider: "Divider", answer: "Answer posted" }[newBlock.type] ?? "New content";
        const icon      = { heading: "📢", code: "💻", list: "📋", quote: "💬", homework: "📝", link: "🔗", image: "🖼️", divider: "—", answer: "💡" }[newBlock.type] ?? "📌";
        showToast(`${typeLabel} added to the board`, icon);
      }
    }

    lastRevision   = newRevision;
    lastBlockCount = newCount;
  }

  /* ── Data Loading (polling) ── */

  async function load() {
    const ctl = new AbortController();
    const tid = setTimeout(() => ctl.abort(), 8_000);
    try {
      const res   = await fetch(`${stateUrl}&t=${Date.now()}`, { headers: { "Accept": "application/json" }, signal: ctl.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const state = await res.json();
      pollErrorCount = 0;
      render(state);
    } catch {
      pollErrorCount++;
      if (pollErrorCount >= 2) {
        setConnectionState("connecting");
        if (els.connection) els.connection.textContent = hasConnectedOnce ? "Reconnecting…" : "Connecting…";
        if (els.status)     els.status.textContent     = hasConnectedOnce ? "Reconnecting…" : "Connecting…";
        if (els.statusText) els.statusText.textContent = hasConnectedOnce ? "Reconnecting…" : "Connecting to classroom…";
      }
    } finally {
      clearTimeout(tid);
    }
  }

  /* ── Join Class ── */

  function scheduleJoinRetry(name) {
    const cleanName = String(name ?? "").trim().slice(0, 80);
    if (!cleanName || joinRetryTimer) return;
    joinRetryTimer = setInterval(() => {
      joinClass(getStoredName() || cleanName, true);
    }, 15_000);
  }

  async function joinClass(name, silent) {
    const cleanName = String(name ?? "").trim().slice(0, 80);
    if (!cleanName) {
      if (els.joinStatus)   els.joinStatus.textContent   = "Enter your name to join the live class.";
      if (els.drawerStatus) els.drawerStatus.textContent = "Enter your name to join.";
      els.joinName?.focus();
      return;
    }
    if (!silent) {
      if (els.joinStatus)   els.joinStatus.textContent   = "Registering this device…";
      if (els.drawerStatus) els.drawerStatus.textContent = "Registering…";
    }
    const joinCtl = new AbortController();
    const joinTid = setTimeout(() => joinCtl.abort(), 10_000);
    try {
      const res = await fetch(stateUrl, {
        method:  "POST",
        headers: { "Accept": "application/json", "Content-Type": "application/json" },
        body:    JSON.stringify({ action: "join", room: _roomParam, name: cleanName, deviceId: getDeviceId(), device: deviceLabel() }),
        signal:  joinCtl.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      joined = true;
      storeName(cleanName);
      const msg = `Joined as ${cleanName}. You're live.`;
      if (els.joinStatus)   els.joinStatus.textContent   = msg;
      if (els.drawerStatus) els.drawerStatus.textContent = msg;
      els.joinPanel?.classList.add("is-joined");
      if (!silent) showToast(`Joined as ${cleanName}`, "✅");
      render(await res.json());
      scheduleJoinRetry(cleanName);
      closeDrawer();
    } catch (err) {
      if (err.name !== "AbortError") console.warn("[LiveClass] Join failed:", err.message);
      scheduleJoinRetry(cleanName);
      if (!silent) {
        if (els.joinStatus)   els.joinStatus.textContent   = "Connecting… retrying automatically.";
        if (els.drawerStatus) els.drawerStatus.textContent = "Connecting… retrying.";
      }
    } finally {
      clearTimeout(joinTid);
    }
  }

  /* ── Copy Invite ── */

  async function copyInviteLink() {
    const link = window.location.href.split("#")[0];
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(link);
      } else {
        window.prompt("Copy class link:", link);
      }
      if (els.copyInviteStatus) els.copyInviteStatus.textContent = "Link copied to clipboard!";
      showToast("Class link copied!", "📋");
    } catch {
      if (els.copyInviteStatus) els.copyInviteStatus.textContent = link;
    }
  }

  /* ── Mobile Drawer ── */

  function openDrawer() {
    if (!els.drawer) return;
    els.drawer.hidden         = false;
    els.drawerBackdrop.hidden = false;
    els.drawer.removeAttribute("aria-hidden");
    els.drawerBackdrop.removeAttribute("aria-hidden");
    const savedName = getStoredName();
    if (els.drawerName && savedName) els.drawerName.value = savedName;
    setTimeout(() => els.drawerName?.focus(), 60);
  }

  function closeDrawer() {
    if (!els.drawer) return;
    els.drawer.hidden         = true;
    els.drawerBackdrop.hidden = true;
    els.drawer.setAttribute("aria-hidden", "true");
    els.drawerBackdrop.setAttribute("aria-hidden", "true");
  }

  /* ── Event Listeners ── */

  els.toggle?.addEventListener("click", () => {
    setTheme(document.body.dataset.boardTheme === "light" ? "dark" : "light", true);
  });

  els.autoScroll?.addEventListener("click", () => {
    autoScroll = !autoScroll;
    els.autoScroll.setAttribute("aria-pressed", String(autoScroll));
    els.autoScroll.style.opacity = autoScroll ? "1" : "0.5";
    showToast(`Auto-scroll ${autoScroll ? "on" : "off"}`, autoScroll ? "⬇️" : "⏸️");
  });

  els.fullscreen?.addEventListener("click", () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  });

  els.joinForm?.addEventListener("submit", e => {
    e.preventDefault();
    joinClass(els.joinName?.value ?? "");
  });

  els.drawerForm?.addEventListener("submit", e => {
    e.preventDefault();
    const name = els.drawerName?.value ?? "";
    if (els.joinName) els.joinName.value = name;
    joinClass(name);
  });

  els.mobileJoinBtn?.addEventListener("click",  openDrawer);
  els.drawerClose?.addEventListener("click",    closeDrawer);
  els.drawerBackdrop?.addEventListener("click", closeDrawer);
  els.copyInvite?.addEventListener("click",     copyInviteLink);

  /* ── Reactions ── */

  let currentReaction = "";
  document.querySelectorAll(".lc-reaction-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const emoji    = btn.dataset.emoji ?? "";
      const isToggle = emoji === currentReaction;
      const next     = isToggle ? "" : emoji;
      currentReaction = next;
      document.querySelectorAll(".lc-reaction-btn").forEach(b => {
        b.classList.toggle("is-active", b.dataset.emoji === next && next !== "");
      });
      const status = document.getElementById("reactionStatus");
      if (status) status.textContent = next ? `Sent: ${next}` : "Tap to let the teacher know.";
      fetch(stateUrl, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ action: "react", text: next, name: getStoredName() || "Student", deviceId: getDeviceId() }),
      }).catch(() => {});
    });
  });

  /* ── Q&A ── */

  document.getElementById("questionForm")?.addEventListener("submit", e => {
    e.preventDefault();
    const input  = document.getElementById("questionInput");
    const status = document.getElementById("questionStatus");
    const q      = (input?.value ?? "").trim();
    if (!q) return;
    if (status) status.textContent = "Sending…";
    const qCtl = new AbortController();
    const qTid = setTimeout(() => qCtl.abort(), 8_000);
    fetch(stateUrl, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ action: "question", text: q, name: getStoredName() || "Student", deviceId: getDeviceId() }),
      signal:  qCtl.signal,
    }).then(() => {
      if (input)  input.value = "";
      if (status) status.textContent = "Question sent! Teacher will answer live.";
      showToast("Question sent to teacher", "❓");
    }).catch(err => {
      if (status) status.textContent = err.name === "AbortError" ? "Timed out. Try again." : "Failed to send. Try again.";
    }).finally(() => clearTimeout(qTid));
  });

  document.addEventListener("keydown", e => {
    if (/input|textarea|select/i.test(e.target?.tagName ?? "")) return;
    if (e.key === "t") setTheme(document.body.dataset.boardTheme === "light" ? "dark" : "light", true);
    if (e.key === "a") els.autoScroll?.click();
    if (e.key === "f") els.fullscreen?.click();
    if (e.key === "j") { if (els.joinName) els.joinName.focus(); else openDrawer(); }
    if (e.key === "Escape") closeDrawer();
  });

  /* ── Push Subscription ── */

  async function subscribePush() {
    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
      const reg     = await navigator.serviceWorker.ready;
      const keyRes  = await fetch("/api/push");
      const keyData = await keyRes.json();
      if (!keyData.publicKey) return;
      const sub  = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyData.publicKey });
      const json = sub.toJSON();
      await fetch("/api/push", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ action: "subscribe", endpoint: json.endpoint, keys: json.keys, deviceId: getDeviceId() }),
      });
    } catch { /* non-critical */ }
  }

  /* ── Init ── */

  setTheme(document.body.dataset.boardTheme ?? "dark");
  const savedName = getStoredName();
  if (els.joinName   && savedName) els.joinName.value   = savedName;
  if (els.drawerName && savedName) els.drawerName.value = savedName;
  if (savedName) scheduleJoinRetry(savedName);
  subscribePush();
  load();
  if (savedName) joinClass(savedName, true);
  setInterval(load, 3_000);

}());
