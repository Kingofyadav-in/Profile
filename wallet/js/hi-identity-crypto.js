"use strict";

/* ======================================================
   hi-identity-crypto.js
   Cryptographic HDI foundation for HI Wallet Phase 1A
   Depends on: hi-storage.js
====================================================== */

var HI_IDENTITY_KEY_ID = "primary";
var HI_IDENTITY_CRYPTO_VERSION = "hdi-ecdsa-p256-v1";
var HI_IDENTITY_KDF_ITERATIONS = 310000;
var HI_RECOVERY_PHRASE_WORDS = [
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
  "prairie","proton","quiver","ranger","ridge","season","stream","tangent","vector","verge","vision","window"
];
var _hiCryptoSessionPrivateKey = null;
var _hiCryptoSessionUnlockedAt = 0;

function hiCryptoBytesToBase64(bytes) {
  var str = "";
  bytes.forEach(function(byte) { str += String.fromCharCode(byte); });
  return btoa(str);
}

function hiCryptoBase64ToBytes(base64) {
  var str = atob(base64);
  var bytes = new Uint8Array(str.length);
  for (var i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i);
  return bytes;
}

async function hiCryptoSha256Hex(bytes) {
  var buf = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(buf)).map(function(b) {
    return b.toString(16).padStart(2, "0");
  }).join("");
}

function hiCryptoRandomBytes(length) {
  var bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

function hiCryptoInitials(name) {
  return String(name || "HI")
    .split(/\s+/)
    .map(function(part) { return part.charAt(0) || ""; })
    .join("")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 3) || "HDI";
}

async function hiCryptoPublicKeyToHDI(publicKeySpki, name) {
  var hex = await hiCryptoSha256Hex(publicKeySpki);
  return hiCryptoInitials(name) + "-" + new Date().getFullYear() + "-K" + hex.slice(0, 10).toUpperCase();
}

async function hiCryptoCreateIdentityKey(name) {
  if (!window.crypto || !crypto.subtle || !window.TextEncoder) {
    throw new Error("Web Crypto is required for cryptographic HDI.");
  }

  var pair = await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign", "verify"]
  );
  var privatePkcs8 = new Uint8Array(await crypto.subtle.exportKey("pkcs8", pair.privateKey));
  var publicSpki = new Uint8Array(await crypto.subtle.exportKey("spki", pair.publicKey));
  var hdi = await hiCryptoPublicKeyToHDI(publicSpki, name);
  var now = Date.now();
  var record = {
    id: HI_IDENTITY_KEY_ID,
    type: "identity-key",
    version: HI_IDENTITY_CRYPTO_VERSION,
    algorithm: "ECDSA-P256-SHA256",
    extractable: true,
    protection: "unprotected-local",
    localPrototypeNotice: "Private key is ready for first-run setup. Protect it with a wallet passphrase from HI Wallet.",
    hdi: hdi,
    publicKeySpki: hiCryptoBytesToBase64(publicSpki),
    privateKeyPkcs8: hiCryptoBytesToBase64(privatePkcs8),
    recoveryPhraseHash: "",
    recoveryPhraseCreatedAt: 0,
    createdAt: now,
    updatedAt: now
  };
  await hiPut("identityKeys", record);
  return record;
}

async function hiCryptoLoadIdentityKey() {
  try { return await hiGet("identityKeys", HI_IDENTITY_KEY_ID); }
  catch (e) { return null; }
}

async function hiCryptoEnsureIdentityKey(identity) {
  var existing = await hiCryptoLoadIdentityKey();
  if (existing && existing.hdi && existing.publicKeySpki && (existing.privateKeyPkcs8 || existing.encryptedPrivateKey)) {
    return existing;
  }
  return await hiCryptoCreateIdentityKey(identity && identity.name ? identity.name : "HI Identity");
}

function hiCryptoIsKeyProtected(record) {
  return !!(record && record.encryptedPrivateKey && record.privateKeySalt && record.privateKeyIv);
}

