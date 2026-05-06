#!/usr/bin/env node
"use strict";

const fs = require("fs");
const http = require("http");
const path = require("path");
const liveClassHandler = require("../api/live-class");

const root = path.resolve(__dirname, "..");
const port = Number(process.env.PORT || 8787);

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webmanifest": "application/manifest+json"
};

function serveStatic(req, res) {
  const url = new URL(req.url, "http://127.0.0.1");
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === "/") pathname = "/index.html";

  const filePath = path.normalize(path.join(root, pathname));
  if (!filePath.startsWith(root)) {
    res.statusCode = 403;
    res.end("Forbidden");
    return;
  }

  fs.stat(filePath, (statErr, stat) => {
    if (statErr || !stat.isFile()) {
      res.statusCode = 404;
      res.end("Not found");
      return;
    }

    res.setHeader("Content-Type", types[path.extname(filePath).toLowerCase()] || "application/octet-stream");
    res.setHeader("Cache-Control", "no-store");
    fs.createReadStream(filePath).pipe(res);
  });
}

const server = http.createServer((req, res) => {
  if (req.url.startsWith("/api/live-class")) {
    liveClassHandler(req, res);
    return;
  }
  serveStatic(req, res);
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Live class server: http://127.0.0.1:${port}/pages/live-class.html`);
  console.log(`API endpoint:       http://127.0.0.1:${port}/api/live-class`);
  if (!process.env.LIVE_CLASS_TOKEN) {
    console.log("Set LIVE_CLASS_TOKEN before sending teacher commands.");
  }
});
