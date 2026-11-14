var SecureChainWallet = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __esm = (fn, res, err) => function __init() {
    if (err) throw err[0];
    try {
      return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
    } catch (e) {
      throw err = [e], e;
    }
  };
  var __commonJS = (cb, mod2) => function __require() {
    try {
      return mod2 || (0, cb[__getOwnPropNames(cb)[0]])((mod2 = { exports: {} }).exports, mod2), mod2.exports;
    } catch (e) {
      throw mod2 = 0, e;
    }
  };
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod2) => __copyProps(__defProp({}, "__esModule", { value: true }), mod2);

  // node_modules/@noble/hashes/_u64.js
  function setU64FromNum(view, byteOffset, n, isLE) {
    const h = fromNumH(n);
    const l = fromNumL(n);
    view.setUint32(byteOffset, isLE ? l : h, isLE);
    view.setUint32(byteOffset + 4, isLE ? h : l, isLE);
  }
  var fromNumH, fromNumL;
  var init_u64 = __esm({
    "node_modules/@noble/hashes/_u64.js"() {
      fromNumH = (n) => n / 2 ** 32 | 0;
      fromNumL = (n) => n >>> 0;
    }
  });

  // node_modules/@noble/hashes/utils.js
  function isBytes(a) {
    return a instanceof Uint8Array || ArrayBuffer.isView(a) && a.constructor.name === "Uint8Array" && "BYTES_PER_ELEMENT" in a && a.BYTES_PER_ELEMENT === 1;
  }
  function anumber(n, title = "") {
    if (typeof n !== "number")
      throw new TypeError(atitle(title) + "expected number, got " + typeof n);
    if (!Number.isSafeInteger(n) || n < 0)
      throw new RangeError(atitle(title) + "expected integer >= 0, got " + n);
    return n;
  }
  function abytes(value, length, title = "") {
    if (isBytes(value) && (length === void 0 || value.length === length))
      return value;
    if (length !== void 0)
      anumber(length, "length");
    const bytes = isBytes(value);
    const ofLen = length !== void 0 ? ` of length ${length}` : "";
    const got = bytes ? `length=${value.length}` : `type=${typeof value}`;
    const message = atitle(title) + "expected Uint8Array" + ofLen + ", got " + got;
    if (!bytes)
      throw new TypeError(message);
    throw new RangeError(message);
  }
  function ahash(h) {
    if (typeof h !== "function" || typeof h.create !== "function")
      throw new TypeError("expected hash wrapped by utils.createHasher");
    anumber(h.outputLen);
    anumber(h.blockLen);
    if (h.outputLen < 1 || h.blockLen < 1)
      throw new Error("hash blockLen / outputLen must be >= 1");
  }
  function aexists(instance, checkFinished = true) {
    if (instance.destroyed)
      throw new Error("hash was destroyed");
    if (checkFinished && instance.finished)
      throw new Error("digest() was already called");
  }
  function aoutput(out, instance) {
    abytes(out, void 0, "output");
    const min = instance.outputLen;
    if (!(out.length >= min)) {
      throw new RangeError('"output" expected length >= ' + min);
    }
  }
  function clean(...arrays) {
    for (let i = 0; i < arrays.length; i++) {
      arrays[i].fill(0);
    }
  }
  function createView(arr) {
    return new DataView(arr.buffer, arr.byteOffset, arr.byteLength);
  }
  function rotr(word, shift) {
    return word << 32 - shift | word >>> shift;
  }
  function bytesToHex(bytes) {
    abytes(bytes);
    if (hasHexBuiltin)
      return bytes.toHex();
    let hex = "";
    for (let i = 0; i < bytes.length; i++) {
      hex += hexes[bytes[i]];
    }
    return hex;
  }
  function asciiToBase16(ch) {
    return ch >= 48 && ch <= 57 ? ch - 48 : ch >= 65 && ch <= 70 ? ch - (65 - 10) : ch >= 97 && ch <= 102 ? ch - (97 - 10) : void 0;
  }
  function hexToBytes(hex) {
    if (typeof hex !== "string")
      throw new TypeError("hex string expected, got " + typeof hex);
    if (hasHexBuiltin) {
      try {
        return Uint8Array.fromHex(hex);
      } catch (error) {
        if (error instanceof SyntaxError)
          throw new RangeError(error.message);
        throw error;
      }
    }
    const hl = hex.length;
    const al = hl / 2;
    if (hl % 2)
      throw new RangeError("hex string expected, got unpadded hex of length " + hl);
    const array = new Uint8Array(al);
    for (let ai = 0, hi = 0; ai < al; ai++, hi += 2) {
      const n1 = asciiToBase16(hex.charCodeAt(hi));
      const n2 = asciiToBase16(hex.charCodeAt(hi + 1));
      if (n1 === void 0 || n2 === void 0) {
        const char = hex[hi] + hex[hi + 1];
        throw new RangeError('hex string expected, got non-hex character "' + char + '" at index ' + hi);
      }
      array[ai] = n1 * 16 + n2;
    }
    return array;
  }
  function utf8ToBytes(str) {
    if (typeof str !== "string")
      throw new TypeError("string expected");
    const encoded = new TextEncoder().encode(str);
    try {
      return new Uint8Array(encoded);
    } finally {
      clean(encoded);
    }
  }
  function concatBytes(...arrays) {
    let sum = 0;
    for (let i = 0; i < arrays.length; i++) {
      const a = arrays[i];
      abytes(a);
      sum += a.length;
    }
    const res = new Uint8Array(sum);
    for (let i = 0, pad = 0; i < arrays.length; i++) {
      const a = arrays[i];
      res.set(a, pad);
      pad += a.length;
    }
    return res;
  }
  function checkOpts(defaults, opts, title = "opts") {
    aopts(defaults, "defaults");
    if (opts !== void 0)
      aopts(opts, title);
    const merged = Object.assign(/* @__PURE__ */ Object.create(null), defaults, opts);
    return merged;
  }
  function createHasher(hashCons, info = {}) {
    if (typeof hashCons !== "function")
      throw new TypeError('"hashCons" expected function, got type=' + typeof hashCons);
    info = checkOpts({}, info, "info");
    const hashC = (msg, opts) => hashCons(opts).update(msg).digest();
    const tmp = hashCons(void 0);
    hashC.outputLen = tmp.outputLen;
    hashC.blockLen = tmp.blockLen;
    hashC.canXOF = tmp.canXOF;
    hashC.create = (opts) => hashCons(opts);
    Object.assign(hashC, info);
    return Object.freeze(hashC);
  }
  function randomBytes(bytesLength = 32) {
    anumber(bytesLength, "bytesLength");
    const cr = typeof globalThis === "object" ? globalThis.crypto : null;
    if (typeof cr?.getRandomValues !== "function")
      throw new Error("crypto.getRandomValues must be defined");
    if (bytesLength > 65536)
      throw new RangeError(`"bytesLength" expected <= 65536, got ${bytesLength}`);
    return cr.getRandomValues(new Uint8Array(bytesLength));
  }
  var atitle, aobject, aopts, hasHexBuiltin, hexes, oidNist;
  var init_utils = __esm({
    "node_modules/@noble/hashes/utils.js"() {
      atitle = (title) => title ? `"${title}" ` : "";
      aobject = (value, label) => {
        if (value === null || typeof value !== "object" || Array.isArray(value))
          throw new TypeError((label === "object" ? "" : `"${label}" `) + "expected object, got type=" + typeof value);
      };
      aopts = (value, label) => {
        aobject(value, label);
        const proto = Object.getPrototypeOf(value);
        if (proto !== Object.prototype && proto !== null)
          throw new TypeError(`"${label}" expected plain object`);
        if (Object.hasOwn(value, "__proto__"))
          throw new TypeError(`"${label}.__proto__" is not allowed`);
      };
      hasHexBuiltin = /* @__PURE__ */ (() => (
        // @ts-ignore
        typeof Uint8Array.from([]).toHex === "function" && typeof Uint8Array.fromHex === "function"
      ))();
      hexes = /* @__PURE__ */ Array.from({ length: 256 }, (_, i) => i.toString(16).padStart(2, "0"));
      oidNist = (suffix) => ({
        // Current NIST hashAlgs suffixes used here fit in one DER subidentifier octet.
        // Larger suffix values would need base-128 OID encoding and a different length byte.
        oid: Uint8Array.from([6, 9, 96, 134, 72, 1, 101, 3, 4, 2, suffix])
      });
    }
  });

  // node_modules/@noble/hashes/_md.js
  function Chi(a, b, c) {
    return a & b ^ ~a & c;
  }
  function Maj(a, b, c) {
    return a & b ^ a & c ^ b & c;
  }
  var HashMD, SHA256_IV;
  var init_md = __esm({
    "node_modules/@noble/hashes/_md.js"() {
      init_u64();
      init_utils();
      HashMD = class {
        blockLen;
        outputLen;
        canXOF = false;
        padOffset;
        isLE;
        // For partial updates less than block size
        buffer;
        view;
        finished = false;
        length = 0;
        pos = 0;
        destroyed = false;
        constructor(blockLen, outputLen, padOffset, isLE) {
          this.blockLen = blockLen;
          this.outputLen = outputLen;
          this.padOffset = padOffset;
          this.isLE = isLE;
          this.buffer = new Uint8Array(blockLen);
          this.view = createView(this.buffer);
        }
        update(data) {
          aexists(this);
          abytes(data);
          const { view, buffer, blockLen } = this;
          const len = data.length;
          let processed = false;
          for (let pos = 0; pos < len; ) {
            const take = Math.min(blockLen - this.pos, len - pos);
            if (take === blockLen) {
              const dataView = createView(data);
              for (; blockLen <= len - pos; pos += blockLen)
                this.process(dataView, pos);
              processed = true;
              continue;
            }
            buffer.set(pos === 0 && take === len ? data : data.subarray(pos, pos + take), this.pos);
            this.pos += take;
            pos += take;
            if (this.pos === blockLen) {
              this.process(view, 0);
              this.pos = 0;
              processed = true;
            }
          }
          this.length += data.length;
          if (processed)
            this.roundClean();
          return this;
        }
        digestInto(out) {
          aexists(this);
          aoutput(out, this);
          this.finished = true;
          const { buffer, view, blockLen, isLE } = this;
          let { pos } = this;
          buffer[pos++] = 128;
          buffer.fill(0, pos);
          if (this.padOffset > blockLen - pos) {
            this.process(view, 0);
            buffer.fill(0);
          }
          setU64FromNum(view, blockLen - 8, this.length * 8, isLE);
          this.process(view, 0);
          this.roundClean();
          const oview = out === buffer ? view : createView(out);
          const len = this.outputLen;
          const outLen = len / 4;
          const state = this.get();
          if (len % 4 || outLen > state.length)
            throw new Error("invalid outputLen");
          for (let i = 0; i < outLen; i++)
            oview.setUint32(4 * i, state[i], isLE);
        }
        digest() {
          const { buffer, outputLen } = this;
          this.digestInto(buffer);
          const res = buffer.slice(0, outputLen);
          this.destroy();
          return res;
        }
        _cloneIntoMeta(to) {
          const { buffer, length, finished, destroyed, pos } = this;
          to.destroyed = destroyed;
          to.finished = finished;
          to.length = length;
          to.pos = pos;
          if (pos)
            to.buffer.set(buffer);
          return to;
        }
        clone() {
          return this._cloneInto();
        }
      };
      SHA256_IV = /* @__PURE__ */ Uint32Array.from([
        1779033703,
        3144134277,
        1013904242,
        2773480762,
        1359893119,
        2600822924,
        528734635,
        1541459225
      ]);
    }
  });

  // node_modules/@noble/hashes/sha2.js
  var SHA256_K, SHA256_W, SHA2_32B, _SHA256, sha256;
  var init_sha2 = __esm({
    "node_modules/@noble/hashes/sha2.js"() {
      init_md();
      init_utils();
      SHA256_K = /* @__PURE__ */ Uint32Array.from([
        1116352408,
        1899447441,
        3049323471,
        3921009573,
        961987163,
        1508970993,
        2453635748,
        2870763221,
        3624381080,
        310598401,
        607225278,
        1426881987,
        1925078388,
        2162078206,
        2614888103,
        3248222580,
        3835390401,
        4022224774,
        264347078,
        604807628,
        770255983,
        1249150122,
        1555081692,
        1996064986,
        2554220882,
        2821834349,
        2952996808,
        3210313671,
        3336571891,
        3584528711,
        113926993,
        338241895,
        666307205,
        773529912,
        1294757372,
        1396182291,
        1695183700,
        1986661051,
        2177026350,
        2456956037,
        2730485921,
        2820302411,
        3259730800,
        3345764771,
        3516065817,
        3600352804,
        4094571909,
        275423344,
        430227734,
        506948616,
        659060556,
        883997877,
        958139571,
        1322822218,
        1537002063,
        1747873779,
        1955562222,
        2024104815,
        2227730452,
        2361852424,
        2428436474,
        2756734187,
        3204031479,
        3329325298
      ]);
      SHA256_W = /* @__PURE__ */ new Uint32Array(64);
      SHA2_32B = class extends HashMD {
        // We cannot use array here since array allows indexing by variable
        // which means optimizer/compiler cannot use registers.
        // Numeric initializers matter: starting the fields as `undefined` changes
        // V8's field representation and makes sha256 3x slower (measured).
        A = 0;
        B = 0;
        C = 0;
        D = 0;
        E = 0;
        F = 0;
        G = 0;
        H = 0;
        constructor(outputLen, IV) {
          super(64, outputLen, 8, false);
          this.A = IV[0] | 0;
          this.B = IV[1] | 0;
          this.C = IV[2] | 0;
          this.D = IV[3] | 0;
          this.E = IV[4] | 0;
          this.F = IV[5] | 0;
          this.G = IV[6] | 0;
          this.H = IV[7] | 0;
        }
        get() {
          const { A, B, C, D, E, F, G, H } = this;
          return [A, B, C, D, E, F, G, H];
        }
        // prettier-ignore
        set(A, B, C, D, E, F, G, H) {
          this.A = A | 0;
          this.B = B | 0;
          this.C = C | 0;
          this.D = D | 0;
          this.E = E | 0;
          this.F = F | 0;
          this.G = G | 0;
          this.H = H | 0;
        }
        _cloneInto(to) {
          (to ||= new this.constructor()).set(...this.get());
          return this._cloneIntoMeta(to);
        }
        process(view, offset) {
          for (let i = 0; i < 16; i++, offset += 4)
            SHA256_W[i] = view.getUint32(offset, false);
          for (let i = 16; i < 64; i++) {
            const W15 = SHA256_W[i - 15];
            const W2 = SHA256_W[i - 2];
            const s0 = rotr(W15, 7) ^ rotr(W15, 18) ^ W15 >>> 3;
            const s1 = rotr(W2, 17) ^ rotr(W2, 19) ^ W2 >>> 10;
            SHA256_W[i] = s1 + SHA256_W[i - 7] + s0 + SHA256_W[i - 16] | 0;
          }
          let { A, B, C, D, E, F, G, H } = this;
          for (let i = 0; i < 64; i++) {
            const sigma1 = rotr(E, 6) ^ rotr(E, 11) ^ rotr(E, 25);
            const T1 = H + sigma1 + Chi(E, F, G) + SHA256_K[i] + SHA256_W[i] | 0;
            const sigma0 = rotr(A, 2) ^ rotr(A, 13) ^ rotr(A, 22);
            const T2 = sigma0 + Maj(A, B, C) | 0;
            H = G;
            G = F;
            F = E;
            E = D + T1 | 0;
            D = C;
            C = B;
            B = A;
            A = T1 + T2 | 0;
          }
          A = A + this.A | 0;
          B = B + this.B | 0;
          C = C + this.C | 0;
          D = D + this.D | 0;
          E = E + this.E | 0;
          F = F + this.F | 0;
          G = G + this.G | 0;
          H = H + this.H | 0;
          this.set(A, B, C, D, E, F, G, H);
        }
        roundClean() {
          clean(SHA256_W);
        }
        destroy() {
          this.destroyed = true;
          this.set(0, 0, 0, 0, 0, 0, 0, 0);
          clean(this.buffer);
        }
      };
      _SHA256 = class extends SHA2_32B {
        constructor() {
          super(32, SHA256_IV);
        }
      };
      sha256 = /* @__PURE__ */ createHasher(
        () => new _SHA256(),
        /* @__PURE__ */ oidNist(1)
      );
    }
  });

  // node_modules/@noble/curves/utils.js
  function aarray(item, title, inner = () => {
  }) {
    if (!Array.isArray(item))
      throw new TypeError(`"${title}" expected array, got type=${typeof item}`);
    for (let i = 0; i < item.length; i++)
      inner(item[i], `${title}[${i}]`);
    return item;
  }
  function astring(value, title = "") {
    if (typeof value !== "string") {
      const prefix = title && `"${title}" `;
      throw new TypeError(prefix + "expected string, got type=" + typeof value);
    }
    return value;
  }
  function aobject2(value, title = "object") {
    if (value === null || typeof value !== "object" || Array.isArray(value))
      throw new TypeError(title === "object" ? "expected valid options object" : `"${title}" expected object, got type=${typeof value}`);
    return value;
  }
  function afunction(value, title) {
    if (typeof value !== "function")
      throw new TypeError(`"${title}" is invalid: expected function, got ${typeof value}`);
    return value;
  }
  function abool(value, title = "") {
    if (typeof value !== "boolean")
      throw new TypeError(atitle2(title) + "expected boolean, got type=" + typeof value);
    return value;
  }
  function abignumber(n) {
    if (typeof n === "bigint") {
      if (!isPosBig(n))
        throw new RangeError("positive bigint expected, got " + n);
    } else
      anumber2(n);
    return n;
  }
  function asafenumber(value, title = "") {
    if (typeof value !== "number") {
      const prefix = title && `"${title}" `;
      throw new TypeError(prefix + "expected number, got type=" + typeof value);
    }
    if (!Number.isSafeInteger(value)) {
      const prefix = title && `"${title}" `;
      throw new RangeError(prefix + "expected safe integer, got " + value);
    }
  }
  function numberToHexUnpadded(num2) {
    const hex = abignumber(num2).toString(16);
    return hex.length & 1 ? "0" + hex : hex;
  }
  function hexToNumber(hex) {
    if (typeof hex !== "string")
      throw new TypeError("hex string expected, got " + typeof hex);
    return hex === "" ? _0n : BigInt("0x" + hex);
  }
  function bytesToNumberBE(bytes) {
    return hexToNumber(bytesToHex(bytes));
  }
  function bytesToNumberLE(bytes) {
    return hexToNumber(bytesToHex(copyBytes(abytes(bytes)).reverse()));
  }
  function numberToBytesBE(n, len) {
    anumber(len);
    if (len === 0)
      throw new Error("zero output length is invalid");
    n = abignumber(n);
    const expectedLen = len * 2;
    const hex = n.toString(16);
    if (hex.length > expectedLen)
      throw new RangeError("number is too large");
    return hexToBytes(hex.padStart(expectedLen, "0"));
  }
  function numberToBytesLE(n, len) {
    return numberToBytesBE(n, len).reverse();
  }
  function equalBytes(a, b) {
    a = abytes2(a);
    b = abytes2(b);
    if (a.length !== b.length)
      return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++)
      diff |= a[i] ^ b[i];
    return diff === 0;
  }
  function copyBytes(bytes) {
    return Uint8Array.from(abytes2(bytes));
  }
  function asciiToBytes(ascii) {
    if (typeof ascii !== "string")
      throw new TypeError("ascii string expected, got " + typeof ascii);
    return Uint8Array.from(ascii, (c, i) => {
      const charCode = c.charCodeAt(0);
      if (c.length !== 1 || charCode > 127) {
        throw new RangeError(`string contains non-ASCII character "${ascii[i]}" with code ${charCode} at position ${i}`);
      }
      return charCode;
    });
  }
  function isPosBig(n) {
    return typeof n === "bigint" && _0n <= n;
  }
  function inRange(n, min, max) {
    return isPosBig(n) && isPosBig(min) && isPosBig(max) && min <= n && n < max;
  }
  function aInRange(title, n, min, max) {
    if (!inRange(n, min, max))
      throw new RangeError("expected valid " + title + ": " + min + " <= n < " + max + ", got " + n);
  }
  function bitLen(n) {
    if (n < _0n)
      throw new Error("expected non-negative bigint, got " + n);
    return n === _0n ? 0 : n.toString(2).length;
  }
  function createHmacDrbg(hashLen, qByteLen, hmacFn) {
    anumber(hashLen, "hashLen");
    anumber(qByteLen, "qByteLen");
    if (typeof hmacFn !== "function")
      throw new TypeError("hmacFn must be a function");
    const u8n = (len) => new Uint8Array(len);
    const NULL = Uint8Array.of();
    const byte0 = Uint8Array.of(0);
    const byte1 = Uint8Array.of(1);
    const _maxDrbgIters = 1e3;
    let v = u8n(hashLen);
    let k = u8n(hashLen);
    let i = 0;
    const reset = () => {
      v.fill(1);
      k.fill(0);
      i = 0;
    };
    const h = (...msgs) => hmacFn(k, concatBytes2(v, ...msgs));
    const reseed = (seed = NULL) => {
      k = h(byte0, seed);
      v = h();
      if (seed.length === 0)
        return;
      k = h(byte1, seed);
      v = h();
    };
    const gen = () => {
      if (i++ >= _maxDrbgIters)
        throw new Error("drbg: tried max amount of iterations");
      let len = 0;
      const out = [];
      while (len < qByteLen) {
        v = h();
        const sl = v.slice();
        out.push(sl);
        len += v.length;
      }
      return concatBytes2(...out);
    };
    const genUntil = (seed, pred) => {
      reset();
      reseed(seed);
      let res = void 0;
      while ((res = pred(gen())) === void 0)
        reseed();
      reset();
      return res;
    };
    return genUntil;
  }
  function validateObject(object, fields = {}, optFields = {}, title = "object") {
    aobject2(object, title);
    aobject2(fields, "fields");
    aobject2(optFields, "optFields");
    function checkField(fieldName, expectedType, isOpt) {
      const label = title === "object" ? `param "${String(fieldName)}"` : `"${title}.${String(fieldName)}"`;
      const val = object[fieldName];
      if (!Object.hasOwn(object, fieldName) && (isOpt ? val !== void 0 : expectedType !== "function")) {
        throw new TypeError(`${label} is invalid: expected own property`);
      }
      if (isOpt && val === void 0)
        return;
      const current = typeof val;
      if (current !== expectedType || val === null)
        throw new TypeError(`${label} is invalid: expected ${expectedType}, got ${current}`);
    }
    const iter = (f, isOpt) => Object.entries(f).forEach(([k, v]) => checkField(k, v, isOpt));
    iter(fields, false);
    iter(optFields, true);
  }
  var abytes2, anumber2, bytesToHex2, concatBytes2, hexToBytes2, isBytes2, randomBytes2, _0n, _1n, atitle2, bitMask;
  var init_utils2 = __esm({
    "node_modules/@noble/curves/utils.js"() {
      init_utils();
      abytes2 = (value, length, title) => abytes(value, length, title);
      anumber2 = anumber;
      bytesToHex2 = bytesToHex;
      concatBytes2 = (...arrays) => concatBytes(...arrays);
      hexToBytes2 = (hex) => hexToBytes(hex);
      isBytes2 = isBytes;
      randomBytes2 = (bytesLength) => randomBytes(bytesLength);
      _0n = /* @__PURE__ */ BigInt(0);
      _1n = /* @__PURE__ */ BigInt(1);
      atitle2 = (title) => title ? `"${title}" ` : "";
      bitMask = (n) => {
        asafenumber(n, "n");
        return (_1n << BigInt(n)) - _1n;
      };
    }
  });

  // node_modules/@noble/curves/abstract/modular.js
  function mod(a, b) {
    if (b <= _0n2)
      throw new Error("mod: expected positive modulus, got " + b);
    const result = a % b;
    return result >= _0n2 ? result : b + result;
  }
  function pow(num2, power, modulo) {
    if (modulo <= _1n2)
      throw new Error("pow: expected modulus > 1, got " + modulo);
    if (typeof power !== "bigint")
      throw new TypeError("invalid exponent: expected bigint, got " + typeof power);
    if (power < _0n2)
      throw new Error("invalid exponent, negatives unsupported");
    if (power === _0n2)
      return _1n2;
    if (power === _1n2)
      return num2;
    let d = num2 % modulo;
    if (d < _0n2)
      d += modulo;
    if (power < POW_WINDOWED_MIN) {
      let p2 = _1n2;
      while (power > _0n2) {
        if (power & _1n2)
          p2 = p2 * d % modulo;
        d = d * d % modulo;
        power >>= _1n2;
      }
      return p2;
    }
    const digits = [];
    while (power > _0n2) {
      digits.push(Number(power & _15n));
      power >>= _4n;
    }
    const table = new Array(16);
    table[0] = _1n2;
    table[1] = d;
    for (let i = 2; i < 16; i++)
      table[i] = table[i - 1] * d % modulo;
    let p = table[digits[digits.length - 1]];
    for (let w = digits.length - 2; w >= 0; w--) {
      p = p * p % modulo;
      p = p * p % modulo;
      p = p * p % modulo;
      p = p * p % modulo;
      const digit = digits[w];
      if (digit !== 0)
        p = p * table[digit] % modulo;
    }
    return p;
  }
  function pow2(x, power, modulo) {
    if (modulo <= _1n2)
      throw new Error("pow2: expected modulus > 1, got " + modulo);
    if (power < _0n2)
      throw new Error("pow2: expected non-negative exponent, got " + power);
    let res = x;
    while (power-- > _0n2) {
      res *= res;
      res %= modulo;
    }
    return res;
  }
  function invert(number, modulo) {
    if (number === _0n2)
      throw new Error("invert: expected non-zero number");
    if (modulo <= _1n2)
      throw new Error("invert: expected modulus > 1, got " + modulo);
    let a = mod(number, modulo);
    let b = modulo;
    let x = _0n2, u = _1n2;
    while (a !== _0n2) {
      const q = b / a;
      const r = b - a * q;
      const m = x - u * q;
      b = a, a = r, x = u, u = m;
    }
    const gcd = b;
    if (gcd !== _1n2)
      throw new Error("invert: does not exist");
    return mod(x, modulo);
  }
  function invertCt(a, prime) {
    if (prime <= _1n2)
      throw new Error("invertCt: expected prime modulus > 1, got " + prime);
    const an = mod(a, prime);
    if (an === _0n2)
      throw new Error("invertCt: expected non-zero number");
    const inverse = pow(an, prime - _2n, prime);
    if (mod(an * inverse, prime) !== _1n2)
      throw new Error("invertCt: does not exist");
    return inverse;
  }
  function assertIsSquare(Fp, root, n) {
    const F = Fp;
    if (!F.eql(F.sqr(root), n))
      throw new Error("Cannot find square root");
  }
  function aoddModulus(order, fnName) {
    if ((order & _1n2) === _0n2)
      throw new Error(fnName + ": expected odd modulus, got " + order);
  }
  function sqrt3mod4(Fp, n) {
    const F = Fp;
    const p1div4 = (F.ORDER + _1n2) / _4n;
    const root = F.pow(n, p1div4);
    assertIsSquare(F, root, n);
    return root;
  }
  function sqrt5mod8(Fp, n) {
    const F = Fp;
    const p5div8 = (F.ORDER - _5n) / _8n;
    const n2 = F.mul(n, _2n);
    const v = F.pow(n2, p5div8);
    const nv = F.mul(n, v);
    const i = F.mul(F.mul(nv, _2n), v);
    const root = F.mul(nv, F.sub(i, F.ONE));
    assertIsSquare(F, root, n);
    return root;
  }
  function sqrt9mod16(P) {
    const Fp_ = Field(P);
    const tn = tonelliShanks(P);
    const c1 = tn(Fp_, Fp_.neg(Fp_.ONE));
    const c2 = tn(Fp_, c1);
    const c3 = tn(Fp_, Fp_.neg(c1));
    const c4 = (P + _7n) / _16n;
    return ((Fp, n) => {
      const F = Fp;
      let tv1 = F.pow(n, c4);
      let tv2 = F.mul(tv1, c1);
      const tv3 = F.mul(tv1, c2);
      const tv4 = F.mul(tv1, c3);
      const e1 = F.eql(F.sqr(tv2), n);
      const e2 = F.eql(F.sqr(tv3), n);
      tv1 = F.cmov(tv1, tv2, e1);
      tv2 = F.cmov(tv4, tv3, e2);
      const e3 = F.eql(F.sqr(tv2), n);
      const root = F.cmov(tv1, tv2, e3);
      assertIsSquare(F, root, n);
      return root;
    });
  }
  function tonelliShanks(P) {
    if (P < _3n)
      throw new Error("sqrt is not defined for small field");
    aoddModulus(P, "tonelliShanks");
    let Q = P - _1n2;
    let S = 0;
    while (Q % _2n === _0n2) {
      Q /= _2n;
      S++;
    }
    let Z = _2n;
    const _Fp = Field(P);
    while (FpLegendre(_Fp, Z) === 1) {
      if (Z++ > 1e3)
        throw new Error("Cannot find square root: probably non-prime P");
    }
    if (S === 1)
      return sqrt3mod4;
    let cc = _Fp.pow(Z, Q);
    const Q1div2 = (Q + _1n2) / _2n;
    return function tonelliSlow(Fp, n) {
      const F = Fp;
      if (F.is0(n))
        return n;
      if (FpLegendre(F, n) !== 1)
        throw new Error("Cannot find square root");
      let M = S;
      let c = F.mul(F.ONE, cc);
      let t = F.pow(n, Q);
      let R = F.pow(n, Q1div2);
      while (!F.eql(t, F.ONE)) {
        if (F.is0(t))
          throw new Error("Cannot find square root: probably non-prime P");
        let i = 1;
        let t_tmp = F.sqr(t);
        while (!F.eql(t_tmp, F.ONE)) {
          i++;
          t_tmp = F.sqr(t_tmp);
          if (i === M)
            throw new Error("Cannot find square root");
        }
        const exponent = _1n2 << BigInt(M - i - 1);
        const b = F.pow(c, exponent);
        M = i;
        c = F.sqr(b);
        t = F.mul(t, c);
        R = F.mul(R, b);
      }
      return R;
    };
  }
  function FpSqrt(P) {
    aoddModulus(P, "Fp.sqrt");
    if (P % _4n === _3n)
      return sqrt3mod4;
    if (P % _8n === _5n)
      return sqrt5mod8;
    if (P % _16n === _9n)
      return sqrt9mod16(P);
    return tonelliShanks(P);
  }
  function validateField(field) {
    aobject2(field, "field");
    if (typeof field.ORDER !== "bigint")
      throw new TypeError('param "ORDER" is invalid: expected bigint, got ' + typeof field.ORDER);
    asafenumber(field.BYTES, "BYTES");
    asafenumber(field.BITS, "BITS");
    for (const name of FIELD_FIELDS)
      afunction(field[name], "field." + name);
    if (field.BYTES < 1 || field.BITS < 1)
      throw new Error("invalid field: expected BYTES/BITS > 0");
    if (field.ORDER <= _1n2)
      throw new Error("invalid field: expected ORDER > 1, got " + field.ORDER);
    return field;
  }
  function FpInvertBatch(Fp, nums, passZero = false) {
    validateField(Fp);
    aarray(nums, "nums");
    abool(passZero, "passZero");
    const F = Fp;
    const inverted = new Array(nums.length).fill(passZero ? F.ZERO : void 0);
    const multipliedAcc = nums.reduce((acc, num2, i) => {
      if (F.is0(num2))
        return acc;
      inverted[i] = acc;
      return F.mul(acc, num2);
    }, F.ONE);
    const invertedAcc = F.inv(multipliedAcc);
    nums.reduceRight((acc, num2, i) => {
      if (F.is0(num2))
        return acc;
      inverted[i] = F.mul(acc, inverted[i]);
      return F.mul(acc, num2);
    }, invertedAcc);
    return inverted;
  }
  function FpLegendre(Fp, n) {
    validateField(Fp);
    const F = Fp;
    aoddModulus(F.ORDER, "FpLegendre");
    const p1mod2 = (F.ORDER - _1n2) / _2n;
    const powered = F.pow(n, p1mod2);
    const yes = F.eql(powered, F.ONE);
    const zero = F.eql(powered, F.ZERO);
    const no = F.eql(powered, F.neg(F.ONE));
    if (!yes && !zero && !no)
      throw new Error("invalid Legendre symbol result");
    return yes ? 1 : zero ? 0 : -1;
  }
  function FpIsSquare(Fp, n) {
    const l = FpLegendre(Fp, n);
    return l !== -1;
  }
  function nLength(n, nBitLength) {
    if (nBitLength !== void 0)
      anumber2(nBitLength);
    if (n <= _0n2)
      throw new Error("invalid n length: expected positive n, got " + n);
    if (nBitLength !== void 0 && nBitLength < 1)
      throw new Error("invalid n length: expected positive bit length, got " + nBitLength);
    const bits = bitLen(n);
    if (nBitLength !== void 0 && nBitLength < bits)
      throw new Error(`invalid n length: expected nBitLength (${nBitLength}) >= bitLen(n) (${bits})`);
    const _nBitLength = nBitLength !== void 0 ? nBitLength : bits;
    const nByteLength = Math.ceil(_nBitLength / 8);
    return { nBitLength: _nBitLength, nByteLength };
  }
  function Field(ORDER, opts = {}) {
    Object.freeze(_Field.prototype);
    return new _Field(ORDER, opts);
  }
  function getFieldBytesLength(fieldOrder) {
    if (typeof fieldOrder !== "bigint")
      throw new Error("field order must be bigint");
    if (fieldOrder <= _1n2)
      throw new Error("field order must be greater than 1");
    const bitLength = bitLen(fieldOrder - _1n2);
    return Math.ceil(bitLength / 8);
  }
  function getMinHashLength(fieldOrder) {
    const length = getFieldBytesLength(fieldOrder);
    return length + Math.ceil(length / 2);
  }
  function mapHashToField(key, fieldOrder, isLE = false) {
    abytes2(key);
    const len = key.length;
    const fieldLen = getFieldBytesLength(fieldOrder);
    const minLen = Math.max(getMinHashLength(fieldOrder), 16);
    if (len < minLen || len > 1024)
      throw new Error("expected " + minLen + "-1024 bytes of input, got " + len);
    const num2 = isLE ? bytesToNumberLE(key) : bytesToNumberBE(key);
    const reduced = mod(num2, fieldOrder - _1n2) + _1n2;
    return isLE ? numberToBytesLE(reduced, fieldLen) : numberToBytesBE(reduced, fieldLen);
  }
  var _0n2, _1n2, _2n, _3n, _4n, _5n, _7n, _8n, _9n, _15n, _16n, POW_WINDOWED_MIN, FIELD_FIELDS, FIELD_SQRT, _Field;
  var init_modular = __esm({
    "node_modules/@noble/curves/abstract/modular.js"() {
      init_utils2();
      _0n2 = /* @__PURE__ */ BigInt(0);
      _1n2 = /* @__PURE__ */ BigInt(1);
      _2n = /* @__PURE__ */ BigInt(2);
      _3n = /* @__PURE__ */ BigInt(3);
      _4n = /* @__PURE__ */ BigInt(4);
      _5n = /* @__PURE__ */ BigInt(5);
      _7n = /* @__PURE__ */ BigInt(7);
      _8n = /* @__PURE__ */ BigInt(8);
      _9n = /* @__PURE__ */ BigInt(9);
      _15n = /* @__PURE__ */ BigInt(15);
      _16n = /* @__PURE__ */ BigInt(16);
      POW_WINDOWED_MIN = /* @__PURE__ */ BigInt("0x10000000000000000");
      FIELD_FIELDS = [
        "create",
        "isValid",
        "is0",
        "neg",
        "inv",
        "sqrt",
        "sqr",
        "eql",
        "add",
        "sub",
        "mul",
        "pow",
        "div",
        "addN",
        "subN",
        "mulN",
        "sqrN"
      ];
      FIELD_SQRT = /* @__PURE__ */ new WeakMap();
      _Field = class {
        ORDER;
        BITS;
        BYTES;
        isLE;
        ZERO = _0n2;
        ONE = _1n2;
        _lengths;
        _mod;
        constructor(ORDER, opts = {}) {
          if (ORDER <= _1n2)
            throw new Error("invalid field: expected ORDER > 1, got " + ORDER);
          let _nbitLength = void 0;
          this.isLE = false;
          if (opts != null && typeof opts === "object") {
            if (typeof opts.BITS === "number")
              _nbitLength = opts.BITS;
            if (typeof opts.sqrt === "function")
              Object.defineProperty(this, "sqrt", { value: opts.sqrt, enumerable: true });
            if (typeof opts.isLE === "boolean")
              this.isLE = opts.isLE;
            if (opts.allowedLengths)
              this._lengths = Object.freeze(opts.allowedLengths.slice());
            if (typeof opts.modFromBytes === "boolean")
              this._mod = opts.modFromBytes;
          }
          const { nBitLength, nByteLength } = nLength(ORDER, _nbitLength);
          if (nByteLength > 2048)
            throw new Error("invalid field: expected ORDER of <= 2048 bytes");
          this.ORDER = ORDER;
          this.BITS = nBitLength;
          this.BYTES = nByteLength;
          Object.freeze(this);
        }
        create(num2) {
          return mod(num2, this.ORDER);
        }
        isValid(num2) {
          if (typeof num2 !== "bigint")
            throw new TypeError("invalid field element: expected bigint, got " + typeof num2);
          return _0n2 <= num2 && num2 < this.ORDER;
        }
        is0(num2) {
          return num2 === _0n2;
        }
        // is valid and invertible
        isValidNot0(num2) {
          return !this.is0(num2) && this.isValid(num2);
        }
        isOdd(num2) {
          return (num2 & _1n2) === _1n2;
        }
        neg(num2) {
          return mod(-num2, this.ORDER);
        }
        eql(lhs, rhs) {
          return lhs === rhs;
        }
        sqr(num2) {
          return mod(num2 * num2, this.ORDER);
        }
        add(lhs, rhs) {
          return mod(lhs + rhs, this.ORDER);
        }
        sub(lhs, rhs) {
          return mod(lhs - rhs, this.ORDER);
        }
        mul(lhs, rhs) {
          return mod(lhs * rhs, this.ORDER);
        }
        pow(num2, power) {
          return pow(num2, power, this.ORDER);
        }
        div(lhs, rhs) {
          return mod(lhs * invert(rhs, this.ORDER), this.ORDER);
        }
        // Same as above, but doesn't normalize
        sqrN(num2) {
          return num2 * num2;
        }
        addN(lhs, rhs) {
          return lhs + rhs;
        }
        subN(lhs, rhs) {
          return lhs - rhs;
        }
        mulN(lhs, rhs) {
          return lhs * rhs;
        }
        inv(num2) {
          return invert(num2, this.ORDER);
        }
        sqrt(num2) {
          let sqrt = FIELD_SQRT.get(this);
          if (!sqrt)
            FIELD_SQRT.set(this, sqrt = FpSqrt(this.ORDER));
          return sqrt(this, num2);
        }
        toBytes(num2) {
          return this.isLE ? numberToBytesLE(num2, this.BYTES) : numberToBytesBE(num2, this.BYTES);
        }
        fromBytes(bytes, skipValidation = false) {
          abytes2(bytes);
          const { _lengths: allowedLengths, BYTES, isLE, ORDER, _mod: modFromBytes } = this;
          if (allowedLengths) {
            if (bytes.length < 1 || !allowedLengths.includes(bytes.length) || bytes.length > BYTES) {
              throw new Error("Field.fromBytes: expected " + allowedLengths + " bytes, got " + bytes.length);
            }
            const padded = new Uint8Array(BYTES);
            padded.set(bytes, isLE ? 0 : padded.length - bytes.length);
            bytes = padded;
          }
          if (bytes.length !== BYTES)
            throw new Error("Field.fromBytes: expected " + BYTES + " bytes, got " + bytes.length);
          let scalar = isLE ? bytesToNumberLE(bytes) : bytesToNumberBE(bytes);
          if (modFromBytes)
            scalar = mod(scalar, ORDER);
          if (!skipValidation) {
            if (!this.isValid(scalar))
              throw new Error("invalid field element: outside of range 0..ORDER");
          }
          return scalar;
        }
        // TODO: we don't need it here, move out to separate fn
        invertBatch(lst) {
          return FpInvertBatch(this, lst, true);
        }
        // We can't move this out because Fp6, Fp12 implement it
        // and it's unclear what to return in there.
        cmov(a, b, condition) {
          abool(condition, "condition");
          return condition ? b : a;
        }
      };
    }
  });

  // node_modules/@noble/curves/abstract/curve.js
  function validatePointCons(Point) {
    const pc = Point;
    if (typeof pc !== "function")
      throw new TypeError('"Point" expected constructor, got type=' + typeof Point);
    afunction(pc.fromAffine, "Point.fromAffine");
    afunction(pc.fromBytes, "Point.fromBytes");
    afunction(pc.fromHex, "Point.fromHex");
    aobject2(pc.BASE, "Point.BASE");
    aobject2(pc.ZERO, "Point.ZERO");
    validateField(pc.Fp);
    validateField(pc.Fn);
  }
  function normalizeZ(c, points) {
    validatePointCons(c);
    validateMSMPoints(points, c);
    const invertedZs = FpInvertBatch(c.Fp, points.map((p) => p.Z));
    return points.map((p, i) => c.fromAffine(p.toAffine(invertedZs[i])));
  }
  function validateW(W, bits, min = 1) {
    if (!Number.isSafeInteger(W) || W < min || W > bits)
      throw new Error("invalid window size, expected [" + min + ".." + bits + "], got W=" + W);
  }
  function validateTableBytes(numPoints, fpBytes) {
    const bytes = numPoints * (4 * fpBytes + 128);
    if (bytes > TABLE_BYTES_MAX)
      throw new Error("invalid window size: table would need ~" + Math.ceil(bytes / 2 ** 20) + " MiB, max " + TABLE_BYTES_MAX / 2 ** 20 + " MiB");
  }
  function probeRandomBytes(randomBytes3, length) {
    if (randomBytes3 === void 0)
      return void 0;
    afunction(randomBytes3, "randomBytes");
    try {
      const probe = randomBytes3(length);
      if (!isBytes2(probe) || probe.length !== length)
        return void 0;
    } catch {
      return void 0;
    }
    return randomBytes3;
  }
  function validateMSMPoints(points, c) {
    aarray(points, "points");
    points.forEach((p, i) => {
      if (!(p instanceof c))
        throw new Error("invalid point at index " + i);
    });
  }
  function validateMSMScalars(scalars, field, maxScalar) {
    if (!Array.isArray(scalars))
      throw new Error("array of scalars expected");
    scalars.forEach((s, i) => {
      const ok = maxScalar === void 0 ? field.isValid(s) : isPosBig(s) && s < maxScalar;
      if (!ok)
        throw new Error("invalid scalar at index " + i);
    });
  }
  function getWindowSize(P) {
    return pointWindowSizes.get(P) || 1;
  }
  function oddMultiples(p, size) {
    const dbl = p.double();
    const t = [p];
    for (let j = 1; j < size; j++)
      t.push(t[j - 1].add(dbl));
    return t;
  }
  function wnafDigits(n, W) {
    const size = 2 ** W;
    const half = size / 2;
    const mask = BigInt(size - 1);
    const d = [];
    while (n > _0n3) {
      let w = 0;
      if (n & _1n3) {
        w = Number(n & mask);
        if (w >= half)
          w -= size;
        n -= BigInt(w);
      }
      d.push(w);
      n >>= _1n3;
    }
    return d;
  }
  function signedWindowDigits(n, W, windows) {
    const size = 2 ** W;
    const half = size / 2;
    const mask = BigInt(size - 1);
    const shiftBy = BigInt(W);
    const d = [];
    for (let w = 0; w < windows; w++) {
      let v = Number(n & mask);
      n >>= shiftBy;
      if (v > half) {
        v -= size;
        n += _1n3;
      }
      d.push(v);
    }
    if (n !== _0n3)
      throw new Error("invalid wnaf");
    return d;
  }
  function wnafWalk(zero, tables, digits) {
    let max = 0;
    for (const d of digits)
      max = Math.max(max, d.length);
    let acc = zero;
    for (let bit = max - 1; bit >= 0; bit--) {
      if (bit !== max - 1)
        acc = acc.double();
      for (let i = 0; i < digits.length; i++) {
        const w = digits[i][bit];
        if (w) {
          const item = tables[i][Math.abs(w) - 1 >> 1];
          acc = acc.add(w < 0 ? item.negate() : item);
        }
      }
    }
    return acc;
  }
  function mulAddUnsafe(c, points, scalars, allowOversized = false) {
    validatePointCons(c);
    validateMSMPoints(points, c);
    abool(allowOversized, "allowOversized");
    validateMSMScalars(scalars, c.Fn, allowOversized ? c.Fn.ORDER ** _4n2 : void 0);
    if (points.length !== scalars.length)
      throw new Error("arrays of points and scalars must have equal length");
    const tables = points.map((p) => oddMultiples(p, 4));
    const digits = scalars.map((n) => wnafDigits(n, 4));
    return wnafWalk(c.ZERO, tables, digits);
  }
  function createField(order, field, isLE) {
    if (field) {
      if (field.ORDER !== order)
        throw new Error("Field.ORDER must match order: Fp == p, Fn == n");
      validateField(field);
      return field;
    } else {
      return Field(order, { isLE });
    }
  }
  function createCurveFields(type, CURVE, curveOpts = {}, FpFnLE) {
    if (type !== "weierstrass" && type !== "edwards")
      throw new Error('expected curve type "weierstrass" or "edwards"');
    if (FpFnLE === void 0)
      FpFnLE = type === "edwards";
    if (!CURVE || typeof CURVE !== "object")
      throw new Error(`expected valid ${type} CURVE object`);
    validateObject(curveOpts);
    for (const p of ["p", "n", "h"]) {
      const val = CURVE[p];
      if (!(isPosBig(val) && val !== _0n3))
        throw new Error(`CURVE.${p} must be positive bigint`);
    }
    const Fp = createField(CURVE.p, curveOpts.Fp, FpFnLE);
    const Fn = createField(CURVE.n, curveOpts.Fn, FpFnLE);
    const _b = type === "weierstrass" ? "b" : "d";
    const params = ["Gx", "Gy", "a", _b];
    for (const p of params) {
      if (!Fp.isValid(CURVE[p]))
        throw new Error(`CURVE.${p} must be valid field element of CURVE.Fp`);
    }
    CURVE = Object.freeze(Object.assign({}, CURVE));
    return { CURVE, Fp, Fn };
  }
  function createKeygen(randomSecretKey, getPublicKey) {
    return function keygen(seed) {
      const secretKey = randomSecretKey(seed);
      return { secretKey, publicKey: getPublicKey(secretKey) };
    };
  }
  var _0n3, _1n3, _4n2, BLIND_BYTES, BLIND_BITS, FW_WINDOW, TABLE_BYTES_MAX, pointWindowSizes, ScalarMultiplier;
  var init_curve = __esm({
    "node_modules/@noble/curves/abstract/curve.js"() {
      init_utils2();
      init_modular();
      _0n3 = /* @__PURE__ */ BigInt(0);
      _1n3 = /* @__PURE__ */ BigInt(1);
      _4n2 = /* @__PURE__ */ BigInt(4);
      BLIND_BYTES = 16;
      BLIND_BITS = 128;
      FW_WINDOW = 5;
      TABLE_BYTES_MAX = /* @__PURE__ */ (() => 2 ** 31)();
      pointWindowSizes = /* @__PURE__ */ new WeakMap();
      ScalarMultiplier = class {
        Point;
        BASE;
        ZERO;
        randomBytes;
        wnafPrecomputes = /* @__PURE__ */ new WeakMap();
        baseCanBeBlinded;
        bits;
        // Parametrized with a given Point class (not individual point)
        constructor(Point, randomBytes3) {
          validatePointCons(Point);
          this.randomBytes = probeRandomBytes(randomBytes3, BLIND_BYTES);
          this.Point = Point;
          this.BASE = Point.BASE;
          this.ZERO = Point.ZERO;
          this.bits = Point.Fn.BITS;
        }
        /**
         * Creates a signed fixed-window wNAF precomputation table: for every window w, the
         * multiples `[1..2^(W−1)]⋅2^(w⋅W)⋅P`, flattened. All doublings are baked into the table,
         * so cached multiplication is additions-only. `windows = ceil(bits/W) + 1`: the extra
         * window absorbs the final carry of signed-digit recoding.
         * For a 256-bit curve and W=6, the table is 44⋅32 = 1408 points.
         * @param point - Point instance
         * @param W - window size
         * @param bits - scalar bitlength the table must cover
         */
        buildWnafTable(point, W, bits) {
          const windows = Math.ceil(bits / W) + 1;
          const half = 2 ** (W - 1);
          const comp = [];
          let base = point;
          for (let w = 0; w < windows; w++) {
            let acc = base;
            for (let i = 0; i < half; i++) {
              comp.push(acc);
              acc = acc.add(base);
            }
            base = comp[comp.length - 1].double();
          }
          return { W, bits, windows, comp };
        }
        /**
         * Implements ec multiplication using precomputed signed fixed-window wNAF tables.
         * Constant-time: fixed window count with one table addition per window — zero digits feed
         * the fake accumulator — and no doublings; the lookup scans the whole window slice.
         * Scalar bounds are validated by the public entry points ({@link ScalarMultiplier.mulCT},
         * {@link ScalarMultiplier.mulCTBlinded}, {@link ScalarMultiplier.mulUnsafe});
         * signedWindowDigits throws if `n` exceeds the table.
         * @returns real and fake (for const-time) points
         */
        wnafCachedCT(precomputes, n) {
          const { W, windows, comp } = precomputes;
          const half = 2 ** (W - 1);
          const digits = signedWindowDigits(n, W, windows);
          let p = this.ZERO;
          let f = this.BASE;
          for (let w = 0; w < windows; w++) {
            const digit = digits[w];
            const start = w * half;
            const idx = Math.abs(digit) - 1;
            let sel = comp[start];
            for (let i = 1; i < half; i++)
              sel = i === idx ? comp[start + i] : sel;
            const neg = sel.negate();
            if (digit === 0)
              f = f.add(comp[start]);
            else
              p = p.add(digit < 0 ? neg : sel);
          }
          return { p, f };
        }
        // Cache key is point identity plus (W, bits); at most two entries exist per point (public-width
        // `Fn.BITS` and blinded `Fn.BITS + BLIND_BITS`). Callers must not reuse the same point with
        // incompatible `transform(...)` layouts and expect a separate cache entry.
        getWnafPrecomputes(W, point, bits, transform) {
          let entries = this.wnafPrecomputes.get(point);
          let comp = entries?.find((entry) => entry.W === W && entry.bits === bits);
          if (!comp) {
            comp = this.buildWnafTable(point, W, bits);
            if (typeof transform === "function")
              comp = { ...comp, comp: transform(comp.comp) };
            if (!entries) {
              entries = [];
              this.wnafPrecomputes.set(point, entries);
            }
            entries.push(comp);
          }
          return comp;
        }
        assertPoint(point) {
          if (!(point instanceof this.Point))
            throw new TypeError('"point" expected Point instance, got type=' + typeof point);
        }
        // Shared prologue of the constant-time entry points. Rejects scalar 0: in key/signature-style
        // callers a zero scalar means broken upstream plumbing, and concrete Points already reject it.
        // Uses inRange instead of Fn.isValidNot0: validateField() only certifies the arithmetic subset.
        validateMulInput(point, scalar) {
          this.assertPoint(point);
          if (!inRange(scalar, _1n3, this.Point.Fn.ORDER))
            throw new Error("invalid scalar");
        }
        // Constant-time dispatch shared by mulCT / mulCTBlinded. Un-precomputed points (W===1, e.g.
        // ECDH peer keys) skip building a throwaway cached table in favor of a small fixed-window
        // multiply. `n` must be < 2^bits.
        runCT(point, n, bits, transform) {
          const W = getWindowSize(point);
          if (W === 1)
            return this.fixedWindowCT(point, n, bits);
          return this.wnafCachedCT(this.getWnafPrecomputes(W, point, bits, transform), n);
        }
        mulCT(point, scalar, transform) {
          this.validateMulInput(point, scalar);
          return this.runCT(point, scalar, this.bits, transform);
        }
        mulCTBlinded(point, scalar, transform) {
          this.validateMulInput(point, scalar);
          if (this.randomBytes === void 0)
            throw new Error("randomBytes is required for scalar blinding");
          const bits = this.Point.Fn.BITS + BLIND_BITS;
          const blind = this.randomBytes(BLIND_BYTES);
          if (!isBytes2(blind) || blind.length !== BLIND_BYTES)
            throw new Error("randomBytes returned invalid byte array");
          blind[0] = blind[0] & 63 | 128;
          const n = scalar + bytesToNumberBE(blind) * this.Point.Fn.ORDER;
          return this.runCT(point, n, bits, transform);
        }
        /**
         * Constant-time multiplication `n*point` for an un-precomputed point, via a small fixed window.
         * A cached wNAF table only pays off when reused; a flat 2^FW_WINDOW table (`size-1` adds) is
         * far cheaper to build for a single use. The point-operation sequence is independent of `n`:
         * build the table, then per window exactly FW_WINDOW doublings, a data-oblivious scan over
         * every table entry, and one addition (adds the identity when the window digit is 0 — never
         * skipped).
         *
         * `n` must be `< 2^bits`. Assumes complete addition (adding the identity costs the same as any
         * add), which holds for the Weierstrass/Edwards point types used here. The table is left in
         * projective form (no normalizeZ): normalizing this small a table costs more than the
         * mixed-add savings it would buy for a single multiply.
         * @returns real point `p`; `f` duplicates it only to match {@link wnafCachedCT}'s return shape
         * (this path needs no fake accumulator — its op-count is already scalar-independent).
         */
        fixedWindowCT(point, n, bits) {
          const W = FW_WINDOW;
          const size = 1 << W;
          const mask = bitMask(W);
          const table = new Array(size);
          table[0] = this.ZERO;
          for (let i = 1; i < size; i++)
            table[i] = table[i - 1].add(point);
          const windows = Math.ceil(bits / W);
          let acc = this.ZERO;
          for (let window = windows - 1; window >= 0; window--) {
            if (window !== windows - 1)
              for (let d = 0; d < W; d++)
                acc = acc.double();
            const digit = Number(n >> BigInt(window * W) & mask);
            let sel = table[0];
            for (let i = 1; i < size; i++)
              sel = i === digit ? table[i] : sel;
            acc = acc.add(sel);
          }
          return { p: acc, f: acc };
        }
        shouldBlind(point, cofactor) {
          if (this.randomBytes === void 0)
            return false;
          if (cofactor === _1n3)
            return true;
          if (point !== this.BASE)
            return false;
          if (this.baseCanBeBlinded === void 0)
            this.baseCanBeBlinded = this.mulUnsafe(this.BASE, this.Point.Fn.ORDER).is0();
          return this.baseCanBeBlinded;
        }
        mulSecret(point, scalar, cofactor, transform) {
          return this.shouldBlind(point, cofactor) ? this.mulCTBlinded(point, scalar, transform) : this.mulCT(point, scalar, transform);
        }
        mulUnsafe(point, scalar, transform) {
          this.assertPoint(point);
          if (!isPosBig(scalar))
            throw new Error("invalid scalar");
          const W = getWindowSize(point);
          if (W === 1 || scalar >= this.Point.Fn.ORDER)
            return mulAddUnsafe(this.Point, [point], [scalar], true);
          const precomputes = this.getWnafPrecomputes(W, point, this.bits, transform);
          return this.wnafCachedCT(precomputes, scalar).p;
        }
        // Remembers the window size used for precomputed wNAF multiplication of the given point
        // and drops any previously built tables. Usually only the base point is precomputed.
        // W=1 resets the point to the un-precomputed (table-less) paths.
        // W is additionally capped so tables stay under ~2 GiB ({@link TABLE_BYTES_MAX}).
        setWindowSize(point, W) {
          this.assertPoint(point);
          validateW(W, this.bits);
          const windows = Math.ceil((this.bits + BLIND_BITS) / W) + 1;
          validateTableBytes(windows * 2 ** (W - 1), this.Point.Fp.BYTES);
          pointWindowSizes.set(point, W);
          this.wnafPrecomputes.delete(point);
        }
        // True when a window size is set: tables themselves are built lazily on first multiply.
        hasWindowSize(point) {
          return getWindowSize(point) !== 1;
        }
      };
    }
  });

  // node_modules/@noble/curves/abstract/fft.js
  function checkU32(n, title = "n") {
    if (typeof n !== "number")
      throw new TypeError(`wrong u32 integer "${title}": expected number, got type=${typeof n}`);
    if (!Number.isSafeInteger(n) || n < 0 || n > 4294967295)
      throw new RangeError(`wrong u32 integer "${title}": expected 0..4294967295, got ${n}`);
    return n;
  }
  function isPowerOfTwo(x) {
    checkU32(x, "x");
    return (x & x - 1) === 0 && x !== 0;
  }
  function nextPowerOfTwo(n) {
    checkU32(n);
    if (n <= 1)
      return 1;
    if (n > 2147483648)
      throw new Error("nextPowerOfTwo overflow: result does not fit u32");
    return 1 << log2(n - 1) + 1 >>> 0;
  }
  function log2(n) {
    checkU32(n);
    return 31 - Math.clz32(n);
  }
  function poly(field, roots, create, fft, length) {
    validateField(field);
    const F = field;
    const _create = create || ((len, elm) => new Array(len).fill(elm ?? F.ZERO));
    const isPoly = (x) => {
      if (Array.isArray(x))
        return true;
      if (!ArrayBuffer.isView(x))
        return false;
      const v = x;
      return typeof v.length === "number" && typeof v.slice === "function" && typeof v[Symbol.iterator] === "function";
    };
    const checkPoly = (title, value) => {
      if (!isPoly(value))
        throw new TypeError(`"${title}" expected polynomial, got type=${typeof value}`);
    };
    const checkLength = (a, b) => {
      checkPoly("a", a);
      const L = a.length;
      if (b !== void 0) {
        checkPoly("b", b);
        if (b.length !== L)
          throw new Error(`poly: mismatched lengths ${L} vs ${b.length}`);
      }
      if (length !== void 0 && L !== length)
        throw new Error(`poly: expected fixed length ${length}, got ${L}`);
      return L;
    };
    function findOmegaIndex(x, n, brp = false, weights) {
      if (!isPowerOfTwo(n))
        throw new Error("poly.lagrange: expected power of two length, got " + n);
      const omega = weights || (brp ? roots.brp(log2(n)) : roots.roots(log2(n)));
      for (let i = 0; i < n; i++)
        if (F.eql(x, omega[i]))
          return i;
      return -1;
    }
    return {
      roots,
      create: _create,
      length,
      extend: (a, len) => {
        checkLength(a);
        const out = _create(len, F.ZERO);
        for (let i = 0; i < Math.min(a.length, len); i++)
          out[i] = a[i];
        return out;
      },
      degree: (a) => {
        checkLength(a);
        for (let i = a.length - 1; i >= 0; i--)
          if (!F.is0(a[i]))
            return i;
        return -1;
      },
      add: (a, b) => {
        const len = checkLength(a, b);
        const out = _create(len);
        for (let i = 0; i < len; i++)
          out[i] = F.add(a[i], b[i]);
        return out;
      },
      sub: (a, b) => {
        const len = checkLength(a, b);
        const out = _create(len);
        for (let i = 0; i < len; i++)
          out[i] = F.sub(a[i], b[i]);
        return out;
      },
      dot: (a, b) => {
        const len = checkLength(a, b);
        const out = _create(len);
        for (let i = 0; i < len; i++)
          out[i] = F.mul(a[i], b[i]);
        return out;
      },
      mul: (a, b) => {
        if (isPoly(b)) {
          const len = checkLength(a, b);
          if (fft) {
            const A = fft.direct(a, false, true);
            const B = fft.direct(b, false, true);
            for (let i = 0; i < A.length; i++)
              A[i] = F.mul(A[i], B[i]);
            return fft.inverse(A, true, false);
          } else {
            const res = _create(len);
            for (let i = 0; i < len; i++) {
              for (let j = 0; j < len; j++) {
                const k = (i + j) % len;
                res[k] = F.add(res[k], F.mul(a[i], b[j]));
              }
            }
            return res;
          }
        } else {
          const out = _create(checkLength(a));
          for (let i = 0; i < out.length; i++)
            out[i] = F.mul(a[i], b);
          return out;
        }
      },
      convolve(a, b) {
        checkPoly("a", a);
        checkPoly("b", b);
        const len = nextPowerOfTwo(a.length + b.length - 1);
        return this.mul(this.extend(a, len), this.extend(b, len));
      },
      shift(p, factor) {
        checkPoly("p", p);
        const out = _create(p.length);
        if (length !== void 0 && p.length !== length)
          throw new Error(`poly: expected fixed length ${length}, got ${p.length}`);
        if (!p.length)
          return out;
        out[0] = p[0];
        for (let i = 1, power = F.ONE; i < p.length; i++) {
          power = F.mul(power, factor);
          out[i] = F.mul(p[i], power);
        }
        return out;
      },
      clone: (a) => {
        checkLength(a);
        const out = _create(a.length);
        for (let i = 0; i < a.length; i++)
          out[i] = a[i];
        return out;
      },
      eval: (a, basis) => {
        checkLength(a, basis);
        let acc = F.ZERO;
        for (let i = 0; i < a.length; i++)
          acc = F.add(acc, F.mul(a[i], basis[i]));
        return acc;
      },
      monomial: {
        basis: (x, n) => {
          const out = _create(n);
          let pow3 = F.ONE;
          for (let i = 0; i < n; i++) {
            out[i] = pow3;
            pow3 = F.mul(pow3, x);
          }
          return out;
        },
        eval: (a, x) => {
          checkLength(a);
          let acc = F.ZERO;
          for (let i = a.length - 1; i >= 0; i--)
            acc = F.add(F.mul(acc, x), a[i]);
          return acc;
        }
      },
      lagrange: {
        basis: (x, n, brp = false, weights) => {
          if (!isPowerOfTwo(n))
            throw new Error("poly.lagrange: expected power of two length, got " + n);
          const bits = log2(n);
          const cache = weights || (brp ? roots.brp(bits) : roots.roots(bits));
          const out = _create(n);
          const idx = findOmegaIndex(x, n, brp, weights);
          if (idx !== -1) {
            out[idx] = F.ONE;
            return out;
          }
          const tm = F.pow(x, BigInt(n));
          const c = F.mul(F.sub(tm, F.ONE), F.inv(BigInt(n)));
          const denom = _create(n);
          for (let i = 0; i < n; i++)
            denom[i] = F.sub(x, cache[i]);
          const inv = F.invertBatch(denom);
          for (let i = 0; i < n; i++)
            out[i] = F.mul(c, F.mul(cache[i], inv[i]));
          return out;
        },
        eval(a, x, brp = false) {
          checkLength(a);
          const idx = findOmegaIndex(x, a.length, brp);
          if (idx !== -1)
            return a[idx];
          const L = this.basis(x, a.length, brp);
          let acc = F.ZERO;
          for (let i = 0; i < a.length; i++)
            if (!F.is0(a[i]))
              acc = F.add(acc, F.mul(a[i], L[i]));
          return acc;
        }
      },
      vanishing(roots2) {
        checkPoly("roots", roots2);
        if (length !== void 0 && roots2.length !== length)
          throw new Error(`poly: expected fixed length ${length}, got ${roots2.length}`);
        const out = _create(roots2.length + 1, F.ZERO);
        out[0] = F.ONE;
        for (const r of roots2) {
          const neg = F.neg(r);
          for (let j = out.length - 1; j > 0; j--)
            out[j] = F.add(F.mul(out[j], neg), out[j - 1]);
          out[0] = F.mul(out[0], neg);
        }
        return out;
      }
    };
  }
  var init_fft = __esm({
    "node_modules/@noble/curves/abstract/fft.js"() {
      init_modular();
    }
  });

  // node_modules/@noble/curves/abstract/hash-to-curve.js
  function i2osp(value, length) {
    asafenumber(value);
    asafenumber(length);
    if (length < 0 || length > 4)
      throw new Error("invalid I2OSP length: " + length);
    if (value < 0 || value > 2 ** (8 * length) - 1)
      throw new Error("invalid I2OSP input: " + value);
    const res = Array.from({ length }).fill(0);
    for (let i = length - 1; i >= 0; i--) {
      res[i] = value & 255;
      value >>>= 8;
    }
    return new Uint8Array(res);
  }
  function strxor(a, b) {
    const arr = new Uint8Array(a.length);
    for (let i = 0; i < a.length; i++) {
      arr[i] = a[i] ^ b[i];
    }
    return arr;
  }
  function normDST(DST) {
    if (!isBytes2(DST) && typeof DST !== "string")
      throw new Error("DST must be Uint8Array or ascii string");
    const dst = typeof DST === "string" ? asciiToBytes(DST) : DST;
    if (dst.length === 0)
      throw new Error("DST must be non-empty");
    return dst;
  }
  function expand_message_xmd(msg, DST, lenInBytes, H) {
    abytes2(msg);
    asafenumber(lenInBytes);
    if (typeof H !== "function")
      throw new Error("expand_message_xmd: expected hash function");
    asafenumber(H.outputLen, "hash.outputLen");
    asafenumber(H.blockLen, "hash.blockLen");
    DST = normDST(DST);
    if (DST.length > 255)
      DST = H(concatBytes2(asciiToBytes("H2C-OVERSIZE-DST-"), DST));
    const { outputLen: b_in_bytes, blockLen: r_in_bytes } = H;
    const ell = Math.ceil(lenInBytes / b_in_bytes);
    if (lenInBytes > 65535 || ell > 255)
      throw new Error("expand_message_xmd: invalid lenInBytes");
    const DST_prime = concatBytes2(DST, i2osp(DST.length, 1));
    const Z_pad = new Uint8Array(r_in_bytes);
    const l_i_b_str = i2osp(lenInBytes, 2);
    const b = new Array(ell);
    const b_0 = H(concatBytes2(Z_pad, msg, l_i_b_str, i2osp(0, 1), DST_prime));
    b[0] = H(concatBytes2(b_0, i2osp(1, 1), DST_prime));
    for (let i = 1; i < ell; i++) {
      const args = [strxor(b_0, b[i - 1]), i2osp(i + 1, 1), DST_prime];
      b[i] = H(concatBytes2(...args));
    }
    const pseudo_random_bytes = concatBytes2(...b);
    return pseudo_random_bytes.slice(0, lenInBytes);
  }
  function expand_message_xof(msg, DST, lenInBytes, k, H) {
    abytes2(msg);
    asafenumber(lenInBytes);
    asafenumber(k, "k");
    if (k < 0)
      throw new Error("expand_message_xof: invalid k");
    if (typeof H !== "function")
      throw new Error("expand_message_xof: expected XOF function");
    if (typeof H.create !== "function")
      throw new Error("expand_message_xof: expected XOF create");
    DST = normDST(DST);
    if (lenInBytes < 0 || lenInBytes > 65535)
      throw new Error("expand_message_xof: invalid lenInBytes");
    if (DST.length > 255) {
      const dkLen = Math.ceil(2 * k / 8);
      DST = H.create({ dkLen }).update(asciiToBytes("H2C-OVERSIZE-DST-")).update(DST).digest();
    }
    if (DST.length > 255)
      throw new Error("expand_message_xof: invalid DST");
    return H.create({ dkLen: lenInBytes }).update(msg).update(i2osp(lenInBytes, 2)).update(DST).update(i2osp(DST.length, 1)).digest();
  }
  function hash_to_field(msg, count, options) {
    validateObject(options, {
      p: "bigint",
      m: "number",
      k: "number",
      hash: "function"
    });
    const { p, k, m, hash, expand, DST } = options;
    asafenumber(hash.outputLen, "valid hash");
    abytes2(msg);
    asafenumber(count);
    asafenumber(m, "m");
    asafenumber(k, "k");
    if (p <= BigInt(1))
      throw new Error("hash_to_field: expected valid field characteristic");
    if (count < 1)
      throw new Error("hash_to_field: expected count >= 1");
    if (m < 1)
      throw new Error("hash_to_field: expected m >= 1");
    if (k < 0)
      throw new Error("hash_to_field: invalid k");
    const log2p = p.toString(2).length;
    const L = Math.ceil((log2p + k) / 8);
    const len_in_bytes = count * m * L;
    let prb;
    if (expand === "xmd") {
      prb = expand_message_xmd(msg, DST, len_in_bytes, hash);
    } else if (expand === "xof") {
      prb = expand_message_xof(msg, DST, len_in_bytes, k, hash);
    } else if (expand === "_internal_pass") {
      prb = msg;
    } else {
      throw new Error('expand must be "xmd" or "xof"');
    }
    const u = new Array(count);
    for (let i = 0; i < count; i++) {
      const e = new Array(m);
      for (let j = 0; j < m; j++) {
        const elm_offset = L * (j + i * m);
        const tv = prb.subarray(elm_offset, elm_offset + L);
        e[j] = mod(os2ip(tv), p);
      }
      u[i] = e;
    }
    return u;
  }
  function isogenyMap(field, map) {
    validateField(field);
    aarray(map, "map");
    const coeff = map.map((i, row) => {
      aarray(i, "map[" + row + "]");
      if (i.length < 1)
        throw new Error("isogenyMap: expected non-empty coefficients");
      return Array.from(i).reverse();
    });
    return (x, y) => {
      const [xn, xd, yn, yd] = coeff.map((val) => val.reduce((acc, i) => field.add(field.mul(acc, x), i)));
      const isZero = field.is0(xd) || field.is0(yd);
      const [xd_inv, yd_inv] = FpInvertBatch(field, [xd, yd], true);
      x = field.mul(xn, xd_inv);
      y = field.mul(y, field.mul(yn, yd_inv));
      return isZero ? { x: field.ZERO, y: field.ZERO } : { x, y };
    };
  }
  function createHasher2(Point, mapToCurve, defaults) {
    if (typeof mapToCurve !== "function")
      throw new Error("mapToCurve() must be defined");
    validateObject(defaults);
    const snapshot = (src) => Object.freeze({
      ...src,
      DST: isBytes2(src.DST) ? copyBytes(src.DST) : src.DST,
      ...src.encodeDST === void 0 ? {} : { encodeDST: isBytes2(src.encodeDST) ? copyBytes(src.encodeDST) : src.encodeDST }
    });
    const safeDefaults = snapshot(defaults);
    const dstOverride = (options) => options && options.DST !== void 0 ? { DST: options.DST } : void 0;
    function map(num2) {
      return Point.fromAffine(mapToCurve(num2));
    }
    function clear(initial) {
      const P = initial.clearCofactor();
      if (P.equals(Point.ZERO))
        return Point.ZERO;
      P.assertValidity();
      return P;
    }
    return Object.freeze({
      get defaults() {
        return snapshot(safeDefaults);
      },
      Point,
      hashToCurve(msg, options) {
        const opts = Object.assign({}, safeDefaults, dstOverride(options));
        const u = hash_to_field(msg, 2, opts);
        const u0 = map(u[0]);
        const u1 = map(u[1]);
        return clear(u0.add(u1));
      },
      encodeToCurve(msg, options) {
        const optsDst = safeDefaults.encodeDST === void 0 ? {} : { DST: safeDefaults.encodeDST };
        const opts = Object.assign({}, safeDefaults, optsDst, dstOverride(options));
        const u = hash_to_field(msg, 1, opts);
        const u0 = map(u[0]);
        return clear(u0);
      },
      /** See {@link H2CHasher} */
      mapToCurve(scalars) {
        if (safeDefaults.m === 1) {
          if (typeof scalars !== "bigint")
            throw new Error("expected bigint (m=1)");
          return clear(map([scalars]));
        }
        if (!Array.isArray(scalars))
          throw new Error("expected array of bigints");
        if (scalars.length !== safeDefaults.m)
          throw new Error(`expected array of ${safeDefaults.m} bigints`);
        for (const i of scalars)
          if (typeof i !== "bigint")
            throw new Error("expected array of bigints");
        return clear(map(scalars));
      },
      // hash_to_scalar can produce 0: https://www.rfc-editor.org/errata/eid8393
      // RFC 9380, draft-irtf-cfrg-bbs-signatures-08. Default scalar DST is the shared generic
      // `HashToScalar-` prefix above unless the caller overrides it per invocation.
      hashToScalar(msg, options) {
        const N = Point.Fn.ORDER;
        const opts = Object.assign({}, safeDefaults, { DST: _DST_scalar }, dstOverride(options), {
          p: N,
          m: 1
        });
        return hash_to_field(msg, 1, opts)[0][0];
      }
    });
  }
  function SWUFpSqrtRatio(Fp, Z) {
    const F = validateField(Fp);
    const q = F.ORDER;
    let l = _0n4;
    for (let o = q - _1n4; o % _2n2 === _0n4; o /= _2n2)
      l += _1n4;
    const c1 = l;
    const _2n_pow_c1_1 = _2n2 << c1 - _1n4 - _1n4;
    const _2n_pow_c1 = _2n_pow_c1_1 * _2n2;
    const c2 = (q - _1n4) / _2n_pow_c1;
    const c3 = (c2 - _1n4) / _2n2;
    const c4 = _2n_pow_c1 - _1n4;
    const c5 = _2n_pow_c1_1;
    const c6 = F.pow(Z, c2);
    const c7 = F.pow(Z, (c2 + _1n4) / _2n2);
    let sqrtRatio = (u, v) => {
      let tv1 = c6;
      let tv2 = F.pow(v, c4);
      let tv3 = F.sqr(tv2);
      tv3 = F.mul(tv3, v);
      let tv5 = F.mul(u, tv3);
      tv5 = F.pow(tv5, c3);
      tv5 = F.mul(tv5, tv2);
      tv2 = F.mul(tv5, v);
      tv3 = F.mul(tv5, u);
      let tv4 = F.mul(tv3, tv2);
      tv5 = F.pow(tv4, c5);
      let isQR = F.eql(tv5, F.ONE);
      tv2 = F.mul(tv3, c7);
      tv5 = F.mul(tv4, tv1);
      tv3 = F.cmov(tv2, tv3, isQR);
      tv4 = F.cmov(tv5, tv4, isQR);
      for (let i = c1; i > _1n4; i--) {
        let tv52 = i - _2n2;
        tv52 = _2n2 << tv52 - _1n4;
        let tvv5 = F.pow(tv4, tv52);
        const e1 = F.eql(tvv5, F.ONE);
        tv2 = F.mul(tv3, tv1);
        tv1 = F.mul(tv1, tv1);
        tvv5 = F.mul(tv4, tv1);
        tv3 = F.cmov(tv2, tv3, e1);
        tv4 = F.cmov(tvv5, tv4, e1);
      }
      return { isValid: !F.is0(v) && (isQR || F.is0(u)), value: tv3 };
    };
    if (F.ORDER % _4n3 === _3n2) {
      const c12 = (F.ORDER - _3n2) / _4n3;
      const c22 = F.sqrt(F.neg(Z));
      sqrtRatio = (u, v) => {
        let tv1 = F.sqr(v);
        const tv2 = F.mul(u, v);
        tv1 = F.mul(tv1, tv2);
        let y1 = F.pow(tv1, c12);
        y1 = F.mul(y1, tv2);
        const y2 = F.mul(y1, c22);
        const tv3 = F.mul(F.sqr(y1), v);
        const isQR = F.eql(tv3, u);
        let y = F.cmov(y2, y1, isQR);
        return { isValid: !F.is0(v) && isQR, value: y };
      };
    }
    return sqrtRatio;
  }
  function mapToCurveSimpleSWU(Fp, opts) {
    const F = validateField(Fp);
    validateObject(opts, {}, {}, "opts");
    const { A, B, Z } = opts;
    if (!F.isValidNot0(A) || !F.isValidNot0(B) || !F.isValid(Z))
      throw new Error("mapToCurveSimpleSWU: invalid opts");
    if (F.eql(Z, F.neg(F.ONE)) || FpIsSquare(F, Z))
      throw new Error("mapToCurveSimpleSWU: invalid opts");
    const x = F.mul(B, F.inv(F.mul(Z, A)));
    const gx = F.add(F.add(F.mul(F.sqr(x), x), F.mul(A, x)), B);
    if (!FpIsSquare(F, gx))
      throw new Error("mapToCurveSimpleSWU: invalid opts");
    const sqrtRatio = SWUFpSqrtRatio(F, Z);
    if (!F.isOdd)
      throw new Error("Field does not have .isOdd()");
    return (u) => {
      let tv1, tv2, tv3, tv4, tv5, tv6, x2, y;
      tv1 = F.sqr(u);
      tv1 = F.mul(tv1, Z);
      tv2 = F.sqr(tv1);
      tv2 = F.add(tv2, tv1);
      tv3 = F.add(tv2, F.ONE);
      tv3 = F.mul(tv3, B);
      tv4 = F.cmov(Z, F.neg(tv2), !F.eql(tv2, F.ZERO));
      tv4 = F.mul(tv4, A);
      tv2 = F.sqr(tv3);
      tv6 = F.sqr(tv4);
      tv5 = F.mul(tv6, A);
      tv2 = F.add(tv2, tv5);
      tv2 = F.mul(tv2, tv3);
      tv6 = F.mul(tv6, tv4);
      tv5 = F.mul(tv6, B);
      tv2 = F.add(tv2, tv5);
      x2 = F.mul(tv1, tv3);
      const { isValid, value } = sqrtRatio(tv2, tv6);
      y = F.mul(tv1, u);
      y = F.mul(y, value);
      x2 = F.cmov(x2, tv3, isValid);
      y = F.cmov(y, value, isValid);
      const e1 = F.isOdd(u) === F.isOdd(y);
      y = F.cmov(F.neg(y), y, e1);
      const tv4_inv = FpInvertBatch(F, [tv4], true)[0];
      x2 = F.mul(x2, tv4_inv);
      return { x: x2, y };
    };
  }
  var _0n4, _1n4, _2n2, _3n2, _4n3, os2ip, _DST_scalar;
  var init_hash_to_curve = __esm({
    "node_modules/@noble/curves/abstract/hash-to-curve.js"() {
      init_utils2();
      init_modular();
      _0n4 = /* @__PURE__ */ BigInt(0);
      _1n4 = /* @__PURE__ */ BigInt(1);
      _2n2 = /* @__PURE__ */ BigInt(2);
      _3n2 = /* @__PURE__ */ BigInt(3);
      _4n3 = /* @__PURE__ */ BigInt(4);
      os2ip = bytesToNumberBE;
      _DST_scalar = "HashToScalar-";
    }
  });

  // node_modules/@noble/curves/abstract/frost.js
  function createFROST(opts) {
    validateObject(opts, {
      name: "string",
      hash: "function"
    }, {
      hashToScalar: "function",
      validatePoint: "function",
      parsePublicKey: "function",
      adjustScalar: "function",
      adjustPoint: "function",
      challenge: "function",
      adjustNonces: "function",
      adjustSecret: "function",
      adjustPublic: "function",
      adjustGroupCommitmentShare: "function",
      adjustTx: "object",
      adjustDKG: "function"
    });
    validatePointCons(opts.Point);
    const { Point, validatePoint, parsePublicKey, adjustScalar, adjustPoint: adjustPointHook, challenge: challenge2, adjustNonces, adjustSecret, adjustPublic, adjustGroupCommitmentShare, adjustDKG } = opts;
    const Fn = opts.Fn === void 0 ? Point.Fn : opts.Fn;
    const adjustTx = opts.adjustTx === void 0 ? void 0 : { encode: opts.adjustTx.encode, decode: opts.adjustTx.decode };
    if (adjustTx)
      validateObject(adjustTx, { encode: "function", decode: "function" });
    const hashBytes = opts.hash;
    const hashToScalar = opts.hashToScalar === void 0 ? (msg, opts2 = { DST: new Uint8Array() }) => {
      const t = hashBytes(concatBytes2(opts2.DST, msg));
      return Fn.create(Fn.isLE ? bytesToNumberLE(t) : bytesToNumberBE(t));
    } : opts.hashToScalar;
    const H1Prefix = utf8ToBytes(opts.H1 !== void 0 ? opts.H1 : opts.name + "rho");
    const H2Prefix = utf8ToBytes(opts.H2 !== void 0 ? opts.H2 : opts.name + "chal");
    const H3Prefix = utf8ToBytes(opts.H3 !== void 0 ? opts.H3 : opts.name + "nonce");
    const H4Prefix = utf8ToBytes(opts.H4 !== void 0 ? opts.H4 : opts.name + "msg");
    const H5Prefix = utf8ToBytes(opts.H5 !== void 0 ? opts.H5 : opts.name + "com");
    const HDKGPrefix = utf8ToBytes(opts.HDKG !== void 0 ? opts.HDKG : opts.name + "dkg");
    const HIDPrefix = utf8ToBytes(opts.HID !== void 0 ? opts.HID : opts.name + "id");
    const H1 = (msg) => hashToScalar(msg, { DST: H1Prefix });
    const H2 = (msg) => hashToScalar(msg, { DST: H2Prefix });
    const H3 = (msg) => hashToScalar(msg, { DST: H3Prefix });
    const H4 = (msg) => hashBytes(concatBytes2(H4Prefix, msg));
    const H5 = (msg) => hashBytes(concatBytes2(H5Prefix, msg));
    const HDKG = (msg) => hashToScalar(msg, { DST: HDKGPrefix });
    const HID = (msg) => hashToScalar(msg, { DST: HIDPrefix });
    const randomScalar = (rng = randomBytes2) => {
      if (typeof rng !== "function")
        throw new TypeError('"rng" expected function, got type=' + typeof rng);
      const t = mapHashToField(rng(getMinHashLength(Fn.ORDER)), Fn.ORDER, Fn.isLE);
      return Fn.isLE ? bytesToNumberLE(t) : bytesToNumberBE(t);
    };
    const serializePoint = (p) => p.toBytes();
    const validatePublicPoint = (p) => {
      p.assertValidity();
      if (p.is0())
        throw new Error("invalid point: identity");
      if (!p.isTorsionFree())
        throw new Error("bad point: not in prime-order subgroup");
      if (validatePoint)
        validatePoint(p);
      return p;
    };
    const parsePoint = (bytes) => validatePublicPoint(Point.fromBytes(bytes));
    const nonceCommitments = (identifier, nonces) => ({
      identifier,
      hiding: serializePoint(Point.BASE.multiply(Fn.fromBytes(nonces.hiding))),
      binding: serializePoint(Point.BASE.multiply(Fn.fromBytes(nonces.binding)))
    });
    const adjustPoint = adjustPointHook === void 0 ? (n) => n : adjustPointHook;
    const validateIdentifier = (n) => {
      if (!Fn.isValid(n) || Fn.is0(n))
        throw new Error("Invalid identifier " + n);
      return n;
    };
    const serializeIdentifier = (id) => bytesToHex2(Fn.toBytes(validateIdentifier(id)));
    const parseIdentifier = (id, title = "identifier") => {
      astring(id, title);
      const n = validateIdentifier(Fn.fromBytes(hexToBytes2(id)));
      if (serializeIdentifier(n) !== id)
        throw new Error("expected canonical identifier hex");
      return n;
    };
    const copyRound1Package = (p) => ({
      identifier: serializeIdentifier(parseIdentifier(p.identifier)),
      commitment: p.commitment.map((c) => copyBytes(c)),
      proofOfKnowledge: copyBytes(p.proofOfKnowledge)
    });
    const canonicalRound1Packages = (packages) => {
      const snapshot = packages.map(copyRound1Package);
      snapshot.sort((a, b) => {
        const ai = parseIdentifier(a.identifier);
        const bi = parseIdentifier(b.identifier);
        return ai < bi ? -1 : ai > bi ? 1 : 0;
      });
      return snapshot;
    };
    const equalRound1Transcripts = (a, b) => {
      if (a.length !== b.length)
        return false;
      for (let i = 0; i < a.length; i++) {
        const p = a[i];
        const q = b[i];
        if (p.identifier !== q.identifier || p.commitment.length !== q.commitment.length)
          return false;
        for (let j = 0; j < p.commitment.length; j++) {
          if (!equalBytes(p.commitment[j], q.commitment[j]))
            return false;
        }
        if (!equalBytes(p.proofOfKnowledge, q.proofOfKnowledge))
          return false;
      }
      return true;
    };
    const Signature = {
      // RFC 9591 Appendix A encodes signatures canonically as
      // SerializeElement(R) || SerializeScalar(z).
      encode: (R, z) => {
        let res = concatBytes2(serializePoint(R), Fn.toBytes(z));
        if (adjustTx)
          res = adjustTx.encode(res);
        return res;
      },
      decode: (sig) => {
        if (adjustTx)
          sig = adjustTx.decode(sig);
        const Rbytes = sig.subarray(0, -Fn.BYTES);
        const R = parsePoint(Rbytes);
        if (serializePoint(R).length !== Rbytes.length)
          throw new Error("invalid signature encoding");
        const z = Fn.fromBytes(sig.subarray(-Fn.BYTES));
        return { R, z };
      }
    };
    const genPointScalarPair = (rng = randomBytes2) => {
      let n = randomScalar(rng);
      if (adjustScalar)
        n = adjustScalar(n);
      let p = Point.BASE.multiply(n);
      return { scalar: n, point: p };
    };
    const nrErr = "roots are unavailable in FROST polynomial mode";
    const noRoots = {
      info: { G: Fn.ZERO, oddFactor: Fn.ZERO, powerOfTwo: 0 },
      roots() {
        throw new Error(nrErr);
      },
      brp() {
        throw new Error(nrErr);
      },
      inverse() {
        throw new Error(nrErr);
      },
      omega() {
        throw new Error(nrErr);
      },
      clear() {
      }
    };
    const Poly = poly(Fn, noRoots);
    const msm = (points, scalars) => mulAddUnsafe(Point, points, scalars);
    const polynomialEvaluate = (x, coeffs) => {
      if (!coeffs.length)
        throw new Error("empty coefficients");
      return Poly.monomial.eval(coeffs, x);
    };
    const deriveInterpolatingValue = (L, xi) => {
      const err = "invalid parameters";
      if (!L.some((x) => Fn.eql(x, xi)))
        throw new Error(err);
      const Lset = new Set(L);
      if (Lset.size !== L.length)
        throw new Error(err);
      if (!Lset.has(xi))
        throw new Error(err);
      let num2 = Fn.ONE;
      let den = Fn.ONE;
      for (const x of L) {
        if (Fn.eql(x, xi))
          continue;
        num2 = Fn.mul(num2, x);
        den = Fn.mul(den, Fn.sub(x, xi));
      }
      return Fn.div(num2, den);
    };
    const evalutateVSS = (identifier, commitment) => {
      const monomial = Poly.monomial.basis(identifier, commitment.length);
      return msm(commitment, monomial);
    };
    const generateSecretPolynomial = (signers, secret, coeffs, rng = randomBytes2) => {
      validateSigners(signers);
      if (secret !== void 0)
        abytes2(secret, Fn.BYTES, "secret");
      if (coeffs !== void 0)
        aarray(coeffs, "coeffs");
      if (typeof rng !== "function")
        throw new TypeError('"rng" expected function, got type=' + typeof rng);
      const secretScalar = secret === void 0 ? randomScalar(rng) : Fn.fromBytes(secret);
      if (!coeffs) {
        coeffs = [];
        for (let i = 0; i < signers.min - 1; i++)
          coeffs.push(randomScalar(rng));
      }
      if (coeffs.length !== signers.min - 1)
        throw new Error("wrong coefficients length");
      const coefficients = [secretScalar, ...coeffs];
      const commitment = coefficients.map((i) => Point.BASE.multiply(i));
      return { coefficients, commitment, secret: secretScalar };
    };
    const ProofOfKnowledge = {
      challenge: (id, verKey, R) => HDKG(concatBytes2(Fn.toBytes(id), serializePoint(verKey), serializePoint(R))),
      compute(id, coefficents, commitments, rng = randomBytes2) {
        if (coefficents.length < 1)
          throw new Error("coefficients should have at least one element");
        const { point: R, scalar: k } = genPointScalarPair(rng);
        const verKey = commitments[0];
        const c = this.challenge(id, verKey, R);
        const mu = Fn.add(k, Fn.mul(coefficents[0], c));
        return Signature.encode(R, mu);
      },
      validate(id, commitment, proof) {
        if (commitment.length < 1)
          throw new Error("commitment should have at least one element");
        const { R, z } = Signature.decode(proof);
        const phi = parsePoint(commitment[0]);
        const c = this.challenge(id, phi, R);
        if (!R.equals(Point.BASE.multiplyUnsafe(z).subtract(phi.multiplyUnsafe(c))))
          throw new Error("invalid proof of knowledge");
      }
    };
    const Basic = {
      challenge: (R, PK, msg) => {
        if (challenge2)
          return challenge2(R, PK, msg);
        return H2(concatBytes2(serializePoint(R), serializePoint(PK), msg));
      },
      sign(msg, sk, rng = randomBytes2) {
        const { point: R, scalar: r } = genPointScalarPair(rng);
        const PK = Point.BASE.multiply(sk);
        const c = this.challenge(R, PK, msg);
        const z = Fn.add(r, Fn.mul(c, sk));
        return [R, z];
      },
      verify(msg, R, z, PK) {
        if (adjustPointHook)
          PK = adjustPointHook(PK);
        if (adjustPointHook)
          R = adjustPointHook(R);
        const c = this.challenge(R, PK, msg);
        const zB = Point.BASE.multiplyUnsafe(z);
        const cA = PK.multiplyUnsafe(c);
        let check = zB.subtract(cA).subtract(R);
        if (check.clearCofactor)
          check = check.clearCofactor();
        return Point.ZERO.equals(check);
      }
    };
    const validateSecretShare = (identifier, commitment, signingShare) => {
      if (!Point.BASE.multiply(signingShare).equals(evalutateVSS(identifier, commitment)))
        throw new Error("invalid secret share");
    };
    const Identifier = {
      fromNumber(n) {
        if (!Number.isSafeInteger(n))
          throw new Error("expected safe interger");
        return serializeIdentifier(BigInt(n));
      },
      // Not in spec, but in FROST implementation,
      // seems useful and nice, no need to sync identifiers (would require more interactions)
      derive(s) {
        astring(s, "s");
        return serializeIdentifier(HID(utf8ToBytes(s)));
      }
    };
    const generateNonce = (secret, rng = randomBytes2) => H3(concatBytes2(rng(32), Fn.toBytes(secret)));
    const getGroupCommitment = (GPK, commitmentList, msg) => {
      const CL = commitmentList.map((i) => [
        i.identifier,
        parseIdentifier(i.identifier),
        parsePoint(i.hiding),
        parsePoint(i.binding)
      ]);
      CL.sort((a, b) => a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0);
      const Cbytes = [];
      for (const [_, id, hC, bC] of CL)
        Cbytes.push(Fn.toBytes(id), serializePoint(hC), serializePoint(bC));
      const encodedCommitmentHash = H5(concatBytes2(...Cbytes));
      const rhoPrefix = concatBytes2(serializePoint(GPK), H4(msg), encodedCommitmentHash);
      const bindingFactors = {};
      for (const [i, id] of CL) {
        bindingFactors[i] = H1(concatBytes2(rhoPrefix, Fn.toBytes(id)));
      }
      let hidingSum = Point.ZERO;
      const points = [];
      const scalars = [];
      for (const [i, _, hC, bC] of CL) {
        if (Point.ZERO.equals(hC) || Point.ZERO.equals(bC))
          throw new Error("infinity commitment");
        hidingSum = hidingSum.add(hC);
        points.push(bC);
        scalars.push(bindingFactors[i]);
      }
      const groupCommitment = hidingSum.add(msm(points, scalars));
      const identifiers = CL.map((i) => i[1]);
      return { identifiers, groupCommitment, bindingFactors };
    };
    const prepareShare = (PK, commitmentList, msg, identifier) => {
      const GPK = adjustPoint(parsePoint(PK));
      const id = parseIdentifier(identifier);
      const { identifiers, groupCommitment, bindingFactors } = getGroupCommitment(GPK, commitmentList, msg);
      const bindingFactor = bindingFactors[identifier];
      const lambda = deriveInterpolatingValue(identifiers, id);
      const challenge3 = Basic.challenge(groupCommitment, GPK, msg);
      return { lambda, challenge: challenge3, bindingFactor, groupCommitment };
    };
    Object.freeze(Identifier);
    const frost = {
      Identifier,
      // DKG is Distributed Key Generation, not Trusted Dealer Key Generation.
      DKG: Object.freeze({
        // NOTE: we allow to pass secret scalar from user side,
        // this way it can be derived, instead of random generation
        round1: (id, signers, secret, rng = randomBytes2) => {
          const idNum = parseIdentifier(id, "id");
          validateSigners(signers);
          const { coefficients, commitment } = generateSecretPolynomial(signers, secret, void 0, rng);
          const proofOfKnowledge = ProofOfKnowledge.compute(idNum, coefficients, commitment, rng);
          const commitmentBytes = commitment.map(serializePoint);
          const round1Public = {
            identifier: serializeIdentifier(idNum),
            commitment: commitmentBytes,
            proofOfKnowledge
          };
          const round1Secret = {
            identifier: idNum,
            coefficients,
            commitment: commitment.map(serializePoint),
            // Copy threshold metadata instead of retaining the caller-owned object by reference.
            signers: { min: signers.min, max: signers.max },
            step: 1
          };
          return { public: round1Public, secret: round1Secret };
        },
        round2: (secret, others) => {
          validateObject(secret, { identifier: "bigint", commitment: "object", signers: "object" }, { coefficients: "object", round1Cache: "object", round2Cache: "object", step: "number" }, "secret");
          validateSigners(secret.signers, "secret.signers");
          aarray(others, "others");
          if (others.length !== secret.signers.max - 1)
            throw new Error("wrong number of round1 packages");
          if (!secret.coefficients || secret.step === 3)
            throw new Error("round3 package used in round2");
          const authenticatedRound1 = canonicalRound1Packages(others);
          if (secret.round2Cache !== void 0) {
            if (secret.round1Cache === void 0 || !equalRound1Transcripts(secret.round1Cache, authenticatedRound1))
              throw new Error("round1 packages do not match authenticated transcript");
            return secret.round2Cache;
          }
          const res = {};
          for (const p of authenticatedRound1) {
            if (p.commitment.length !== secret.signers.min)
              throw new Error("wrong number of commitments");
            const id = parseIdentifier(p.identifier);
            if (id === secret.identifier)
              throw new Error("duplicate id=" + serializeIdentifier(id));
            ProofOfKnowledge.validate(id, p.commitment, p.proofOfKnowledge);
            for (const c of p.commitment)
              parsePoint(c);
            if (res[p.identifier])
              throw new Error("Duplicate id=" + id);
            const signingShare = Fn.toBytes(polynomialEvaluate(id, secret.coefficients));
            res[p.identifier] = {
              identifier: serializeIdentifier(secret.identifier),
              signingShare
            };
          }
          secret.round1Cache = authenticatedRound1;
          secret.round2Cache = res;
          secret.step = 2;
          return res;
        },
        round3: (secret, round1, round2) => {
          validateObject(secret, { identifier: "bigint", commitment: "object", signers: "object" }, { coefficients: "object", round1Cache: "object", round2Cache: "object", step: "number" }, "secret");
          validateSigners(secret.signers, "secret.signers");
          aarray(round1, "round1");
          aarray(round2, "round2");
          if (round1.length !== secret.signers.max - 1)
            throw new Error("wrong length of round1 packages");
          if (!secret.coefficients || secret.step !== 2 || !secret.round1Cache)
            throw new Error("round2 package used in round3");
          const suppliedRound1 = canonicalRound1Packages(round1);
          const authenticatedRound1 = secret.round1Cache;
          if (!equalRound1Transcripts(authenticatedRound1, suppliedRound1))
            throw new Error("round1 packages do not match authenticated transcript");
          if (round2.length !== authenticatedRound1.length)
            throw new Error("wrong length of round2 packages");
          const merged = {};
          for (const r1 of authenticatedRound1) {
            if (!r1.identifier || !r1.commitment)
              throw new Error("wrong round1 share");
            merged[r1.identifier] = { ...r1 };
          }
          for (const r2 of round2) {
            if (!r2.identifier || !r2.signingShare)
              throw new Error("wrong round2 share");
            if (!merged[r2.identifier])
              throw new Error("round1 share for " + r2.identifier + " is missing");
            merged[r2.identifier].signingShare = r2.signingShare;
          }
          if (Object.keys(merged).length !== authenticatedRound1.length)
            throw new Error("mismatch identifiers between rounds");
          let signingShare = Fn.ZERO;
          if (secret.commitment.length !== secret.signers.min)
            throw new Error("wrong commitments length");
          const localCommitment = secret.commitment.map(parsePoint);
          const localShare = polynomialEvaluate(secret.identifier, secret.coefficients);
          validateSecretShare(secret.identifier, localCommitment, localShare);
          const localCommitmentBytes = localCommitment.map(serializePoint);
          const commitments = {
            [serializeIdentifier(secret.identifier)]: localCommitmentBytes
          };
          for (const k in merged) {
            const v = merged[k];
            if (!v.signingShare || !v.commitment)
              throw new Error("mismatch identifiers");
            const id = parseIdentifier(k);
            const signingSharePart = Fn.fromBytes(v.signingShare);
            const commitment = v.commitment.map(parsePoint);
            validateSecretShare(secret.identifier, commitment, signingSharePart);
            signingShare = Fn.add(signingShare, signingSharePart);
            const idSer = serializeIdentifier(id);
            if (commitments[idSer])
              throw new Error("duplicated id=" + idSer);
            commitments[idSer] = v.commitment;
          }
          signingShare = Fn.add(signingShare, localShare);
          const mergedCommitment = new Array(secret.signers.min).fill(Point.ZERO);
          for (const k in commitments) {
            const v = commitments[k];
            if (v.length !== secret.signers.min)
              throw new Error("wrong commitments length");
            for (let i = 0; i < v.length; i++)
              mergedCommitment[i] = mergedCommitment[i].add(parsePoint(v[i]));
          }
          const mergedCommitmentBytes = mergedCommitment.map(serializePoint);
          const verifyingShares = {};
          for (const k in commitments)
            verifyingShares[k] = serializePoint(evalutateVSS(parseIdentifier(k), mergedCommitment));
          let res = {
            public: {
              signers: { min: secret.signers.min, max: secret.signers.max },
              commitments: mergedCommitmentBytes,
              verifyingShares: Object.fromEntries(Object.entries(verifyingShares).map(([k, v]) => [k, v.slice()]))
            },
            secret: {
              identifier: serializeIdentifier(secret.identifier),
              signingShare: Fn.toBytes(signingShare)
            }
          };
          if (adjustDKG)
            res = adjustDKG(res);
          for (let i = 0; i < secret.coefficients.length; i++)
            secret.coefficients[i] -= secret.coefficients[i];
          delete secret.coefficients;
          delete secret.round1Cache;
          delete secret.round2Cache;
          secret.step = 3;
          return res;
        },
        clean(secret) {
          validateObject(secret, { identifier: "bigint", commitment: "object", signers: "object" }, { coefficients: "object", round1Cache: "object", round2Cache: "object", step: "number" }, "secret");
          secret.identifier -= secret.identifier;
          if (secret.coefficients) {
            for (let i = 0; i < secret.coefficients.length; i++)
              secret.coefficients[i] -= secret.coefficients[i];
          }
          delete secret.round1Cache;
          delete secret.round2Cache;
          secret.step = 3;
        }
      }),
      // Trusted dealer setup
      // Generates keys for all participants
      trustedDealer(signers, identifiers, secret, rng = randomBytes2) {
        validateSigners(signers);
        if (identifiers === void 0) {
          identifiers = [];
          for (let i = 1; i <= signers.max; i++)
            identifiers.push(Identifier.fromNumber(i));
        } else {
          aarray(identifiers, "identifiers");
          if (identifiers.length !== signers.max)
            throw new Error("identifiers should be array of " + signers.max);
        }
        const identifierNums = {};
        for (const id of identifiers) {
          const idNum = parseIdentifier(id);
          if (id in identifierNums)
            throw new Error("duplicated id=" + id);
          identifierNums[id] = idNum;
        }
        const sp = generateSecretPolynomial(signers, secret, void 0, rng);
        const commitmentBytes = sp.commitment.map(serializePoint);
        const secretShares = {};
        const verifyingShares = {};
        for (const id of identifiers) {
          const signingShare = polynomialEvaluate(identifierNums[id], sp.coefficients);
          verifyingShares[id] = serializePoint(Point.BASE.multiply(signingShare));
          secretShares[id] = {
            identifier: id,
            signingShare: Fn.toBytes(signingShare)
          };
        }
        return {
          public: {
            signers: { min: signers.min, max: signers.max },
            commitments: commitmentBytes,
            verifyingShares
          },
          secretShares
        };
      },
      // Validate secret (from trusted dealer or DKG)
      validateSecret(secret, pub) {
        validateObject(secret, { identifier: "string", signingShare: "object" }, {}, "secret");
        abytes2(secret.signingShare, Fn.BYTES, "secret.signingShare");
        validateObject(pub, {
          signers: "object",
          commitments: "object",
          verifyingShares: "object"
        }, {}, "pub");
        validateSigners(pub.signers, "pub.signers");
        aarray(pub.commitments, "pub.commitments");
        const id = parseIdentifier(secret.identifier);
        const commitment = pub.commitments.map(parsePoint);
        const signingShare = Fn.fromBytes(secret.signingShare);
        validateSecretShare(id, commitment, signingShare);
      },
      // Actual signing
      // Round 1: each participant commit to nonces
      // Nonces kept private, commitments sent to coordinator (or every other participant)
      // NOTE: we don't need the message at this point, which lets a coordinator
      // keep multiple nonce commitments per participant in advance and skip
      // round1 for signing.
      // But then each participant needs to remember generated shares
      commit(secret, rng = randomBytes2) {
        validateObject(secret, { identifier: "string", signingShare: "object" }, {}, "secret");
        abytes2(secret.signingShare, Fn.BYTES, "secret.signingShare");
        if (typeof rng !== "function")
          throw new TypeError('"rng" expected function, got type=' + typeof rng);
        const secretScalar = Fn.fromBytes(secret.signingShare);
        const hiding = generateNonce(secretScalar, rng);
        const binding = generateNonce(secretScalar, rng);
        const nonces = { hiding: Fn.toBytes(hiding), binding: Fn.toBytes(binding) };
        return { nonces, commitments: nonceCommitments(secret.identifier, nonces) };
      },
      // Round2: sign. Each participant creates a signature share from the secret
      // and the selected nonce commitments.
      signShare(secret, pub, nonces, commitmentList, msg) {
        validateObject(secret, { identifier: "string", signingShare: "object" }, {}, "secret");
        abytes2(secret.signingShare, Fn.BYTES, "secret.signingShare");
        validateObject(pub, {
          signers: "object",
          commitments: "object",
          verifyingShares: "object"
        }, {}, "pub");
        validateSigners(pub.signers, "pub.signers");
        aarray(pub.commitments, "pub.commitments");
        validateObject(nonces, { hiding: "object", binding: "object" }, {}, "nonces");
        abytes2(nonces.hiding, Fn.BYTES, "nonces.hiding");
        abytes2(nonces.binding, Fn.BYTES, "nonces.binding");
        aarray(commitmentList, "commitmentList");
        abytes2(msg, void 0, "msg");
        validateCommitmentsNum(pub.signers, commitmentList.length);
        const hidingNonce0 = Fn.fromBytes(nonces.hiding);
        const bindingNonce0 = Fn.fromBytes(nonces.binding);
        if (Fn.is0(hidingNonce0) || Fn.is0(bindingNonce0))
          throw new Error("signing nonces already used");
        const expectedCommitment = {
          identifier: secret.identifier,
          hiding: serializePoint(Point.BASE.multiply(hidingNonce0)),
          binding: serializePoint(Point.BASE.multiply(bindingNonce0))
        };
        const commitment = commitmentList.find((i) => i.identifier === secret.identifier);
        if (!commitment)
          throw new Error("missing signer commitment");
        if (bytesToHex2(commitment.hiding) !== bytesToHex2(expectedCommitment.hiding) || bytesToHex2(commitment.binding) !== bytesToHex2(expectedCommitment.binding))
          throw new Error("incorrect signer commitment");
        if (adjustSecret)
          secret = adjustSecret(secret, pub);
        if (adjustPublic)
          pub = adjustPublic(pub);
        const SK = Fn.fromBytes(secret.signingShare);
        const { lambda, challenge: challenge3, bindingFactor, groupCommitment } = prepareShare(pub.commitments[0], commitmentList, msg, secret.identifier);
        const N = adjustNonces ? adjustNonces(groupCommitment, nonces) : nonces;
        const hidingNonce = adjustNonces ? Fn.fromBytes(N.hiding) : hidingNonce0;
        const bindingNonce = adjustNonces ? Fn.fromBytes(N.binding) : bindingNonce0;
        const t = Fn.mul(Fn.mul(lambda, SK), challenge3);
        const t2 = Fn.mul(bindingNonce, bindingFactor);
        const r = Fn.toBytes(Fn.add(Fn.add(hidingNonce, t2), t));
        nonces.hiding.fill(0);
        nonces.binding.fill(0);
        return r;
      },
      // Each participant (or coordinator) can verify signatures from other participants
      verifyShare(pub, commitmentList, msg, identifier, sigShare) {
        validateObject(pub, {
          signers: "object",
          commitments: "object",
          verifyingShares: "object"
        }, {}, "pub");
        validateSigners(pub.signers, "pub.signers");
        aarray(pub.commitments, "pub.commitments");
        aarray(commitmentList, "commitmentList");
        abytes2(msg, void 0, "msg");
        parseIdentifier(identifier);
        abytes2(sigShare, Fn.BYTES, "sigShare");
        if (adjustPublic)
          pub = adjustPublic(pub);
        const comm = commitmentList.find((i) => i.identifier === identifier);
        if (!comm)
          throw new Error("cannot find identifier commitment");
        const PK = parsePoint(pub.verifyingShares[identifier]);
        const hidingNonceCommitment = parsePoint(comm.hiding);
        const bindingNonceCommitment = parsePoint(comm.binding);
        const { lambda, challenge: challenge3, bindingFactor, groupCommitment } = prepareShare(pub.commitments[0], commitmentList, msg, identifier);
        let commShare = hidingNonceCommitment.add(bindingNonceCommitment.multiplyUnsafe(bindingFactor));
        if (adjustGroupCommitmentShare)
          commShare = adjustGroupCommitmentShare(groupCommitment, commShare);
        const l = Point.BASE.multiplyUnsafe(Fn.fromBytes(sigShare));
        const r = commShare.add(PK.multiplyUnsafe(Fn.mul(challenge3, lambda)));
        return l.equals(r);
      },
      // Aggregate multiple signature shares into groupSignature
      aggregate(pub, commitmentList, msg, sigShares) {
        validateObject(pub, {
          signers: "object",
          commitments: "object",
          verifyingShares: "object"
        }, {}, "pub");
        validateSigners(pub.signers, "pub.signers");
        aarray(pub.commitments, "pub.commitments");
        aarray(commitmentList, "commitmentList");
        abytes2(msg, void 0, "msg");
        validateObject(sigShares, {}, {}, "sigShares");
        const rawPub = pub;
        if (adjustPublic)
          pub = adjustPublic(pub);
        try {
          validateCommitmentsNum(pub.signers, commitmentList.length);
        } catch {
          throw new AggErr("aggregation failed", []);
        }
        const ids = commitmentList.map((i) => i.identifier);
        const seen = /* @__PURE__ */ new Set();
        for (const id of ids) {
          if (seen.has(id))
            throw new AggErr("aggregation failed", []);
          seen.add(id);
        }
        if (ids.length !== Object.keys(sigShares).length)
          throw new AggErr("aggregation failed", []);
        for (const id of ids) {
          if (!(id in sigShares) || !(id in pub.verifyingShares))
            throw new AggErr("aggregation failed", []);
        }
        const GPK = parsePoint(pub.commitments[0]);
        const { groupCommitment } = getGroupCommitment(GPK, commitmentList, msg);
        let z = Fn.ZERO;
        for (const id of ids)
          z = Fn.add(z, Fn.fromBytes(sigShares[id]));
        if (!Basic.verify(msg, groupCommitment, z, GPK)) {
          const cheaters = [];
          for (const id of ids) {
            if (!this.verifyShare(rawPub, commitmentList, msg, id, sigShares[id]))
              cheaters.push(id);
          }
          throw new AggErr("aggregation failed", cheaters);
        }
        return Signature.encode(groupCommitment, z);
      },
      // Basic sign/verify using single key
      sign(msg, secretKey) {
        let sk = Fn.fromBytes(secretKey);
        if (adjustScalar)
          sk = adjustScalar(sk);
        const [R, z] = Basic.sign(msg, sk);
        return Signature.encode(R, z);
      },
      verify(sig, msg, publicKey) {
        const PK = parsePublicKey ? validatePublicPoint(parsePublicKey(publicKey)) : parsePoint(publicKey);
        const { R, z } = Signature.decode(sig);
        return Basic.verify(msg, R, z, PK);
      },
      // Combine multiple secret shares to restore secret
      combineSecret(shares, signers) {
        aarray(shares, "shares");
        validateSigners(signers);
        if (shares.length < signers.min || shares.length > signers.max)
          throw new Error("wrong secret shares array");
        const points = [];
        const seen = {};
        for (const s of shares) {
          const idNum = parseIdentifier(s.identifier);
          const id = serializeIdentifier(idNum);
          if (seen[id])
            throw new Error("duplicated id=" + id);
          seen[id] = true;
          points.push([idNum, Fn.fromBytes(s.signingShare)]);
        }
        const xCoords = points.map(([x]) => x);
        let res = Fn.ZERO;
        for (const [x, y] of points)
          res = Fn.add(res, Fn.mul(y, deriveInterpolatingValue(xCoords, x)));
        return Fn.toBytes(res);
      },
      // Utils
      utils: Object.freeze({
        Fn,
        // NOTE: we re-export it here because it may be different from Point.Fn (ed448 is fun!)
        // Test RNG overrides still go through noble's non-zero scalar derivation; this is not a raw
        // "bytes become scalar" escape hatch.
        randomScalar: (rng = randomBytes2) => Fn.toBytes(genPointScalarPair(rng).scalar),
        generateSecretPolynomial: (signers, secret, coeffs, rng) => {
          const res = generateSecretPolynomial(signers, secret, coeffs, rng);
          return { ...res, commitment: res.commitment.map(serializePoint) };
        }
      })
    };
    return Object.freeze(frost);
  }
  var validateSigners, validateCommitmentsNum, AggErr;
  var init_frost = __esm({
    "node_modules/@noble/curves/abstract/frost.js"() {
      init_utils();
      init_utils2();
      init_curve();
      init_fft();
      init_modular();
      validateSigners = (signers, title = "signers") => {
        validateObject(signers, { min: "number", max: "number" }, {}, title);
        asafenumber(signers.min, title + ".min");
        asafenumber(signers.max, title + ".max");
        if (signers.min < 2 || signers.max < 2 || signers.min > signers.max)
          throw new Error("Wrong signers info: min=" + signers.min + " max=" + signers.max);
      };
      validateCommitmentsNum = (signers, len) => {
        if (len < signers.min || len > signers.max)
          throw new Error("Wrong number of commitments=" + len);
      };
      AggErr = class extends Error {
        // Empty means aggregation failed before per-share verification could attribute a signer.
        cheaters;
        constructor(msg, cheaters) {
          super(msg);
          this.cheaters = cheaters;
        }
      };
    }
  });

  // node_modules/@noble/hashes/hmac.js
  var _HMAC, hmac;
  var init_hmac = __esm({
    "node_modules/@noble/hashes/hmac.js"() {
      init_utils();
      _HMAC = class {
        oHash;
        iHash;
        blockLen;
        outputLen;
        canXOF = false;
        finished = false;
        destroyed = false;
        constructor(hash, key) {
          ahash(hash);
          abytes(key, void 0, "key");
          this.iHash = hash.create();
          if (typeof this.iHash.update !== "function")
            throw new Error("expected Hash instance");
          this.blockLen = this.iHash.blockLen;
          this.outputLen = this.iHash.outputLen;
          const blockLen = this.blockLen;
          const pad = new Uint8Array(blockLen);
          pad.set(key.length > blockLen ? hash.create().update(key).digest() : key);
          for (let i = 0; i < pad.length; i++)
            pad[i] ^= 54;
          this.iHash.update(pad);
          this.oHash = hash.create();
          for (let i = 0; i < pad.length; i++)
            pad[i] ^= 54 ^ 92;
          this.oHash.update(pad);
          clean(pad);
        }
        update(buf) {
          aexists(this);
          this.iHash.update(buf);
          return this;
        }
        digestInto(out) {
          aexists(this);
          aoutput(out, this);
          this.finished = true;
          const buf = out.subarray(0, this.outputLen);
          this.iHash.digestInto(buf);
          this.oHash.update(buf);
          this.oHash.digestInto(buf);
          this.destroy();
        }
        digest() {
          const out = new Uint8Array(this.oHash.outputLen);
          this.digestInto(out);
          return out;
        }
        _cloneInto(to) {
          to ||= Object.create(Object.getPrototypeOf(this), {});
          const { oHash, iHash, finished, destroyed, blockLen, outputLen, canXOF } = this;
          to = to;
          to.finished = finished;
          to.destroyed = destroyed;
          to.blockLen = blockLen;
          to.outputLen = outputLen;
          to.canXOF = canXOF;
          to.oHash = oHash._cloneInto(to.oHash);
          to.iHash = iHash._cloneInto(to.iHash);
          return to;
        }
        clone() {
          return this._cloneInto();
        }
        destroy() {
          this.destroyed = true;
          this.oHash.destroy();
          this.iHash.destroy();
        }
      };
      hmac = /* @__PURE__ */ (() => {
        const hmac_ = ((hash, key, message) => new _HMAC(hash, key).update(message).digest());
        hmac_.create = (hash, key) => new _HMAC(hash, key);
        return hmac_;
      })();
    }
  });

  // node_modules/@noble/curves/abstract/der.js
  var _0n5, DERErr, _DER, DER;
  var init_der = __esm({
    "node_modules/@noble/curves/abstract/der.js"() {
      init_utils2();
      _0n5 = /* @__PURE__ */ BigInt(0);
      DERErr = class extends Error {
        constructor(m = "") {
          super(m);
        }
      };
      _DER = {
        // asn.1 DER encoding utils
        Err: DERErr,
        // Basic building block is TLV (Tag-Length-Value)
        _tlv: {
          encode: (tag, data) => {
            const { Err: E } = _DER;
            asafenumber(tag, "tag");
            if (tag < 0 || tag > 255)
              throw new E("tlv.encode: wrong tag");
            astring(data, "data");
            if (data.length & 1)
              throw new E("tlv.encode: unpadded data");
            const dataLen = data.length / 2;
            const len = numberToHexUnpadded(dataLen);
            if (len.length / 2 & 128)
              throw new E("tlv.encode: long form length too big");
            const lenLen = dataLen > 127 ? numberToHexUnpadded(len.length / 2 | 128) : "";
            const t = numberToHexUnpadded(tag);
            return t + lenLen + len + data;
          },
          // v - value, l - left bytes (unparsed)
          decode(tag, data) {
            const { Err: E } = _DER;
            data = abytes2(data, void 0, "DER data");
            let pos = 0;
            if (tag < 0 || tag > 255)
              throw new E("tlv.decode: wrong tag");
            if (data.length < 2 || data[pos++] !== tag)
              throw new E("tlv.decode: wrong tlv");
            const first = data[pos++];
            const isLong = !!(first & 128);
            let length = 0;
            if (!isLong)
              length = first;
            else {
              const lenLen = first & 127;
              if (!lenLen)
                throw new E("tlv.decode(long): indefinite length not supported");
              if (lenLen > 4)
                throw new E("tlv.decode(long): byte length is too big");
              const lengthBytes = data.subarray(pos, pos + lenLen);
              if (lengthBytes.length !== lenLen)
                throw new E("tlv.decode: length bytes not complete");
              if (lengthBytes[0] === 0)
                throw new E("tlv.decode(long): zero leftmost byte");
              for (const b of lengthBytes)
                length = length << 8 | b;
              pos += lenLen;
              if (length < 128)
                throw new E("tlv.decode(long): not minimal encoding");
            }
            const v = data.subarray(pos, pos + length);
            if (v.length !== length)
              throw new E("tlv.decode: wrong value length");
            return { v, l: data.subarray(pos + length) };
          }
        },
        // https://crypto.stackexchange.com/a/57734 Leftmost bit of first byte is 'negative' flag,
        // since we always use positive integers here. It must always be empty:
        // - add zero byte if exists
        // - if next byte doesn't have a flag, leading zero is not allowed (minimal encoding)
        _int: {
          encode(num2) {
            const { Err: E } = _DER;
            abignumber(num2);
            if (num2 < _0n5)
              throw new E("integer: negative integers are not allowed");
            let hex = numberToHexUnpadded(num2);
            if (Number.parseInt(hex[0], 16) & 8)
              hex = "00" + hex;
            if (hex.length & 1)
              throw new E("unexpected DER parsing assertion: unpadded hex");
            return hex;
          },
          decode(data) {
            const { Err: E } = _DER;
            if (data.length < 1)
              throw new E("invalid signature integer: empty");
            if (data[0] & 128)
              throw new E("invalid signature integer: negative");
            if (data.length > 1 && data[0] === 0 && !(data[1] & 128))
              throw new E("invalid signature integer: unnecessary leading zero");
            return bytesToNumberBE(data);
          }
        },
        toSig(bytes, maxScalarBytes) {
          const { Err: E, _int: int, _tlv: tlv } = _DER;
          if (maxScalarBytes !== void 0) {
            asafenumber(maxScalarBytes, "maxScalarBytes");
            if (maxScalarBytes < 1)
              throw new E("invalid signature: maxScalarBytes must be positive");
          }
          const data = abytes2(bytes, void 0, "signature");
          const { v: seqBytes, l: seqLeftBytes } = tlv.decode(48, data);
          if (seqLeftBytes.length)
            throw new E("invalid signature: left bytes after parsing");
          const { v: rBytes, l: rLeftBytes } = tlv.decode(2, seqBytes);
          const { v: sBytes, l: sLeftBytes } = tlv.decode(2, rLeftBytes);
          if (sLeftBytes.length)
            throw new E("invalid signature: left bytes after parsing");
          if (maxScalarBytes !== void 0 && (rBytes.length > maxScalarBytes || sBytes.length > maxScalarBytes))
            throw new E("invalid signature: integer too large");
          return { r: int.decode(rBytes), s: int.decode(sBytes) };
        },
        hexFromSig(sig) {
          const { _tlv: tlv, _int: int } = _DER;
          validateObject(sig, { r: "bigint", s: "bigint" }, {}, "sig");
          const rs = tlv.encode(2, int.encode(sig.r));
          const ss = tlv.encode(2, int.encode(sig.s));
          const seq = rs + ss;
          return tlv.encode(48, seq);
        }
      };
      DER = /* @__PURE__ */ (() => {
        Object.freeze(_DER._tlv);
        Object.freeze(_DER._int);
        return Object.freeze(_DER);
      })();
    }
  });

  // node_modules/@noble/curves/abstract/weierstrass.js
  function _splitEndoScalar(k, basis, n) {
    aInRange("scalar", k, _0n6, n);
    const [[a1, b1], [a2, b2]] = basis;
    const c1 = divNearest(b2 * k, n);
    const c2 = divNearest(-b1 * k, n);
    let k1 = k - c1 * a1 - c2 * a2;
    let k2 = -c1 * b1 - c2 * b2;
    const k1neg = k1 < _0n6;
    const k2neg = k2 < _0n6;
    if (k1neg)
      k1 = -k1;
    if (k2neg)
      k2 = -k2;
    const MAX_NUM = bitMask(Math.ceil(bitLen(n) / 2)) + _1n5;
    if (k1 < _0n6 || k1 >= MAX_NUM || k2 < _0n6 || k2 >= MAX_NUM) {
      throw new Error("splitScalar (endomorphism): failed for k");
    }
    return { k1neg, k1, k2neg, k2 };
  }
  function validateSigFormat(format) {
    if (!["compact", "recovered", "der"].includes(format))
      throw new Error('Signature format must be "compact", "recovered", or "der"');
    return format;
  }
  function validateSigOpts(opts, def) {
    validateObject(opts);
    const optsn = {};
    for (let optName of Object.keys(def)) {
      optsn[optName] = opts[optName] === void 0 ? def[optName] : opts[optName];
    }
    abool(optsn.lowS, "lowS");
    abool(optsn.prehash, "prehash");
    if (optsn.format !== void 0)
      validateSigFormat(optsn.format);
    return optsn;
  }
  function weierstrass(params, extraOpts = {}) {
    const validated = createCurveFields("weierstrass", params, extraOpts);
    const Fp = validated.Fp;
    const Fn = validated.Fn;
    let CURVE = validated.CURVE;
    const { h: cofactor, n: CURVE_ORDER } = CURVE;
    validateObject(extraOpts, {}, {
      allowInfinityPoint: "boolean",
      clearCofactor: "function",
      isTorsionFree: "function",
      fromBytes: "function",
      toBytes: "function",
      endo: "object",
      randomBytes: "function"
    });
    const { endo: endoOpts, allowInfinityPoint, clearCofactor, isTorsionFree, fromBytes, toBytes } = extraOpts;
    const randomBytes3 = extraOpts.randomBytes === void 0 ? randomBytes2 : extraOpts.randomBytes;
    if (endoOpts) {
      if (!Fp.is0(CURVE.a) || typeof endoOpts.beta !== "bigint" || !Array.isArray(endoOpts.basises)) {
        throw new Error('invalid endo: expected "beta": bigint and "basises": array');
      }
    }
    const endo = endoOpts ? {
      beta: endoOpts.beta,
      basises: endoOpts.basises.map((basis) => [...basis])
    } : void 0;
    const lengths = getWLengths(Fp, Fn);
    function assertCompressionIsSupported() {
      if (!Fp.isOdd)
        throw new Error("compression is not supported: Field does not have .isOdd()");
    }
    function pointToBytes2(_c, point, isCompressed) {
      if (point.is0()) {
        if (!allowInfinityPoint)
          throw new Error("bad point: ZERO");
        return Uint8Array.of(0);
      }
      const { x, y } = point.toAffine();
      const bx = Fp.toBytes(x);
      abool(isCompressed, "isCompressed");
      if (isCompressed) {
        assertCompressionIsSupported();
        const hasEvenY = !Fp.isOdd(y);
        return concatBytes2(pprefix(hasEvenY), bx);
      } else {
        return concatBytes2(Uint8Array.of(4), bx, Fp.toBytes(y));
      }
    }
    function pointFromBytes(bytes) {
      abytes2(bytes, void 0, "Point");
      const { publicKey: comp, publicKeyUncompressed: uncomp } = lengths;
      const length = bytes.length;
      const head = bytes[0];
      const tail = bytes.subarray(1);
      if (allowInfinityPoint && length === 1 && head === 0)
        return { x: Fp.ZERO, y: Fp.ZERO };
      if (length === comp && (head === 2 || head === 3)) {
        const x = Fp.fromBytes(tail);
        if (!Fp.isValid(x))
          throw new Error("bad point: is not on curve, wrong x");
        const y2 = weierstrassEquation(x);
        let y;
        try {
          y = Fp.sqrt(y2);
        } catch (sqrtError) {
          const err = sqrtError instanceof Error ? ": " + sqrtError.message : "";
          throw new Error("bad point: is not on curve, sqrt error" + err);
        }
        assertCompressionIsSupported();
        const evenY = Fp.isOdd(y);
        const evenH = (head & 1) === 1;
        if (evenH !== evenY)
          y = Fp.neg(y);
        return { x, y };
      } else if (length === uncomp && head === 4) {
        const L = Fp.BYTES;
        const x = Fp.fromBytes(tail.subarray(0, L));
        const y = Fp.fromBytes(tail.subarray(L, L * 2));
        if (!isValidXY(x, y))
          throw new Error("bad point: is not on curve");
        return { x, y };
      } else {
        throw new Error(`bad point: got length ${length}, expected compressed=${comp} or uncompressed=${uncomp}`);
      }
    }
    const encodePoint = toBytes === void 0 ? pointToBytes2 : toBytes;
    const decodePoint = fromBytes === void 0 ? pointFromBytes : fromBytes;
    const b3 = Fp.mul(CURVE.b, _3n3);
    const mulA = Fp.is0(CURVE.a) ? (_) => Fp.ZERO : (x) => Fp.mul(CURVE.a, x);
    function weierstrassEquation(x) {
      const x2 = Fp.sqr(x);
      const x3 = Fp.mul(x2, x);
      return Fp.add(Fp.add(x3, Fp.mul(x, CURVE.a)), CURVE.b);
    }
    function isValidXY(x, y) {
      const left = Fp.sqr(y);
      const right = weierstrassEquation(x);
      return Fp.eql(left, right);
    }
    if (!isValidXY(CURVE.Gx, CURVE.Gy))
      throw new Error("bad curve params: generator point");
    const _4a3 = Fp.mul(Fp.pow(CURVE.a, _3n3), _4n4);
    const _27b2 = Fp.mul(Fp.sqr(CURVE.b), BigInt(27));
    if (Fp.is0(Fp.add(_4a3, _27b2)))
      throw new Error("bad curve params: a or b");
    function acoord(title, n, banZero = false) {
      if (!Fp.isValid(n) || banZero && Fp.is0(n))
        throw new Error(`bad point coordinate ${title}`);
      return typeof n === "object" && n !== null ? Fp.create(n) : n;
    }
    function aprjpoint(other) {
      if (!(other instanceof Point))
        throw new Error("Weierstrass Point expected");
    }
    function splitEndoScalarN(k) {
      if (!endo || !endo.basises)
        throw new Error("no endo");
      return _splitEndoScalar(k, endo.basises, Fn.ORDER);
    }
    function pushWnafPair(points, scalars, p, k) {
      if (!Fn.isValid(k))
        throw new RangeError("invalid scalar: out of range");
      if (endo) {
        const { k1neg, k1, k2neg, k2 } = splitEndoScalarN(k);
        const psi = new Point(Fp.mul(p.X, endo.beta), p.Y, p.Z);
        points.push(k1neg ? p.negate() : p, k2neg ? psi.negate() : psi);
        scalars.push(k1, k2);
      } else {
        points.push(p);
        scalars.push(k);
      }
    }
    const validityCache = /* @__PURE__ */ new WeakSet();
    class Point {
      static BASE = new Point(CURVE.Gx, CURVE.Gy, Fp.ONE);
      static ZERO = new Point(Fp.ZERO, Fp.ONE, Fp.ZERO);
      static Fp = Fp;
      static Fn = Fn;
      X;
      Y;
      Z;
      /** Does NOT validate if the point is valid. Use `.assertValidity()`. */
      constructor(X, Y, Z) {
        this.X = acoord("x", X);
        this.Y = acoord("y", Y, true);
        this.Z = acoord("z", Z);
        Object.freeze(this);
      }
      static CURVE() {
        return CURVE;
      }
      /** Does NOT validate if the point is valid. Use `.assertValidity()`. */
      static fromAffine(p) {
        const { x, y } = p || {};
        if (!p || !Fp.isValid(x) || !Fp.isValid(y))
          throw new Error("invalid affine point");
        if (p instanceof Point)
          throw new Error("projective point not allowed");
        if (Fp.is0(x) && Fp.is0(y))
          return Point.ZERO;
        return new Point(x, y, Fp.ONE);
      }
      static fromBytes(bytes) {
        const P = Point.fromAffine(decodePoint(abytes2(bytes, void 0, "point")));
        P.assertValidity();
        return P;
      }
      static fromHex(hex) {
        return Point.fromBytes(hexToBytes2(hex));
      }
      get x() {
        return this.toAffine().x;
      }
      get y() {
        return this.toAffine().y;
      }
      /**
       * @param isLazy - true will defer table computation until the first multiplication
       */
      precompute(windowSize = 6, isLazy = true) {
        wnaf.setWindowSize(this, windowSize);
        if (!isLazy)
          this.multiply(_3n3);
        return this;
      }
      // TODO: return `this`
      /** A point on curve is valid if it conforms to equation. */
      assertValidity() {
        const p = this;
        if (p.is0()) {
          if (allowInfinityPoint && Fp.is0(p.X) && Fp.eql(p.Y, Fp.ONE) && Fp.is0(p.Z))
            return;
          throw new Error("bad point: ZERO");
        }
        if (validityCache.has(p))
          return;
        const { x, y } = p.toAffine();
        if (!Fp.isValid(x) || !Fp.isValid(y))
          throw new Error("bad point: x or y not field elements");
        if (!isValidXY(x, y))
          throw new Error("bad point: equation left != right");
        if (!p.isTorsionFree())
          throw new Error("bad point: not in prime-order subgroup");
        validityCache.add(p);
      }
      hasEvenY() {
        const { y } = this.toAffine();
        if (!Fp.isOdd)
          throw new Error("Field doesn't support isOdd");
        return !Fp.isOdd(y);
      }
      /** Compare one point to another. */
      equals(other) {
        aprjpoint(other);
        const { X: X1, Y: Y1, Z: Z1 } = this;
        const { X: X2, Y: Y2, Z: Z2 } = other;
        const U1 = Fp.eql(Fp.mul(X1, Z2), Fp.mul(X2, Z1));
        const U2 = Fp.eql(Fp.mul(Y1, Z2), Fp.mul(Y2, Z1));
        return U1 && U2;
      }
      /** Flips point to one corresponding to (x, -y) in Affine coordinates. */
      negate() {
        return new Point(this.X, Fp.neg(this.Y), this.Z);
      }
      // Renes-Costello-Batina exception-free doubling formula.
      // There is 30% faster Jacobian formula, but it is not complete.
      // https://eprint.iacr.org/2015/1060, algorithm 3
      // Cost: 8M + 3S + 3*a + 2*b3 + 15add.
      double() {
        const { X: X1, Y: Y1, Z: Z1 } = this;
        let X3 = Fp.ZERO, Y3 = Fp.ZERO, Z3 = Fp.ZERO;
        let t0 = Fp.mul(X1, X1);
        let t1 = Fp.mul(Y1, Y1);
        let t2 = Fp.mul(Z1, Z1);
        let t3 = Fp.mul(X1, Y1);
        t3 = Fp.add(t3, t3);
        Z3 = Fp.mul(X1, Z1);
        Z3 = Fp.add(Z3, Z3);
        X3 = mulA(Z3);
        Y3 = Fp.mul(b3, t2);
        Y3 = Fp.add(X3, Y3);
        X3 = Fp.sub(t1, Y3);
        Y3 = Fp.add(t1, Y3);
        Y3 = Fp.mul(X3, Y3);
        X3 = Fp.mul(t3, X3);
        Z3 = Fp.mul(b3, Z3);
        t2 = mulA(t2);
        t3 = Fp.sub(t0, t2);
        t3 = mulA(t3);
        t3 = Fp.add(t3, Z3);
        Z3 = Fp.add(t0, t0);
        t0 = Fp.add(Z3, t0);
        t0 = Fp.add(t0, t2);
        t0 = Fp.mul(t0, t3);
        Y3 = Fp.add(Y3, t0);
        t2 = Fp.mul(Y1, Z1);
        t2 = Fp.add(t2, t2);
        t0 = Fp.mul(t2, t3);
        X3 = Fp.sub(X3, t0);
        Z3 = Fp.mul(t2, t1);
        Z3 = Fp.add(Z3, Z3);
        Z3 = Fp.add(Z3, Z3);
        return new Point(X3, Y3, Z3);
      }
      // Renes-Costello-Batina exception-free addition formula.
      // There is 30% faster Jacobian formula, but it is not complete.
      // https://eprint.iacr.org/2015/1060, algorithm 1
      // Cost: 12M + 0S + 3*a + 3*b3 + 23add.
      add(other) {
        aprjpoint(other);
        const { X: X1, Y: Y1, Z: Z1 } = this;
        const { X: X2, Y: Y2, Z: Z2 } = other;
        let X3 = Fp.ZERO, Y3 = Fp.ZERO, Z3 = Fp.ZERO;
        let t0 = Fp.mul(X1, X2);
        let t1 = Fp.mul(Y1, Y2);
        let t2 = Fp.mul(Z1, Z2);
        let t3 = Fp.add(X1, Y1);
        let t4 = Fp.add(X2, Y2);
        t3 = Fp.mul(t3, t4);
        t4 = Fp.add(t0, t1);
        t3 = Fp.sub(t3, t4);
        t4 = Fp.add(X1, Z1);
        let t5 = Fp.add(X2, Z2);
        t4 = Fp.mul(t4, t5);
        t5 = Fp.add(t0, t2);
        t4 = Fp.sub(t4, t5);
        t5 = Fp.add(Y1, Z1);
        X3 = Fp.add(Y2, Z2);
        t5 = Fp.mul(t5, X3);
        X3 = Fp.add(t1, t2);
        t5 = Fp.sub(t5, X3);
        Z3 = mulA(t4);
        X3 = Fp.mul(b3, t2);
        Z3 = Fp.add(X3, Z3);
        X3 = Fp.sub(t1, Z3);
        Z3 = Fp.add(t1, Z3);
        Y3 = Fp.mul(X3, Z3);
        t1 = Fp.add(t0, t0);
        t1 = Fp.add(t1, t0);
        t2 = mulA(t2);
        t4 = Fp.mul(b3, t4);
        t1 = Fp.add(t1, t2);
        t2 = Fp.sub(t0, t2);
        t2 = mulA(t2);
        t4 = Fp.add(t4, t2);
        t0 = Fp.mul(t1, t4);
        Y3 = Fp.add(Y3, t0);
        t0 = Fp.mul(t5, t4);
        X3 = Fp.mul(t3, X3);
        X3 = Fp.sub(X3, t0);
        t0 = Fp.mul(t3, t1);
        Z3 = Fp.mul(t5, Z3);
        Z3 = Fp.add(Z3, t0);
        return new Point(X3, Y3, Z3);
      }
      subtract(other) {
        aprjpoint(other);
        return this.add(other.negate());
      }
      is0() {
        return this.equals(Point.ZERO);
      }
      /**
       * Constant time multiplication.
       * Uses precomputed tables (signed fixed-window wNAF) when available.
       * Uses scalar blinding and avoids endomorphism splitting in the secret-scalar path.
       * @param scalar - by which the point would be multiplied
       * @returns New point
       */
      multiply(scalar) {
        if (!Fn.isValidNot0(scalar))
          throw new RangeError("invalid scalar: out of range");
        const { p, f } = wnaf.mulSecret(this, scalar, cofactor, normalize);
        return normalize([p, f])[0];
      }
      /**
       * Non-constant-time multiplication. Uses width-4 wNAF with GLV endomorphism splitting
       * when available (two half-width scalars sharing one halved doubling chain).
       * It's faster, but should only be used when you don't care about
       * an exposed secret key e.g. sig verification, which works over *public* keys.
       */
      multiplyUnsafe(scalar) {
        const p = this;
        const sc = scalar;
        if (!Fn.isValid(sc))
          throw new RangeError("invalid scalar: out of range");
        if (sc === _0n6 || p.is0())
          return Point.ZERO;
        if (sc === _1n5)
          return p;
        if (wnaf.hasWindowSize(this))
          return wnaf.mulUnsafe(p, sc, normalize);
        const points = [];
        const scalars = [];
        pushWnafPair(points, scalars, p, sc);
        return mulAddUnsafe(Point, points, scalars);
      }
      /**
       * Non-constant-time double-scalar multiplication `a⋅this + b⋅other` (Strauss–Shamir).
       * Both walks share one doubling chain via {@link mulAddUnsafe}, and GLV endomorphism
       * (when available) halves the chain again by splitting each scalar into two half-width
       * parts. Used by ECDSA verification and public-key recovery for `R = u1⋅G + u2⋅P`.
       * Only for public scalars.
       */
      mulAddUnsafe(a, other, b) {
        aprjpoint(other);
        const points = [];
        const scalars = [];
        pushWnafPair(points, scalars, this, a);
        pushWnafPair(points, scalars, other, b);
        return mulAddUnsafe(Point, points, scalars);
      }
      /**
       * Converts Projective point to affine (x, y) coordinates.
       * (X, Y, Z) ∋ (x=X/Z, y=Y/Z).
       * @param invertedZ - Z^-1 (inverted zero) - optional, precomputation is useful for invertBatch
       */
      toAffine(invertedZ) {
        const p = this;
        let iz = invertedZ;
        if (iz != null && !Fp.isValid(iz))
          throw new RangeError('"invertedZ" expected valid field element');
        const { X, Y, Z } = p;
        if (Fp.eql(Z, Fp.ONE))
          return { x: X, y: Y };
        const is0 = p.is0();
        if (iz == null)
          iz = is0 ? Fp.ONE : Fp.inv(Z);
        const x = Fp.mul(X, iz);
        const y = Fp.mul(Y, iz);
        const zz = Fp.mul(Z, iz);
        if (is0)
          return { x: Fp.ZERO, y: Fp.ZERO };
        if (!Fp.eql(zz, Fp.ONE))
          throw new Error("invZ was invalid");
        return { x, y };
      }
      /**
       * Checks whether Point is free of torsion elements (is in prime subgroup).
       * Always torsion-free for cofactor=1 curves.
       */
      isTorsionFree() {
        if (cofactor === _1n5)
          return true;
        if (isTorsionFree)
          return isTorsionFree(Point, this);
        return wnaf.mulUnsafe(this, CURVE_ORDER).is0();
      }
      clearCofactor() {
        if (cofactor === _1n5)
          return this;
        if (clearCofactor)
          return clearCofactor(Point, this);
        return this.multiplyUnsafe(cofactor);
      }
      isSmallOrder() {
        if (cofactor === _1n5)
          return this.is0();
        return this.clearCofactor().is0();
      }
      toBytes(isCompressed = true) {
        abool(isCompressed, "isCompressed");
        this.assertValidity();
        return encodePoint(Point, this, isCompressed);
      }
      toHex(isCompressed = true) {
        return bytesToHex2(this.toBytes(isCompressed));
      }
      toString() {
        return `<Point ${this.is0() ? "ZERO" : this.toHex()}>`;
      }
    }
    const normalize = (points) => normalizeZ(Point, points);
    const wnaf = new ScalarMultiplier(Point, randomBytes3);
    if (wnaf.bits >= 6)
      Point.BASE.precompute(6);
    Object.freeze(Point.prototype);
    Object.freeze(Point);
    return Point;
  }
  function pprefix(hasEvenY) {
    return Uint8Array.of(hasEvenY ? 2 : 3);
  }
  function getWLengths(Fp, Fn) {
    return {
      secretKey: Fn.BYTES,
      publicKey: 1 + Fp.BYTES,
      publicKeyUncompressed: 1 + 2 * Fp.BYTES,
      publicKeyHasPrefix: true,
      // Raw compact `(r || s)` signature width; DER and recovered signatures use
      // different lengths outside this helper.
      signature: 2 * Fn.BYTES
    };
  }
  function ecdh(Point, ecdhOpts = {}) {
    validatePointCons(Point);
    const { Fn } = Point;
    const randomBytes_ = ecdhOpts.randomBytes === void 0 ? randomBytes2 : ecdhOpts.randomBytes;
    const lengths = Object.assign(getWLengths(Point.Fp, Fn), {
      seed: Math.max(getMinHashLength(Fn.ORDER), 16)
    });
    function isValidSecretKey(secretKey) {
      try {
        const num2 = Fn.fromBytes(secretKey);
        return Fn.isValidNot0(num2);
      } catch (error) {
        return false;
      }
    }
    function isValidPublicKey(publicKey, isCompressed) {
      const { publicKey: comp, publicKeyUncompressed } = lengths;
      try {
        const l = publicKey.length;
        if (isCompressed === true && l !== comp)
          return false;
        if (isCompressed === false && l !== publicKeyUncompressed)
          return false;
        return !Point.fromBytes(publicKey).is0();
      } catch (error) {
        return false;
      }
    }
    function randomSecretKey(seed) {
      seed = seed === void 0 ? randomBytes_(lengths.seed) : seed;
      return mapHashToField(abytes2(seed, lengths.seed, "seed"), Fn.ORDER);
    }
    function getPublicKey(secretKey, isCompressed = true) {
      return Point.BASE.multiply(Fn.fromBytes(secretKey)).toBytes(isCompressed);
    }
    function isProbPub(item) {
      const { secretKey, publicKey, publicKeyUncompressed } = lengths;
      const allowedLengths = Fn._lengths;
      if (!isBytes2(item))
        return void 0;
      const l = abytes2(item, void 0, "key").length;
      const isPub = l === publicKey || l === publicKeyUncompressed;
      const isSec = l === secretKey || !!allowedLengths?.includes(l);
      if (isPub && isSec)
        return void 0;
      return isPub;
    }
    function getSharedSecret(secretKeyA, publicKeyB, isCompressed = true) {
      if (isProbPub(secretKeyA) === true)
        throw new Error("first arg must be private key");
      if (isProbPub(publicKeyB) === false)
        throw new Error("second arg must be public key");
      const s = Fn.fromBytes(secretKeyA);
      const b = Point.fromBytes(publicKeyB);
      if (b.is0())
        throw new Error("invalid public key: point at infinity");
      return b.multiply(s).toBytes(isCompressed);
    }
    const utils = {
      isValidSecretKey,
      isValidPublicKey,
      randomSecretKey
    };
    const keygen = createKeygen(randomSecretKey, getPublicKey);
    Object.freeze(utils);
    Object.freeze(lengths);
    return Object.freeze({ getPublicKey, getSharedSecret, keygen, Point, utils, lengths });
  }
  function ecdsa(Point, hash, ecdsaOpts = {}) {
    validatePointCons(Point);
    const hash_ = hash;
    ahash(hash_);
    validateObject(ecdsaOpts, {}, {
      hmac: "function",
      lowS: "boolean",
      randomBytes: "function",
      bits2int: "function",
      bits2int_modN: "function"
    });
    const opts = Object.assign({}, ecdsaOpts);
    const randomBytes3 = opts.randomBytes === void 0 ? randomBytes2 : opts.randomBytes;
    const hmac2 = opts.hmac === void 0 ? (key, msg) => hmac(hash_, key, msg) : opts.hmac;
    const { Fp, Fn } = Point;
    const { ORDER: CURVE_ORDER, BITS: fnBits } = Fn;
    const blindLength = getMinHashLength(CURVE_ORDER);
    const csprng = probeRandomBytes(randomBytes3, blindLength);
    const { keygen, getPublicKey, getSharedSecret, utils, lengths } = ecdh(Point, opts);
    const defaultSigOpts = {
      prehash: true,
      lowS: typeof opts.lowS === "boolean" ? opts.lowS : true,
      format: "compact",
      extraEntropy: false
    };
    const hasLargeRecoveryLifts = CURVE_ORDER * _2n3 + _1n5 < Fp.ORDER;
    function isBiggerThanHalfOrder(number) {
      const HALF = CURVE_ORDER >> _1n5;
      return number > HALF;
    }
    function validateRS(title, num2) {
      if (!Fn.isValidNot0(num2))
        throw new Error(`invalid signature ${title}: out of range 1..Point.Fn.ORDER`);
      return num2;
    }
    function assertFieldSignIsSupported() {
      if (!Fp.isOdd)
        throw new Error("Field doesn't support isOdd");
    }
    function getRecoveryBit(x, y, r) {
      assertFieldSignIsSupported();
      return (x === r ? 0 : 2) | Number(Fp.isOdd(y));
    }
    function assertRecoverableCurve() {
      if (hasLargeRecoveryLifts)
        throw new Error('"recovered" sig type is not supported for cofactor >2 curves');
    }
    function validateSigLength(bytes, format) {
      validateSigFormat(format);
      const size = lengths.signature;
      const sizer = format === "compact" ? size : format === "recovered" ? size + 1 : void 0;
      return abytes2(bytes, sizer);
    }
    class Signature {
      r;
      s;
      recovery;
      constructor(r, s, recovery) {
        this.r = validateRS("r", r);
        this.s = validateRS("s", s);
        if (recovery != null) {
          assertRecoverableCurve();
          if (![0, 1, 2, 3].includes(recovery))
            throw new Error("invalid recovery id");
          this.recovery = recovery;
        }
        Object.freeze(this);
      }
      static fromBytes(bytes, format = defaultSigOpts.format) {
        validateSigLength(bytes, format);
        let recid;
        if (format === "der") {
          if (bytes.length > 2 * Fn.BYTES + 16)
            throw new DER.Err("invalid signature: DER signature too long");
          const { r: r2, s: s2 } = DER.toSig(abytes2(bytes), Fn.BYTES + 1);
          return new Signature(r2, s2);
        }
        if (format === "recovered") {
          recid = bytes[0];
          format = "compact";
          bytes = bytes.subarray(1);
        }
        const L = lengths.signature / 2;
        const r = bytes.subarray(0, L);
        const s = bytes.subarray(L, L * 2);
        return new Signature(Fn.fromBytes(r), Fn.fromBytes(s), recid);
      }
      static fromHex(hex, format) {
        return this.fromBytes(hexToBytes2(hex), format);
      }
      assertRecovery() {
        const { recovery } = this;
        if (recovery == null)
          throw new Error("invalid recovery id: must be present");
        return recovery;
      }
      addRecoveryBit(recovery) {
        return new Signature(this.r, this.s, recovery);
      }
      // Unlike the top-level helper below, this method expects a digest that has
      // already been hashed to the curve's message representative.
      recoverPublicKey(messageHash) {
        const { r, s } = this;
        const recovery = this.assertRecovery();
        const radj = recovery === 2 || recovery === 3 ? r + CURVE_ORDER : r;
        if (!Fp.isValid(radj))
          throw new Error("invalid recovery id: sig.r+curve.n != R.x");
        const x = Fp.toBytes(radj);
        const R = Point.fromBytes(concatBytes2(pprefix((recovery & 1) === 0), x));
        const ir = Fn.inv(radj);
        const h = bits2int_modN(abytes2(messageHash, void 0, "msgHash"));
        const u1 = Fn.create(-h * ir);
        const u2 = Fn.create(s * ir);
        const Q = Point.BASE.mulAddUnsafe(u1, R, u2);
        if (Q.is0())
          throw new Error("invalid recovery: point at infinify");
        Q.assertValidity();
        return Q;
      }
      // Signatures should be low-s, to prevent malleability.
      hasHighS() {
        return isBiggerThanHalfOrder(this.s);
      }
      toBytes(format = defaultSigOpts.format) {
        validateSigFormat(format);
        if (format === "der")
          return hexToBytes2(DER.hexFromSig(this));
        const { r, s } = this;
        const rb = Fn.toBytes(r);
        const sb = Fn.toBytes(s);
        if (format === "recovered") {
          assertRecoverableCurve();
          return concatBytes2(Uint8Array.of(this.assertRecovery()), rb, sb);
        }
        return concatBytes2(rb, sb);
      }
      toHex(format) {
        return bytesToHex2(this.toBytes(format));
      }
    }
    Object.freeze(Signature.prototype);
    Object.freeze(Signature);
    const bits2int = opts.bits2int === void 0 ? function bits2int_def(bytes) {
      if (bytes.length > 8192)
        throw new Error("input is too large");
      const num2 = bytesToNumberBE(bytes);
      const delta = bytes.length * 8 - fnBits;
      return delta > 0 ? num2 >> BigInt(delta) : num2;
    } : opts.bits2int;
    const bits2int_modN = opts.bits2int_modN === void 0 ? function bits2int_modN_def(bytes) {
      return Fn.create(bits2int(bytes));
    } : opts.bits2int_modN;
    const ORDER_MASK = bitMask(fnBits);
    function int2octets(num2) {
      aInRange("num < 2^" + fnBits, num2, _0n6, ORDER_MASK);
      return Fn.toBytes(num2);
    }
    function validateMsgAndHash(message, prehash) {
      abytes2(message, void 0, "message");
      return prehash ? abytes2(hash_(message), void 0, "prehashed message") : message;
    }
    function prepSig(message, secretKey, opts2) {
      const { lowS, prehash, extraEntropy } = validateSigOpts(opts2, defaultSigOpts);
      message = validateMsgAndHash(message, prehash);
      const h1int = bits2int_modN(message);
      const d = Fn.fromBytes(secretKey);
      if (!Fn.isValidNot0(d))
        throw new Error("invalid private key");
      const seedArgs = [int2octets(d), int2octets(h1int)];
      if (extraEntropy != null && extraEntropy !== false) {
        const e = extraEntropy === true ? randomBytes3(lengths.secretKey) : extraEntropy;
        seedArgs.push(abytes2(e, void 0, "extraEntropy"));
      }
      const seed = concatBytes2(...seedArgs);
      const m = h1int;
      function k2sig(kBytes) {
        const k = bits2int(kBytes);
        if (!Fn.isValidNot0(k))
          return;
        const q = Point.BASE.multiply(k).toAffine();
        const r = Fn.create(q.x);
        if (r === _0n6)
          return;
        let s;
        if (csprng !== void 0) {
          const b = bytesToNumberBE(mapHashToField(csprng(blindLength), CURVE_ORDER));
          const ibk = Fn.inv(Fn.mul(b, k));
          const bm = Fn.mul(b, m);
          const bd = Fn.mul(b, d);
          s = Fn.create(ibk * Fn.create(bm + bd * r));
        } else {
          const ik = invertCt(k, CURVE_ORDER);
          s = Fn.create(ik * Fn.create(m + r * d));
        }
        if (s === _0n6)
          return;
        let recovery = getRecoveryBit(q.x, q.y, r);
        let normS = s;
        if (lowS && isBiggerThanHalfOrder(s)) {
          normS = Fn.neg(s);
          recovery ^= 1;
        }
        return new Signature(r, normS, hasLargeRecoveryLifts ? void 0 : recovery);
      }
      return { seed, k2sig };
    }
    function sign(message, secretKey, opts2 = {}) {
      const { seed, k2sig } = prepSig(message, secretKey, opts2);
      const drbg = createHmacDrbg(hash_.outputLen, Fn.BYTES, hmac2);
      const sig = drbg(seed, k2sig);
      return sig.toBytes(opts2.format);
    }
    function verify(signature, message, publicKey, opts2 = {}) {
      const { lowS, prehash, format } = validateSigOpts(opts2, defaultSigOpts);
      publicKey = abytes2(publicKey, void 0, "publicKey");
      message = validateMsgAndHash(message, prehash);
      if (!isBytes2(signature)) {
        const end = signature instanceof Signature ? ", use sig.toBytes()" : "";
        throw new Error("verify expects Uint8Array signature" + end);
      }
      validateSigLength(signature, format);
      try {
        const sig = Signature.fromBytes(signature, format);
        const P = Point.fromBytes(publicKey);
        if (P.is0())
          return false;
        if (lowS && sig.hasHighS())
          return false;
        const { r, s } = sig;
        const h = bits2int_modN(message);
        const is = Fn.inv(s);
        const u1 = Fn.create(h * is);
        const u2 = Fn.create(r * is);
        const R = Point.BASE.mulAddUnsafe(u1, P, u2);
        if (R.is0())
          return false;
        const q = R.toAffine();
        const v = Fn.create(q.x);
        if (v !== r)
          return false;
        if (format === "recovered" && sig.recovery !== getRecoveryBit(q.x, q.y, r))
          return false;
        return true;
      } catch (e) {
        return false;
      }
    }
    function recoverPublicKey(signature, message, opts2 = {}) {
      const { prehash } = validateSigOpts(opts2, defaultSigOpts);
      message = validateMsgAndHash(message, prehash);
      return Signature.fromBytes(signature, "recovered").recoverPublicKey(message).toBytes();
    }
    return Object.freeze({
      keygen,
      getPublicKey,
      getSharedSecret,
      utils,
      lengths,
      Point,
      sign,
      verify,
      recoverPublicKey,
      Signature,
      hash: hash_
    });
  }
  var divNearest, _0n6, _1n5, _2n3, _3n3, _4n4;
  var init_weierstrass = __esm({
    "node_modules/@noble/curves/abstract/weierstrass.js"() {
      init_hmac();
      init_utils();
      init_utils2();
      init_curve();
      init_der();
      init_modular();
      divNearest = (num2, den) => (num2 + (num2 >= 0 ? den : -den) / _2n3) / den;
      _0n6 = /* @__PURE__ */ BigInt(0);
      _1n5 = /* @__PURE__ */ BigInt(1);
      _2n3 = /* @__PURE__ */ BigInt(2);
      _3n3 = /* @__PURE__ */ BigInt(3);
      _4n4 = /* @__PURE__ */ BigInt(4);
    }
  });

  // node_modules/@noble/curves/secp256k1.js
  var secp256k1_exports = {};
  __export(secp256k1_exports, {
    __TEST: () => __TEST,
    schnorr: () => schnorr,
    schnorr_FROST: () => schnorr_FROST,
    secp256k1: () => secp256k1,
    secp256k1_FROST: () => secp256k1_FROST,
    secp256k1_hasher: () => secp256k1_hasher
  });
  function sqrtMod(y) {
    const P = secp256k1_CURVE.p;
    const _3n4 = BigInt(3), _6n = BigInt(6), _11n = BigInt(11), _22n = BigInt(22);
    const _23n = BigInt(23), _44n = BigInt(44), _88n = BigInt(88);
    const b2 = y * y * y % P;
    const b3 = b2 * b2 * y % P;
    const b6 = pow2(b3, _3n4, P) * b3 % P;
    const b9 = pow2(b6, _3n4, P) * b3 % P;
    const b11 = pow2(b9, _2n4, P) * b2 % P;
    const b22 = pow2(b11, _11n, P) * b11 % P;
    const b44 = pow2(b22, _22n, P) * b22 % P;
    const b88 = pow2(b44, _44n, P) * b44 % P;
    const b176 = pow2(b88, _88n, P) * b88 % P;
    const b220 = pow2(b176, _44n, P) * b44 % P;
    const b223 = pow2(b220, _3n4, P) * b3 % P;
    const t1 = pow2(b223, _23n, P) * b22 % P;
    const t2 = pow2(t1, _6n, P) * b2 % P;
    const root = pow2(t2, _2n4, P);
    if (!Fpk1.eql(Fpk1.sqr(root), y))
      throw new Error("Cannot find square root");
    return root;
  }
  function taggedHash(tag, ...messages) {
    let tagP = TAGGED_HASH_PREFIXES[tag];
    if (tagP === void 0) {
      const tagH = sha256(asciiToBytes(tag));
      tagP = concatBytes2(tagH, tagH);
      TAGGED_HASH_PREFIXES[tag] = tagP;
    }
    return sha256(concatBytes2(tagP, ...messages));
  }
  function schnorrGetExtPubKey(priv) {
    const { Fn, BASE } = Pointk1;
    const d_ = Fn.fromBytes(abytes2(priv, 32, "secretKey"));
    const p = BASE.multiply(d_);
    const affine = p.toAffine();
    const scalar = hasEven(affine.y) ? d_ : Fn.neg(d_);
    return { scalar, bytes: affineXToBytes(affine) };
  }
  function lift_x(x) {
    const Fp = Fpk1;
    if (!Fp.isValidNot0(x))
      throw new Error("invalid x: Fail if x \u2265 p");
    const xx = Fp.sqr(x);
    const c = Fp.add(Fp.mulN(xx, x), BigInt(7));
    let y = Fp.sqrt(c);
    if (!hasEven(y))
      y = Fp.neg(y);
    const p = Pointk1.fromAffine({ x, y });
    p.assertValidity();
    return p;
  }
  function challenge(...args) {
    return Pointk1.Fn.create(num(taggedHash("BIP0340/challenge", ...args)));
  }
  function schnorrGetPublicKey(secretKey) {
    return schnorrGetExtPubKey(secretKey).bytes;
  }
  function schnorrSign(message, secretKey, auxRand = randomBytes(32)) {
    const { Fn, BASE } = Pointk1;
    const m = copyBytes(abytes2(message, void 0, "message"));
    const { bytes: px, scalar: d } = schnorrGetExtPubKey(secretKey);
    const a = abytes2(auxRand, 32, "auxRand");
    const t = Fn.toBytes(d ^ num(taggedHash("BIP0340/aux", a)));
    const rand = taggedHash("BIP0340/nonce", t, px, m);
    const k_ = Fn.create(num(rand));
    if (k_ === _0n7)
      throw new Error("sign failed: k is zero");
    const p = BASE.multiply(k_);
    const affine = p.toAffine();
    const k = hasEven(affine.y) ? k_ : Fn.neg(k_);
    const rx = affineXToBytes(affine);
    const e = challenge(rx, px, m);
    const sig = new Uint8Array(64);
    sig.set(rx, 0);
    sig.set(Fn.toBytes(Fn.create(k + e * d)), 32);
    if (!schnorrVerify(sig, m, px))
      throw new Error("sign: Invalid signature produced");
    return sig;
  }
  function schnorrVerify(signature, message, publicKey) {
    const { Fp, Fn, BASE } = Pointk1;
    const sig = abytes2(signature, 64, "signature");
    const m = abytes2(message, void 0, "message");
    const pub = abytes2(publicKey, 32, "publicKey");
    try {
      const P = lift_x(num(pub));
      const rBytes = sig.subarray(0, 32);
      const r = num(rBytes);
      if (!Fp.isValidNot0(r))
        return false;
      const s = num(sig.subarray(32, 64));
      if (!Fn.isValidNot0(s))
        return false;
      const e = challenge(rBytes, pointToBytes(P), m);
      const R = BASE.mulAddUnsafe(s, P, Fn.neg(e));
      const { x, y } = R.toAffine();
      if (R.is0() || !hasEven(y) || !Fp.eql(x, r))
        return false;
      return true;
    } catch (error) {
      return false;
    }
  }
  function tweak(point, merkleRoot) {
    if (merkleRoot === void 0)
      return _0n7;
    const x = pointToBytes(point);
    const t = bytesToNumberBE(taggedHash("TapTweak", x, merkleRoot));
    if (!Pointk1.Fn.isValid(t))
      throw new Error("invalid TapTweak hash");
    return t;
  }
  function frostPubToEvenY(pub) {
    const VK = Pointk1.fromBytes(pub.commitments[0]);
    if (hasEven(VK.y))
      return pub;
    return {
      signers: { min: pub.signers.min, max: pub.signers.max },
      commitments: pub.commitments.map((i) => Pointk1.fromBytes(i).negate().toBytes()),
      verifyingShares: Object.fromEntries(Object.entries(pub.verifyingShares).map(([k, v]) => [
        k,
        Pointk1.fromBytes(v).negate().toBytes()
      ]))
    };
  }
  function frostSecretToEvenY(s, pub) {
    const VK = Pointk1.fromBytes(pub.commitments[0]);
    if (hasEven(VK.y))
      return s;
    const Fn = Pointk1.Fn;
    return {
      ...s,
      signingShare: Fn.toBytes(Fn.neg(Fn.fromBytes(s.signingShare)))
    };
  }
  function frostNoncesToEvenY(groupCommitment, nonces) {
    if (hasEven(groupCommitment.y))
      return nonces;
    const Fn = Pointk1.Fn;
    return {
      binding: Fn.toBytes(Fn.neg(Fn.fromBytes(nonces.binding))),
      hiding: Fn.toBytes(Fn.neg(Fn.fromBytes(nonces.hiding)))
    };
  }
  function frostTweakSecret(s, pub, merkleRoot) {
    const Fn = Pointk1.Fn;
    const keyPackage = frostSecretToEvenY(s, pub);
    const evenPub = frostPubToEvenY(pub);
    const t = tweak(Pointk1.fromBytes(evenPub.commitments[0]), merkleRoot);
    const signingShare = Fn.toBytes(Fn.add(Fn.fromBytes(keyPackage.signingShare), t));
    return {
      identifier: keyPackage.identifier,
      signingShare
    };
  }
  function frostTweakPublic(pub, merkleRoot) {
    const PKPackage = frostPubToEvenY(pub);
    const t = tweak(Pointk1.fromBytes(PKPackage.commitments[0]), merkleRoot);
    if (t === _0n7)
      return PKPackage;
    const tp = Pointk1.BASE.multiply(t);
    const commitments = PKPackage.commitments.map((c, i) => (i === 0 ? Pointk1.fromBytes(c).add(tp) : Pointk1.fromBytes(c)).toBytes());
    const verifyingShares = {};
    for (const k in PKPackage.verifyingShares) {
      verifyingShares[k] = Pointk1.fromBytes(PKPackage.verifyingShares[k]).add(tp).toBytes();
    }
    return {
      signers: { min: PKPackage.signers.min, max: PKPackage.signers.max },
      commitments,
      verifyingShares
    };
  }
  var secp256k1_CURVE, secp256k1_ENDO, _0n7, _2n4, Fpk1, Pointk1, secp256k1, TAGGED_HASH_PREFIXES, pointToBytes, affineXToBytes, hasEven, num, __TEST, schnorr, isoMap, mapSWU, getMapSWU, secp256k1_hasher, secp256k1_FROST, schnorr_FROST;
  var init_secp256k1 = __esm({
    "node_modules/@noble/curves/secp256k1.js"() {
      init_sha2();
      init_utils();
      init_curve();
      init_frost();
      init_hash_to_curve();
      init_modular();
      init_weierstrass();
      init_utils2();
      secp256k1_CURVE = {
        p: BigInt("0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2f"),
        n: BigInt("0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141"),
        h: BigInt(1),
        a: BigInt(0),
        b: BigInt(7),
        Gx: BigInt("0x79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798"),
        Gy: BigInt("0x483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8")
      };
      secp256k1_ENDO = {
        beta: BigInt("0x7ae96a2b657c07106e64479eac3434e99cf0497512f58995c1396c28719501ee"),
        basises: [
          [BigInt("0x3086d221a7d46bcde86c90e49284eb15"), -BigInt("0xe4437ed6010e88286f547fa90abfe4c3")],
          [BigInt("0x114ca50f7a8e2f3f657c1108d9d44cfd8"), BigInt("0x3086d221a7d46bcde86c90e49284eb15")]
        ]
      };
      _0n7 = /* @__PURE__ */ BigInt(0);
      _2n4 = /* @__PURE__ */ BigInt(2);
      Fpk1 = /* @__PURE__ */ Field(secp256k1_CURVE.p, { sqrt: sqrtMod });
      Pointk1 = /* @__PURE__ */ weierstrass(secp256k1_CURVE, {
        Fp: Fpk1,
        endo: secp256k1_ENDO
      });
      secp256k1 = /* @__PURE__ */ ecdsa(Pointk1, sha256);
      TAGGED_HASH_PREFIXES = /* @__PURE__ */ Object.create(null);
      pointToBytes = (point) => point.toBytes(true).slice(1);
      affineXToBytes = ({ x }) => Fpk1.toBytes(x);
      hasEven = (y) => !Fpk1.isOdd(y);
      num = bytesToNumberBE;
      __TEST = /* @__PURE__ */ Object.freeze({ lift_x, frostTweakPublic, frostTweakSecret });
      schnorr = /* @__PURE__ */ (() => {
        const size = 32;
        const seedLength = 48;
        const randomSecretKey = (seed) => {
          seed = seed === void 0 ? randomBytes(seedLength) : seed;
          return mapHashToField(abytes2(seed, seedLength, "seed"), secp256k1_CURVE.n);
        };
        return Object.freeze({
          keygen: createKeygen(randomSecretKey, schnorrGetPublicKey),
          getPublicKey: schnorrGetPublicKey,
          sign: schnorrSign,
          verify: schnorrVerify,
          Point: Pointk1,
          utils: Object.freeze({
            randomSecretKey,
            taggedHash,
            lift_x,
            pointToBytes
          }),
          lengths: Object.freeze({
            secretKey: size,
            publicKey: size,
            publicKeyHasPrefix: false,
            signature: size * 2,
            seed: seedLength
          })
        });
      })();
      isoMap = /* @__PURE__ */ (() => isogenyMap(Fpk1, [
        // xNum
        [
          "0x8e38e38e38e38e38e38e38e38e38e38e38e38e38e38e38e38e38e38daaaaa8c7",
          "0x7d3d4c80bc321d5b9f315cea7fd44c5d595d2fc0bf63b92dfff1044f17c6581",
          "0x534c328d23f234e6e2a413deca25caece4506144037c40314ecbd0b53d9dd262",
          "0x8e38e38e38e38e38e38e38e38e38e38e38e38e38e38e38e38e38e38daaaaa88c"
        ],
        // xDen
        [
          "0xd35771193d94918a9ca34ccbb7b640dd86cd409542f8487d9fe6b745781eb49b",
          "0xedadc6f64383dc1df7c4b2d51b54225406d36b641f5e41bbc52a56612a8c6d14",
          "0x0000000000000000000000000000000000000000000000000000000000000001"
          // LAST 1
        ],
        // yNum
        [
          "0x4bda12f684bda12f684bda12f684bda12f684bda12f684bda12f684b8e38e23c",
          "0xc75e0c32d5cb7c0fa9d0a54b12a0a6d5647ab046d686da6fdffc90fc201d71a3",
          "0x29a6194691f91a73715209ef6512e576722830a201be2018a765e85a9ecee931",
          "0x2f684bda12f684bda12f684bda12f684bda12f684bda12f684bda12f38e38d84"
        ],
        // yDen
        [
          "0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffff93b",
          "0x7a06534bb8bdb49fd5e9e6632722c2989467c1bfc8e8d978dfb425d2685c2573",
          "0x6484aa716545ca2cf3a70c3fa8fe337e0a3d21162f0d6299a7bf8192bfd2a76f",
          "0x0000000000000000000000000000000000000000000000000000000000000001"
          // LAST 1
        ]
      ].map((i) => i.map((j) => BigInt(j)))))();
      getMapSWU = () => mapSWU || (mapSWU = mapToCurveSimpleSWU(Fpk1, {
        // Building the SWU sqrt-ratio helper eagerly adds noticeable `secp256k1.js` import cost, so
        // defer it to first use; after that the cached mapper is reused directly.
        A: BigInt("0x3f8731abdd661adca08a5558f0f5d272e953d363cb6f0e5d405447c01a444533"),
        B: BigInt("1771"),
        Z: Fpk1.create(BigInt("-11"))
      }));
      secp256k1_hasher = /* @__PURE__ */ (() => createHasher2(Pointk1, (scalars) => {
        const { x, y } = getMapSWU()(Fpk1.create(scalars[0]));
        return isoMap(x, y);
      }, {
        DST: "secp256k1_XMD:SHA-256_SSWU_RO_",
        encodeDST: "secp256k1_XMD:SHA-256_SSWU_NU_",
        p: Fpk1.ORDER,
        m: 1,
        k: 128,
        expand: "xmd",
        hash: sha256
      }))();
      secp256k1_FROST = /* @__PURE__ */ (() => createFROST({
        name: "FROST-secp256k1-SHA256-v1",
        Point: Pointk1,
        hashToScalar: secp256k1_hasher.hashToScalar,
        hash: sha256
      }))();
      schnorr_FROST = /* @__PURE__ */ (() => createFROST({
        name: "FROST-secp256k1-SHA256-TR-v1",
        Point: Pointk1,
        hashToScalar: secp256k1_hasher.hashToScalar,
        hash: sha256,
        // Taproot related hacks
        parsePublicKey(publicKey) {
          if (publicKey.length === 32)
            return lift_x(bytesToNumberBE(publicKey));
          if (publicKey.length === 33)
            return Pointk1.fromBytes(publicKey);
          throw new Error(`expected x-only or compressed public key, got length=${publicKey.length}`);
        },
        adjustScalar(n) {
          const PK = Pointk1.BASE.multiply(n);
          return hasEven(PK.y) ? n : Pointk1.Fn.neg(n);
        },
        adjustPoint: (p) => hasEven(p.y) ? p : p.negate(),
        challenge(R, PK, msg) {
          return challenge(pointToBytes(R), pointToBytes(PK), msg);
        },
        adjustNonces: frostNoncesToEvenY,
        adjustGroupCommitmentShare: (GC, GCShare) => !hasEven(GC.y) ? GCShare.negate() : GCShare,
        adjustPublic: frostPubToEvenY,
        adjustSecret: frostSecretToEvenY,
        adjustTx: {
          // Compat with official implementation
          encode: (tx) => tx.subarray(1),
          decode: (tx) => concatBytes2(Uint8Array.of(2), tx)
        },
        adjustDKG: (k) => {
          const merkleRoot = new Uint8Array(0);
          return {
            public: frostTweakPublic(k.public, merkleRoot),
            secret: frostTweakSecret(k.secret, k.public, merkleRoot)
          };
        }
      }))();
    }
  });

  // client/wallet.js
  var require_wallet = __commonJS({
    "client/wallet.js"(exports, module) {
      var { secp256k1: secp256k12 } = (init_secp256k1(), __toCommonJS(secp256k1_exports));
      var encoder = new TextEncoder();
      var ITERATIONS = 6e5;
      var hex = (bytes2) => Array.from(bytes2, (byte) => byte.toString(16).padStart(2, "0")).join("");
      var bytes = (value) => Uint8Array.from(value.match(/../g), (part) => parseInt(part, 16));
      var base64 = (value) => btoa(String.fromCharCode(...value));
      function publicIdentity(secret) {
        const publicBytes = secp256k12.getPublicKey(secret, false);
        const prefix = bytes("3056301006072a8648ce3d020106052b8104000a034200");
        const der = new Uint8Array(prefix.length + publicBytes.length);
        der.set(prefix);
        der.set(publicBytes, prefix.length);
        const encoded = base64(der).match(/.{1,64}/g).join("\n");
        return { der, publicKey: "-----BEGIN PUBLIC KEY-----\n" + encoded + "\n-----END PUBLIC KEY-----\n" };
      }
      async function identity(secret) {
        const { der, publicKey } = publicIdentity(secret);
        const hash = await crypto.subtle.digest("SHA-256", der);
        return { address: "SC_" + hex(new Uint8Array(hash)).slice(0, 40), publicKey };
      }
      async function passwordKey(password, salt, usage) {
        const material = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveKey"]);
        return crypto.subtle.deriveKey(
          { name: "PBKDF2", hash: "SHA-256", salt, iterations: ITERATIONS },
          material,
          { name: "AES-GCM", length: 256 },
          false,
          [usage]
        );
      }
      async function create(password) {
        if (typeof password !== "string" || password.length < 12) {
          throw new Error("Use a wallet password with at least 12 characters.");
        }
        const secret = secp256k12.utils.randomSecretKey();
        try {
          const info = await identity(secret);
          const salt = crypto.getRandomValues(new Uint8Array(16));
          const iv = crypto.getRandomValues(new Uint8Array(12));
          const key = await passwordKey(password, salt, "encrypt");
          const ciphertext = await crypto.subtle.encrypt({
            name: "AES-GCM",
            iv,
            additionalData: encoder.encode("SecureChain-Wallet-v1")
          }, key, secret);
          return {
            version: 1,
            address: info.address,
            iterations: ITERATIONS,
            salt: hex(salt),
            iv: hex(iv),
            ciphertext: hex(new Uint8Array(ciphertext))
          };
        } finally {
          secret.fill(0);
        }
      }
      function validateVault(vault) {
        if (!vault || vault.version !== 1 || vault.iterations !== ITERATIONS || !/^SC_[0-9a-f]{40}$/.test(vault.address) || !/^[0-9a-f]{32}$/.test(vault.salt) || !/^[0-9a-f]{24}$/.test(vault.iv) || !/^[0-9a-f]{96}$/.test(vault.ciphertext)) throw new Error("Invalid encrypted wallet file.");
        return {
          version: 1,
          address: vault.address,
          iterations: ITERATIONS,
          salt: vault.salt,
          iv: vault.iv,
          ciphertext: vault.ciphertext
        };
      }
      async function unlock(input, password) {
        const vault = validateVault(input);
        let secret;
        try {
          const key = await passwordKey(password, bytes(vault.salt), "decrypt");
          secret = new Uint8Array(await crypto.subtle.decrypt(
            {
              name: "AES-GCM",
              iv: bytes(vault.iv),
              additionalData: encoder.encode("SecureChain-Wallet-v1")
            },
            key,
            bytes(vault.ciphertext)
          ));
          const info = await identity(secret);
          if (info.address !== vault.address) throw new Error("Address mismatch");
          let locked = false;
          return {
            ...info,
            lock() {
              secret.fill(0);
              locked = true;
            },
            sign(receiver, amount, nonce) {
              if (locked) throw new Error("Unlock the wallet before signing.");
              if (!/^SC_[0-9a-f]{40}$/.test(receiver) || !Number.isSafeInteger(amount) || amount < 1 || !Number.isSafeInteger(nonce) || nonce < 0) {
                throw new Error("Enter a valid recipient and a positive whole amount.");
              }
              const data = encoder.encode(JSON.stringify([
                "SecureChain-TX-v1",
                info.address,
                receiver,
                amount,
                nonce
              ]));
              const signature = secp256k12.sign(data, secret, { format: "der", prehash: true });
              return {
                sender: info.address,
                receiver,
                amount,
                nonce,
                publicKey: info.publicKey,
                signature: hex(signature)
              };
            }
          };
        } catch {
          secret?.fill(0);
          throw new Error("Unable to unlock wallet. Check the password and wallet file.");
        }
      }
      module.exports = { create, unlock, validateVault };
    }
  });
  return require_wallet();
})();
/*! Bundled license information:

@noble/curves/utils.js:
@noble/curves/abstract/modular.js:
@noble/curves/abstract/curve.js:
@noble/curves/abstract/der.js:
@noble/curves/abstract/weierstrass.js:
@noble/curves/secp256k1.js:
  (*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) *)
*/
