"use strict";

/* ======================================================
   hi-identity-crypto.js
   Cryptographic HDI foundation for HI Wallet Phase 1A
   Depends on: hi-storage.js
====================================================== */

const HI_IDENTITY_KEY_ID          = "primary";
const HI_IDENTITY_CRYPTO_VERSION  = "hdi-ecdsa-p256-v1";
const HI_IDENTITY_KDF_ITERATIONS  = 310_000;

const HI_RECOVERY_PHRASE_WORDS = [
  "amber","anchor","atlas","beacon","birch","blaze","bloom","brisk","canyon","canvas","cedar","cinder",
  "citizen","clever","coast","comet","coral","crest","crown","dawn","delta","distant","drift","eagle",
  "ember","engine","ever","field","frost","future","globe","gold","grace","harbor","harmony","health",
  "honest","horizon","human","icon","indigo","inspire","jasmine","journey","kernel","kind","lattice","ledger",
  "liberty","logic","lumen","matrix","meridian","motive","native","nectar","oasis","orbit","origin","pearl",
  "phoenix","pixel","plaza","prism","pulse","quartz","quest","quiet","radar","river","rocket","saffron",
  "sage","signal","silver","skyline","solace","spark","spirit","spring","stable","stone","summit","sunrise",
  "swift","terra","thrive","timber","token","trail","unison","unity","uplink","vivid","voyage","woven",
  "zenith","zest","cipher","circle","domain","echo","emberline","fabric","fable","fusion","glimmer","gravity",
  "harvest","helix","impact","jewel","keeper","kinetic","linear","moment","north","opal","oracle","pioneer",
  "prairie","proton","quiver","ranger","ridge","season","stream","tangent","vector","verge","vision","window",
];

let _hiCryptoSessionPrivateKey = null;
let _hiCryptoSessionUnlockedAt = 0;

/* ── Encoding helpers ── */

function hiCryptoBytesToBase64(bytes) {
  let str = "";
  bytes.forEach(byte => { str += String.fromCharCode(byte); });
  return btoa(str);
}

function hiCryptoBase64ToBytes(base64) {
  const str   = atob(base64);
  const bytes = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i);
  return bytes;
}

async function hiCryptoSha256Hex(bytes) {
  const buf = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function hiCryptoRandomBytes(length) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

function hiCryptoInitials(name) {
  return String(name ?? "HI")
    .split(/\s+/)
    .map(part => part.charAt(0) ?? "")
    .join("")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 3) || "HDI";
}

async function hiCryptoPublicKeyToHDI(publicKeySpki, name) {
  const hex = await hiCryptoSha256Hex(publicKeySpki);
  return `${hiCryptoInitials(name)}-${new Date().getFullYear()}-K${hex.slice(0, 10).toUpperCase()}`;
}

/* ── Key creation / loading ── */

async function hiCryptoCreateIdentityKey(name) {
  if (!window.crypto?.subtle || !window.TextEncoder) {
    throw new Error("Web Crypto is required for cryptographic HDI.");
  }
  const pair        = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const privatePkcs8 = new Uint8Array(await crypto.subtle.exportKey("pkcs8", pair.privateKey));
  const publicSpki   = new Uint8Array(await crypto.subtle.exportKey("spki",  pair.publicKey));
  const hdi          = await hiCryptoPublicKeyToHDI(publicSpki, name);
  const now          = Date.now();
  const record = {
    id:                       HI_IDENTITY_KEY_ID,
    type:                     "identity-key",
    version:                  HI_IDENTITY_CRYPTO_VERSION,
    algorithm:                "ECDSA-P256-SHA256",
    extractable:              true,
    protection:               "unprotected-local",
    localPrototypeNotice:     "Private key is ready for first-run setup. Protect it with a wallet passphrase from HI Wallet.",
    hdi,
    publicKeySpki:            hiCryptoBytesToBase64(publicSpki),
    privateKeyPkcs8:          hiCryptoBytesToBase64(privatePkcs8),
    recoveryPhraseHash:       "",
    recoveryPhraseCreatedAt:  0,
    createdAt:                now,
    updatedAt:                now,
  };
  await hiPut("identityKeys", record);
  return record;
}

async function hiCryptoLoadIdentityKey() {
  try { return await hiGet("identityKeys", HI_IDENTITY_KEY_ID); }
  catch { return null; }
}

