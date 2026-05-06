#!/usr/bin/env node
"use strict";

const endpoint = process.env.LIVE_CLASS_ENDPOINT || "http://127.0.0.1:8787/api/live-class";
const endpointUrl = new URL(endpoint, "http://127.0.0.1");
const token = process.env.LIVE_CLASS_TOKEN || (
  /^(127\.0\.0\.1|localhost)$/.test(endpointUrl.hostname)
    ? ""
    : (process.env.JARVIS_API_KEY || "")
);
const args = process.argv.slice(2);

function usage() {
  console.log(`Live Class Board

Usage:
  LIVE_CLASS_TOKEN=secret LIVE_CLASS_ENDPOINT=https://your-site.com/api/live-class node tools/board.js title "Future of Computers"
  JARVIS_API_KEY=secret LIVE_CLASS_ENDPOINT=https://your-site.com/api/live-class node tools/board.js title "Future of Computers"
  node tools/board.js write "Computers help people by reducing repetitive work."
  node tools/board.js heading "Today's Topic"
  node tools/board.js code js "console.log('Hello world')"
  node tools/board.js list "1. Learn\\n2. Practice\\n3. Build"
  node tools/board.js quote "Technology should serve people."
  node tools/board.js homework "Practice typing for 10 minutes."
  node tools/board.js link "Open Google" "https://google.com"
  node tools/board.js image "Computer lab" "https://example.com/image.jpg"
  node tools/board.js focus 2
  node tools/board.js undo
  node tools/board.js theme dark
  node tools/board.js teacher "Amit Ku Yadav"
  node tools/board.js room "Future Computer Class"
  node tools/board.js status "Class is live"
  node tools/board.js clear
  node tools/board.js reset
`);
}

function bodyFromArgs() {
  const action = String(args[0] || "").toLowerCase();
  if (!action || action === "help" || action === "--help") return null;

  if (action === "code") {
    return {
      action,
      language: args[1] || "text",
      value: args.slice(2).join(" ")
    };
  }

  if (action === "link" || action === "image") {
    return {
      action,
      label: args[1] || "",
      caption: args[1] || "",
      url: args[2] || args[1] || "",
      value: args[1] || args[2] || ""
    };
  }

  return {
    action,
    value: args.slice(1).join(" ")
  };
}

async function main() {
  const payload = bodyFromArgs();
  if (!payload) {
    usage();
    return;
  }

  if (!token) {
    console.error("Missing LIVE_CLASS_TOKEN or JARVIS_API_KEY.");
    process.exit(1);
  }

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error(data.error || `Request failed with ${res.status}`);
    process.exit(1);
  }

  console.log(`OK revision ${data.revision}: ${payload.action}`);
}

main().catch(err => {
  console.error(err && err.message ? err.message : err);
  process.exit(1);
});