function hiCryptoIsUnlocked() {
  return !!_hiCryptoSessionPrivateKey;
}

function hiCryptoNormalizePhrase(phrase) {
  return String(phrase || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/[-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function hiCryptoPhraseHash(phrase) {
  var clean = hiCryptoNormalizePhrase(phrase);
  var data = new TextEncoder().encode(clean);
  if (window.crypto && crypto.subtle) {
    try {
      var buf = await crypto.subtle.digest("SHA-256", data);
      return Array.from(new Uint8Array(buf)).map(function(b) {
        return b.toString(16).padStart(2, "0");
      }).join("");
    } catch (e) {}
  }
  return clean;
}

function hiCryptoGenerateRecoveryPhrase(wordCount) {
  var count = Math.max(12, parseInt(wordCount, 10) || 12);
  var bytes = hiCryptoRandomBytes(count);
  var words = [];
  for (var i = 0; i < count; i++) {
    words.push(HI_RECOVERY_PHRASE_WORDS[bytes[i] % HI_RECOVERY_PHRASE_WORDS.length]);
  }
  return words.join(" ");
}

async function hiCryptoRegisterRecoveryPhrase(phrase) {
  var record = await hiCryptoLoadIdentityKey();
  if (!record) throw new Error("Identity key is missing.");
  var clean = hiCryptoNormalizePhrase(phrase);
  if (clean.split(" ").length < 12) throw new Error("Use at least 12 recovery words.");
  record.recoveryPhraseHash = await hiCryptoPhraseHash(clean);
  record.recoveryPhraseCreatedAt = Date.now();
  record.updatedAt = Date.now();
  await hiPut("identityKeys", record);
  return {
    phrase: clean,
    hash: record.recoveryPhraseHash,
    createdAt: record.recoveryPhraseCreatedAt
  };
}

async function hiCryptoRecoveryStatus() {
  var record = await hiCryptoLoadIdentityKey();
  return {
    registered: !!(record && record.recoveryPhraseHash),
    createdAt: record && record.recoveryPhraseCreatedAt ? record.recoveryPhraseCreatedAt : 0
  };
}

async function hiCryptoDeriveWrappingKey(passphrase, saltBytes) {
  if (!passphrase || String(passphrase).length < 8) {
    throw new Error("Use a passphrase with at least 8 characters.");
  }
  var material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(String(passphrase)),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: saltBytes, iterations: HI_IDENTITY_KDF_ITERATIONS, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function hiCryptoEncryptPrivateKey(privatePkcs8Base64, passphrase) {
  var salt = hiCryptoRandomBytes(16);
  var iv = hiCryptoRandomBytes(12);
  var key = await hiCryptoDeriveWrappingKey(passphrase, salt);
  var encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv },
    key,
    hiCryptoBase64ToBytes(privatePkcs8Base64)
  );
  return {
    kdf: "PBKDF2-SHA256",
    iterations: HI_IDENTITY_KDF_ITERATIONS,
    cipher: "AES-256-GCM",
    privateKeySalt: hiCryptoBytesToBase64(salt),
    privateKeyIv: hiCryptoBytesToBase64(iv),
    encryptedPrivateKey: hiCryptoBytesToBase64(new Uint8Array(encrypted))
  };
}

async function hiCryptoDecryptPrivateKey(record, passphrase) {
  if (!hiCryptoIsKeyProtected(record)) {
    if (!record || !record.privateKeyPkcs8) throw new Error("Identity private key is missing.");
    return record.privateKeyPkcs8;
  }
  var salt = hiCryptoBase64ToBytes(record.privateKeySalt);
  var iv = hiCryptoBase64ToBytes(record.privateKeyIv);
  var key = await hiCryptoDeriveWrappingKey(passphrase, salt);
  var decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv },
    key,
    hiCryptoBase64ToBytes(record.encryptedPrivateKey)
  );
  return hiCryptoBytesToBase64(new Uint8Array(decrypted));
}