async function hiCryptoEnsureIdentityKey(identity) {
  const existing = await hiCryptoLoadIdentityKey();
  if (existing?.hdi && existing.publicKeySpki && (existing.privateKeyPkcs8 || existing.encryptedPrivateKey)) {
    return existing;
  }
  return hiCryptoCreateIdentityKey(identity?.name ?? "HI Identity");
}

/* ── Key protection status ── */

const hiCryptoIsKeyProtected = record => !!(record?.encryptedPrivateKey && record.privateKeySalt && record.privateKeyIv);
const hiCryptoIsUnlocked     = ()     => !!_hiCryptoSessionPrivateKey;

/* ── Recovery phrase ── */

function hiCryptoNormalizePhrase(phrase) {
  return String(phrase ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/[-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function hiCryptoPhraseHash(phrase) {
  const clean = hiCryptoNormalizePhrase(phrase);
  const data  = new TextEncoder().encode(clean);
  if (window.crypto?.subtle) {
    try {
      const buf = await crypto.subtle.digest("SHA-256", data);
      return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
    } catch { /* fallback below */ }
  }
  return clean;
}

function hiCryptoGenerateRecoveryPhrase(wordCount) {
  const count = Math.max(12, parseInt(wordCount, 10) || 12);
  const bytes = hiCryptoRandomBytes(count);
  const words = [];
  for (let i = 0; i < count; i++) {
    words.push(HI_RECOVERY_PHRASE_WORDS[bytes[i] % HI_RECOVERY_PHRASE_WORDS.length]);
  }
  return words.join(" ");
}

async function hiCryptoRegisterRecoveryPhrase(phrase) {
  const record = await hiCryptoLoadIdentityKey();
  if (!record) throw new Error("Identity key is missing.");
  const clean = hiCryptoNormalizePhrase(phrase);
  if (clean.split(" ").length < 12) throw new Error("Use at least 12 recovery words.");
  record.recoveryPhraseHash      = await hiCryptoPhraseHash(clean);
  record.recoveryPhraseCreatedAt = Date.now();
  record.updatedAt               = Date.now();
  await hiPut("identityKeys", record);
  return { phrase: clean, hash: record.recoveryPhraseHash, createdAt: record.recoveryPhraseCreatedAt };
}

async function hiCryptoRecoveryStatus() {
  const record = await hiCryptoLoadIdentityKey();
  return { registered: !!(record?.recoveryPhraseHash), createdAt: record?.recoveryPhraseCreatedAt ?? 0 };
}

/* ── Wrapping key (PBKDF2) ── */

async function hiCryptoDeriveWrappingKey(passphrase, saltBytes) {
  if (!passphrase || String(passphrase).length < 8) {
    throw new Error("Use a passphrase with at least 8 characters.");
  }
  const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(String(passphrase)), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: saltBytes, iterations: HI_IDENTITY_KDF_ITERATIONS, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

/* ── Encrypt / decrypt private key ── */

async function hiCryptoEncryptPrivateKey(privatePkcs8Base64, passphrase) {
  const salt      = hiCryptoRandomBytes(16);
  const iv        = hiCryptoRandomBytes(12);
  const key       = await hiCryptoDeriveWrappingKey(passphrase, salt);
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, hiCryptoBase64ToBytes(privatePkcs8Base64));
  return {
    kdf:                 "PBKDF2-SHA256",
    iterations:          HI_IDENTITY_KDF_ITERATIONS,
    cipher:              "AES-256-GCM",
    privateKeySalt:      hiCryptoBytesToBase64(salt),
    privateKeyIv:        hiCryptoBytesToBase64(iv),
    encryptedPrivateKey: hiCryptoBytesToBase64(new Uint8Array(encrypted)),
  };
}

async function hiCryptoDecryptPrivateKey(record, passphrase) {
  if (!hiCryptoIsKeyProtected(record)) {
    if (!record?.privateKeyPkcs8) throw new Error("Identity private key is missing.");
    return record.privateKeyPkcs8;
  }
  const salt      = hiCryptoBase64ToBytes(record.privateKeySalt);
  const iv        = hiCryptoBase64ToBytes(record.privateKeyIv);
  const key       = await hiCryptoDeriveWrappingKey(passphrase, salt);
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, hiCryptoBase64ToBytes(record.encryptedPrivateKey));
  return hiCryptoBytesToBase64(new Uint8Array(decrypted));
}

/* ── Protect / unlock / lock ── */

async function hiCryptoProtectIdentityKey(passphrase) {
  const record = await hiCryptoLoadIdentityKey();
  if (!record || (!record.privateKeyPkcs8 && !record.encryptedPrivateKey)) throw new Error("Create HDI identity first.");
  if (hiCryptoIsKeyProtected(record) && !record.privateKeyPkcs8) {
    await hiCryptoUnlockIdentityKey(passphrase);
    return record;
  }
  const encrypted  = await hiCryptoEncryptPrivateKey(record.privateKeyPkcs8, passphrase);
  const privateKey = await hiCryptoImportPrivateKey({ privateKeyPkcs8: record.privateKeyPkcs8 });
  const updated    = Object.assign({}, record, encrypted, { privateKeyPkcs8: "", protection: "passphrase-encrypted", protectedAt: Date.now(), updatedAt: Date.now() });
  await hiPut("identityKeys", updated);
  _hiCryptoSessionPrivateKey = privateKey;
  _hiCryptoSessionUnlockedAt = Date.now();
  return updated;
}

async function hiCryptoUnlockIdentityKey(passphrase) {
  const record      = await hiCryptoLoadIdentityKey();
  if (!record) throw new Error("Identity key is missing.");
  const privatePkcs8 = await hiCryptoDecryptPrivateKey(record, passphrase);
  _hiCryptoSessionPrivateKey = await hiCryptoImportPrivateKey({ privateKeyPkcs8: privatePkcs8 });
  _hiCryptoSessionUnlockedAt = Date.now();
  return { hdi: record.hdi, protected: hiCryptoIsKeyProtected(record), unlockedAt: _hiCryptoSessionUnlockedAt };
}

function hiCryptoLockIdentityKey() {
  _hiCryptoSessionPrivateKey = null;
  _hiCryptoSessionUnlockedAt = 0;
}

async function hiCryptoSecurityStatus() {
  const record = await hiCryptoLoadIdentityKey();
  return {
    exists:              !!record,
    hdi:                 record?.hdi                  ?? "",
    protected:           hiCryptoIsKeyProtected(record),
    unlocked:            hiCryptoIsUnlocked(),
    unlockedAt:          _hiCryptoSessionUnlockedAt,
    protection:          record?.protection            ?? "missing",
    recoveryRegistered:  !!(record?.recoveryPhraseHash),
  };
}

/* ── Import key helpers ── */

function hiCryptoImportPrivateKey(record) {
  return crypto.subtle.importKey("pkcs8", hiCryptoBase64ToBytes(record.privateKeyPkcs8), { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
}

function hiCryptoImportPublicKey(record) {
  return crypto.subtle.importKey("spki", hiCryptoBase64ToBytes(record.publicKeySpki), { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]);
}

/* ── Sign / verify ── */

async function hiCryptoSignPayload(payload) {
  const record = await hiCryptoLoadIdentityKey();
  if (!record) throw new Error("Identity key is missing.");
  let privateKey = _hiCryptoSessionPrivateKey;
  if (!privateKey && record.privateKeyPkcs8) privateKey = await hiCryptoImportPrivateKey(record);
  if (!privateKey) throw new Error("Unlock identity key before signing.");
  const canonical = JSON.stringify(payload ?? {});
  const signature = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, privateKey, new TextEncoder().encode(canonical));
  return {
    algorithm:     record.algorithm,
    keyVersion:    record.version,
    hdi:           record.hdi,
    publicKeySpki: record.publicKeySpki,
    payload,
    signature:     hiCryptoBytesToBase64(new Uint8Array(signature)),
    signedAt:      new Date().toISOString(),
  };
}

async function hiCryptoVerifyProof(proof) {
  if (!proof?.publicKeySpki || !proof.signature || !proof.payload) return false;
  const publicKey = await hiCryptoImportPublicKey(proof);
  return crypto.subtle.verify(
    { name: "ECDSA", hash: "SHA-256" },
    publicKey,
    hiCryptoBase64ToBytes(proof.signature),
    new TextEncoder().encode(JSON.stringify(proof.payload)),
  );
}
