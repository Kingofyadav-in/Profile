"use strict";

/* ============================================================
   hi-watermark.js — Content Protection Engine
   Phase A-D: pHash, LSB watermark embed/detect
   ============================================================ */

const HiWatermark = (() => {

  const MARKER      = "HI-WM:";
  const PHASH_SIZE  = 8;   // 8x8 = 64-bit hash

  // ── internal helpers ─────────────────────────────────────────

  function _textToBits(text) {
    let bits = "";
    for (let i = 0; i < text.length; i++)
      bits += text.charCodeAt(i).toString(2).padStart(8, "0");
    return bits;
  }

  function _bitsToText(bits) {
    let text = "";
    for (let i = 0; i + 8 <= bits.length; i += 8) {
      const code = parseInt(bits.slice(i, i + 8), 2);
      if (code === 0) break;
      text += String.fromCharCode(code);
    }
    return text;
  }

  function _loadImg(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload  = () => { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Cannot load image")); };
      img.src = url;
    });
  }

  function _videoFirstFrame(file) {
    return new Promise((resolve, reject) => {
      const video = document.createElement("video");
      const url   = URL.createObjectURL(file);
      video.muted  = true;
      video.preload = "metadata";
      video.src    = url;
      video.addEventListener("loadeddata", () => { video.currentTime = 0.5; });
      video.addEventListener("seeked", () => {
        const c = document.createElement("canvas");
        c.width  = video.videoWidth  || 320;
        c.height = video.videoHeight || 240;
        c.getContext("2d").drawImage(video, 0, 0);
        URL.revokeObjectURL(url);
        video.src = "";
        resolve(c);
      });
      video.addEventListener("error", () => {
        URL.revokeObjectURL(url);
        reject(new Error("Cannot load video frame"));
      });
    });
  }

  function _hashFrom8x8Canvas(canvas) {
    const ctx  = canvas.getContext("2d");
    const data = ctx.getImageData(0, 0, PHASH_SIZE, PHASH_SIZE).data;
    const gray = new Float32Array(PHASH_SIZE * PHASH_SIZE);
    for (let i = 0; i < gray.length; i++)
      gray[i] = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
    const mean = gray.reduce((a, b) => a + b, 0) / gray.length;
    let hash = "";
    for (let i = 0; i < gray.length; i++) hash += gray[i] >= mean ? "1" : "0";
    return hash;
  }

  // ── public API ───────────────────────────────────────────────

  /**
   * Compute 64-bit perceptual hash of an image or video file.
   * Returns a 64-char binary string e.g. "1100101001..."
   */
  async function computePHash(file) {
    let sourceCanvas;
    if (file.type.startsWith("video/")) {
      sourceCanvas = await _videoFirstFrame(file);
    } else {
      const img = await _loadImg(file);
      sourceCanvas = document.createElement("canvas");
      sourceCanvas.width  = img.naturalWidth  || img.width;
      sourceCanvas.height = img.naturalHeight || img.height;
      sourceCanvas.getContext("2d").drawImage(img, 0, 0);
    }
    const small = document.createElement("canvas");
    small.width = small.height = PHASH_SIZE;
    small.getContext("2d").drawImage(sourceCanvas, 0, 0, PHASH_SIZE, PHASH_SIZE);
    return _hashFrom8x8Canvas(small);
  }

  /**
   * Hamming distance between two hash strings (0 = identical, 64 = opposite).
   */
  function hammingDistance(a, b) {
    let d = 0;
    const len = Math.min(a.length, b.length);
    for (let i = 0; i < len; i++) if (a[i] !== b[i]) d++;
    return d;
  }

  /**
   * Convert Hamming distance to a confidence percentage (0–100).
   * Threshold of 10 bits = ~84% confidence floor.
   */
  function distanceToConfidence(dist) {
    return Math.max(0, Math.round((1 - dist / 64) * 100));
  }

  /**
   * Embed licenseId as an invisible LSB watermark into an image file.
   * Returns { blob: Blob, method: "lsb"|"none", licenseId }
   * PNG output preserves the watermark. JPEG re-encoding destroys LSB.
   */
  async function embedWatermark(file, licenseId) {
    if (!file.type.startsWith("image/")) {
      return { blob: file, method: "none", licenseId };
    }
    const img = await _loadImg(file);
    const canvas = document.createElement("canvas");
    canvas.width  = img.naturalWidth  || img.width;
    canvas.height = img.naturalHeight || img.height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const payload   = MARKER + licenseId + "\0";
    const bits      = _textToBits(payload);

    if (bits.length > imageData.data.length / 4) {
      throw new Error(`Image too small — need at least ${bits.length} pixels`);
    }
    // Embed in blue channel LSB (blue is least perceptible to human eye)
    for (let i = 0; i < bits.length; i++) {
      const idx = i * 4 + 2;
      imageData.data[idx] = (imageData.data[idx] & 0xFE) | parseInt(bits[i]);
    }
    ctx.putImageData(imageData, 0, 0);

    const blob = await new Promise(res => canvas.toBlob(res, "image/png"));
    return { blob, method: "lsb", licenseId };
  }

  /**
   * Try to extract a watermark from an image file.
   * Returns the embedded licenseId string, or null if none found.
   */
  async function detectWatermark(file) {
    if (!file.type.startsWith("image/")) return null;
    const img = await _loadImg(file);
    const canvas = document.createElement("canvas");
    canvas.width  = img.naturalWidth  || img.width;
    canvas.height = img.naturalHeight || img.height;
    canvas.getContext("2d").drawImage(img, 0, 0);

    const data     = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
    const readBits = Math.min((MARKER.length + 64) * 8, Math.floor(data.length / 4));
    let bits = "";
    for (let i = 0; i < readBits; i++) bits += (data[i * 4 + 2] & 1).toString();

    const extracted = _bitsToText(bits);
    if (extracted.startsWith(MARKER)) return extracted.slice(MARKER.length);
    return null;
  }

  return { computePHash, hammingDistance, distanceToConfidence, embedWatermark, detectWatermark };
})();

if (typeof module !== "undefined") module.exports = HiWatermark;
