"use strict";

(function () {
  var _roomParam    = new URLSearchParams(window.location.search).get("room") || "main";
  var stateUrl      = "/api/live-class?room=" + encodeURIComponent(_roomParam);
  var lastRevision  = 0;
  var lastBlockCount = 0;
  var manuallySelectedTheme = false;
  var autoScroll    = true;
  var joined        = false;
  var joinRetryTimer = null;
  var hasConnectedOnce = false;

  var els = {
    title:          document.getElementById("boardTitle"),
    subtitle:       document.getElementById("boardSubtitle"),
    status:         document.getElementById("boardStatus"),
    mode:           document.getElementById("boardMode"),
    room:           document.getElementById("boardRoom"),
    teacher:        document.getElementById("boardTeacher"),
    revision:       document.getElementById("boardRevision"),
    updated:        document.getElementById("boardUpdated"),
    board:          document.getElementById("liveBoard"),
    connection:     document.getElementById("boardConnection"),
    toggle:         document.getElementById("boardThemeToggle"),
    themeLabel:     document.getElementById("boardThemeLabel"),
    autoScroll:     document.getElementById("boardAutoScroll"),
    fullscreen:     document.getElementById("boardFullscreen"),
    logo:           document.getElementById("liveClassLogo"),
    viewerCount:    document.getElementById("viewerCount"),
    viewerCountMeta:document.getElementById("viewerCountMeta"),
    learnerStatus:  document.getElementById("boardLearnerStatus"),
    viewerList:     document.getElementById("viewerList"),
    joinForm:       document.getElementById("joinClassForm"),
    joinPanel:      document.getElementById("joinClassPanel"),
    joinName:       document.getElementById("joinNameInput"),
    joinStatus:     document.getElementById("joinStatus"),
    copyInvite:     document.getElementById("copyInviteBtn"),
    copyInviteStatus:document.getElementById("copyInviteStatus"),
    /* new: status bar */
    statusDot:      document.getElementById("lcStatusDot"),
    statusText:     document.getElementById("lcStatusText"),
    statusViewers:  document.getElementById("lcStatusViewers"),
    statusUpdated:  document.getElementById("lcStatusUpdated"),
    liveDot:        document.getElementById("lcLiveDot"),
    toastArea:      document.getElementById("lcToastArea"),
    /* mobile join */
    mobileJoinBtn:  document.getElementById("lcMobileJoinBtn"),
    drawer:         document.getElementById("lcDrawer"),
    drawerBackdrop: document.getElementById("lcDrawerBackdrop"),
    drawerClose:    document.getElementById("lcDrawerClose"),
    drawerForm:     document.getElementById("lcDrawerForm"),
    drawerName:     document.getElementById("lcDrawerName"),
    drawerStatus:   document.getElementById("lcDrawerStatus")
  };

  /* ── Helpers ── */
  function esc(v) {
    return String(v || "")
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function formatTime(ms) {
    if (!ms) return "--";
    return new Date(ms).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  function relativeTime(ms) {
    var diff = Math.max(0, Date.now() - Number(ms || 0));
    if (diff < 15000)  return "now";
    if (diff < 60000)  return Math.round(diff / 1000) + "s ago";
    if (diff < 3600000) return Math.round(diff / 60000) + "m ago";
    return formatTime(ms);
  }

  function getDeviceId() {
    try {
      var ex = localStorage.getItem("live_class_device_id");
      if (ex) return ex;
      var id = "device-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 9);
      localStorage.setItem("live_class_device_id", id);
      return id;
    } catch (e) { return "device-" + Math.random().toString(36).slice(2, 12); }
  }

  function getStoredName() {
    try { return localStorage.getItem("live_class_name") || ""; } catch (e) { return ""; }
  }

  function storeName(name) {
    try { localStorage.setItem("live_class_name", name); } catch (e) {}
  }

  function deviceLabel() {
    var ua = navigator.userAgent || "";
    var type = /Mobi|Android/i.test(ua) ? "Mobile" : /Tablet|iPad/i.test(ua) ? "Tablet" : "Desktop";
    var browser = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" :
                  /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Browser";
    return type + " " + browser;
  }

  function initials(name) {
    return String(name || "Guest").trim().split(/\s+/).slice(0, 2)
      .map(function (p) { return p.charAt(0).toUpperCase(); }).join("") || "G";
  }

  /* ── Sound Ping ── */
  var audioCtx = null;
  function playPing() {
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      var osc  = audioCtx.createOscillator();
      var gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = "sine";
      osc.frequency.value = 660;
      gain.gain.setValueAtTime(0.18, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.45);
      osc.start(audioCtx.currentTime);
      osc.stop(audioCtx.currentTime + 0.45);
    } catch (e) {}
  }

  /* ── Toast ── */
  function showToast(msg, icon) {
    if (!els.toastArea) return;
    var toast = document.createElement("div");
    toast.className = "lc-toast";
    toast.innerHTML = '<span class="lc-toast-icon">' + (icon || "📌") + "</span><span>" + esc(msg) + "</span>";
    els.toastArea.appendChild(toast);
    setTimeout(function () {
      toast.classList.add("lc-toast--out");
      setTimeout(function () { toast.remove(); }, 300);
    }, 3400);
  }

  /* ── Status Bar ── */
  function setConnectionState(state) {
    if (els.statusDot)  els.statusDot.dataset.state = state;
    if (els.liveDot) {
      if (state === "live")        els.liveDot.classList.add("is-live");
      else                         els.liveDot.classList.remove("is-live");
    }
  }

  function updateStatusBar(viewerCount, updatedAt) {
    if (els.statusViewers) {
      var n = Number(viewerCount) || 0;
      els.statusViewers.textContent = n === 1 ? "1 learner online" : n + " learners online";
    }
    if (els.statusUpdated && updatedAt) {
      els.statusUpdated.textContent = "Updated " + relativeTime(updatedAt);
    }
  }

  /* ── Theme ── */
  function setTheme(theme, manual) {
    var selected = theme === "light" ? "light" : "dark";
    document.body.dataset.boardTheme = selected;
    var isLight = selected === "light";
    if (els.mode)       els.mode.textContent        = isLight ? "Whiteboard" : "Blackboard";
    if (els.themeLabel) els.themeLabel.textContent   = isLight ? "Blackboard" : "Whiteboard";
    if (els.logo)       els.logo.src = isLight ? "/logo/day-logo.png" : "/logo/night-logo.png";
    if (manual) {
      manuallySelectedTheme = true;
      try { localStorage.setItem("live_class_theme", selected); } catch (e) {}
    }
  }

  /* ── Block Rendering ── */
  function renderBlock(block, focusId, index) {
    var text       = esc(block.text || "");
    var focusCls   = block.id && block.id === focusId ? " is-focus" : "";
    var idx        = '<span class="board-block-index">' + String(index + 1).padStart(2, "0") + "</span>";

    if (block.type === "heading")  return '<div class="board-block board-heading'  + focusCls + '">' + idx + text + "</div>";
    if (block.type === "code")     return '<pre class="board-block board-code'     + focusCls + '">' + idx + "<code>" + text + "</code></pre>";
    if (block.type === "list")     return '<div class="board-block board-list'     + focusCls + '">' + idx + text + "</div>";
    if (block.type === "quote")    return '<blockquote class="board-block board-quote' + focusCls + '">' + idx + text + "</blockquote>";
    if (block.type === "homework") return '<div class="board-block board-homework' + focusCls + '">' + idx + "<strong>Homework</strong><p>" + text + "</p></div>";
    if (block.type === "divider")  return '<div class="board-block board-divider'  + focusCls + '" aria-hidden="true"></div>';
    if (block.type === "answer")   return '<div class="board-block board-answer'   + focusCls + '">' + idx + "<strong>Answer</strong><p>" + text + "</p></div>";
    if (block.type === "link") {
      var url = esc(block.url || block.text || "#");
      return '<div class="board-block board-link' + focusCls + '">' + idx +
        '<a href="' + url + '" target="_blank" rel="noopener noreferrer">' + text + "</a>" +
        "<small>" + url + "</small></div>";
    }
    if (block.type === "image") {
      var src = esc(block.url || "");
      return '<figure class="board-block board-image' + focusCls + '">' + idx +
        '<img src="' + src + '" alt="' + text + '" loading="lazy" />' +
        "<figcaption>" + text + "</figcaption></figure>";
    }
    return '<div class="board-block board-text' + focusCls + '">' + idx + text + "</div>";
  }

  function renderViewers(viewers) {
    var list  = Array.isArray(viewers) ? viewers : [];
    var count = list.length;
    if (els.viewerCount)     els.viewerCount.textContent     = String(count);
    if (els.viewerCountMeta) els.viewerCountMeta.textContent = String(count);
    if (els.learnerStatus)   els.learnerStatus.textContent   = count === 1 ? "1 joined" : count + " joined";
    if (!els.viewerList) return;
    if (!count) {
      els.viewerList.innerHTML = '<p class="lc-viewer-empty">No learners joined yet.</p>';
      return;
    }
    els.viewerList.innerHTML = list.map(function (v) {
      var name   = esc(v.name   || "Guest Learner");
      var device = esc(v.device || "Browser");
      var ip     = esc(v.ip     || "IP hidden");
      return '<div class="viewer-item">' +
        '<span class="viewer-avatar">' + esc(initials(name)) + "</span>" +
        '<span><strong class="viewer-name">' + name + "</strong>" +
        '<span class="viewer-meta">' + device + " · " + relativeTime(v.lastSeen) + "</span></span>" +
        "</div>";
    }).join("");
  }

  function render(state) {
    if (!state) return;
    if (!manuallySelectedTheme) setTheme(state.theme);
    if (els.title)    els.title.textContent    = state.title    || "Live Classroom";
    if (els.subtitle) els.subtitle.textContent = state.subtitle || "";
    if (els.status)   els.status.textContent   = state.status   || "Live";
    if (els.room)     els.room.textContent      = state.room    || "Live Room";
    if (els.teacher)  els.teacher.textContent   = state.teacher || "Teacher";
    if (els.revision) els.revision.textContent  = String(state.revision || 1);
    if (els.updated)  els.updated.textContent   = formatTime(state.updatedAt);
    if (els.connection) els.connection.textContent = "● Live";
    if (els.statusText) els.statusText.textContent = "Connected to classroom";

    setConnectionState("live");
    updateStatusBar((Array.isArray(state.viewers) ? state.viewers.length : 0), state.updatedAt);

    hasConnectedOnce = true;
    renderViewers(state.viewers);

    var blocks     = Array.isArray(state.blocks) ? state.blocks : [];
    var newCount   = blocks.length;
    var newRevision = state.revision || 0;

    if (els.board && newRevision !== lastRevision) {
      var hadContent = lastRevision > 0;
      els.board.innerHTML = blocks.length
        ? blocks.map(function (b, i) { return renderBlock(b, state.focusId, i); }).join("")
        : '<p class="board-empty">Board is clear. Waiting for teacher…</p>';

      if (autoScroll) {
        var focus = els.board.querySelector(".is-focus") || els.board.lastElementChild;
        if (focus) focus.scrollIntoView({ behavior: "smooth", block: "end" });
      }

      /* Syntax highlight code blocks */
      if (window.hljs) {
        els.board.querySelectorAll("pre code").forEach(function (el) { window.hljs.highlightElement(el); });
      }

      /* Toast + sound on new content */
      if (hadContent && newCount > lastBlockCount) {
        playPing();
        var newBlock = blocks[blocks.length - 1];
        var typeLabel = {
          heading: "New heading", code: "Code block", list: "New list",
          quote: "New quote", homework: "Homework posted", link: "New link",
          image: "Image added", divider: "Divider", answer: "Answer posted"
        }[newBlock.type] || "New content";
        var icon = {
          heading: "📢", code: "💻", list: "📋", quote: "💬",
          homework: "📝", link: "🔗", image: "🖼️", divider: "—", answer: "💡"
        }[newBlock.type] || "📌";
        showToast(typeLabel + " added to the board", icon);
      }
    }

    lastRevision  = newRevision;
    lastBlockCount = newCount;
  }

  /* ── WebSocket (real-time via Railway) ── */
  var _ws = null;
  var _wsRetryTimer = null;
  var _wsConnected = false;

  function connectWebSocket() {
    if (_ws && (_ws.readyState === 0 || _ws.readyState === 1)) return;
    try {
      _ws = new WebSocket("wss://jarvis.kingofyadav.in/api/ws/live-class");
      _ws.onopen = function () {
        _wsConnected = true;
        if (els.statusText) els.statusText.textContent = "Connected (real-time)";
      };
      _ws.onmessage = function (evt) {
        try {
          var data = JSON.parse(evt.data);
          if (data && !data.ping) render(data);
        } catch (e) {}
      };
      _ws.onclose = function () {
        _wsConnected = false;
        _ws = null;
        _wsRetryTimer = setTimeout(connectWebSocket, 4000);
      };
      _ws.onerror = function () { _wsConnected = false; };
    } catch (e) {}
  }

  /* ── Data Loading (polling fallback) ── */
  async function load() {
    try {
      var res   = await fetch(stateUrl + "&t=" + Date.now(), { headers: { "Accept": "application/json" } });
      if (!res.ok) throw new Error("HTTP " + res.status);
      var state = await res.json();
      render(state);
    } catch (err) {
      setConnectionState("connecting");
      if (els.connection) els.connection.textContent = hasConnectedOnce ? "Reconnecting…" : "Connecting…";
      if (els.status)     els.status.textContent     = hasConnectedOnce ? "Reconnecting…" : "Connecting…";
      if (els.statusText) els.statusText.textContent = hasConnectedOnce ? "Reconnecting…" : "Connecting to classroom…";
    }
  }

  /* ── Join Class ── */
  function scheduleJoinRetry(name) {
    var cleanName = String(name || "").trim().slice(0, 80);
    if (!cleanName || joinRetryTimer) return;
    joinRetryTimer = setInterval(function () {
      joinClass(getStoredName() || cleanName, true);
    }, 15000);
  }

  async function joinClass(name, silent) {
    var cleanName = String(name || "").trim().slice(0, 80);
    if (!cleanName) {
      if (els.joinStatus)   els.joinStatus.textContent   = "Enter your name to join the live class.";
      if (els.drawerStatus) els.drawerStatus.textContent = "Enter your name to join.";
      if (els.joinName)     els.joinName.focus();
      return;
    }
    if (!silent) {
      if (els.joinStatus)   els.joinStatus.textContent   = "Registering this device…";
      if (els.drawerStatus) els.drawerStatus.textContent = "Registering…";
    }
    try {
      var res = await fetch(stateUrl, {
        method: "POST",
        headers: { "Accept": "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ action: "join", room: _roomParam, name: cleanName, deviceId: getDeviceId(), device: deviceLabel() })
      });
      if (!res.ok) throw new Error("HTTP " + res.status);
      joined = true;
      storeName(cleanName);
      var msg = "Joined as " + cleanName + ". You're live.";
      if (els.joinStatus)   els.joinStatus.textContent   = msg;
      if (els.drawerStatus) els.drawerStatus.textContent = msg;
      if (els.joinPanel)    els.joinPanel.classList.add("is-joined");
      if (!silent)          showToast("Joined as " + cleanName, "✅");
      render(await res.json());
      scheduleJoinRetry(cleanName);
      closeDrawer();
    } catch (err) {
      scheduleJoinRetry(cleanName);
      if (!silent) {
        if (els.joinStatus)   els.joinStatus.textContent   = "Connecting… retrying automatically.";
        if (els.drawerStatus) els.drawerStatus.textContent = "Connecting… retrying.";
      }
    }
  }

  /* ── Copy Invite ── */
  async function copyInviteLink() {
    var link = window.location.href.split("#")[0];
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(link);
      } else {
        window.prompt("Copy class link:", link);
      }
      if (els.copyInviteStatus) els.copyInviteStatus.textContent = "Link copied to clipboard!";
      showToast("Class link copied!", "📋");
    } catch (e) {
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
    var savedName = getStoredName();
    if (els.drawerName && savedName) els.drawerName.value = savedName;
    setTimeout(function () { if (els.drawerName) els.drawerName.focus(); }, 60);
  }

  function closeDrawer() {
    if (!els.drawer) return;
    els.drawer.hidden         = true;
    els.drawerBackdrop.hidden = true;
    els.drawer.setAttribute("aria-hidden", "true");
    els.drawerBackdrop.setAttribute("aria-hidden", "true");
  }

  /* ── Event Listeners ── */
  if (els.toggle) {
    els.toggle.addEventListener("click", function () {
      setTheme(document.body.dataset.boardTheme === "light" ? "dark" : "light", true);
    });
  }

  if (els.autoScroll) {
    els.autoScroll.addEventListener("click", function () {
      autoScroll = !autoScroll;
      els.autoScroll.setAttribute("aria-pressed", String(autoScroll));
      els.autoScroll.style.opacity = autoScroll ? "1" : "0.5";
      showToast("Auto-scroll " + (autoScroll ? "on" : "off"), autoScroll ? "⬇️" : "⏸️");
    });
  }

  if (els.fullscreen) {
    els.fullscreen.addEventListener("click", function () {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen();
      } else if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    });
  }

  if (els.joinForm) {
    els.joinForm.addEventListener("submit", function (e) {
      e.preventDefault();
      joinClass(els.joinName ? els.joinName.value : "");
    });
  }

  if (els.drawerForm) {
    els.drawerForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var name = els.drawerName ? els.drawerName.value : "";
      if (els.joinName) els.joinName.value = name;
      joinClass(name);
    });
  }

  if (els.mobileJoinBtn) els.mobileJoinBtn.addEventListener("click", openDrawer);
  if (els.drawerClose)   els.drawerClose.addEventListener("click", closeDrawer);
  if (els.drawerBackdrop) els.drawerBackdrop.addEventListener("click", closeDrawer);

  if (els.copyInvite) els.copyInvite.addEventListener("click", copyInviteLink);

  /* ── Reactions ── */
  var currentReaction = "";
  document.querySelectorAll(".lc-reaction-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var emoji = btn.dataset.emoji || "";
      var isToggle = emoji === currentReaction;
      var next = isToggle ? "" : emoji;
      currentReaction = next;
      document.querySelectorAll(".lc-reaction-btn").forEach(function (b) {
        b.classList.toggle("is-active", b.dataset.emoji === next && next !== "");
      });
      var status = document.getElementById("reactionStatus");
      if (status) status.textContent = next ? "Sent: " + next : "Tap to let the teacher know.";
      fetch(stateUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "react",
          text: next,
          name: getStoredName() || "Student",
          deviceId: getDeviceId()
        })
      }).catch(function () {});
    });
  });

  /* ── Q&A ── */
  var questionForm = document.getElementById("questionForm");
  if (questionForm) {
    questionForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var input  = document.getElementById("questionInput");
      var status = document.getElementById("questionStatus");
      var q = (input ? input.value : "").trim();
      if (!q) return;
      if (status) status.textContent = "Sending…";
      fetch(stateUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "question",
          text: q,
          name: getStoredName() || "Student",
          deviceId: getDeviceId()
        })
      }).then(function () {
        if (input)  input.value = "";
        if (status) status.textContent = "Question sent! Teacher will answer live.";
        showToast("Question sent to teacher", "❓");
      }).catch(function () {
        if (status) status.textContent = "Failed to send. Try again.";
      });
    });
  }

  document.addEventListener("keydown", function (e) {
    if (/input|textarea|select/i.test((e.target || {}).tagName || "")) return;
    if (e.key === "t") setTheme(document.body.dataset.boardTheme === "light" ? "dark" : "light", true);
    if (e.key === "a" && els.autoScroll) els.autoScroll.click();
    if (e.key === "f" && els.fullscreen) els.fullscreen.click();
    if (e.key === "j") {
      if (els.joinName) els.joinName.focus();
      else openDrawer();
    }
    if (e.key === "Escape") closeDrawer();
  });

  /* ── Push Subscription ── */
  async function subscribePush() {
    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
      var reg = await navigator.serviceWorker.ready;
      var keyRes = await fetch("/api/push");
      var keyData = await keyRes.json();
      if (!keyData.publicKey) return;
      var sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: keyData.publicKey
      });
      var json = sub.toJSON();
      await fetch("/api/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "subscribe", endpoint: json.endpoint, keys: json.keys, deviceId: getDeviceId() })
      });
    } catch (e) {}
  }

  /* ── Init ── */
  setTheme(document.body.dataset.boardTheme || "dark");
  var savedName = getStoredName();
  if (els.joinName && savedName) els.joinName.value = savedName;
  if (els.drawerName && savedName) els.drawerName.value = savedName;
  if (savedName) { scheduleJoinRetry(savedName); }
  connectWebSocket();
  subscribePush();
  load();
  if (savedName) joinClass(savedName, true);
  /* Poll as fallback — less frequent when WS is alive */
  setInterval(function () { if (!_wsConnected) load(); }, 1500);
  setInterval(load, 8000); /* periodic sync regardless, catches WS drift */

}());