async function hiCryptoProtectIdentityKey(passphrase) {
  var record = await hiCryptoLoadIdentityKey();
  if (!record || (!record.privateKeyPkcs8 && !record.encryptedPrivateKey)) {
    throw new Error("Create HDI identity first.");
  }
  if (hiCryptoIsKeyProtected(record) && !record.privateKeyPkcs8) {
    await hiCryptoUnlockIdentityKey(passphrase);
    return record;
  }
  var encrypted = await hiCryptoEncryptPrivateKey(record.privateKeyPkcs8, passphrase);
  var privateKey = await hiCryptoImportPrivateKey({ privateKeyPkcs8: record.privateKeyPkcs8 });
  var updated = Object.assign({}, record, encrypted, {
    privateKeyPkcs8: "",
    protection: "passphrase-encrypted",
    protectedAt: Date.now(),
    updatedAt: Date.now()
  });
  await hiPut("identityKeys", updated);
  _hiCryptoSessionPrivateKey = privateKey;
  _hiCryptoSessionUnlockedAt = Date.now();
  return updated;
}

async function hiCryptoUnlockIdentityKey(passphrase) {
  var record = await hiCryptoLoadIdentityKey();
  if (!record) throw new Error("Identity key is missing.");
  var privatePkcs8 = await hiCryptoDecryptPrivateKey(record, passphrase);
  _hiCryptoSessionPrivateKey = await hiCryptoImportPrivateKey({ privateKeyPkcs8: privatePkcs8 });
  _hiCryptoSessionUnlockedAt = Date.now();
  return {
    hdi: record.hdi,
    protected: hiCryptoIsKeyProtected(record),
    unlockedAt: _hiCryptoSessionUnlockedAt
  };
}

function hiCryptoLockIdentityKey() {
  _hiCryptoSessionPrivateKey = null;
  _hiCryptoSessionUnlockedAt = 0;
}

async function hiCryptoSecurityStatus() {
  var record = await hiCryptoLoadIdentityKey();
  return {
    exists: !!record,
    hdi: record && record.hdi ? record.hdi : "",
    protected: hiCryptoIsKeyProtected(record),
    unlocked: hiCryptoIsUnlocked(),
    unlockedAt: _hiCryptoSessionUnlockedAt,
    protection: record && record.protection ? record.protection : "missing",
    recoveryRegistered: !!(record && record.recoveryPhraseHash)
  };
}

async function hiCryptoImportPrivateKey(record) {
  return await crypto.subtle.importKey(
    "pkcs8",
    hiCryptoBase64ToBytes(record.privateKeyPkcs8),
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );
}

async function hiCryptoImportPublicKey(record) {
  return await crypto.subtle.importKey(
    "spki",
    hiCryptoBase64ToBytes(record.publicKeySpki),
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["verify"]
  );
}

async function hiCryptoSignPayload(payload) {
  var record = await hiCryptoLoadIdentityKey();
  if (!record) throw new Error("Identity key is missing.");
  var privateKey = _hiCryptoSessionPrivateKey;
  if (!privateKey && record.privateKeyPkcs8) {
    privateKey = await hiCryptoImportPrivateKey(record);
  }
  if (!privateKey) throw new Error("Unlock identity key before signing.");
  var canonical = JSON.stringify(payload || {});
  var signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    privateKey,
    new TextEncoder().encode(canonical)
  );
  return {
    algorithm: record.algorithm,
    keyVersion: record.version,
    hdi: record.hdi,
    publicKeySpki: record.publicKeySpki,
    payload: payload,
    signature: hiCryptoBytesToBase64(new Uint8Array(signature)),
    signedAt: new Date().toISOString()
  };
}

async function hiCryptoVerifyProof(proof) {
  if (!proof || !proof.publicKeySpki || !proof.signature || !proof.payload) return false;
  var publicKey = await hiCryptoImportPublicKey(proof);
  return await crypto.subtle.verify(
    { name: "ECDSA", hash: "SHA-256" },
    publicKey,
    hiCryptoBase64ToBytes(proof.signature),
    new TextEncoder().encode(JSON.stringify(proof.payload))
  );
}
