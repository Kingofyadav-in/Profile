/**
 * rupeecoin.js — RupeeCoin client library v3 (decentralized).
 * Key-based auth: ECDSA secp256k1, client-side signing, no PIN.
 * Requires @noble/secp256k1 loaded before this file.
 */
(function (global) {
  'use strict';

  var HOST        = (typeof window !== 'undefined' && window.RC_NODE_URL) || '';
  var STORAGE_KEY = 'rc_wallet_v3';
  var RC_VERSION  = 0x3C;

  // ── Base58Check ──────────────────────────────────────────────────────────────
  var B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

  function b58encode(bytes) {
    var n = BigInt('0x' + Array.from(bytes).map(function(b){return b.toString(16).padStart(2,'0')}).join(''));
    var s = '';
    while (n > 0n) {
      s = B58[Number(n % 58n)] + s;
      n = n / 58n;
    }
    for (var i = 0; i < bytes.length && bytes[i] === 0; i++) s = B58[0] + s;
    return s;
  }

  // ── SHA-256 helper (uses Web Crypto) ─────────────────────────────────────────
  function sha256(bytes) {
    // Synchronous fallback using SubtleCrypto wrapped in a workaround.
    // For address derivation we use a small sync implementation.
    return _sha256sync(bytes);
  }

  // Minimal sync SHA-256 (RFC 6234)
  var _K = (function(){
    var k=[];
    var primes=[2,3,5,7,11,13,17,19,23,29,31,37,41,43,47,53,59,61,67,71,73,79,83,89,97];
    for(var i=0;i<64;i++){
      var p=primes[i<8?i:Math.floor(i/4)];
      var x=i<8?Math.cbrt(p):Math.sqrt(p);
      k[i]=(((x-Math.floor(x))*0x100000000)>>>0);
    }
    // Precomputed correct constants
    return [0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,
            0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
            0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,
            0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
            0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,
            0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
            0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,
            0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
            0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,
            0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
            0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,
            0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
            0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,
            0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
            0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,
            0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
  }());

  function _sha256sync(data) {
    if (data instanceof Uint8Array === false) data = new Uint8Array(data);
    var len = data.length;
    var bitLen = len * 8;
    var padLen = ((len + 9) % 64 === 0) ? len + 9 : len + 9 + (64 - (len + 9) % 64);
    var buf = new Uint8Array(padLen);
    buf.set(data);
    buf[len] = 0x80;
    var dv = new DataView(buf.buffer);
    dv.setUint32(padLen - 4, bitLen & 0xFFFFFFFF, false);
    dv.setUint32(padLen - 8, Math.floor(bitLen / 0x100000000), false);

    var h0=0x6a09e667,h1=0xbb67ae85,h2=0x3c6ef372,h3=0xa54ff53a;
    var h4=0x510e527f,h5=0x9b05688c,h6=0x1f83d9ab,h7=0x5be0cd19;
    var w = new Uint32Array(64);

    for (var i = 0; i < padLen; i += 64) {
      for (var j = 0; j < 16; j++) w[j] = dv.getUint32(i + j * 4, false);
      for (j = 16; j < 64; j++) {
        var s0 = _ror(w[j-15],7)^_ror(w[j-15],18)^(w[j-15]>>>3);
        var s1 = _ror(w[j-2],17)^_ror(w[j-2],19)^(w[j-2]>>>10);
        w[j] = (w[j-16]+s0+w[j-7]+s1) >>> 0;
      }
      var a=h0,b=h1,c=h2,d=h3,e=h4,f=h5,g=h6,h=h7;
      for (j = 0; j < 64; j++) {
        var S1 = _ror(e,6)^_ror(e,11)^_ror(e,25);
        var ch = (e&f)^(~e&g);
        var tmp1 = (h+S1+ch+_K[j]+w[j]) >>> 0;
        var S0 = _ror(a,2)^_ror(a,13)^_ror(a,22);
        var maj = (a&b)^(a&c)^(b&c);
        var tmp2 = (S0+maj) >>> 0;
        h=g; g=f; f=e; e=(d+tmp1)>>>0;
        d=c; c=b; b=a; a=(tmp1+tmp2)>>>0;
      }
      h0=(h0+a)>>>0; h1=(h1+b)>>>0; h2=(h2+c)>>>0; h3=(h3+d)>>>0;
      h4=(h4+e)>>>0; h5=(h5+f)>>>0; h6=(h6+g)>>>0; h7=(h7+h)>>>0;
    }
    var out = new Uint8Array(32);
    var odv = new DataView(out.buffer);
    [h0,h1,h2,h3,h4,h5,h6,h7].forEach(function(v,i){odv.setUint32(i*4,v,false);});
    return out;
  }

  function _ror(n, r) { return ((n >>> r) | (n << (32 - r))) >>> 0; }

  // ── Address derivation ───────────────────────────────────────────────────────
  function pubkeyToAddress(pubkeyHex) {
    // pubkeyHex: 128-char uncompressed x+y
    var raw = hexToBytes(pubkeyHex);
    var x = raw.slice(0, 32), y = raw.slice(32, 64);
    var prefix = y[31] % 2 === 0 ? 0x02 : 0x03;
    var compressed = new Uint8Array(33);
    compressed[0] = prefix;
    compressed.set(x, 1);
    var h1 = sha256(compressed);
    var h2 = sha256(h1);
    var h160 = h2.slice(0, 20);
    var payload = new Uint8Array(21);
    payload[0] = RC_VERSION;
    payload.set(h160, 1);
    var chk = sha256(sha256(payload)).slice(0, 4);
    var full = new Uint8Array(25);
    full.set(payload); full.set(chk, 21);
    return b58encode(full);
  }

  // ── Hex helpers ──────────────────────────────────────────────────────────────
  function hexToBytes(hex) {
    var out = new Uint8Array(hex.length / 2);
    for (var i = 0; i < hex.length; i += 2)
      out[i / 2] = parseInt(hex.substr(i, 2), 16);
    return out;
  }

  function bytesToHex(bytes) {
    return Array.from(bytes).map(function(b){return b.toString(16).padStart(2,'0')}).join('');
  }

  // ── Session (key-based, no server auth) ──────────────────────────────────────
  function loadWallet() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || null; }
    catch (e) { return null; }
  }

  function saveWallet(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function clearWallet() {
    localStorage.removeItem(STORAGE_KEY);
  }

  // ── XHR helper ───────────────────────────────────────────────────────────────
  function request(method, url, body, cb) {
    var xhr = new XMLHttpRequest();
    xhr.open(method, url, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.onreadystatechange = function () {
      if (xhr.readyState !== 4) return;
      var result;
      try { result = JSON.parse(xhr.responseText); }
      catch (e) { result = { ok: false, error: 'Invalid server response' }; }
      if (!xhr.status || xhr.status < 100)
        result = { ok: false, error: 'Network error — is the node running?' };
      cb(result);
    };
    xhr.send(body ? JSON.stringify(body) : null);
  }

  // ── Transaction signing ──────────────────────────────────────────────────────
  function _signingPreimage(tx, inputIdx) {
    var data = {
      version:  tx.version,
      inputs:   tx.inputs.map(function(i){ return {txid: i.txid, vout: i.vout}; }),
      outputs:  tx.outputs.map(function(o){ return {address: o.address, amount: o.amount}; }),
      locktime: tx.locktime,
      sighash_input: inputIdx,
    };
    // sort_keys equivalent — sort object keys
    return JSON.stringify(_sortedObj(data));
  }

  function _sortedObj(obj) {
    if (Array.isArray(obj)) return obj.map(_sortedObj);
    if (obj === null || typeof obj !== 'object') return obj;
    var sorted = {};
    Object.keys(obj).sort().forEach(function(k){ sorted[k] = _sortedObj(obj[k]); });
    return sorted;
  }

  function _computeTxid(tx) {
    var data = {
      inputs:   tx.inputs.map(function(i){
        return {txid:i.txid,vout:i.vout,pubkey:i.pubkey,signature:i.signature};
      }),
      locktime: tx.locktime,
      outputs:  tx.outputs.map(function(o){ return {address:o.address,amount:o.amount}; }),
      version:  tx.version,
    };
    var raw = new TextEncoder().encode(JSON.stringify(_sortedObj(data)));
    var h1 = sha256(raw);
    var h2 = sha256(h1);
    return bytesToHex(h2);
  }

  // Sign a transaction using @noble/secp256k1 (must be loaded before this file)
  function signTransaction(tx, privateKeyHex, publicKeyHex, cb) {
    var secp = global.nobleSecp256k1 || (global.secp256k1);
    if (!secp) {
      cb(null, 'noble/secp256k1 not loaded');
      return;
    }
    var signed = JSON.parse(JSON.stringify(tx));  // deep clone
    var privBytes = hexToBytes(privateKeyHex);

    function signInput(idx) {
      if (idx >= signed.inputs.length) {
        signed.txid = _computeTxid(signed);
        cb(signed, null);
        return;
      }
      var preimage = _signingPreimage(signed, idx);
      var msgBytes = sha256(new TextEncoder().encode(preimage));
      // @noble/secp256k1 v1 API: secp256k1.sign(hash, privKey) — returns DER
      Promise.resolve().then(function() {
        // Try v2 API first, fall back to v1
        var p;
        if (secp.sign) {
          p = Promise.resolve(secp.sign(msgBytes, privBytes, {der: true}));
        } else {
          p = Promise.resolve(secp.signSync(msgBytes, privBytes, {der: true}));
        }
        return p;
      }).then(function(sigBytes) {
        signed.inputs[idx].pubkey    = publicKeyHex;
        signed.inputs[idx].signature = bytesToHex(sigBytes instanceof Uint8Array ? sigBytes : new Uint8Array(sigBytes));
        signInput(idx + 1);
      }).catch(function(e) { cb(null, String(e)); });
    }
    signInput(0);
  }

  // ── Public API ───────────────────────────────────────────────────────────────
  var RC = {
    HOST: HOST,

    // ── Key / wallet management ─────────────────────────────────────────────

    generateWallet: function (cb) {
      var secp = global.nobleSecp256k1 || global.secp256k1;
      if (secp && secp.utils && secp.utils.randomPrivateKey) {
        try {
          var privBytes      = secp.utils.randomPrivateKey();
          var privateKeyHex  = bytesToHex(privBytes);
          var pubPoint       = secp.getPublicKey(privBytes, false);
          var pubBytes       = pubPoint instanceof Uint8Array ? pubPoint : new Uint8Array(pubPoint);
          var publicKeyHex   = bytesToHex(pubBytes.slice(1));
          var address        = pubkeyToAddress(publicKeyHex);
          saveWallet({ privateKey: privateKeyHex, publicKey: publicKeyHex, address: address, balance_cache: 0 });
          cb({ ok: true, private_key: privateKeyHex, public_key: publicKeyHex, address: address });
        } catch (e) {
          cb({ ok: false, error: 'Key generation failed: ' + e.message });
        }
        return;
      }
      if (!HOST) { cb({ ok: false, error: 'RC node not configured. Set window.RC_NODE_URL.' }); return; }
      request('POST', HOST + '/api/wallet/new', {}, function (res) {
        if (res.ok) {
          saveWallet({ privateKey: res.private_key, publicKey: res.public_key,
                       address: res.address, balance_cache: 0 });
        }
        cb(res);
      });
    },

    importWallet: function (privateKeyHex, cb) {
      // Derive public key + address using @noble/secp256k1
      var secp = global.nobleSecp256k1 || global.secp256k1;
      if (!secp) { cb({ ok: false, error: 'noble/secp256k1 not loaded' }); return; }
      try {
        var privBytes = hexToBytes(privateKeyHex);
        // Get public key (uncompressed point, 64 bytes without 04 prefix)
        var pubPoint = secp.getPublicKey(privBytes, false);  // uncompressed 65 bytes
        var pubBytes = pubPoint instanceof Uint8Array ? pubPoint : new Uint8Array(pubPoint);
        // Strip 04 prefix to get raw 64-byte x+y
        var raw64 = pubBytes.slice(1);
        var publicKeyHex = bytesToHex(raw64);
        var address = pubkeyToAddress(publicKeyHex);
        saveWallet({ privateKey: privateKeyHex, publicKey: publicKeyHex,
                     address: address, balance_cache: 0 });
        cb({ ok: true, address: address, publicKey: publicKeyHex });
      } catch (e) {
        cb({ ok: false, error: 'Invalid private key: ' + e.message });
      }
    },

    logout: function () { clearWallet(); },
    isLoggedIn: function () { var w = loadWallet(); return !!(w && w.address); },
    getAddress: function () { var w = loadWallet(); return w ? w.address : null; },
    getPrivateKey: function () { var w = loadWallet(); return w ? w.privateKey : null; },
    getPublicKey: function () { var w = loadWallet(); return w ? w.publicKey : null; },
    getBalance: function () { var w = loadWallet(); return w ? (w.balance_cache || 0) : 0; },
    setBalance: function (n) {
      var w = loadWallet();
      if (w) { w.balance_cache = n; saveWallet(w); }
    },

    // ── Network queries ──────────────────────────────────────────────────────

    stats: function (cb) {
      request('GET', HOST + '/api/stats', null, cb);
    },

    balance: function (cb) {
      var addr = RC.getAddress();
      if (!addr) { cb({ ok: false, error: 'No wallet loaded' }); return; }
      request('GET', HOST + '/api/balance?address=' + addr, null, function (res) {
        if (res.ok) RC.setBalance(res.balance);
        cb(res);
      });
    },

    utxos: function (cb) {
      var addr = RC.getAddress();
      if (!addr) { cb({ ok: false, error: 'No wallet loaded' }); return; }
      request('GET', HOST + '/api/utxos?address=' + addr, null, cb);
    },

    history: function (cb) {
      var addr = RC.getAddress();
      if (!addr) { cb({ ok: false, error: 'No wallet loaded' }); return; }
      request('GET', HOST + '/api/history?address=' + addr, null, cb);
    },

    blocks: function (cb) {
      request('GET', HOST + '/api/blocks', null, cb);
    },

    mempool: function (cb) {
      request('GET', HOST + '/api/mempool', null, cb);
    },

    peers: function (cb) {
      request('GET', HOST + '/api/peers', null, cb);
    },

    // ── Send coins ───────────────────────────────────────────────────────────

    send: function (toAddress, amount, cb) {
      var w = loadWallet();
      if (!w) { cb({ ok: false, error: 'No wallet loaded' }); return; }

      // 1. Fetch UTXOs
      request('GET', HOST + '/api/utxos?address=' + w.address, null, function (res) {
        if (!res.ok) { cb(res); return; }

        // 2. Select UTXOs (greedy)
        var utxos = res.utxos || [];
        var selected = [], total = 0;
        utxos.sort(function (a, b) { return b.amount - a.amount; });
        for (var i = 0; i < utxos.length; i++) {
          selected.push(utxos[i]);
          total += utxos[i].amount;
          if (total >= amount) break;
        }
        if (total < amount) {
          cb({ ok: false, error: 'Insufficient balance (' + total + ' < ' + amount + ')' });
          return;
        }

        // 3. Build transaction
        var change = total - amount;
        var tx = {
          version:  1,
          inputs:   selected.map(function (u) {
            return { txid: u.txid, vout: u.vout, pubkey: '', signature: '' };
          }),
          outputs:  [{ address: toAddress, amount: amount }],
          locktime: 0,
          txid: '',
        };
        if (change > 0) tx.outputs.push({ address: w.address, amount: change });

        // 4. Sign
        signTransaction(tx, w.privateKey, w.publicKey, function (signedTx, signErr) {
          if (signErr) { cb({ ok: false, error: 'Signing failed: ' + signErr }); return; }

          // 5. Broadcast
          request('POST', HOST + '/api/tx', { tx: signedTx }, function (bcast) {
            if (bcast.ok) RC.setBalance(RC.getBalance() - amount);
            cb(bcast);
          });
        });
      });
    },

    // ── Utilities ────────────────────────────────────────────────────────────

    esc: function (s) {
      return String(s)
        .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
        .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
    },

    fmt: function (n) { return Number(n).toLocaleString(); },

    shortAddr: function (addr) {
      if (!addr || addr.length < 16) return addr;
      return addr.slice(0, 8) + '…' + addr.slice(-6);
    },
  };

  global.RC = RC;

}(typeof window !== 'undefined' ? window : this));
