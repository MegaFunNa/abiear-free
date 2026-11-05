(async () => {
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res, err) => function __init() {
  if (err) throw err[0];
  try {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  } catch (e) {
    throw err = [e], e;
  }
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// js/ncc-sos.js
var BANDS, SOS;
var init_ncc_sos = __esm({
  "js/ncc-sos.js"() {
    BANDS = [[40, 900], [900, 2500], [2500, 4500], [4500, 8e3], [8e3, 11500]];
    SOS = [[[8700548979953996e-21, 17401097959907992e-21, 8700548979953996e-21, 1, -1.809585342730556, 0.8203546981213877], [1, 2, 1, 1, -1.9079896498570863, 0.9210096909894185], [1, -2, 1, 1, -1.9897191826948066, 0.9897511555897573], [1, -2, 1, 1, -1.996232378800817, 0.9962603662950666]], [[9276462029231162e-20, 18552924058462325e-20, 9276462029231162e-20, 1, -1.73323449947286, 0.7878695832419383], [1, 2, 1, 1, -1.83761640203843, 0.860208625635113], [1, -2, 1, 1, -1.7964145249042311, 0.891334114182785], [1, -2, 1, 1, -1.942183386253815, 0.9565426957104826]], [[21313872697507885e-20, 4262774539501577e-19, 21313872697507885e-20, 1, -1.5503830620838996, 0.7625522810788534], [1, 2, 1, 1, -1.6691795305403505, 0.8052585995403833], [1, -2, 1, 1, -1.577662165021925, 0.8831806233162003], [1, -2, 1, 1, -1.821646170765022, 0.9281911551107702]], [[0.001614294763260782, 0.003228589526521564, 0.001614294763260782, 1, -1.0205974309229517, 0.6219712718749593], [1, 2, 1, 1, -1.277099752728289, 0.6749955752947558], [1, -2, 1, 1, -0.9360621412934027, 0.8138139922979011], [1, -2, 1, 1, -1.5446178388171181, 0.8730356093806262]], [[0.0016142947632607834, 0.003228589526521567, 0.0016142947632607834, 1, -0.34190849210297514, 0.6397370116230721], [1, 2, 1, 1, -0.633799226387939, 0.6562506918443047], [1, -2, 1, 1, -0.15123736415147843, 0.8334224933987374], [1, -2, 1, 1, -0.9021732510164724, 0.8524951034029221]]];
  }
});

// js/fft.js
function tablesFor(n) {
  let t = tables.get(n);
  if (t) return t;
  const bits = Math.log2(n);
  if (!Number.isInteger(bits)) throw new Error(`размер БПФ не степень двойки: ${n}`);
  const rev = new Uint32Array(n);
  for (let i = 0; i < n; i++) {
    let r = 0;
    for (let b = 0; b < bits; b++) r |= (i >> b & 1) << bits - 1 - b;
    rev[i] = r;
  }
  const stages = [];
  for (let size = 8; size <= n; size <<= 1) {
    const half = size >> 1;
    const c = new Float64Array(half), s = new Float64Array(half);
    for (let k = 0; k < half; k++) {
      c[k] = Math.cos(2 * Math.PI * k / size);
      s[k] = Math.sin(2 * Math.PI * k / size);
    }
    stages.push({ size, half, c, s });
  }
  t = { rev, stages };
  tables.set(n, t);
  return t;
}
function nextPow2(n) {
  let p = 1;
  while (p < n) p <<= 1;
  return p;
}
function fft(re, im, inverse = false) {
  const n = re.length;
  if (n < 4) throw new Error("БПФ меньше 4 точек не нужно");
  const { rev, stages } = tablesFor(n);
  for (let i = 0; i < n; i++) {
    const j = rev[i];
    if (j > i) {
      let t = re[i];
      re[i] = re[j];
      re[j] = t;
      t = im[i];
      im[i] = im[j];
      im[j] = t;
    }
  }
  const sgn = inverse ? 1 : -1;
  for (let a = 0; a < n; a += 4) {
    const r0 = re[a] + re[a + 1], i0 = im[a] + im[a + 1];
    const r1 = re[a] - re[a + 1], i1 = im[a] - im[a + 1];
    const r2 = re[a + 2] + re[a + 3], i2 = im[a + 2] + im[a + 3];
    const r3 = re[a + 2] - re[a + 3], i3 = im[a + 2] - im[a + 3];
    const t3r = -sgn * i3, t3i = sgn * r3;
    re[a] = r0 + r2;
    im[a] = i0 + i2;
    re[a + 2] = r0 - r2;
    im[a + 2] = i0 - i2;
    re[a + 1] = r1 + t3r;
    im[a + 1] = i1 + t3i;
    re[a + 3] = r1 - t3r;
    im[a + 3] = i1 - t3i;
  }
  for (const { size, half, c, s } of stages) {
    for (let start = 0; start < n; start += size) {
      for (let k = 0; k < half; k++) {
        const wr = c[k], wi = sgn * s[k];
        const a = start + k, b = a + half;
        const br = re[b], bi = im[b];
        const tr = br * wr - bi * wi;
        const ti = br * wi + bi * wr;
        re[b] = re[a] - tr;
        im[b] = im[a] - ti;
        re[a] += tr;
        im[a] += ti;
      }
    }
  }
  if (inverse) for (let i = 0; i < n; i++) {
    re[i] /= n;
    im[i] /= n;
  }
}
function fftReal2(a, b, n) {
  const re = new Float64Array(n), im = new Float64Array(n);
  re.set(a.length > n ? a.subarray(0, n) : a);
  if (b) im.set(b.length > n ? b.subarray(0, n) : b);
  fft(re, im);
  const A = { re: new Float64Array(n), im: new Float64Array(n) };
  const B = b ? { re: new Float64Array(n), im: new Float64Array(n) } : null;
  for (let k = 0; k < n; k++) {
    const k2 = n - k & n - 1;
    const zr = re[k], zi = im[k], cr = re[k2], ci = -im[k2];
    A.re[k] = (zr + cr) / 2;
    A.im[k] = (zi + ci) / 2;
    if (B) {
      B.re[k] = (zi - ci) / 2;
      B.im[k] = -(zr - cr) / 2;
    }
  }
  return [A, B];
}
var tables;
var init_fft = __esm({
  "js/fft.js"() {
    tables = /* @__PURE__ */ new Map();
  }
});

// js/ncc-detector.js
var ncc_detector_exports = {};
__export(ncc_detector_exports, {
  DECIM: () => DECIM,
  DEFAULTS: () => DEFAULTS,
  IN_SR: () => IN_SR,
  NccDetector: () => NccDetector,
  SR: () => SR,
  prepareTemplate: () => prepareTemplate,
  pursuit: () => pursuit,
  scoreWindow: () => scoreWindow,
  splitBands: () => splitBands
});
function splitBands(x48) {
  const tmp = new Float64Array(x48.length);
  return SOS.map((sos) => {
    new BandFilter(sos).process(x48, tmp);
    const out = new Float64Array(Math.ceil(x48.length / DECIM));
    for (let i = 0, j = 0; i < x48.length; i += DECIM, j++) out[j] = tmp[i];
    return out;
  });
}
function prepareTemplate(wave, meta, opts = {}) {
  opts = { ...DEFAULTS, ...opts };
  const pad = new Float64Array(IN_SR / 20 + wave.length + IN_SR / 10);
  pad.set(wave, IN_SR / 20);
  const bands = splitBands(pad);
  const n = bands[0].length;
  const env = new Float64Array(n);
  let peak = 0;
  for (let i = 0; i < n; i++) {
    let e = 0;
    for (let b = 0; b < NB; b++) e += bands[b][i] ** 2;
    env[i] = e;
    if (e > peak) peak = e;
  }
  if (!(peak > 0)) throw new Error(`пустой эталон ${meta.name}`);
  let on = 0;
  while (on < n && env[on] <= peak * 1e-3) on++;
  let end = n - 1;
  while (end > on && env[end] <= peak * 1e-6) end--;
  const start = Math.max(0, on - Math.round(0.01 * SR));
  const L2 = Math.min(Math.round(opts.matchSec * SR), end + 1 - start);
  const seg = bands.map((x) => x.slice(start, start + L2));
  const full = bands.map((x) => x.slice(start, end + 1));
  const segE = seg.map((x) => x.reduce((s, v) => s + v * v, 0));
  const total = segE.reduce((a, b) => a + b, 0);
  const share = segE.map((e) => e / total);
  const used = share.map((w) => w >= opts.minW);
  const norm3 = (idx) => {
    const w = new Float64Array(NB);
    const s = idx.reduce((a, b) => a + share[b], 0);
    if (s > 0) for (const b of idx) w[b] = share[b] / s;
    return w;
  };
  const all = [...Array(NB).keys()].filter((b) => used[b]);
  const lf = LF_BANDS.filter((b) => used[b]);
  return {
    ...meta,
    L: L2,
    seg,
    full,
    segE,
    segTotal: total,
    segNorm: segE.map(Math.sqrt),
    bands: all,
    w: norm3(all),
    lfBands: lf,
    wLF: lf.length ? norm3(lf) : null,
    spec: /* @__PURE__ */ new Map()
    // N → [{re, im}] спектры полос эталона (уже сопряжённые)
  };
}
function templateSpec(t, N) {
  t = t.base ?? t;
  let s = t.spec.get(N);
  if (s) return s;
  s = new Array(NB).fill(null);
  for (let i = 0; i < t.bands.length; i += 2) {
    const b1 = t.bands[i], b2 = t.bands[i + 1];
    const [A, B] = fftReal2(t.seg[b1], b2 != null ? t.seg[b2] : null, N);
    for (const [b, S] of [[b1, A], [b2, B]]) {
      if (b == null) continue;
      for (let k = 0; k < N; k++) S.im[k] = -S.im[k];
      s[b] = S;
    }
  }
  t.spec.set(N, s);
  return s;
}
function scoreWindow(X, templates, opts = DEFAULTS) {
  const n = X[0].length;
  const N = nextPow2(n);
  const eps = n > 0 ? 10 ** (opts.minLevelDb / 10) : 0;
  const c2 = X.map((x) => {
    const c = new Float64Array(n + 1);
    for (let i = 0; i < n; i++) c[i + 1] = c[i] + x[i] * x[i];
    return c;
  });
  const XS = new Array(NB);
  for (let b = 0; b < NB; b += 2) {
    const [A, B] = fftReal2(X[b], b + 1 < NB ? X[b + 1] : null, N);
    XS[b] = A;
    if (b + 1 < NB) XS[b + 1] = B;
  }
  const out = /* @__PURE__ */ new Map();
  const acc = /* @__PURE__ */ new Map();
  const jobs = [];
  for (const t of templates) {
    const m = n - t.L + 1;
    acc.set(t, { full: new Float64Array(Math.max(0, m)), lf: t.wLF && opts.useLF ? new Float64Array(Math.max(0, m)) : null, m });
    if (m <= 0) continue;
    const spec = templateSpec(t, N);
    for (const b of t.bands) jobs.push([t, b, spec[b]]);
  }
  const invCache = /* @__PURE__ */ new Map();
  const invNorm = (b, L2, m) => {
    const key = b * 1e6 + L2;
    let v = invCache.get(key);
    if (!v) {
      v = new Float64Array(m);
      const cb = c2[b];
      for (let p = 0; p < m; p++) v[p] = 1 / (Math.sqrt(cb[p + L2] - cb[p] + eps * L2) + 1e-30);
      invCache.set(key, v);
    }
    return v;
  };
  const re = new Float64Array(N), im = new Float64Array(N);
  for (let j = 0; j < jobs.length; j += 2) {
    const J1 = jobs[j], J2 = jobs[j + 1];
    const X1 = XS[J1[1]], T1 = J1[2];
    if (J2) {
      const X2 = XS[J2[1]], T2 = J2[2];
      for (let k = 0; k < N; k++) {
        const p1r = X1.re[k] * T1.re[k] - X1.im[k] * T1.im[k];
        const p1i = X1.re[k] * T1.im[k] + X1.im[k] * T1.re[k];
        const p2r = X2.re[k] * T2.re[k] - X2.im[k] * T2.im[k];
        const p2i = X2.re[k] * T2.im[k] + X2.im[k] * T2.re[k];
        re[k] = p1r - p2i;
        im[k] = p1i + p2r;
      }
    } else {
      for (let k = 0; k < N; k++) {
        re[k] = X1.re[k] * T1.re[k] - X1.im[k] * T1.im[k];
        im[k] = X1.re[k] * T1.im[k] + X1.im[k] * T1.re[k];
      }
    }
    fft(re, im, true);
    for (const [J, corr] of [[J1, re], [J2, im]]) {
      if (!J) continue;
      const [t, b] = J;
      const a = acc.get(t);
      const inv = invNorm(b, t.L, a.m), tn = 1 / t.segNorm[b];
      const wf = t.w[b] * tn, wl = a.lf ? t.wLF[b] * tn : 0;
      const full = a.full, lf = a.lf;
      if (wl) for (let p = 0; p < a.m; p++) {
        const v = corr[p] * inv[p];
        full[p] += wf * v;
        lf[p] += wl * v;
      }
      else for (let p = 0; p < a.m; p++) full[p] += wf * corr[p] * inv[p];
    }
  }
  for (const t of templates) {
    const a = acc.get(t);
    const s = new Float32Array(n).fill(-Infinity);
    for (let p = 0; p < a.m; p++) s[p] = a.lf ? Math.max(a.full[p], a.lf[p]) : a.full[p];
    out.set(t, s);
  }
  return out;
}
function pursuit(X, templates, opts = DEFAULTS) {
  const n = X[0].length;
  const R = X.map((x) => Float64Array.from(x));
  const excl = new Map(templates.map((t) => [t, []]));
  const cluster = Math.round(opts.clusterSec * SR);
  const near = Math.round(0.05 * SR);
  const hits = [];
  let first = null;
  for (let it = 0; it < opts.maxIters; it++) {
    const S = scoreWindow(R, templates, opts);
    if (!first) first = S;
    let best = null;
    for (const t2 of templates) {
      const s = S.get(t2), ex = excl.get(t2);
      for (let p2 = 0; p2 < n; p2++) {
        if (!(s[p2] > (best?.score ?? -Infinity))) continue;
        if (ex.some(([lo, hi]) => p2 >= lo && p2 <= hi)) continue;
        best = { template: t2, pos: p2, score: s[p2] };
      }
    }
    if (!best || best.score < thresholdOf(best.template, opts) - opts.subMargin) break;
    const { template: t, pos: p } = best;
    excl.get(t).push([p - cluster, p + cluster]);
    let eR = 0, eO = 0;
    for (const b of t.bands) {
      for (let i = p; i < Math.min(n, p + t.L); i++) {
        eR += R[b][i] ** 2;
        eO += X[b][i] ** 2;
      }
    }
    if (eR > eO * 1.05 + 1e-20) continue;
    let dot = 0;
    for (let b = 0; b < NB; b++) {
      const r = R[b], sg = t.seg[b];
      for (let i = 0; i < t.L && p + i < n; i++) dot += r[p + i] * sg[i];
    }
    const gain = Math.max(0, dot / t.segTotal);
    for (let b = 0; b < NB; b++) {
      const r = R[b], f = t.full[b];
      for (let i = 0; i < f.length && p + i < n; i++) r[p + i] -= gain * f[i];
    }
    if (best.score >= thresholdOf(t, opts)) {
      let second = null;
      for (const u of templates) {
        if (u.soundId === t.soundId) continue;
        const s = first.get(u);
        for (let q = Math.max(0, p - near); q <= Math.min(n - 1, p + near); q++) {
          if (s[q] > (second?.score ?? -Infinity)) second = { template: u, score: s[q] };
        }
      }
      hits.push({ ...best, gain, second });
    }
  }
  return hits.sort((a, b) => b.score - a.score);
}
var IN_SR, DECIM, SR, NB, LF_MAX_HZ, LF_BANDS, DEFAULTS, BandFilter, thresholdOf, NccDetector;
var init_ncc_detector = __esm({
  "js/ncc-detector.js"() {
    init_ncc_sos();
    init_fft();
    IN_SR = 48e3;
    DECIM = 2;
    SR = IN_SR / DECIM;
    NB = BANDS.length;
    LF_MAX_HZ = 4500;
    LF_BANDS = BANDS.map(([, hi], b) => hi <= LF_MAX_HZ ? b : -1).filter((b) => b >= 0);
    DEFAULTS = {
      matchSec: 0.2,
      // сколько от начала эталона сравниваем
      threshold: 0.38,
      // порог срабатывания (у эталона может быть свой: template.threshold). Часть звуков
      // игра смешивает со случайным слоем, и они дают только 0.43–0.56; фон без звуков ≤ ~0.32
      candThr: 0.28,
      // с какого сходства место становится кандидатом на разбор
      fastMin: 0.75,
      // быстрый путь: сходство не ниже …
      fastMargin: 0.25,
      // … и отрыв от лучшего другого звука рядом
      minW: 0.03,
      // полосы с меньшей долей энергии эталона не участвуют
      subMargin: 0.1,
      // pursuit вычитает находки от threshold − subMargin
      pastSec: 0.5,
      // окно разбора: до кандидата …
      futureSec: 0.35,
      // … и после
      clusterSec: 0.25,
      // одна и та же находка эталона в пределах этого — одна
      maxIters: 10,
      maxPursuit: 12,
      // сколько эталонов-кандидатов разбирать в одном окне
      useLF: true,
      minLevelDb: -80,
      // тише этого (на отсчёт) — тишина, корреляцию не считаем
      preThr: 0.2,
      // предотбор по главной полосе (0 — без предотбора)
      fftSize: 8192
      // размер БПФ сканирования: шаг = fftSize − длина эталона (8192 → ~0.14 с)
    };
    BandFilter = class {
      constructor(sos) {
        this.sos = sos;
        this.z = sos.map(() => new Float64Array(2));
      }
      process(x, out) {
        const { sos, z } = this;
        for (let i = 0; i < x.length; i++) {
          let v = x[i];
          for (let s = 0; s < sos.length; s++) {
            const c = sos[s], zs = z[s];
            const y = c[0] * v + zs[0];
            zs[0] = c[1] * v - c[4] * y + zs[1];
            zs[1] = c[2] * v - c[5] * y;
            v = y;
          }
          out[i] = v;
        }
        return out;
      }
    };
    thresholdOf = (t, opts) => t.threshold ?? opts.threshold;
    NccDetector = class {
      constructor(templates, opts = {}) {
        if (!templates.length) throw new Error("пустая библиотека звуков");
        this.opts = { ...DEFAULTS, ...opts };
        this.templates = templates;
        this.Lmax = Math.max(...templates.map((t) => t.L));
        this.fullMax = Math.max(...templates.map((t) => t.full[0].length));
        this.N = Math.max(this.opts.fftSize ?? 0, nextPow2(this.Lmax + 1024));
        this.pre = templates.map((t) => {
          const b = t.bands.reduce((a, c) => t.w[c] > t.w[a] ? c : a);
          const v = Object.create(t);
          v.bands = [b];
          v.w = Float64Array.from({ length: NB }, (_, i) => i === b ? 1 : 0);
          v.wLF = null;
          v.base = t;
          return v;
        });
        this.hop = this.N - this.Lmax + 1;
        this.cluster = Math.round(this.opts.clusterSec * SR);
        this.past = Math.round(this.opts.pastSec * SR);
        this.future = Math.round(this.opts.futureSec * SR);
        this.reset();
      }
      reset() {
        this.filters = SOS.map((s) => new BandFilter(s));
        this.phase = 0;
        this.buf = Array.from({ length: NB }, () => new Float64Array(8 * SR));
        this.len = 0;
        this.bufStart = 0;
        this.scanPos = 0;
        this.pending = [];
        this.emitted = [];
        this.stats = { hops: 0, skipped: 0, pursuits: 0, scanMs: 0, pursuitMs: 0, best: 0 };
      }
      get bufEnd() {
        return this.bufStart + this.len;
      }
      // Кормить моно 48 кГц любыми кусками. Возвращает находки.
      feed(block) {
        const x = block instanceof Float64Array ? block : Float64Array.from(block);
        const tmp = new Float64Array(x.length);
        const first = this.phase === 0 ? 0 : DECIM - this.phase;
        const count = first < x.length ? Math.floor((x.length - 1 - first) / DECIM) + 1 : 0;
        if (this.len + count > this.buf[0].length) {
          const cap = Math.max(this.len + count, this.buf[0].length * 2);
          this.buf = this.buf.map((old) => {
            const y = new Float64Array(cap);
            y.set(old.subarray(0, this.len));
            return y;
          });
        }
        for (let b = 0; b < NB; b++) {
          this.filters[b].process(x, tmp);
          const dst = this.buf[b];
          for (let i = first, j = this.len; i < x.length; i += DECIM, j++) dst[j] = tmp[i];
        }
        this.len += count;
        this.phase = (this.phase + x.length) % DECIM;
        const hits = [];
        while (this.scanPos + this.hop + this.Lmax - 1 <= this.bufEnd) {
          hits.push(...this.scanHop(this.scanPos));
          this.scanPos += this.hop;
        }
        this.trim();
        return hits;
      }
      // Дожать хвост (для файлов).
      flush() {
        const sec = (this.opts.futureSec + this.opts.pastSec + 2 * this.hop / SR + this.Lmax / SR) * 1.2;
        return this.feed(new Float64Array(Math.ceil(sec * IN_SR)));
      }
      window(a, b) {
        a = Math.max(a, this.bufStart);
        b = Math.min(b, this.bufEnd);
        return { start: a, X: this.buf.map((x) => x.slice(a - this.bufStart, b - this.bufStart)) };
      }
      trim() {
        const keep = this.past + this.future + this.cluster * 4 + this.fullMax + this.hop * 2;
        const minPending = this.pending.length ? Math.min(...this.pending.map((c) => c.pos)) - this.past : Infinity;
        const from = Math.min(this.scanPos - keep, minPending);
        const cut = from - this.bufStart;
        if (cut > SR) {
          for (const x of this.buf) x.copyWithin(0, cut, this.len);
          this.len -= cut;
          this.bufStart += cut;
        }
        this.emitted = this.emitted.filter((e) => e.pos > this.scanPos - 10 * SR);
      }
      banned(t, pos) {
        return this.emitted.some((e) => e.template === t && Math.abs(e.pos - pos) <= this.cluster);
      }
      emit(hit, how) {
        if (this.banned(hit.template, hit.pos)) return null;
        this.emitted.push({ template: hit.template, pos: hit.pos });
        const t = hit.template;
        return {
          name: t.name,
          soundId: t.soundId,
          kind: t.kind,
          score: hit.score,
          how,
          time: hit.pos * DECIM / IN_SR,
          second: hit.second ? { name: hit.second.template.name, soundId: hit.second.template.soundId, score: hit.second.score } : null
        };
      }
      scanHop(p0) {
        const o = this.opts;
        const t0 = performance.now();
        this.stats.hops++;
        const { X } = this.window(p0, p0 + this.hop + this.Lmax - 1);
        let e = 0;
        for (const x of X) for (let i = 0; i < x.length; i++) e += x[i] * x[i];
        const out = [];
        if (e / X[0].length < 10 ** (o.minLevelDb / 10)) {
          this.stats.skipped++;
        } else {
          let S;
          if (o.preThr > 0) {
            const P = scoreWindow(X, this.pre, { ...o, useLF: false });
            const sel = [];
            S = /* @__PURE__ */ new Map();
            for (const v of this.pre) {
              const s = P.get(v);
              let mx = -Infinity;
              for (let p = 0; p < this.hop; p++) if (s[p] > mx) mx = s[p];
              if (mx >= o.preThr) sel.push(v.base);
              else S.set(v.base, s);
            }
            this.stats.full = (this.stats.full ?? 0) + sel.length;
            for (const [t, s] of scoreWindow(X, sel, o)) S.set(t, s);
            this.selected = new Set(sel);
          } else {
            S = scoreWindow(X, this.templates, o);
            this.selected = null;
          }
          const tops = [];
          for (const t of this.templates) {
            if (this.selected && !this.selected.has(t)) continue;
            const s = S.get(t);
            let bp = -1, bs = -Infinity;
            for (let p = 0; p < this.hop; p++) if (s[p] > bs) {
              bs = s[p];
              bp = p;
            }
            if (bs > this.stats.best) this.stats.best = bs;
            if (bs >= o.candThr) tops.push({ template: t, pos: p0 + bp, score: bs, rel: bp });
          }
          for (const c of tops) this.addCandidate(c);
          tops.sort((a, b) => b.score - a.score);
          const best = tops[0];
          if (best && best.score >= o.fastMin) {
            const near = Math.round(0.05 * SR);
            let second = null;
            for (const t of this.templates) {
              if (t.soundId === best.template.soundId) continue;
              const s = S.get(t);
              for (let p = Math.max(0, best.rel - near); p <= Math.min(this.hop - 1, best.rel + near); p++) {
                if (s[p] > (second?.score ?? -Infinity)) second = { template: t, score: s[p] };
              }
            }
            if (best.score - (second?.score ?? 0) >= o.fastMargin) {
              const h = this.emit({ ...best, second }, "fast");
              if (h) out.push(h);
            }
          }
        }
        this.stats.scanMs += performance.now() - t0;
        out.push(...this.finalize(p0 + this.hop));
        return out;
      }
      addCandidate(c) {
        const same = this.pending.find((d) => d.template === c.template && Math.abs(d.pos - c.pos) <= this.cluster);
        if (!same) this.pending.push(c);
        else if (c.score > same.score) Object.assign(same, c);
      }
      // Кандидаты, после которых просканировано futureSec, разбираются группами (близкие — вместе).
      finalize(scanned) {
        const out = [];
        this.pending.sort((a, b) => a.pos - b.pos);
        while (this.pending.length) {
          let k = 1;
          while (k < this.pending.length && this.pending[k].pos - this.pending[k - 1].pos <= this.cluster) k++;
          const group = this.pending.slice(0, k);
          const last = group[group.length - 1].pos;
          if (last + this.future > scanned) break;
          this.pending.splice(0, k);
          const t0 = performance.now();
          this.stats.pursuits++;
          const byT = /* @__PURE__ */ new Map();
          for (const c of group) if (!byT.has(c.template) || byT.get(c.template) < c.score) byT.set(c.template, c.score);
          const cands = [...byT].sort((a, b) => b[1] - a[1]).slice(0, this.opts.maxPursuit).map(([t]) => t);
          const { start, X } = this.window(group[0].pos - this.past, last + this.future + this.Lmax);
          for (const h of pursuit(X, cands, this.opts)) {
            const e = this.emit({ ...h, pos: start + h.pos }, "pursuit");
            if (e) out.push(e);
          }
          this.stats.pursuitMs += performance.now() - t0;
        }
        return out;
      }
    };
  }
});

// js/i18n.js
var root = document.documentElement;
var current = root.lang === "en" ? "en" : "ru";
var isRu = current === "ru";
var locale = current === "ru" ? "ru-RU" : "en-US";
var L = (ru, en) => current === "ru" ? ru : en;
var ATTRS = ["title", "aria-label", "placeholder", "alt", "content"];
var label = (el, toEn) => el.tagName === "BUTTON" ? toEn ? "RU" : "EN" : toEn ? "Русский" : "English";
function remember(el, attr) {
  const key = attr ? `data-ru-${attr}` : "data-ru";
  if (el.hasAttribute(key)) return;
  el.setAttribute(key, attr ? el.getAttribute(attr) ?? "" : el.textContent);
}
function apply(next) {
  const toEn = next === "en";
  if (toEn) {
    for (const el of document.querySelectorAll("[data-en]")) {
      remember(el);
      el.textContent = el.dataset.en;
    }
    for (const a of ATTRS) {
      for (const el of document.querySelectorAll(`[data-en-${a}]`)) {
        remember(el, a);
        el.setAttribute(a, el.getAttribute(`data-en-${a}`));
      }
    }
  } else {
    for (const el of document.querySelectorAll("[data-ru]")) el.textContent = el.getAttribute("data-ru");
    for (const a of ATTRS) {
      for (const el of document.querySelectorAll(`[data-ru-${a}]`)) el.setAttribute(a, el.getAttribute(`data-ru-${a}`));
    }
  }
  const title = document.querySelector("title[data-en]");
  if (title) document.title = title.textContent.trim();
}
function bindSwitch(btn) {
  if (btn.dataset.langBound) return;
  btn.dataset.langBound = "1";
  btn.addEventListener("click", () => {
    const next = current === "ru" ? "en" : "ru";
    try {
      localStorage.setItem("merchant-ear.lang", next);
    } catch {
    }
    current = next;
    root.lang = next;
    apply(next);
    const url = new URL(location.href);
    if (next === "ru") url.searchParams.delete("lang");
    else url.searchParams.set("lang", "en");
    history.replaceState(null, "", url);
    for (const b of document.querySelectorAll("[data-lang-switch]")) {
      const toEn = current !== "ru";
      const spans = b.querySelectorAll("[data-lang]");
      if (spans.length) continue;
      b.textContent = label(b, toEn);
      b.title = toEn ? "English" : "Русский";
    }
  });
}
function applyStatic() {
  const app = !!document.querySelector("section.console");
  for (const btn of document.querySelectorAll("[data-lang-switch]")) {
    const toEn = current !== "ru";
    const spans = btn.querySelectorAll("[data-lang]");
    if (!spans.length) {
      btn.textContent = label(btn, toEn);
      btn.title = toEn ? "English" : "Русский";
    }
    if (app) {
      btn.addEventListener("click", () => {
        try {
          localStorage.setItem("merchant-ear.lang", current === "ru" ? "en" : "ru");
        } catch {
        }
        const url = new URL(location.href);
        url.searchParams.delete("lang");
        location.replace(url);
      });
    } else {
      bindSwitch(btn);
    }
  }
  if (current === "en") apply("en");
  root.removeAttribute("data-i18n-pending");
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", applyStatic);
else applyStatic();

// js/model-core.js
var SOUND_TEMPERATURE = 0.05;
function prior(data2, items, profileId, typeId = null, price = null) {
  const pools = data2.pools.filter((p) => p.profile === profileId && (typeId == null || p.typeId === typeId) && (price == null || p.price === price));
  const total = pools.reduce((s, p) => s + p.weight, 0) || pools.length;
  const out = /* @__PURE__ */ new Map();
  for (const pool of pools) {
    const share = (pool.weight || 1) / total;
    const poolTotal = pool.items.reduce((s, it) => s + it.weight, 0);
    for (const it of pool.items) {
      const item = items.get(it.id);
      if (!item) continue;
      const p = share * it.weight / poolTotal;
      const key = `${pool.typeId}|${pool.price}|${it.id}`;
      const e = out.get(key) ?? { typeId: pool.typeId, itemId: it.id, p: 0, price: pool.price, ok: item.contactPrice >= pool.price ? 1 : 0 };
      e.p += p;
      out.set(key, e);
    }
  }
  return out;
}
function posterior(items, prior2, { manualSoundId = null, events = [], allowedSounds = null } = {}, size = null, allowRotation = true) {
  const rows = [];
  for (const e of prior2.values()) {
    const item = items.get(e.itemId);
    if (size && !fits(item.size, size, allowRotation)) continue;
    if (manualSoundId != null && item.soundId !== manualSoundId) continue;
    if (allowedSounds && !allowedSounds.has(item.soundId)) continue;
    let logLik = 0;
    for (const ev of events) logLik += (ev.get(item.soundId)?.score ?? -1) / SOUND_TEMPERATURE;
    rows.push({ item, typeId: e.typeId, prior: e.p, logLik, cargoPrice: e.price, ok: e.ok });
  }
  const maxLog = Math.max(...rows.map((r) => r.logLik), 0);
  let norm3 = 0;
  for (const r of rows) {
    r.weight = r.prior * Math.exp(r.logLik - maxLog);
    norm3 += r.weight;
  }
  for (const r of rows) r.p = norm3 > 0 ? r.weight / norm3 : 0;
  return rows.sort((a, b) => b.p - a.p);
}
function soundsInPrior(items, prior2) {
  const out = /* @__PURE__ */ new Map();
  for (const e of prior2.values()) {
    const s = items.get(e.itemId).soundId;
    out.set(s, (out.get(s) ?? 0) + e.p);
  }
  return out;
}
var turns = ([w, h]) => Math.max(w, h) < 3;
function fits([w, h], [sw, sh], rot) {
  return w === sw && h === sh || rot && turns([w, h]) && w === sh && h === sw;
}
function summarize(rows) {
  const ev = rows.reduce((s, r) => s + r.p * r.item.contactPrice, 0);
  const price = rows.reduce((s, r) => s + r.p * r.cargoPrice, 0);
  const profit = rows.reduce((s, r) => s + r.p * r.ok, 0);
  return { ev, price, profit };
}

// js/model.js
var MODE_RU = {
  Normal: "Обычный",
  Lockdown: "Локдаун",
  Forbidden: "Запретная",
  Anomaly: "Аномалия",
  DeepAnomaly: "Глуб. аномалия",
  Infection: "Заражение",
  SevereInfection: "Сильное заражение"
};
var MODE_EN = {
  Normal: "Normal",
  Lockdown: "Lockdown",
  Forbidden: "Forbidden",
  Anomaly: "Anomaly",
  DeepAnomaly: "Deep Anomaly",
  Infection: "Infection",
  SevereInfection: "Severe Infection"
};
var modeName = (mode) => (isRu ? MODE_RU : MODE_EN)[mode] ?? mode;
var MAP_RU = {
  "Farm": "Ферма",
  "Valley": "Долина",
  "Northridge": "Нортридж",
  "Armory": "Арсенал",
  "TV Station": "Телецентр",
  "Airport": "Аэропорт",
  "Distorted Valley": "Искажённая долина"
};
var MAP_ORDER = ["Farm", "Valley", "Northridge", "Armory", "TV Station", "Airport", "Distorted Valley"];
var MODE_ORDER = ["Normal", "Lockdown", "Forbidden", "Anomaly", "DeepAnomaly", "Infection", "SevereInfection"];
var MODE_LOOK = {
  Normal: { title: "Белая", color: "#e8e8e3" },
  Lockdown: { title: "Жёлтая", color: "#f2c230" },
  Forbidden: { title: "Красная", color: "#ef4b4b" },
  Anomaly: { title: "Аномалия", color: "#a35cf0" },
  DeepAnomaly: { title: "Глубокая аномалия", color: "#7c3aed" },
  Infection: { title: "Заражение", color: "#5bc77a" },
  SevereInfection: { title: "Сильное заражение", color: "#2f9e57" }
};
var TYPE_RU = {
  "Flammables": "Горючие материалы",
  "Building Materials": "Строительные материалы",
  "Computer Parts": "Детали компьютеров",
  "Energy Items": "Энергетические товары",
  "Tools": "Инструменты",
  "Household Items": "Бытовые товары",
  "Medical Supplies": "Медицинские товары",
  "Rare Medical Supplies": "Редкие медицинские товары",
  "Collectibles": "Коллекционные предметы",
  "Uncommon Collectibles": "Необычные коллекционные предметы",
  "Rare Collectibles": "Редкие коллекционные предметы",
  "Paper": "Бумага",
  "Instruments": "Приборы",
  "Military Items": "Военные предметы",
  "Uncommon Military Items": "Необычные военные предметы",
  "Electronics": "Электроника",
  "Mystery Cargo": "Загадочный груз",
  "Uncommon Mystery Cargo": "Необычный загадочный груз",
  "Rare Mystery Cargo": "Редкий загадочный груз"
};
var RARITY = {
  1: { name: "Common", color: "#8b8f94" },
  2: { name: "Uncommon", color: "#4caf6a" },
  3: { name: "Rare", color: "#3d8bfd" },
  4: { name: "Epic", color: "#a35cf0" },
  5: { name: "Legendary", color: "#f0a530" },
  6: { name: "Mythic", color: "#ef4b4b" }
};
var MerchantModel = class {
  constructor(data2) {
    this.data = data2;
    this.items = new Map(data2.items.map((i) => [i.id, i]));
    this.types = new Map(data2.types.map((t) => {
      const ru = TYPE_RU[t.name] ?? t.name;
      return [t.id, { en: t.name, ru, name: isRu ? ru : t.name }];
    }));
    this.sounds = new Map(data2.sounds.map((s) => [s.id, s]));
  }
  // Каждая карта/режим — отдельный пункт; значение — id профиля пулов.
  mapOptions() {
    const opts = [];
    for (const p of this.data.profiles) {
      if (p.maps?.length && !/^Unknown/.test(p.label)) {
        for (const m of p.maps) opts.push({ value: p.id, label: `${m.mapName} — ${MODE_RU[m.mode] ?? m.mode}` });
      } else {
        opts.push({ value: p.id, label: `Профиль ${p.id} (неизвестные карты)` });
      }
    }
    return opts.sort((a, b) => a.label.localeCompare(b.label));
  }
  // Для окна выбора карты: карта → её режимы. Профили без известных карт сюда не попадают.
  // label совпадает с mapOptions(), чтобы выбор был общим с админкой.
  mapChoices() {
    const maps = /* @__PURE__ */ new Map();
    for (const p of this.data.profiles) {
      if (!p.maps?.length || /^Unknown/.test(p.label)) continue;
      for (const m of p.maps) {
        const ru = MAP_RU[m.mapName] ?? m.mapName;
        const entry = maps.get(m.mapName) ?? { map: m.mapName, ru, name: isRu ? ru : m.mapName, modes: [] };
        const look = MODE_LOOK[m.mode] ?? { title: modeName(m.mode), color: "#8b8f94" };
        entry.modes.push({
          mode: m.mode,
          profileId: p.id,
          label: `${m.mapName} — ${MODE_RU[m.mode] ?? m.mode}`,
          modeName: modeName(m.mode),
          ...look,
          ...isRu ? {} : { title: modeName(m.mode) }
        });
        maps.set(m.mapName, entry);
      }
    }
    const rank = (list, key) => list.indexOf(key) + 1 || 99;
    for (const e of maps.values()) e.modes.sort((a, b) => rank(MODE_ORDER, a.mode) - rank(MODE_ORDER, b.mode));
    return [...maps.values()].sort((a, b) => rank(MAP_ORDER, a.map) - rank(MAP_ORDER, b.map));
  }
  typeOptions(profileId) {
    const ids = new Set(this.data.pools.filter((p) => p.profile === profileId).map((p) => p.typeId));
    return [...ids].map((id) => ({ value: id, label: this.typeName(id).ru, en: this.typeName(id).en })).sort((a, b) => a.label.localeCompare(b.label, "ru"));
  }
  typeName(id) {
    return this.types.get(id) ?? { en: `Type ${id}`, ru: `Тип ${id}`, name: isRu ? `Тип ${id}` : `Type ${id}` };
  }
  // typeId = null — любой тип груза.
  priceOptions(profileId, typeId) {
    const prices = new Set(this.data.pools.filter((p) => p.profile === profileId && (typeId == null || p.typeId === typeId)).map((p) => p.price));
    return [...prices].sort((a, b) => a - b);
  }
  // Расчёт шансов только у админки: на сайте пулов с весами нет, шансы считает сервер (server/merchant.mjs).
  prior(profileId, typeId = null, price = null) {
    return prior(this.data, this.items, profileId, typeId, price);
  }
  posterior(prior2, evidence = {}, size = null, allowRotation = true) {
    return posterior(this.items, prior2, evidence, size, allowRotation).map((r) => this.named(r));
  }
  soundsInPrior(prior2) {
    return soundsInPrior(this.items, prior2);
  }
  /** Строка расчёта с названием типа груза на языке сайта. */
  named(r) {
    const t = this.typeName(r.typeId);
    return { ...r, typeName: t.name, typeNameEn: t.en };
  }
};

// js/remote-model.js
var MAX_PER_REQUEST = 24;
var CACHE_SIZE = 400;
var RETRY_MS = 3e3;
var round3 = (v) => Math.round(v * 1e3) / 1e3;
var comboKey = (t, c) => `${t ?? ""}|${c ?? ""}`;
var RemoteModel = class extends EventTarget {
  /** model — MerchantModel на витрине (/api/catalog): названия, карты, цены, предметы без звуков. */
  constructor(model2) {
    super();
    this.version = 0;
    this.model = model2;
    this.cache = /* @__PURE__ */ new Map();
    this.slots = /* @__PURE__ */ new Map();
    this.queue = /* @__PURE__ */ new Map();
    this.inflight = /* @__PURE__ */ new Set();
    this.failed = /* @__PURE__ */ new Map();
    this.possibleBy = /* @__PURE__ */ new Map();
    this.items = /* @__PURE__ */ new Map();
    this.changeTimer = null;
    this.flushTimer = null;
  }
  // ---------- звуки грузов ----------
  /** Доли звуков в грузе (как soundsInPrior). Пока не загружено — пусто, загрузка уже идёт. */
  possible(profileId, typeId = null, price = null) {
    const table = this.possibleBy.get(profileId);
    if (table instanceof Map) {
      return table.get(comboKey(typeId, price)) ?? table.get(comboKey(typeId, null)) ?? table.get(comboKey(null, price)) ?? table.get(comboKey(null, null)) ?? /* @__PURE__ */ new Map();
    }
    if (profileId != null && !table) this.loadPossible(profileId);
    return /* @__PURE__ */ new Map();
  }
  /** То же, но дождаться загрузки: нужно при разборе звука, чтобы не отбросить его зря. */
  async possibleAsync(profileId, typeId = null, price = null) {
    if (profileId == null) return /* @__PURE__ */ new Map();
    if (!(this.possibleBy.get(profileId) instanceof Map)) await this.loadPossible(profileId).catch(() => {
    });
    return this.possible(profileId, typeId, price);
  }
  loadPossible(profileId) {
    const have = this.possibleBy.get(profileId);
    if (have) return have instanceof Map ? Promise.resolve(have) : have;
    const p = this.#get(`/api/model/possible?p=${encodeURIComponent(profileId)}`).then(({ possible }) => {
      const table = new Map(Object.entries(possible).map(([k, list]) => [k, new Map(list)]));
      this.possibleBy.set(profileId, table);
      this.#changed();
      return table;
    }).catch((e) => {
      this.possibleBy.delete(profileId);
      setTimeout(() => this.#changed(), RETRY_MS);
      throw e;
    });
    this.possibleBy.set(profileId, p);
    return p;
  }
  // ---------- строки шансов ----------
  /**
   * Строки как у MerchantModel.posterior: { item, typeId, typeName, typeNameEn, prior, cargoPrice, ok, p }.
   * cargo: { p: профиль, t: тип, c: цена }; evidence: { manualSoundId, events: [Map soundId → { score }], allowedSounds }.
   */
  rows(slot, cargo, { manualSoundId = null, events = [], allowedSounds = null } = {}, size = null, rotation = true) {
    if (cargo.p == null) return [];
    const q = {
      p: cargo.p,
      t: cargo.t ?? null,
      c: cargo.c ?? null,
      s: size ?? null,
      r: rotation,
      m: manualSoundId,
      e: events.map((ev) => [...ev].map(([id, m]) => [id, round3(m.score)]).sort((a, b) => a[0] - b[0])),
      a: allowedSounds ? [...allowedSounds].sort((a, b) => a - b) : null
    };
    const key = JSON.stringify(q);
    const hit = this.cache.get(key);
    if (hit) {
      this.cache.delete(key);
      this.cache.set(key, hit);
      this.slots.set(slot, hit);
      return hit;
    }
    this.#request(key, q);
    return this.slots.get(slot) ?? [];
  }
  #request(key, q) {
    if (this.inflight.has(key) || this.queue.has(key) || (this.failed.get(key) ?? 0) > Date.now()) return;
    this.queue.set(key, q);
    this.flushTimer ??= setTimeout(() => this.#flush(), 0);
  }
  #flush() {
    this.flushTimer = null;
    const batch = [...this.queue].slice(0, MAX_PER_REQUEST);
    for (const [key] of batch) {
      this.queue.delete(key);
      this.inflight.add(key);
    }
    if (this.queue.size) this.flushTimer = setTimeout(() => this.#flush(), 0);
    if (!batch.length) return;
    this.#post("/api/model", { q: batch.map(([, q]) => q) }).then(({ rows }) => {
      batch.forEach(([key], i) => this.#store(key, rows[i] ?? []));
    }).catch(() => {
      for (const [key] of batch) this.failed.set(key, Date.now() + RETRY_MS);
      setTimeout(() => this.#changed(), RETRY_MS);
    }).finally(() => {
      for (const [key] of batch) this.inflight.delete(key);
      this.#changed();
    });
  }
  #store(key, compact) {
    const rows = [];
    for (const [itemId, typeId, cargoPrice, p, prior2, ok, soundId] of compact) {
      const item = this.#item(itemId, soundId);
      if (item) rows.push(this.model.named({ item, typeId, prior: prior2, cargoPrice, ok, p }));
    }
    this.cache.set(key, rows);
    this.version++;
    this.failed.delete(key);
    while (this.cache.size > CACHE_SIZE) this.cache.delete(this.cache.keys().next().value);
  }
  #item(id, soundId) {
    const k = `${id}|${soundId}`;
    let item = this.items.get(k);
    if (!item) {
      const base = this.model.items.get(id);
      if (!base) return null;
      item = { ...base, soundId };
      this.items.set(k, item);
    }
    return item;
  }
  // ---------- сеть ----------
  /** Перерисовка одна на пачку ответов. Не requestAnimationFrame: вкладка обычно в фоне, пока идёт игра. */
  #changed() {
    this.changeTimer ??= setTimeout(() => {
      this.changeTimer = null;
      this.dispatchEvent(new Event("change"));
    }, 0);
  }
  #get(url) {
    return this.#fetch(url, { cache: "no-store" });
  }
  #post(url, body) {
    return this.#fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  }
  async #fetch(url, init) {
    const r = await fetch(url, init);
    if (r.status === 401) {
      this.dispatchEvent(new Event("unauthorized"));
      throw new Error("unauthorized");
    }
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  }
};

// js/features.js
var FFT_SIZE = 1024;
var HOP = 256;
var N_BANDS = 40;
var F_MIN = 80;
var F_MAX = 16e3;
var LOG_FLOOR = 1e-10;
var DETECT_MIN_HZ = 300;
var FFT = class {
  constructor(n) {
    this.n = n;
    this.rev = new Uint32Array(n);
    const bits = Math.log2(n);
    for (let i = 0; i < n; i++) {
      let r = 0;
      for (let b = 0; b < bits; b++) r |= (i >> b & 1) << bits - 1 - b;
      this.rev[i] = r;
    }
    this.cos = new Float64Array(n / 2);
    this.sin = new Float64Array(n / 2);
    for (let i = 0; i < n / 2; i++) {
      this.cos[i] = Math.cos(2 * Math.PI * i / n);
      this.sin[i] = -Math.sin(2 * Math.PI * i / n);
    }
  }
  // in-place, re/im длины n
  transform(re, im) {
    const { n, rev } = this;
    for (let i = 0; i < n; i++) {
      const j = rev[i];
      if (j > i) {
        [re[i], re[j]] = [re[j], re[i]];
        [im[i], im[j]] = [im[j], im[i]];
      }
    }
    for (let size = 2; size <= n; size <<= 1) {
      const half = size >> 1, step = n / size;
      for (let start = 0; start < n; start += size) {
        for (let k = 0; k < half; k++) {
          const wr = this.cos[k * step], wi = this.sin[k * step];
          const a = start + k, b = a + half;
          const tr = re[b] * wr - im[b] * wi;
          const ti = re[b] * wi + im[b] * wr;
          re[b] = re[a] - tr;
          im[b] = im[a] - ti;
          re[a] += tr;
          im[a] += ti;
        }
      }
    }
  }
};
var hz2mel = (f) => 2595 * Math.log10(1 + f / 700);
var mel2hz = (m) => 700 * (10 ** (m / 2595) - 1);
function melFilterbank(sampleRate) {
  const fMax = Math.min(F_MAX, sampleRate / 2);
  const bins = FFT_SIZE / 2 + 1;
  const melPts = Array.from({ length: N_BANDS + 2 }, (_, i) => hz2mel(F_MIN) + (hz2mel(fMax) - hz2mel(F_MIN)) * i / (N_BANDS + 1));
  const binPts = melPts.map((m) => mel2hz(m) * FFT_SIZE / sampleRate);
  const filters = [];
  for (let b = 0; b < N_BANDS; b++) {
    const [l, c, r] = [binPts[b], binPts[b + 1], binPts[b + 2]];
    const lo = Math.max(0, Math.floor(l)), hi = Math.min(bins - 1, Math.ceil(r));
    const w = new Float32Array(hi - lo + 1);
    for (let k = lo; k <= hi; k++) {
      w[k - lo] = k <= c ? Math.max(0, (k - l) / (c - l || 1)) : Math.max(0, (r - k) / (r - c || 1));
    }
    filters.push({ lo, w, center: c });
  }
  return filters;
}
var FeatureExtractor = class {
  constructor(sampleRate) {
    this.sampleRate = sampleRate;
    this.fft = new FFT(FFT_SIZE);
    this.window = Float32Array.from({ length: FFT_SIZE }, (_, i) => 0.5 - 0.5 * Math.cos(2 * Math.PI * i / FFT_SIZE));
    this.filters = melFilterbank(sampleRate);
    this.firstDetectBand = this.filters.findIndex((f) => f.center * sampleRate / FFT_SIZE >= DETECT_MIN_HZ);
    this.re = new Float64Array(FFT_SIZE);
    this.im = new Float64Array(FFT_SIZE);
    this.power = new Float64Array(FFT_SIZE / 2 + 1);
  }
  get frameSeconds() {
    return HOP / this.sampleRate;
  }
  // samples: FFT_SIZE отсчётов, начиная с offset. Возвращает { bands: Float32Array(N_BANDS) в log10, energyDb }.
  frame(samples, offset = 0) {
    const { re, im, power, window: window2 } = this;
    for (let i = 0; i < FFT_SIZE; i++) {
      re[i] = (samples[offset + i] || 0) * window2[i];
      im[i] = 0;
    }
    this.fft.transform(re, im);
    let total = 0;
    for (let k = 0; k < power.length; k++) {
      power[k] = re[k] * re[k] + im[k] * im[k];
      total += power[k];
    }
    const bands = new Float32Array(N_BANDS);
    let detect = 0;
    for (let b = 0; b < N_BANDS; b++) {
      const { lo, w } = this.filters[b];
      let e = 0;
      for (let k = 0; k < w.length; k++) e += power[lo + k] * w[k];
      bands[b] = Math.log10(e + LOG_FLOOR);
      if (b >= this.firstDetectBand) detect += e;
    }
    return { bands, energyDb: 10 * Math.log10(detect / FFT_SIZE + LOG_FLOOR), fullDb: 10 * Math.log10(total / FFT_SIZE + LOG_FLOOR) };
  }
  // Весь сигнал → массив кадров.
  frames(signal) {
    const out = [];
    for (let off = 0; off + FFT_SIZE <= signal.length; off += HOP) out.push(this.frame(signal, off));
    return out;
  }
};
function trimSilence(frames, dropDb = 35) {
  if (!frames.length) return frames;
  const peak = Math.max(...frames.map((f) => f.energyDb));
  const first = frames.findIndex((f) => f.energyDb > peak - dropDb);
  let last = frames.length - 1;
  while (last > first && frames[last].energyDb <= peak - dropDb) last--;
  return frames.slice(first, last + 1);
}
function flatten(frames, maxFrames2 = Infinity) {
  const n = Math.min(frames.length, maxFrames2);
  const out = new Float32Array(n * N_BANDS);
  for (let i = 0; i < n; i++) out.set(frames[i].bands ?? frames[i], i * N_BANDS);
  return out;
}

// js/matcher.js
var MAX_SECONDS = 0.7;
var PRE_FRAMES = 64;
var SEARCH_BEFORE = 44;
var SEARCH_AFTER = 40;
var NOISE_FRAMES = 16;
var START_DROP_DB = 35;
var MIN_FRAMES = 6;
var TUNE = {
  NOISE_STAT: "median",
  // фон по кадрам до звука — медиана: устойчива и к тишине, и к дождю с каплями
  NOISE_MARGIN: 1.5,
  // запас над оценкой фона
  MASK: 2,
  // ячейка считается звуком, если мощность > MASK × фон
  RANGE: 5,
  // 50 дБ динамического диапазона; всё тише — «тишина»
  MASK_TEMPLATE: true,
  // маскировать эталон тем же фоном
  // Штраф, если фон замаскировал большую часть эталона. Под дождём маскируется почти всё,
  // и штраф топил правильные звуки (22/76 → 55/76 без него), поэтому выключен (0).
  MIN_COVERAGE: 0,
  LOW_BAND: 3
  // полосы ниже (~< 250 Гц, гул фона) в сравнении не участвуют
};
function maxFrames(frameSeconds) {
  return Math.round(MAX_SECONDS / frameSeconds);
}
function windowFrames(frameSeconds) {
  return PRE_FRAMES + SEARCH_AFTER + maxFrames(frameSeconds);
}
function withMax(data2, meta) {
  let max = -Infinity;
  for (const v of data2) if (v > max) max = v;
  return { ...meta, data: data2, max, length: data2.length / N_BANDS };
}
function makeTemplate(frames, frameSeconds, meta) {
  return withMax(flatten(trimSilence(frames, START_DROP_DB), maxFrames(frameSeconds)), meta);
}
function templateFromData(data2, meta) {
  return withMax(Float32Array.from(data2), meta);
}
var CAPTURE_MIN = -6;
function averageTemplate(captures, meta) {
  const len = Math.max(...captures.map((c) => c.length));
  const sum = new Float64Array(len);
  for (const c of captures) for (let i = 0; i < c.length; i++) sum[i] += c[i] > CAPTURE_MIN ? 10 ** c[i] : 0;
  const data2 = new Float32Array(len);
  let max = -Infinity;
  for (let i = 0; i < len; i++) {
    data2[i] = Math.log10(sum[i] / captures.length + 1e-12);
    if (data2[i] > max) max = data2[i];
  }
  for (let i = 0; i < len; i++) if (data2[i] < max - TUNE.RANGE) data2[i] = max - TUNE.RANGE;
  return withMax(data2, { ...meta, count: captures.length });
}
function correlate(live, liveFrames, liveFloor, offset, tpl, tplThr, tplFloor, len) {
  const n = len * N_BANDS;
  const liveN = liveFrames * N_BANDS;
  const tplN = tpl.data.length;
  let sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0, active = 0, kept = 0;
  const low = TUNE.LOW_BAND;
  for (let i = 0; i < n; i++) {
    if (i % N_BANDS < low) continue;
    const li = offset * N_BANDS + i;
    const x = li < liveN && live[li] > liveFloor ? live[li] : liveFloor;
    const t = i < tplN ? tpl.data[i] : -Infinity;
    if (t > tplFloor) active++;
    const y = t > tplThr[i % N_BANDS] ? (kept++, t) : tplFloor;
    sx += x;
    sy += y;
    sxx += x * x;
    syy += y * y;
    sxy += x * y;
  }
  const m = n - len * low;
  const cov = sxy - sx * sy / m;
  const vx = sxx - sx * sx / m;
  const vy = syy - sy * sy / m;
  if (vx <= 1e-9 || vy <= 1e-9) return 0;
  const coverage = active ? kept / active : 0;
  return cov / Math.sqrt(vx * vy) * (TUNE.MIN_COVERAGE > 0 ? Math.min(1, coverage / TUNE.MIN_COVERAGE) : 1);
}
function matchSegment(segmentFrames, templates, frameSeconds) {
  const F = segmentFrames.length;
  const onset = Math.min(PRE_FRAMES, F - 1);
  const nf = Math.max(1, Math.min(NOISE_FRAMES, onset));
  let n0 = 0, quietest = Infinity;
  for (let s = 0; s + nf <= onset; s += 4) {
    let sum = 0;
    for (let f = s; f < s + nf; f++) sum += segmentFrames[f].energyDb;
    if (sum < quietest) {
      quietest = sum;
      n0 = s;
    }
  }
  const noiseFrames = segmentFrames.slice(n0, n0 + nf);
  const noiseP = new Float64Array(N_BANDS);
  const stat = (vals) => {
    vals.sort((a, b) => a - b);
    if (TUNE.NOISE_STAT === "median") return vals[vals.length >> 1];
    if (TUNE.NOISE_STAT === "mean") return vals.reduce((a, b) => a + b, 0) / vals.length;
    return vals[0];
  };
  for (let b = 0; b < N_BANDS; b++) {
    noiseP[b] = stat(noiseFrames.map((f) => 10 ** f.bands[b])) * TUNE.NOISE_MARGIN;
  }
  const noiseDb = 10 * Math.log10(stat(noiseFrames.map((f) => 10 ** (f.energyDb / 10))) * TUNE.NOISE_MARGIN);
  const live = new Float32Array(F * N_BANDS);
  const frameMax = new Float64Array(F).fill(-Infinity);
  for (let f = 0; f < F; f++) {
    const bands = segmentFrames[f].bands;
    for (let b = 0; b < N_BANDS; b++) {
      const p = 10 ** bands[b];
      const v = p > TUNE.MASK * noiseP[b] ? Math.log10(p - noiseP[b]) : -Infinity;
      live[f * N_BANDS + b] = v;
      if (b >= TUNE.LOW_BAND && v > frameMax[f]) frameMax[f] = v;
    }
  }
  let peakDb = -Infinity;
  for (let f = onset; f < F; f++) peakDb = Math.max(peakDb, segmentFrames[f].energyDb);
  const loudThr = Math.max(peakDb - START_DROP_DB, noiseDb + 6);
  let lastLoud = onset;
  for (let f = onset; f < F; f++) if (segmentFrames[f].energyDb > loudThr) lastLoud = f;
  const noiseLog = Float64Array.from(noiseP, (p) => Math.log10((TUNE.MASK - 1) * p));
  const cap = maxFrames(frameSeconds);
  const from = Math.max(0, onset - SEARCH_BEFORE);
  const to = Math.min(F - MIN_FRAMES, onset + SEARCH_AFTER);
  const tplThr = new Float64Array(N_BANDS);
  const scores = templates.map((tpl) => {
    const tplFloor = tpl.max - TUNE.RANGE;
    let best = -1, bestOffset = onset, bestLen = 0;
    for (let o = from; o <= to; o++) {
      if (!Number.isFinite(frameMax[o]) && !Number.isFinite(frameMax[o + 1])) continue;
      const liveLen = Math.max(0, lastLoud - o + 1);
      const len = Math.min(cap, Math.max(tpl.length, liveLen), F - o);
      if (len < MIN_FRAMES) continue;
      let regionMax = -Infinity;
      for (let f = o; f < o + Math.min(len, tpl.length); f++) if (frameMax[f] > regionMax) regionMax = frameMax[f];
      if (!Number.isFinite(regionMax)) continue;
      const gain = regionMax - tpl.max;
      for (let b = 0; b < N_BANDS; b++) tplThr[b] = TUNE.MASK_TEMPLATE ? Math.max(tplFloor, noiseLog[b] - gain) : tplFloor;
      const r = correlate(live, F, regionMax - TUNE.RANGE, o, tpl, tplThr, tplFloor, len);
      if (r > best) {
        best = r;
        bestOffset = o;
        bestLen = len;
      }
    }
    return { template: tpl, score: best, offset: bestOffset, len: bestLen };
  });
  scores.sort((a, b) => b.score - a.score);
  const top = scores[0];
  if (!top || top.score < 0) return { scores, data: new Float32Array(0) };
  const end = top.offset + Math.max(MIN_FRAMES, Math.min(top.len, lastLoud - top.offset + 1, cap));
  const data2 = live.slice(top.offset * N_BANDS, end * N_BANDS);
  let dataMax = -Infinity;
  for (const v of data2) if (v > dataMax) dataMax = v;
  for (let i = 0; i < data2.length; i++) if (!(data2[i] > dataMax - TUNE.RANGE)) data2[i] = dataMax - TUNE.RANGE;
  return { scores, data: data2 };
}
function scoresBySound(scores) {
  const best = /* @__PURE__ */ new Map();
  for (const s of scores) {
    const id = s.template.soundId;
    if (!best.has(id) || best.get(id).score < s.score) best.set(id, s);
  }
  return best;
}

// js/make-worker.js
function workerFromBundle(name) {
  const src = window.STATIC_DATA?.workers?.[name];
  if (!src) return null;
  return new Worker(URL.createObjectURL(new Blob([src], { type: "text/javascript" })));
}
function makeWorker(name, onDead) {
  if (location.protocol !== "file:") {
    try {
      const w = new Worker(new URL(`js/${name}`, document.baseURI), { type: "module" });
      w.addEventListener("error", () => onDead?.(workerFromBundle(name)), { once: true });
      return w;
    } catch (err) {
      const fallback = workerFromBundle(name);
      if (fallback) return fallback;
      throw err;
    }
  }
  return workerFromBundle(name) ?? new Worker(new URL(`js/${name}`, document.baseURI), { type: "module" });
}
async function addWorklet(audioWorklet, name) {
  const src = window.STATIC_DATA?.workers?.[name];
  if (!src) return audioWorklet.addModule(new URL(`js/${name}`, document.baseURI));
  try {
    return await audioWorklet.addModule(URL.createObjectURL(new Blob([src], { type: "text/javascript" })));
  } catch (err) {
    return audioWorklet.addModule("data:text/javascript," + encodeURIComponent(src));
  }
}

// js/audio-engine.js
var SAMPLE_RATE = 48e3;
var ABS_MIN_DB = -60;
var REARM_FRAMES = 8;
var JUMP_DB = 8;
var JUMP_LOOKBACK = 3;
var MIN_GAP_FRAMES = 10;
var MAX_WINDOWS = 3;
var RECORD_SECONDS = 30;
var LEVEL_EVERY = 6;
var FLOOR_FRAMES = 280;
var FLOOR_EVERY = 4;
var CALM_EVERY = 94;
var CALM_SAMPLES = 360;
var CALM_MIN = 20;
var WIND_MAX_DB = 3;
var WIND_TEMPLATES_DB = 1;
var RAIN_TILT_DB = -5;
var RAIN_NOTCH_DB = 3;
var RAIN_ON = 10;
var RAIN_OFF = 20;
var START_TIMEOUT_MS = 5e3;
function dataUriBytes(uri) {
  const bin = atob(String(uri).slice(String(uri).indexOf("base64,") + 7));
  const u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return u8.buffer;
}
async function loadSoundBytes(url) {
  const file = String(url).split("/").pop();
  const packed = window.STATIC_DATA?.audio?.[file];
  if (packed) return dataUriBytes(packed);
  try {
    return await (await fetch(url)).arrayBuffer();
  } catch (err) {
    const alt = window.STATIC_DATA?.audio?.[file.replace(/\.ogg$/i, "") + ".ogg"];
    if (alt) return dataUriBytes(alt);
    throw err;
  }
}
var DETECTOR = (() => {
  try {
    const q = new URLSearchParams(location.search).get("detector");
    if (q === "old" || q === "ncc") localStorage.setItem("merchant-ear.detector", q);
    return localStorage.getItem("merchant-ear.detector") ?? "ncc";
  } catch {
    return "ncc";
  }
})();
var NCC_THR = (() => {
  try {
    const q = Number(new URLSearchParams(location.search).get("thr"));
    if (Number.isFinite(q) && q >= 0.15 && q <= 0.9) {
      localStorage.setItem("merchant-ear.nccThr", String(q));
      return q;
    }
    const s = Number(localStorage.getItem("merchant-ear.nccThr"));
    return Number.isFinite(s) && s >= 0.15 && s <= 0.9 ? s : 0.38;
  } catch {
    return 0.38;
  }
})();
function withTimeout(promise, message) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), START_TIMEOUT_MS);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}
var AudioEngine = class extends EventTarget {
  constructor() {
    super();
    this.ctx = new AudioContext({ sampleRate: SAMPLE_RATE, latencyHint: "interactive" });
    this.fx = new FeatureExtractor(this.ctx.sampleRate);
    this.frameSeconds = this.fx.frameSeconds;
    this.windowFrames = windowFrames(this.frameSeconds);
    this.builtinTemplates = [];
    this.customTemplates = [];
    this.mapName = null;
    this.thresholdDb = 12;
    this.stream = null;
    this.sourceNode = null;
    this.tap = null;
    this.pending = new Float32Array(0);
    this.history = [];
    this.windows = [];
    this.group = null;
    this.lastOnset = -Infinity;
    this.floorDb = -70;
    this.floorHist = [];
    this.calmHist = [];
    this.calmDb = null;
    this.windDb = 0;
    this.windMode = "auto";
    this.rain = false;
    this.rainHist = [];
    this.rainRun = 0;
    const hz = this.fx.filters.map((f) => f.center * this.ctx.sampleRate / FFT_SIZE);
    const pick = (lo, hi) => hz.flatMap((h, b) => h >= lo && h <= hi ? [b] : []);
    this.rainBands = { hi: pick(2700, 7500), mid: pick(300, 700), peak: pick(3200, 4100), dip: pick(2400, 2650) };
    this.armed = true;
    this.quietRun = 0;
    this.frameCount = 0;
    this.recBuf = new Float32Array(SAMPLE_RATE * RECORD_SECONDS);
    this.recPos = 0;
    this.recFilled = 0;
  }
  get templates() {
    return [...this.builtinTemplates, ...this.customTemplates];
  }
  // Эталоны для окна звука: свои — только этой карты (или всех карт), «ветер» — только при ветре.
  // Звука сброса при проверке груза в игре нет: эталоны сброса только ловили выстрелы и шаги,
  // поэтому в сравнении их нет (загружены — их можно послушать в админке).
  activeTemplates(windDb) {
    const wind = windDb >= WIND_TEMPLATES_DB;
    const custom = this.customTemplates.filter((t) => (t.map === "*" || t.map === this.mapName) && (t.mode !== "wind" || wind));
    return [...this.builtinTemplates.filter((t) => t.kind !== "drop"), ...custom];
  }
  async loadTemplates(sounds, urlFor) {
    const decoder = new OfflineAudioContext(1, 1, SAMPLE_RATE);
    const jobs = sounds.flatMap((s) => [
      ["pickup", s.pickup],
      ["drop", s.drop]
    ].filter(([, name]) => name).map(async ([kind, name]) => {
      const buf = await decoder.decodeAudioData(await loadSoundBytes(urlFor(name)));
      const mono = mixdown(buf);
      return makeTemplate(this.fx.frames(mono), this.frameSeconds, { soundId: s.id, kind, name, buffer: buf });
    }));
    const done = await Promise.allSettled(jobs);
    this.builtinTemplates = done.filter((d) => d.status === "fulfilled").map((d) => d.value);
    const lost = done.filter((d) => d.status === "rejected");
    if (lost.length) console.warn("[ncc] эталонов не расшифровалось:", lost.length, "из", done.length, lost.slice(0, 3).map((d) => String(d.reason)));
    if (!this.builtinTemplates.length) {
      this.nccError = L("эталоны звука не загрузились", "sound references did not load");
      console.error("[ncc]", this.nccError, done[0] ? String(done[0].reason) : L("в каталоге нет звуков", "catalog has no sounds"));
      this.emit("detector", { kind: "none", error: this.nccError });
    }
    if (DETECTOR === "ncc" && this.builtinTemplates.length) this.startNcc();
    return this.builtinTemplates;
  }
  // Записи копилки (power) одного звука, карты и режима усредняются в один эталон.
  // Старые свои эталоны (data, уже с маской) остаются по одному.
  setCustomTemplates(list) {
    const groups = /* @__PURE__ */ new Map();
    const single = [];
    for (const t of list) {
      const meta = { soundId: t.soundId, kind: "custom", mode: t.mode ?? "normal", map: t.map ?? "*", name: `Своя запись #${t.soundId}` };
      if (!t.power) {
        single.push(templateFromData(t.data, { ...meta, id: t.id, count: 1 }));
        continue;
      }
      const key = `${t.soundId}|${meta.mode}|${meta.map}`;
      if (!groups.has(key)) groups.set(key, { meta, ids: [], captures: [] });
      const g = groups.get(key);
      g.ids.push(t.id);
      g.captures.push(Float32Array.from(t.power));
    }
    this.customTemplates = [...single, ...[...groups.values()].map((g) => averageTemplate(g.captures, { ...g.meta, ids: g.ids }))];
  }
  async ensureGraph() {
    if (this.ctx.state === "suspended") {
      await withTimeout(this.ctx.resume(), L(
        "Браузер не запускает звук. Проверьте, что в Windows выбрано устройство вывода звука, и перезапустите браузер.",
        "The browser won't start audio. Check that Windows has an audio output device, then restart the browser."
      ));
    }
    if (this.tap) return;
    try {
      await withTimeout(addWorklet(this.ctx.audioWorklet, "tap-worklet.js"), "timeout");
    } catch (err) {
      console.error("tap-worklet:", err);
      const local = location.protocol === "file:";
      throw new Error(L(
        local ? "Не загрузился обработчик звука при запуске прямо с диска (file://). Chrome/Edge блокирует его в этом режиме — откройте сборку через GitHub Pages или любой локальный сервер." : "Не загрузился обработчик звука. Часто его блокирует антивирус или расширение браузера: добавьте abiear.ru в исключения.",
        local ? "The audio processor didn't load when opened straight from disk (file://). Chrome/Edge blocks it there — open the build via GitHub Pages or any local server." : "The audio processor didn't load. An antivirus or browser extension often blocks it: add abiear.ru to exceptions."
      ));
    }
    this.tap = new AudioWorkletNode(this.ctx, "tap", { numberOfInputs: 1, numberOfOutputs: 1, channelCountMode: "explicit", channelCount: 2 });
    this.tap.port.onmessage = (e) => this.push(e.data);
    const mute = this.ctx.createGain();
    mute.gain.value = 0;
    this.tap.connect(mute).connect(this.ctx.destination);
  }
  // Звук окна игры. В Chrome после выбора окна нужно включить «Также транслировать звук приложения».
  async startDisplayCapture() {
    const options = {
      // Кадр крупнее 1600×1000 не нужен: цену и подписи распознаватель всё равно приводит к одной
      // высоте текста (коэффициенты k в ocr.js и grid-labels.js), а памяти и процессора на кадр
      // 1920×1200 уходит на треть больше — из-за этого в игре падал фпс.
      video: { displaySurface: "window", frameRate: { ideal: 30 }, width: { max: 1600 }, height: { max: 1e3 } },
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false, suppressLocalAudioPlayback: false },
      systemAudio: "include",
      // Если браузер умеет — при выборе окна брать звук только этого окна (иначе Windows отдаёт звук всей системы).
      windowAudio: "window",
      monitorTypeSurfaces: "include",
      selfBrowserSurface: "exclude",
      surfaceSwitching: "exclude"
    };
    let stream;
    try {
      stream = await navigator.mediaDevices.getDisplayMedia(options);
    } catch (err) {
      if (err?.name === "NotReadableError") {
        console.error(err);
        throw new Error(L(
          "Windows не даёт браузеру звук. Win+R → mmsys.cpl → правой кнопкой по устройству вывода → «Свойства» → «Дополнительно» → снимите «Включить дополнительные средства звука» → OK. Потом обновите страницу.",
          "Windows won't give the browser audio. Win+R → mmsys.cpl → right click your output device → Properties → Advanced → uncheck “Enable audio enhancements” → OK. Then reload the page."
        ));
      }
      if (err?.name !== "TypeError") throw err;
      delete options.windowAudio;
      stream = await navigator.mediaDevices.getDisplayMedia(options);
    }
    if (!stream.getAudioTracks().length) {
      stream.getTracks().forEach((t) => t.stop());
      throw new Error(L(
        "В захвате нет звука. Выберите окно игры и включите переключатель «Также транслировать звук приложения».",
        "No audio in the capture. Pick the game window and turn on the audio sharing switch."
      ));
    }
    try {
      await this.attachStream(stream, L("Звук системы", "System audio"));
    } catch (err) {
      stream.getTracks().forEach((t) => t.stop());
      throw err;
    }
  }
  // Микрофон или виртуальное устройство (Stereo Mix, VB-Cable).
  async startInputDevice(deviceId) {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { deviceId: deviceId ? { exact: deviceId } : void 0, echoCancellation: false, noiseSuppression: false, autoGainControl: false }
    });
    await this.attachStream(stream, stream.getAudioTracks()[0]?.label || L("Устройство ввода", "Input device"));
  }
  async attachStream(stream, label2) {
    this.stop();
    await this.ensureGraph();
    this.stream = stream;
    this.sourceNode = this.ctx.createMediaStreamSource(new MediaStream(stream.getAudioTracks()));
    this.sourceNode.connect(this.tap);
    stream.getTracks().forEach((t) => t.addEventListener("ended", () => {
      if (this.stream !== stream) return;
      this.stop();
      this.emit("ended");
    }));
    this.resetDetector();
    this.emit("state", { running: true, label: label2 });
  }
  stop() {
    if (!this.stream) return;
    this.sourceNode?.disconnect();
    this.stream.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.sourceNode = null;
    this.emit("state", { running: false });
  }
  // Проиграть эталон и одновременно пропустить его через детектор (проверка без игры).
  async inject(buffer, { gain = 1, audible = true } = {}) {
    await this.ensureGraph();
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const g = this.ctx.createGain();
    g.gain.value = gain;
    src.connect(g);
    g.connect(this.tap);
    if (audible) g.connect(this.ctx.destination);
    src.start(this.ctx.currentTime + 0.25);
  }
  // Просто послушать эталон (мимо детектора).
  async play(buffer) {
    if (this.ctx.state === "suspended") await this.ctx.resume();
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(this.ctx.destination);
    src.start();
  }
  // ---------- новый детектор ----------
  startNcc() {
    this.ncc?.terminate();
    this.nccInline = null;
    this.nccReady = false;
    this.nccFed = 0;
    this.nccThr = NCC_THR;
    const templates0 = this.builtinTemplates.map((t) => ({ name: t.name, soundId: t.soundId, kind: t.kind, wave: mixdown(t.buffer) }));
    try {
      this.ncc = makeWorker("ncc-worker.js");
    } catch (err) {
      this.ncc = null;
      console.error("ncc-worker не создался:", err);
    }
    if (!this.ncc) {
      this.startNccInline(templates0);
      return;
    }
    this.ncc.onerror = (e) => {
      console.error("ncc-worker:", e.message ?? e);
      this.nccReady = false;
      this.nccError = String(e.message ?? e ?? "");
      this.emit("detector", { kind: "none", error: this.nccError });
      this.startNccInline(templates0);
    };
    this.ncc.onmessage = (e) => this.onNcc(e.data);
    this.ncc.postMessage({ type: "init", templates: templates0, opts: { threshold: NCC_THR } });
    clearInterval(this.nccWatch);
    clearTimeout(this.nccWatch);
    this.nccInlineTries = 0;
    this.nccWatch = setInterval(() => {
      if (this.nccReady) {
        clearInterval(this.nccWatch);
        return;
      }
      if (this.nccInlineTries >= 4) {
        clearInterval(this.nccWatch);
        return;
      }
      this.nccInlineTries++;
      this.startNccInline(templates0);
    }, 2500);
  }
  // Распознавание без воркера. Дороже по процессору, но звук определяется в любом случае:
  // антивирус, политика браузера или file:// без blob-воркеров больше не обнуляют результат.
  async startNccInline(templates) {
    if (this.nccReady || this.nccInline) return;
    try {
      const mod = await Promise.resolve().then(() => (init_ncc_detector(), ncc_detector_exports));
      const tpls = templates.map((t) => mod.prepareTemplate(t.wave, { name: t.name, soundId: t.soundId, kind: t.kind }, { threshold: NCC_THR }));
      const det = new mod.NccDetector(tpls, { threshold: NCC_THR });
      this.nccInline = det;
      this.nccThr = NCC_THR;
      this.nccReady = true;
      this.nccFed = 0;
      this.nccError = "";
      console.warn("[ncc] воркер недоступен — распознавание идёт в основном потоке");
      this.emit("detector", { kind: "ncc", inline: true });
    } catch (err) {
      console.error("[ncc] распознавание не запустилось:", err);
      this.nccError = String(err?.message ?? err);
      this.emit("detector", { kind: "none", error: this.nccError });
    }
  }
  onNcc(m) {
    if (m.type === "ready") {
      this.nccReady = true;
      console.info(`[ncc] детектор готов: ${m.count} эталонов, ${m.ms.toFixed(0)} мс`);
      this.emit("detector", { kind: "ncc" });
      return;
    }
    if (m.type === "stats") {
      this.nccStats = m.stats;
      return;
    }
    if (m.type !== "hits") return;
    const byName = new Map(this.builtinTemplates.map((t) => [t.name, t]));
    const now = Date.now();
    for (const h of m.hits) {
      console.info(`[ncc] ${h.name} ${h.score.toFixed(2)} (${h.how})${h.second ? `, 2-й ${h.second.name} ${h.second.score.toFixed(2)}` : ""}`);
      if (h.kind === "drop") continue;
      const tpl = byName.get(h.name);
      if (!tpl) continue;
      const scores = [{ template: tpl, score: h.score, offset: 0, len: 0 }];
      const sec = h.second && byName.get(h.second.name);
      if (sec) scores.push({ template: sec, score: h.second.score, offset: 0, len: 0 });
      const at = now - Math.max(0, (this.nccFed / SAMPLE_RATE - h.time) * 1e3);
      const peakDb = Math.max(-120, ...this.floorHist.slice(-200));
      const cand = { scores, data: new Float32Array(0), frames: null, peakDb, quiet: false, at, ncc: h };
      this.emit("onset", { energyDb: peakDb });
      this.emit("event", { ...cand, candidates: [cand] });
    }
  }
  resetDetector() {
    if (this.nccInline) this.nccInline.reset();
    if (this.ncc && !this.nccInline) {
      this.ncc.postMessage({ type: "reset" });
      this.nccFed = 0;
    }
    this.pending = new Float32Array(0);
    this.history = [];
    this.windows = [];
    this.group = null;
    this.lastOnset = -Infinity;
    this.floorDb = -70;
    this.floorHist = [];
    this.calmHist = [];
    this.calmDb = null;
    this.windDb = 0;
    this.armed = true;
    this.quietRun = 0;
    this.rainHist = [];
    this.rainRun = 0;
    this.setRain(false);
  }
  push(block) {
    if (this.nccReady) {
      if (this.nccInline) {
        const hits = this.nccInline.feed(Float32Array.from(block));
        if (hits.length) this.onNcc({ type: "hits", hits, at: Date.now() });
        this.nccFed += block.length;
        if (this.nccFed >= SAMPLE_RATE * 5) {
          this.onNcc({ type: "stats", stats: { ...this.nccInline.stats, lastMs: 0 } });
          this.nccInline.stats.best = 0;
          this.nccFed = 0;
        }
      } else {
        const copy = Float32Array.from(block);
        this.ncc.postMessage({ type: "audio", block: copy }, [copy.buffer]);
        this.nccFed += copy.length;
      }
    }
    for (let i = 0; i < block.length; i++) {
      this.recBuf[this.recPos] = block[i];
      this.recPos = (this.recPos + 1) % this.recBuf.length;
    }
    this.recFilled = Math.min(this.recBuf.length, this.recFilled + block.length);
    const merged = new Float32Array(this.pending.length + block.length);
    merged.set(this.pending);
    merged.set(block, this.pending.length);
    let off = 0;
    for (; off + FFT_SIZE <= merged.length; off += HOP) this.onFrame(this.fx.frame(merged, off));
    this.pending = merged.slice(off);
  }
  onFrame(frame) {
    const e = frame.energyDb;
    this.frameCount++;
    for (const w of [...this.windows]) {
      w.push(frame);
      if (w.length >= this.windowFrames) this.finishWindow(w);
    }
    const recentMax = Math.max(-Infinity, ...this.history.slice(-JUMP_LOOKBACK).map((f) => f.energyDb));
    const thr = this.thresholdDb - this.windDb;
    const loud = this.history.length >= PRE_FRAMES && e > this.floorDb + thr && e > ABS_MIN_DB;
    const jump = e > recentMax + JUMP_DB;
    if (!this.nccReady && loud && (this.armed || jump) && this.windows.length < MAX_WINDOWS && this.frameCount - this.lastOnset >= MIN_GAP_FRAMES) {
      const w = [...this.history.slice(-PRE_FRAMES), frame];
      w.floorDb = this.floorDb;
      w.windDb = this.windDb;
      this.windows.push(w);
      this.lastOnset = this.frameCount;
      this.armed = false;
      this.quietRun = 0;
      this.emit("onset", { energyDb: e });
    }
    this.floorHist.push(e);
    if (this.floorHist.length > FLOOR_FRAMES) this.floorHist.shift();
    if (this.floorHist.length === 1 || this.frameCount % FLOOR_EVERY === 0) {
      const sorted = [...this.floorHist].sort((a, b) => a - b);
      this.floorDb = sorted[sorted.length >> 1];
    }
    if (this.frameCount % CALM_EVERY === 0 && this.floorHist.length >= FLOOR_FRAMES && this.floorDb > ABS_MIN_DB) {
      this.calmHist.push(this.floorDb);
      if (this.calmHist.length > CALM_SAMPLES) this.calmHist.shift();
      if (this.calmHist.length >= CALM_MIN) {
        const sorted = [...this.calmHist].sort((a, b) => a - b);
        this.calmDb = sorted[Math.floor(sorted.length * 0.1)];
      }
    }
    this.trackRain(frame);
    this.windDb = this.windMode === "on" ? WIND_MAX_DB : this.windMode === "off" || this.calmDb == null ? 0 : Math.max(0, Math.min(WIND_MAX_DB, this.floorDb - this.calmDb));
    const busy = this.windows.length > 0;
    if (!this.armed && !busy) {
      this.quietRun = e < this.floorDb + thr / 2 ? this.quietRun + 1 : 0;
      if (this.quietRun >= REARM_FRAMES) {
        this.armed = true;
        this.quietRun = 0;
      }
    }
    this.history.push(frame);
    if (this.history.length > PRE_FRAMES) this.history.shift();
    if (this.frameCount % LEVEL_EVERY === 0) {
      this.emit("level", { energyDb: e, floorDb: this.floorDb, thresholdDb: this.floorDb + thr, windDb: this.windDb, calmKnown: this.calmDb != null, rain: this.rain });
    }
  }
  // Признаки дождя по кадру копятся всегда, решение — раз в ~0.5 с по медианам, с задержкой на вкл/выкл.
  trackRain(frame) {
    const { hi, mid, peak, dip } = this.rainBands;
    const sum = (idx) => idx.reduce((a, b) => a + 10 ** frame.bands[b], 0);
    const m = sum(mid), d = sum(dip);
    this.rainHist.push([10 * Math.log10(sum(hi) / m), 10 * Math.log10(sum(peak) * dip.length / (peak.length * d))]);
    if (this.rainHist.length > FLOOR_FRAMES) this.rainHist.shift();
    if (this.frameCount % CALM_EVERY || this.rainHist.length < FLOOR_FRAMES) return;
    const med = (j) => this.rainHist.map((x) => x[j]).sort((a, b) => a - b)[FLOOR_FRAMES >> 1];
    const hit = this.floorDb > ABS_MIN_DB && med(0) >= RAIN_TILT_DB && med(1) >= RAIN_NOTCH_DB;
    this.rainRun = hit === this.rain ? 0 : this.rainRun + 1;
    if (this.rainRun >= (this.rain ? RAIN_OFF : RAIN_ON)) {
      this.rainRun = 0;
      this.setRain(hit);
    }
  }
  setRain(on) {
    if (this.rain === on) return;
    this.rain = on;
    this.emit("rain", { rain: on });
  }
  // Перекрывающиеся окна (выстрел, а следом звук предмета) образуют группу и отдаются одним событием
  // со всеми вариантами. Так посторонний звук не «съедает» звук предмета.
  finishWindow(frames) {
    this.windows.splice(this.windows.indexOf(frames), 1);
    const t0 = performance.now();
    const { scores, data: data2 } = matchSegment(frames, this.activeTemplates(frames.windDb), this.frameSeconds);
    const peakDb = Math.max(...frames.map((f) => f.energyDb));
    const quiet = frames.windDb > 0 && peakDb <= frames.floorDb + this.thresholdDb;
    const result = { scores, data: data2, frames, peakDb, quiet, at: Date.now(), ms: performance.now() - t0 };
    if (!this.group) this.group = [];
    if (scores.length) this.group.push(result);
    if (!this.windows.length) {
      const candidates = this.group.sort((a, b) => b.scores[0].score - a.scores[0].score);
      this.group = null;
      if (candidates.length) this.emit("event", { ...candidates[0], candidates });
    }
  }
  emit(type, detail) {
    this.dispatchEvent(new CustomEvent(type, { detail }));
  }
};
AudioEngine.prototype.recordingWav = function() {
  const n = this.recFilled;
  const start = (this.recPos - n + this.recBuf.length) % this.recBuf.length;
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = this.recBuf[(start + i) % this.recBuf.length];
  return wavBlob(out);
};
function wavBlob(samples, sampleRate = SAMPLE_RATE) {
  const parts = Array.isArray(samples) ? samples : [samples];
  const n = parts.reduce((a, p) => a + p.length, 0);
  const out = new DataView(new ArrayBuffer(44 + n * 2));
  const str = (o2, t) => {
    for (let i = 0; i < t.length; i++) out.setUint8(o2 + i, t.charCodeAt(i));
  };
  str(0, "RIFF");
  out.setUint32(4, 36 + n * 2, true);
  str(8, "WAVE");
  str(12, "fmt ");
  out.setUint32(16, 16, true);
  out.setUint16(20, 1, true);
  out.setUint16(22, 1, true);
  out.setUint32(24, sampleRate, true);
  out.setUint32(28, sampleRate * 2, true);
  out.setUint16(32, 2, true);
  out.setUint16(34, 16, true);
  str(36, "data");
  out.setUint32(40, n * 2, true);
  let o = 44;
  for (const p of parts) {
    for (let i = 0; i < p.length; i++, o += 2) out.setInt16(o, Math.max(-1, Math.min(1, p[i])) * 32767, true);
  }
  return new Blob([out.buffer], { type: "audio/wav" });
}
function mixdown(buf) {
  const out = new Float32Array(buf.length);
  for (let c = 0; c < buf.numberOfChannels; c++) {
    const ch = buf.getChannelData(c);
    for (let i = 0; i < out.length; i++) out[i] += ch[i] / buf.numberOfChannels;
  }
  return out;
}

// js/classify.js
var CARGO_MARGIN = 0.08;
var QUIET = { minMatch: 0.75, lead: 0.08 };
var DEFAULTS2 = { threshold: 12, minMatch: 0.6 };
var KEYS = { threshold: "threshold", minMatch: "minMatch2", custom: "customTemplates", mapLabel: "mapLabel", windMode: "windMode", customRev: "customRev" };
var store = {
  get(key, fallback) {
    try {
      const v = localStorage.getItem(`merchant-ear.${key}`);
      return v == null ? fallback : JSON.parse(v);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(`merchant-ear.${key}`, JSON.stringify(value));
    } catch {
    }
  },
  remove(key) {
    try {
      localStorage.removeItem(`merchant-ear.${key}`);
    } catch {
    }
  }
};
async function fetchCustomTemplates() {
  try {
    const r = await fetch("/api/templates", { cache: "no-store" });
    if (!r.ok) return null;
    return (await r.json()).templates ?? [];
  } catch {
    return null;
  }
}
var mapNameOf = (label2) => label2 ? String(label2).split(" — ")[0] : null;
function classify(candidates, possible, minMatch) {
  const scored = candidates.filter((c) => c.scores.length).map((c) => {
    const bySound = scoresBySound(c.scores);
    let inCargo = -1;
    let cargoBest = null;
    for (const id of possible.keys()) {
      const m = bySound.get(id);
      if (m && (!cargoBest || m.score > cargoBest.score)) cargoBest = m;
    }
    if (cargoBest) inCargo = cargoBest.score;
    if (inCargo < c.scores[0].score - CARGO_MARGIN) inCargo = -1;
    return { ...c, bySound, inCargo, cargoBest };
  }).sort((a, b) => b.inCargo - a.inCargo);
  const chosen = scored[0];
  if (!chosen) return null;
  let accepted = chosen.inCargo >= (chosen.ncc ? 0 : minMatch);
  let reason = accepted ? null : scored.some((c) => c.scores[0].score >= minMatch) ? "не из этого груза" : "посторонний звук";
  if (accepted && chosen.quiet) {
    let other = -1;
    for (const [id, m] of chosen.bySound) if (id !== chosen.cargoBest.template.soundId && m.score > other) other = m.score;
    if (chosen.inCargo < QUIET.minMatch || chosen.inCargo - other < QUIET.lead) {
      accepted = false;
      reason = "тихий звук на шумном фоне";
    }
  }
  return { chosen, scored, accepted, reason };
}

// js/scope.js
function createScope(canvas, { points = 360, dbMin = -90, dbMax = 10, onSignal = () => {
}, onReset = () => {
} } = {}) {
  const ctx = canvas.getContext("2d");
  let levels = [], thresholds = [], hits = [];
  let dirty = true;
  const css = getComputedStyle(document.documentElement);
  const color = (v) => css.getPropertyValue(v).trim();
  const C = { good: color("--good"), accent: color("--accent"), line: color("--line") };
  new ResizeObserver(() => {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(canvas.clientWidth * dpr);
    canvas.height = Math.round(canvas.clientHeight * dpr);
    dirty = true;
  }).observe(canvas);
  function draw() {
    requestAnimationFrame(draw);
    if (!dirty) return;
    dirty = false;
    const w = canvas.width, h = canvas.height, dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, w, h);
    const y = (db) => h - Math.max(0, Math.min(1, (db - dbMin) / (dbMax - dbMin))) * (h - 6 * dpr) - 3 * dpr;
    const x = (i, len) => w - (len - 1 - i) * (w / (points - 1));
    const line = (arr) => {
      ctx.beginPath();
      arr.forEach((v, i) => i ? ctx.lineTo(x(i, arr.length), y(v)) : ctx.moveTo(x(i, arr.length), y(v)));
    };
    ctx.strokeStyle = C.line;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let g = 1; g < 4; g++) {
      const gy = Math.round(h * g / 4) + 0.5;
      ctx.moveTo(0, gy);
      ctx.lineTo(w, gy);
    }
    ctx.stroke();
    if (!levels.length) {
      ctx.strokeStyle = C.line;
      ctx.lineWidth = 2 * dpr;
      ctx.beginPath();
      ctx.moveTo(0, h - 3 * dpr);
      ctx.lineTo(w, h - 3 * dpr);
      ctx.stroke();
      return;
    }
    ctx.fillStyle = C.accent;
    for (const i of hits) ctx.fillRect(x(i, levels.length) - dpr, 0, 2 * dpr, h);
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, C.good + "66");
    grad.addColorStop(1, C.good + "00");
    line(levels);
    ctx.lineTo(w, h);
    ctx.lineTo(x(0, levels.length), h);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();
    line(levels);
    ctx.strokeStyle = C.good;
    ctx.lineWidth = 1.5 * dpr;
    ctx.stroke();
    ctx.setLineDash([4 * dpr, 3 * dpr]);
    line(thresholds);
    ctx.strokeStyle = C.accent;
    ctx.lineWidth = 1.5 * dpr;
    ctx.stroke();
    ctx.setLineDash([]);
  }
  requestAnimationFrame(draw);
  return {
    push(level, threshold) {
      if (!levels.length) onSignal();
      levels.push(level);
      thresholds.push(threshold);
      if (levels.length > points) {
        levels.shift();
        thresholds.shift();
        hits = hits.map((i) => i - 1).filter((i) => i >= 0);
      }
      dirty = true;
    },
    hit() {
      if (levels.length) {
        hits.push(levels.length - 1);
        dirty = true;
      }
    },
    reset() {
      levels = [];
      thresholds = [];
      hits = [];
      dirty = true;
      onReset();
    }
  };
}

// js/cells.js
var MAX_CELLS = 6;
var ROI = 520;
var PITCH_SHARE = 0.68;
var median = (a) => {
  if (!a.length) return null;
  a.sort((x, y) => x - y);
  return a[a.length >> 1];
};
function luminance(canvas, x, y, W, H) {
  const px = canvas.getContext("2d", { willReadFrequently: true }).getImageData(x, y, W, H).data;
  const L2 = new Uint8Array(W * H);
  for (let i = 0, j = 0; j < L2.length; i += 4, j++) L2[j] = 77 * px[i] + 150 * px[i + 1] + 29 * px[i + 2] >> 8;
  return { L: L2, W, H };
}
function findLines(score, from, to) {
  const at = (x) => Math.max(score[x - 1] ?? 0, score[x] ?? 0, score[x + 1] ?? 0);
  const candidates = [];
  for (let p = 40; p <= 170; p += 0.2) {
    let best = { v: -1 };
    for (let off = from; off < from + p; off++) {
      let s = 0, n = 0;
      for (let x = off; x < to; x += p) {
        s += at(Math.round(x));
        n++;
      }
      if (n >= 3 && s / n > best.v) best = { v: s / n, off, p };
    }
    if (best.v > 0) candidates.push(best);
  }
  if (!candidates.length) return null;
  const top = Math.max(...candidates.map((c) => c.v));
  const pick = candidates.find((c) => c.v >= top * PITCH_SHARE);
  const lines = [];
  for (let x = pick.off; x < to; x += pick.p) {
    const r = Math.round(x);
    let bx = r;
    for (let d = -2; d <= 2; d++) if ((score[r + d] ?? 0) > (score[bx] ?? 0)) bx = r + d;
    lines.push(bx);
  }
  return { pitch: pick.p, lines };
}
function measureCargo(canvas, tip, { hide = true } = {}) {
  const rx = Math.max(0, Math.round(tip.x0) - ROI - 16), ry = Math.max(0, Math.round(tip.y0) - ROI - 16);
  const area = luminance(canvas, rx, ry, Math.min(canvas.width, Math.round(tip.x0) + ROI + 16) - rx, Math.min(canvas.height, Math.round(tip.y0) + ROI + 16) - ry);
  const result = measureArea(area, { x0: tip.x0 - rx, y0: tip.y0 - ry, x1: tip.x1 - rx, y1: tip.y1 - ry }, hide);
  return result && { ...result, lines: { xs: result.lines.xs.map((x) => x + rx), ys: result.lines.ys.map((y) => y + ry) } };
}
function measureArea({ L: L2, W, H }, tip, hide) {
  const lum = (x, y) => L2[y * W + x];
  const pad = 6;
  const hidden = hide ? (x, y) => x >= tip.x0 - pad && x <= tip.x1 + pad && y >= tip.y0 - pad && y <= tip.y1 + pad : () => false;
  const cx = Math.max(0, Math.round(tip.x0) - 4), cy = Math.max(0, Math.round(tip.y0) - 4);
  const x0 = Math.max(4, cx - ROI), x1 = Math.min(W - 4, cx + ROI), y0 = Math.max(4, cy - ROI), y1 = Math.min(H - 4, cy + ROI);
  const colScore = new Float32Array(W), rowScore = new Float32Array(H);
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      if (hidden(x, y)) continue;
      const v = lum(x, y);
      if (v < 30) continue;
      if (v - Math.max(lum(x - 3, y), lum(x + 3, y)) >= 12) colScore[x]++;
      if (v - Math.max(lum(x, y - 3), lum(x, y + 3)) >= 12) rowScore[y]++;
    }
  }
  const gx = findLines(colScore, x0, x1), gy = findLines(rowScore, y0, y1);
  if (!gx || !gy || Math.abs(gx.pitch - gy.pitch) > Math.max(gx.pitch, gy.pitch) * 0.1) return null;
  const xs = gx.lines, ys = gy.lines;
  const q0 = xs.findLastIndex((x) => x <= cx), r0 = ys.findLastIndex((y) => y <= cy);
  if (q0 < 0 || r0 < 0 || q0 >= xs.length - 1 || r0 >= ys.length - 1) return null;
  const cache = /* @__PURE__ */ new Map();
  const memo = (k, f) => cache.has(k) ? cache.get(k) : (cache.set(k, f()), cache.get(k));
  const fill = (q, r) => memo(`f${q},${r}`, () => {
    if (q < 0 || r < 0 || q >= xs.length - 1 || r >= ys.length - 1) return -1;
    const a = [], m = Math.round((xs[q + 1] - xs[q]) * 0.12);
    let all = 0;
    for (let y = ys[r] + m; y < ys[r + 1] - m; y += 2) for (let x = xs[q] + m; x < xs[q + 1] - m; x += 2) {
      all++;
      if (!hidden(x, y)) a.push(lum(x, y));
    }
    return a.length >= all * 0.25 ? median(a) : null;
  });
  const edge = (q, r, vertical) => memo(`${vertical ? "v" : "h"}${q},${r}`, () => {
    if (q < 0 || r < 0 || q >= xs.length - 1 || r >= ys.length - 1) return Infinity;
    const a = [];
    let all = 0;
    if (vertical) {
      const x = xs[q + 1], h = ys[r + 1] - ys[r];
      for (let y = Math.round(ys[r] + h * 0.15); y < ys[r + 1] - h * 0.15; y++) {
        all++;
        if (!hidden(x, y)) a.push(Math.max(lum(x - 1, y), lum(x, y), lum(x + 1, y)));
      }
    } else {
      const y = ys[r + 1], w = xs[q + 1] - xs[q];
      for (let x = Math.round(xs[q] + w * 0.15); x < xs[q + 1] - w * 0.15; x++) {
        all++;
        if (!hidden(x, y)) a.push(Math.max(lum(x, y - 1), lum(x, y), lum(x, y + 1)));
      }
    }
    return a.length >= all * 0.25 ? median(a) : null;
  });
  const base = fill(q0, r0);
  if (base == null || base < 8) return null;
  const wall = Math.max(30, base * 2.4);
  const isWall = (v) => v == null ? null : v >= wall;
  const isCargo = (v) => v == null ? null : v >= base * 0.5;
  let [qa, qb, ra, rb] = [q0, q0, r0, r0];
  const tryGrow = (cells) => {
    let seen = false;
    for (const [linkWall, cellFill] of cells) {
      const w = isWall(linkWall), c = isCargo(cellFill);
      if (w === true || c === false) return false;
      if (w === false) seen = true;
    }
    return seen;
  };
  for (let changed = true; changed; ) {
    changed = false;
    const rowsRange = () => Array.from({ length: rb - ra + 1 }, (_, i) => ra + i);
    const colsRange = () => Array.from({ length: qb - qa + 1 }, (_, i) => qa + i);
    if (qb - qa + 1 < MAX_CELLS && tryGrow(rowsRange().map((r) => [edge(qb, r, true), fill(qb + 1, r)]))) {
      qb++;
      changed = true;
    }
    if (qb - qa + 1 < MAX_CELLS && tryGrow(rowsRange().map((r) => [edge(qa - 1, r, true), fill(qa - 1, r)]))) {
      qa--;
      changed = true;
    }
    if (rb - ra + 1 < MAX_CELLS && tryGrow(colsRange().map((q) => [edge(q, rb, false), fill(q, rb + 1)]))) {
      rb++;
      changed = true;
    }
    if (rb - ra + 1 < MAX_CELLS && tryGrow(colsRange().map((q) => [edge(q, ra - 1, false), fill(q, ra - 1)]))) {
      ra--;
      changed = true;
    }
  }
  return { size: [qb - qa + 1, rb - ra + 1], pitch: gx.pitch, cells: { qa, qb, ra, rb }, lines: { xs, ys } };
}
function measureAcross(canvas, others, tip) {
  const all = [measureCargo(canvas, tip), ...others.map((c) => measureCargo(c, tip, { hide: false }))].filter(Boolean);
  return all.sort((a, b) => b.size[0] * b.size[1] - a.size[0] * a.size[1])[0] ?? null;
}

// js/grid.js
var GRID_COLS = 9;
var SMALL_UI_PITCH = 56;
var median2 = (a) => {
  if (!a.length) return null;
  a.sort((x, y) => x - y);
  return a[a.length >> 1];
};
function luminance2(canvas) {
  const W = canvas.width, H = canvas.height;
  const px = canvas.getContext("2d", { willReadFrequently: true }).getImageData(0, 0, W, H).data;
  const L2 = new Uint8Array(W * H);
  for (let i = 0, j = 0; j < L2.length; i += 4, j++) L2[j] = 77 * px[i] + 150 * px[i + 1] + 29 * px[i + 2] >> 8;
  return { L: L2, W, H, px };
}
var LINE_MIN = 22;
var LINE_RISE = 8;
var CARGO_FILL = 14;
var MAX_SIDE = 3;
var BLACK = 10;
var WALL_V = 45;
var WALL_BRIGHT = 55;
var TINT = 8;
var TINT_SAME = 8;
var WALL_TINT = 100;
var HOVER_LO = 4;
function fitComb(score, from, to, count, pMin, pMax, step = 0.25, minFirst = 0, tol = 1) {
  const pad = Math.ceil(pMax) + 4;
  const dil = new Float32Array(score.length + 2 * pad);
  for (let x = -pad; x < score.length + pad; x++) {
    let v = 0;
    for (let d = -tol; d <= tol; d++) v = Math.max(v, score[x + d] ?? 0);
    dil[x + pad] = v;
  }
  const at = (x) => dil[Math.round(x) + pad];
  let bv = 0, boff = 0, bp = pMin, any = false;
  for (let p = pMin; p <= pMax; p += step) {
    const last = to - (count - 1) * p;
    for (let off = from; off < last; off++) {
      if (at(off) < minFirst) continue;
      let s = 0, lo = Infinity, x = off;
      for (let k = 0; k < count; k++, x += p) {
        const v2 = at(x);
        s += v2;
        if (v2 < lo) lo = v2;
      }
      const out = Math.max(at(off - p), at(off + count * p));
      const v = s / count + lo - out * 0.5;
      if (!any || v > bv) {
        any = true;
        bv = v;
        boff = off;
        bp = p;
      }
    }
  }
  return any ? { v: bv, off: boff, p: bp } : null;
}
function snap(score, x) {
  const r = Math.round(x);
  let bx = r;
  for (let d = -3; d <= 3; d++) if ((score[r + d] ?? 0) > (score[bx] ?? 0)) bx = r + d;
  return bx;
}
function detectGrid(canvas, hint = null) {
  const { L: L2, W, H, px } = luminance2(canvas);
  const lum = (x, y) => L2[y * W + x];
  const colScore = new Float32Array(W);
  for (let y = 0; y < H; y += 2) {
    const row = y * W;
    for (let x = 3; x < W - 3; x++) {
      const v = L2[row + x];
      if (v >= LINE_MIN && v - Math.max(L2[row + x - 3], L2[row + x + 3]) >= LINE_RISE) colScore[x]++;
    }
  }
  const typical = median2(Array.from(colScore.subarray(3, W - 3))) ?? 0;
  const columns = (gx2) => {
    if (!gx2 || gx2.v < 20) return null;
    const xs2 = Array.from({ length: GRID_COLS + 1 }, (_, k) => snap(colScore, gx2.off + k * gx2.p));
    const teeth = xs2.map((x) => Math.max(colScore[x - 1], colScore[x], colScore[x + 1]));
    const mean = teeth.reduce((a2, b2) => a2 + b2, 0) / teeth.length;
    return mean < Math.max(20, typical * 4) || teeth.filter((t) => t >= typical * 2).length < GRID_COLS - 1 ? null : xs2;
  };
  let gx = null, xs = null;
  if (hint?.comb) {
    const { off, p, v } = hint.comb;
    const near = fitComb(colScore, Math.max(3, off - 4), Math.min(W - 3, off + 4 + GRID_COLS * p), GRID_COLS + 1, p - 0.5, p + 0.5, 0.125);
    if (near && near.v >= v * 0.7 && (xs = columns(near))) gx = near;
  }
  const panelScore = (cand) => {
    const p = (cand[GRID_COLS] - cand[0]) / GRID_COLS;
    if (!(p >= 30)) return 0;
    const colOn = (x, y) => {
      const v = Math.max(L2[y * W + x - 1], L2[y * W + x], L2[y * W + x + 1]);
      return v >= LINE_MIN - 4 && v - Math.max(L2[y * W + x - 4], L2[y * W + x + 4]) >= 3;
    };
    let top2 = -1, bottom2 = -1;
    for (let y = 4, run = -1, gap = 0; y < H - 4; y++) {
      const on = cand.filter((x) => colOn(x, y)).length >= 5;
      if (on) {
        if (run < 0) run = y;
        gap = 0;
        if (y - run > bottom2 - top2) {
          top2 = run;
          bottom2 = y;
        }
      } else if (run >= 0 && ++gap > 12) run = -1;
    }
    if (top2 < 0) return 0;
    let score = 0;
    for (let r = 0; top2 + r * p < bottom2; r++) {
      for (let q = 0; q < GRID_COLS; q++) {
        const x0 = cand[q], x1 = cand[q + 1], y0 = top2 + r * p;
        let txt = 0, n = 0;
        for (let yy = Math.round(y0 + 2); yy < Math.round(Math.min(y0 + p * 0.28, H - 2)); yy += 2) {
          for (let x = Math.round(x0 + 3); x < Math.round(x0 + (x1 - x0) * 0.38); x += 2) {
            n++;
            const i = (yy * W + x) * 4;
            if (Math.min(px[i], px[i + 1], px[i + 2]) >= 105) txt++;
          }
        }
        if (n && txt / n >= 0.05) score++;
      }
    }
    return score;
  };
  const PANEL_OK = 20;
  if (!xs) {
    const pLo = Math.max(30, W / 60), pHi = Math.min(220, W / 9.5);
    let best = null;
    {
      const search = colScore.slice();
      for (let tries = 0; tries < 3 && !(best && best.score >= PANEL_OK); tries++) {
        const rough = fitComb(search, 3, W - 3, GRID_COLS + 1, pLo, pHi, 0.5, Math.max(10, typical * 2), 2);
        if (!rough) break;
        const fine = fitComb(search, Math.max(3, rough.off - 3), Math.min(W - 3, rough.off + 3 + GRID_COLS * (rough.p + 1)), GRID_COLS + 1, rough.p - 1, rough.p + 1, 0.125);
        const cand = columns(fine);
        search.fill(0, Math.max(0, rough.off - 3), Math.min(W, Math.round(rough.off + GRID_COLS * rough.p) + 4));
        if (!cand) continue;
        const score = panelScore(cand);
        if (!best || score > best.score) best = { gx: fine, xs: cand, score };
      }
    }
    if (!best) return null;
    gx = best.gx;
    xs = best.xs;
  }
  const pitch = (xs[GRID_COLS] - xs[0]) / GRID_COLS;
  const small = pitch < SMALL_UI_PITCH;
  const rowScore = new Float32Array(H);
  for (let y = 3; y < H - 3; y++) {
    for (let x = xs[0] + 2; x < xs[GRID_COLS] - 2; x += 2) {
      const v = lum(x, y);
      if (v >= LINE_MIN && v - Math.max(lum(x, y - 3), lum(x, y + 3)) >= LINE_RISE) rowScore[y]++;
    }
  }
  let bestOff = 0, bestV = -1;
  for (let off = 0; off < pitch; off++) {
    let s = 0;
    for (let y = off; y < H; y += pitch) s += Math.max(rowScore[Math.round(y) - 1] ?? 0, rowScore[Math.round(y)] ?? 0, rowScore[Math.round(y) + 1] ?? 0);
    if (s > bestV) {
      bestV = s;
      bestOff = off;
    }
  }
  const lines = [];
  for (let y = bestOff; y < H - 3; y += pitch) lines.push(snap(rowScore, y));
  if (lines.length < 3) return null;
  const cellFill = (q, y0, y1) => cellStats(L2, px, W, xs[q], xs[q + 1], y0, y1, pitch);
  const lineStats = (n, get) => {
    const vals = [];
    let seen = 0, hidden = 0;
    for (let i = 0; i < n; i++) {
      const [v, side] = get(i);
      if (!Number.isFinite(v) || !Number.isFinite(side)) {
        hidden++;
        continue;
      }
      if (v < BLACK && side < BLACK) {
        hidden++;
        continue;
      }
      vals.push(v);
      if (v - side >= 3) seen++;
    }
    return vals.length >= n * 0.25 ? { v: median2(vals), seen: seen / vals.length, hidden: hidden / n } : { v: 0, seen: 0, hidden: 1 };
  };
  const vLine = (x, y0, y1) => {
    const from = Math.round(y0 + (y1 - y0) * 0.15), n = Math.round((y1 - y0) * 0.7);
    return lineStats(n, (i) => [Math.max(lum(x - 1, from + i), lum(x, from + i), lum(x + 1, from + i)), Math.max(lum(x - 4, from + i), lum(x + 4, from + i))]);
  };
  const hLine = (y, x0, x1) => {
    const from = Math.round(x0 + (x1 - x0) * 0.15), n = Math.round((x1 - x0) * 0.7);
    return lineStats(n, (i) => [Math.max(lum(from + i, y - 1), lum(from + i, y), lum(from + i, y + 1)), Math.max(lum(from + i, y - 4), lum(from + i, y + 4))]);
  };
  const cellHint = (q, y0, y1) => {
    const x0 = xs[q], x1 = xs[q + 1];
    let txt = 0, grey2 = 0, n = 0;
    for (let y = Math.round(y0 + 2); y < Math.round(y1 - 2); y += 2) {
      for (let x = Math.round(x0 + 2); x < Math.round(x1 - 2); x += 2) {
        n++;
        const i = (y * W + x) * 4;
        const mn = Math.min(px[i], px[i + 1], px[i + 2]);
        if ((x - x0) / (x1 - x0) < 0.5 && (y - y0) / (y1 - y0) < 0.32 && mn >= 105) txt++;
        else if (mn >= 25 && mn <= 125) grey2++;
      }
    }
    return n > 0 && (txt / n >= 0.015 || grey2 / n >= 0.3);
  };
  const bands = lines.slice(0, -1).map((y, i) => {
    const y1 = lines[i + 1];
    const v = xs.map((x) => vLine(x, y, y1));
    const ok = v.filter((e) => e.seen > 0.3 && e.v >= LINE_MIN - 4).length;
    const frame = (e) => e.seen > 0.5 && e.v >= WALL_V;
    const evid = xs.slice(0, -1).some((_, q) => cellHint(q, y, y1));
    return {
      y0: y,
      y1,
      v,
      n: ok,
      ok: (v[0].seen > 0.5 || v[GRID_COLS].seen > 0.5) && ok >= 5 || small && frame(v[0]) && frame(v[GRID_COLS]) && ok >= 3 || ok >= 6 || ok >= 3 && evid
    };
  });
  let a = -1, b = -1;
  for (let i = 0; i < bands.length; ) {
    if (!bands[i].ok) {
      i++;
      continue;
    }
    let j = i;
    while (j < bands.length && (bands[j].ok || bands[j].n >= 2 && bands[j + 1]?.ok)) j++;
    if (j - i > b - a) {
      a = i;
      b = j;
    }
    i = j;
  }
  if (a < 0) return null;
  const colAt = (x, y) => {
    const v = Math.max(lum(x - 1, y), lum(x, y), lum(x + 1, y));
    return v >= LINE_MIN - 4 && v - Math.max(lum(x - 4, y), lum(x + 4, y)) >= 3;
  };
  const frameAt = (x, y) => colAt(x, y) && Math.max(lum(x - 1, y), lum(x, y), lum(x + 1, y)) >= WALL_V;
  let top = -1, bottom = -1;
  for (let y = 4, run = -1, gap = 0; y < H - 4; y++) {
    const n = xs.filter((x) => colAt(x, y)).length;
    const on = n >= 5 || small && n >= 3 && frameAt(xs[0], y) && frameAt(xs[GRID_COLS], y);
    if (on) {
      if (run < 0) run = y;
      gap = 0;
      if (y - run > bottom - top) {
        top = run;
        bottom = y;
      }
    } else if (run >= 0 && ++gap > 12) run = -1;
  }
  while (a < b && lines[a] < top - 3) a++;
  while (b > a && lines[b] > bottom + 3) b--;
  if (b - a < 2) return null;
  const tipsPre = findTips(lum, W, H, xs, lines.slice(a), pitch);
  const strip = (t) => !tipHide(t, lum, W, pitch, xs) && t.x1 - t.x0 >= 4 * pitch && t.y1 - t.y0 >= 0.3 * pitch && t.x1 > xs[0] && t.x0 < xs[GRID_COLS];
  const strips = tipsPre.filter(strip);
  const header = strips.find((t) => t.y1 <= lines[a] + pitch) ?? null;
  const footer = strips.filter((t) => t.y0 >= lines[b] - pitch).sort((p, q) => p.y0 - q.y0)[0] ?? null;
  const cap = Math.min(H, footer ? footer.y0 : H);
  const extra = [];
  for (let y0 = lines[b]; y0 + pitch * 0.4 < cap; y0 += pitch) {
    const y1 = y0 + pitch;
    const ok = xs.filter((x) => {
      const e = vLine(x, y0, Math.min(y1, H));
      return e && e.seen > 0.3 && e.v >= LINE_MIN - 4;
    }).length;
    const over = tipsPre.some((t) => tipHide(t, lum, W, pitch, xs) && t.y1 > y0 && t.y0 < y1 && t.x1 > xs[0] && t.x0 < xs[GRID_COLS]);
    const evid = xs.slice(0, -1).some((_, q) => {
      const f = cellFill(q, y0 + 2, Math.min(y1 - 2, H - 2));
      return f.dark < 0.6 && f.fill >= CARGO_FILL && f.fill <= 60 && (f.flat >= 0.4 || f.hi >= 0.02) || cellHint(q, y0, y1);
    });
    const pass = ok >= 4 || ok >= 2 && (evid || over) || over && (ok >= 1 || evid);
    if (!pass) break;
    extra.push(Math.round(y1));
  }
  const allLines = lines.slice(0, b + 1).concat(extra);
  const allBands = allLines.map((y0, i) => ({ v: xs.map((x) => vLine(x, y0 + 2, Math.min(allLines[i + 1] ?? y0 + pitch, H - 2))) }));
  const ys = allLines.slice(a);
  const rows = ys.length - 1;
  const fills = [], vEdges = [], hEdges = [];
  for (let r = 0; r < rows; r++) {
    fills.push(xs.slice(0, -1).map((_, q) => cellFill(q, ys[r], ys[r + 1])));
    vEdges.push(allBands[a + r].v);
  }
  for (let k = 0; k <= rows; k++) hEdges.push(xs.slice(0, -1).map((x, q) => hLine(ys[k], x, xs[q + 1])));
  const tinted = (f) => Math.max(Math.abs(f.rg), Math.abs(f.bg), Math.abs(f.rg - f.bg)) >= TINT;
  const sameTint = (a2, b2) => a2 && b2 && tinted(a2) && tinted(b2) && Math.abs(a2.rg - b2.rg) + Math.abs(a2.bg - b2.bg) <= TINT_SAME;
  const edgeKind = (e, a2, b2) => {
    if (e.hidden >= 0.75 || e.v < BLACK + 4) return "hidden";
    const same = sameTint(a2, b2);
    return e.v >= (same ? WALL_TINT : WALL_V) && (e.seen >= 0.4 || small && !same && e.v >= WALL_BRIGHT) ? "wall" : "inner";
  };
  const isRed = (q, r) => cellRed(px, W, xs[q], xs[q + 1], ys[r], ys[r + 1], pitch);
  const red = [];
  for (let r = 0; r < rows; r++) for (let q = 0; q < GRID_COLS; q++) if (isRed(q, r)) red.push([q, r]);
  const redSet = new Set(red.map(([q, r]) => `${q},${r}`));
  const tips = findTips(lum, W, H, xs, ys, pitch);
  const inTip = (x, y) => tips.some((t) => tipHide(t, lum, W, pitch, xs) && x >= t.x0 && x <= t.x1 && y >= t.y0 && y <= t.y1);
  const cells = fills.map((row, r) => row.map((f, q) => {
    if (redSet.has(`${q},${r}`)) return "hidden";
    if (inTip((xs[q] + xs[q + 1]) / 2, (ys[r] + ys[r + 1]) / 2)) return "hidden";
    if (f.dark < 0.6 && f.fill >= CARGO_FILL && f.fill <= 60 && (f.flat >= 0.4 || f.hi >= 0.02)) return "cargo";
    const around = [vEdges[r][q], vEdges[r][q + 1], hEdges[r][q], hEdges[r + 1][q]];
    return around.filter((e) => e.v >= (small ? LINE_MIN : 35) && e.seen >= 0.5).length >= 3 ? "empty" : "hidden";
  }));
  const id = (q, r) => r * GRID_COLS + q;
  const parent = Array.from({ length: rows * GRID_COLS }, (_, i) => i);
  const find = (i) => parent[i] === i ? i : parent[i] = find(parent[i]);
  for (let r = 0; r < rows; r++) for (let q = 0; q < GRID_COLS; q++) {
    if (cells[r][q] !== "cargo") continue;
    if (q + 1 < GRID_COLS && cells[r][q + 1] === "cargo" && edgeKind(vEdges[r][q + 1], fills[r][q], fills[r][q + 1]) === "inner") parent[find(id(q + 1, r))] = find(id(q, r));
    if (r + 1 < rows && cells[r + 1][q] === "cargo" && edgeKind(hEdges[r + 1][q], fills[r][q], fills[r + 1][q]) === "inner") parent[find(id(q, r + 1))] = find(id(q, r));
  }
  for (let r = 0; r < rows; r++) for (let q = 0; q < GRID_COLS; q++) {
    if (cells[r][q] !== "hidden" || !inTip((xs[q] + xs[q + 1]) / 2, (ys[r] + ys[r + 1]) / 2)) continue;
    if (r > 0 && r + 1 < rows && cells[r - 1][q] === "cargo" && cells[r + 1][q] === "cargo" && edgeKind(hEdges[r][q], fills[r - 1][q], fills[r][q]) !== "wall" && edgeKind(hEdges[r + 1][q], fills[r][q], fills[r + 1][q]) !== "wall") parent[find(id(q, r - 1))] = find(id(q, r + 1));
    if (q > 0 && q + 1 < GRID_COLS && cells[r][q - 1] === "cargo" && cells[r][q + 1] === "cargo" && edgeKind(vEdges[r][q], fills[r][q - 1], fills[r][q]) !== "wall" && edgeKind(vEdges[r][q + 1], fills[r][q], fills[r][q + 1]) !== "wall") parent[find(id(q - 1, r))] = find(id(q + 1, r));
  }
  const groups = /* @__PURE__ */ new Map();
  for (let r = 0; r < rows; r++) for (let q = 0; q < GRID_COLS; q++) {
    if (cells[r][q] !== "cargo") continue;
    const k = find(id(q, r));
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push([q, r]);
  }
  const cargos = [];
  const dropped = [];
  const cands = [];
  for (const list of groups.values()) {
    const qa = Math.min(...list.map((c) => c[0])), qb = Math.max(...list.map((c) => c[0]));
    const ra = Math.min(...list.map((c) => c[1])), rb = Math.max(...list.map((c) => c[1]));
    const w = qb - qa + 1, h = rb - ra + 1;
    if (w > MAX_SIDE || h > MAX_SIDE) {
      dropped.push({ qa, ra, w, h, n: list.length, why: "oversize" });
      continue;
    }
    let partial = false, holeTip = true;
    if (list.length !== w * h) {
      let ok = true;
      for (let r = ra; r <= rb; r++) for (let q = qa; q <= qb; q++) {
        if (cells[r][q] === "empty") ok = false;
        if (cells[r][q] === "cargo" && list.some(([x, y]) => x === q && y === r)) continue;
        if (cells[r][q] === "cargo" || !inTip((xs[q] + xs[q + 1]) / 2, (ys[r] + ys[r + 1]) / 2)) holeTip = false;
      }
      if (!ok) {
        dropped.push({ qa, ra, w, h, n: list.length, why: "shape" });
        continue;
      }
      partial = true;
    }
    let bad = false;
    const mark = { cutLow: false, cutUp: false, other: false };
    const side = (e, cell, clip) => {
      const k = edgeKind(e);
      if (k === "hidden" || cell === "hidden") {
        partial = true;
        mark.other = true;
        mark.log = (mark.log ?? []).concat([[k, cell, clip, e.v, e.seen]]);
      } else if (k === "inner") {
        if (e.seen >= 0.6 && e.v >= 30) return;
        if (clip) {
          partial = true;
          mark.other = true;
        } else bad = true;
      }
    };
    for (let q = qa; q <= qb; q++) {
      const e = hEdges[ra][q], k = edgeKind(e);
      const under = inTip((xs[q] + xs[q + 1]) / 2, ys[ra]);
      const solid = k === "wall" || k === "inner" && e.seen >= 0.6 && e.v >= 30;
      if (k === "hidden" || cells[ra - 1]?.[q] === "hidden" || under) {
        partial = true;
        mark.other = true;
      } else if (!solid) {
        if (ra === 0) {
          partial = true;
          mark.cutUp = true;
        } else bad = true;
      }
    }
    for (let q = qa; q <= qb; q++) {
      const eB = hEdges[rb + 1][q], below = cells[rb + 1]?.[q];
      if (rb === rows - 1 && below === void 0) {
        const k = edgeKind(eB);
        if (!(k === "wall" || k === "inner" && eB.seen >= 0.6 && eB.v >= 30)) {
          partial = true;
          mark.cutLow = true;
        }
      } else side(eB, below, rb === rows - 1);
    }
    for (let r = ra; r <= rb; r++) {
      side(vEdges[r][qa], cells[r][qa - 1], qa === 0);
      side(vEdges[r][qb + 1], cells[r][qb + 1], qb + 1 === GRID_COLS);
    }
    if (bad) {
      dropped.push({ qa, ra, w, h, n: list.length, why: "bad-edge" });
      continue;
    }
    cands.push({ list, qa, qb, ra, rb, w, h, partial, holeTip, mark });
  }
  const icons = /* @__PURE__ */ new Map();
  const iconHs = [];
  for (const c of cands) {
    const fullBox = !c.partial && !c.mark.cutLow && !c.mark.cutUp && !c.mark.other;
    if (!fullBox && !c.mark.cutLow && !c.mark.cutUp) continue;
    const yCap = c.mark.cutLow ? Math.min(ys[c.ra] + c.h * pitch * 2.5, ys[rows] + pitch * 0.12, H) : ys[c.ra] + c.h * pitch;
    const g = iconGeom(px, W, H, xs[c.qa], xs[c.qb + 1], ys[c.ra], yCap, c.ra === 0 ? 0 : 0.12);
    if (g) icons.set(`${c.qa},${c.ra}`, g);
    if (fullBox && g) {
      const hPix = g.bot - g.top + 1;
      const cell = Math.min(c.w, c.h) * pitch;
      const boxCy = ys[c.ra] + c.h * pitch / 2;
      if (Math.abs(g.cy - boxCy) <= c.h * pitch * 0.2 && hPix >= cell * 0.08 && hPix <= cell * 0.72) iconHs.push(hPix);
    }
  }
  const iconH = iconHs.length ? median2(iconHs) : 0;
  for (const c of cands) {
    const { list, qa, qb, ra, rb, w, h, holeTip } = c;
    let partial = c.partial;
    const mark = c.mark;
    let g = icons.get(`${qa},${ra}`);
    if (ra === 0 && g && !mark.other && list.length === w * h) {
      if (g.top <= ys[ra] + 3) {
        if (!mark.cutUp) {
          mark.cutUp = true;
          partial = true;
        }
      } else if (mark.cutUp) {
        mark.cutUp = false;
        partial = false;
      }
    }
    if (partial && list.length !== w * h && holeTip && !mark.other && !mark.cutLow && !mark.cutUp) partial = false;
    let hUse = h;
    if (!mark.other && list.length === w * h && mark.cutLow !== mark.cutUp && g) {
      let hEst = null;
      if (iconH) {
        const s = hFromIcon(g, h, ys[ra], mark.cutUp ? ys[ra] + h * pitch : null, pitch, iconH);
        if (s && s.h > h && s.err + 0.12 * pitch < s.errH) hEst = Math.max(1, Math.min(MAX_SIDE, s.h));
        else if (s && s.errH < 0.12 * pitch) partial = false;
      }
      if (hEst == null && mark.cutLow) {
        hEst = Math.round(2 * (g.cy - ys[ra]) / pitch);
        if (g.cy >= ys[ra] + (h - 0.5) * pitch) hEst = Math.round(2 * (g.top - ys[ra]) / pitch + 0.55);
        hEst = Math.max(1, Math.min(MAX_SIDE, hEst));
        if (hEst <= h) hEst = null;
      }
      if (hEst != null) {
        hUse = hEst;
        partial = false;
      }
    }
    const up = mark.cutUp ? Math.max(0, hUse - h) : 0;
    const at = (k) => median2(list.map(([q, r]) => fills[r][q][k]));
    const fill = at("fill"), tone = { rg: at("rg"), bg: at("bg"), lo: at("lo") };
    tone.tinted = tinted(tone);
    cargos.push({ q: qa, r: ra - up, w, h: hUse, x0: xs[qa], y0: ys[ra] - up * pitch, x1: xs[qb + 1], y1: ys[ra] - up * pitch + hUse * pitch, fill, tone, partial });
  }
  const grey = cargos.filter((c) => !c.tone.tinted);
  const usual = median2(grey.map((c) => c.fill)), usualLo = median2(grey.map((c) => c.tone.lo));
  let hov = null;
  for (const c of cargos) {
    let by = -Infinity;
    if (!c.tone.tinted) {
      if (usual != null && c.fill >= usual * 1.35) by = c.fill - usual - 5;
    } else {
      const peers = cargos.filter((d) => d !== c && d.tone.tinted && sameTint(d.tone, c.tone));
      const base = peers.length ? Math.min(...peers.map((d) => d.tone.lo)) : usualLo;
      if (base != null) by = c.tone.lo - base - (peers.length ? 5 : HOVER_LO);
    }
    if (by >= 0 && (!hov || by > hov.by)) hov = { c, by };
  }
  for (const c of cargos) {
    c.hover = c === hov?.c;
    delete c.tone;
  }
  return { pitch, xs, ys, rows, cells, cargos, red, fills, tips, vEdges, hEdges, dropped, comb: { off: gx.off, p: gx.p, v: gx.v } };
}
function cellStats(L2, px, W, x0, x1, y0, y1, pitch) {
  const m = Math.round(pitch * 0.12), v = [], rg = [], bg = [], lo = [];
  let all = 0, hi = 0;
  for (let y = Math.round(y0 + m); y < Math.round(y1 - m); y += 3) for (let x = Math.round(x0 + m); x < Math.round(x1 - m); x += 3) {
    all++;
    const l = L2[y * W + x];
    const i = (y * W + x) * 4;
    const mn = Math.min(px[i], px[i + 1], px[i + 2]);
    if (mn >= 145) hi++;
    if (l < BLACK) continue;
    v.push(l);
    rg.push(px[i] - px[i + 1]);
    bg.push(px[i + 2] - px[i + 1]);
    lo.push(mn);
  }
  if (!v.length) return { fill: 0, flat: 0, dark: 1, hi: 0, rg: 0, bg: 0, lo: 0 };
  v.sort((x, y) => x - y);
  const fill = v[v.length >> 1];
  return { fill, flat: v.filter((l) => Math.abs(l - fill) <= 4).length / v.length, dark: 1 - v.length / all, hi: hi / all, rg: median2(rg), bg: median2(bg), lo: median2(lo) };
}
function iconGeom(px, W, H, bx0, bx1, by0, by1, skipFrac = 0) {
  let rows = [], xs = [];
  const x0 = Math.max(0, Math.round(bx0)), x1 = Math.min(W, Math.round(bx1));
  const yTop = Math.max(0, Math.round(by0 + (by1 - by0) * skipFrac));
  const width = (x1 - x0) / 2;
  const marks = [];
  for (let y = yTop; y < Math.min(H, Math.round(by1)); y++) {
    let grey = 0, white = 0;
    for (let x = x0; x < x1; x += 2) {
      const i = (y * W + x) * 4;
      const mn = Math.min(px[i], px[i + 1], px[i + 2]);
      if (mn >= 145) white++;
      else if (mn >= 25 && mn <= 125) grey++;
    }
    if (grey >= width * 0.13 && white <= width * 0.06) marks.push(y);
  }
  let best = [], cur = [];
  for (const y of marks) {
    if (cur.length && y - cur[cur.length - 1] > 2) {
      if (cur.length > best.length) best = cur;
      cur = [];
    }
    cur.push(y);
  }
  if (cur.length > best.length) best = cur;
  rows = best;
  if (rows.length < 2) return null;
  for (let x = Math.max(0, Math.round(bx0)); x < Math.min(W, Math.round(bx1)); x++) {
    let grey = 0;
    for (let y = rows[0]; y <= rows[rows.length - 1]; y++) {
      const i = (y * W + x) * 4;
      const mn = Math.min(px[i], px[i + 1], px[i + 2]);
      if (mn >= 25 && mn <= 125) grey++;
    }
    if (grey >= (rows[rows.length - 1] - rows[0] + 1) * 0.5) xs.push(x);
  }
  const top = rows[0], bot = rows[rows.length - 1];
  const cx = xs.length ? (xs[0] + xs[xs.length - 1]) / 2 : (bx0 + bx1) / 2;
  if (Math.abs(cx - (bx0 + bx1) / 2) > (bx1 - bx0) * 0.3) return null;
  return {
    top,
    bot,
    cy: (top + bot) / 2,
    cx,
    w: xs.length ? xs[xs.length - 1] - xs[0] + 1 : bx1 - bx0
  };
}
function hFromIcon(g, hLat, y0, yBottom, pitch, iconH) {
  if (!g || !(iconH > 0)) return null;
  const fromBottom = yBottom != null;
  const observed = fromBottom ? g.bot : g.top;
  if (observed == null) return null;
  const errOf = (h) => {
    const cy = fromBottom ? yBottom - h * pitch / 2 : y0 + h * pitch / 2;
    return Math.abs((fromBottom ? cy + iconH / 2 : cy - iconH / 2) - observed);
  };
  let best = null;
  for (let h = Math.max(1, hLat); h <= MAX_SIDE; h++) {
    const err = errOf(h);
    if (!best || err < best.err) best = { h, err };
  }
  return best ? { ...best, errH: errOf(hLat) } : null;
}
function cellRed(px, W, x0, x1, y0, y1, pitch) {
  const m = Math.round(pitch * 0.15);
  let red = 0, all = 0;
  for (let y = y0 + m; y < y1 - m; y += 3) for (let x = x0 + m; x < x1 - m; x += 3) {
    const i = (y * W + x) * 4;
    all++;
    if (px[i] >= 45 && px[i] - Math.max(px[i + 1], px[i + 2]) >= 25) red++;
  }
  return red >= all * 0.4;
}
function lightArea(prev, W, H) {
  const p = prev.pitch;
  const x0 = Math.max(0, Math.floor(prev.xs[0] - 6 * p)), y0 = Math.max(0, Math.floor(prev.ys[0] - p));
  const x1 = Math.min(W, Math.ceil(prev.xs[GRID_COLS] + 6 * p)), y1 = Math.min(H, Math.ceil(prev.ys[prev.rows] + 4 * p));
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}
function detectLight(canvas, prev, ox, oy) {
  const { L: L2, W, H, px } = luminance2(canvas);
  const lum = (x, y) => L2[y * W + x];
  const pitch = prev.pitch, rows = prev.rows;
  const xs = prev.xs.map((x) => Math.round(x - ox)), ys = prev.ys.map((y) => Math.round(y - oy));
  if (ys[rows] > H - 1) ys[rows] = H - 1;
  if (xs[0] < 4 || xs[GRID_COLS] > W - 4 || ys[0] < 4 || ys[rows] > H - 1) return null;
  const at = (x, y) => lum(x, y < 0 ? 0 : y > H - 1 ? H - 1 : y);
  const hits = (y) => {
    let n = 0;
    for (let x = xs[0] + 2; x < xs[GRID_COLS] - 2; x += 2) {
      const v = Math.max(at(x, y - 1), lum(x, y), at(x, y + 1));
      if (v >= LINE_MIN && v - Math.max(at(x, y - 4), at(x, y + 4)) >= LINE_RISE) n++;
    }
    return n;
  };
  let onLines = 0, offLines = 0;
  for (let r = 0; r <= rows; r++) onLines += hits(ys[r]);
  for (let r = 0; r < rows; r++) offLines += hits(Math.round((ys[r] + ys[r + 1]) / 2));
  if (onLines < 2 * offLines + rows) return null;
  const fills = [], cells = [], red = [];
  const tips = findTips(lum, W, H, xs, ys, pitch);
  const inTip = (x, y) => tips.some((t) => tipHide(t, lum, W, pitch, xs) && x >= t.x0 && x <= t.x1 && y >= t.y0 && y <= t.y1);
  let same = 0, differ = 0;
  for (let r = 0; r < rows; r++) {
    const fr = [], cr = [];
    for (let q = 0; q < GRID_COLS; q++) {
      const f = cellStats(L2, px, W, xs[q], xs[q + 1], ys[r], ys[r + 1], pitch);
      const isRed = cellRed(px, W, xs[q], xs[q + 1], ys[r], ys[r + 1], pitch);
      const isTip = inTip((xs[q] + xs[q + 1]) / 2, (ys[r] + ys[r + 1]) / 2);
      if (isRed) red.push([q, r]);
      const cargo = !isRed && !isTip && f.dark < 0.6 && f.fill >= CARGO_FILL && f.fill <= 60 && (f.flat >= 0.4 || f.hi >= 0.02);
      const cell = isRed || isTip ? "hidden" : cargo ? "cargo" : f.dark >= 0.6 ? "hidden" : "empty";
      const was = prev.cells[r]?.[q];
      if (cell !== "hidden" && (was === "cargo" || was === "empty")) {
        if (cell === "cargo" === (was === "cargo")) same++;
        else differ++;
      }
      fr.push(f);
      cr.push(cell);
    }
    fills.push(fr);
    cells.push(cr);
  }
  if (differ > Math.max(2, (same + differ) * 0.1)) return null;
  const back = (t) => t && { x0: t.x0 + ox, y0: t.y0 + oy, x1: t.x1 + ox, y1: t.y1 + oy };
  return { light: true, pitch, xs: prev.xs, ys: prev.ys, rows, cells, cargos: [], red, fills, tips: tips.map(back) };
}
function tipHide(t, lum, W, pitch, xs) {
  const w = t.x1 - t.x0, h = t.y1 - t.y0;
  if (w > Math.min(6 * pitch, (xs[GRID_COLS] - xs[0]) * 0.75) || h > 2.6 * pitch || h < 0.35 * pitch) return false;
  let white = 0, all = 0;
  for (let y = Math.round(t.y0); y < t.y1; y += 2) for (let x = Math.round(t.x0); x < t.x1; x += 2) {
    all++;
    if (lum(x, y) >= 150) white++;
  }
  return all > 0 && white / all >= 0.012;
}
function findTips(lum, W, H, xs, ys, pitch) {
  const minRun = pitch * 0.6, from = Math.max(0, Math.round(xs[0] - 6 * pitch));
  const overLine = (x0, x1) => xs.some((x) => x0 + 3 < x && x < x1 - 3);
  const runs = [];
  for (let y = Math.max(0, Math.round(ys[0] - pitch)); y < Math.min(H, ys.at(-1) + 4 * pitch); y += 2) {
    let best = null;
    for (let x = from, start = -1; x <= W; x++) {
      if (x < W && lum(x, y) < BLACK) {
        if (start < 0) start = x;
        continue;
      }
      if (start >= 0 && x - start >= minRun && overLine(start, x) && (!best || x - start > best.x1 - best.x0)) best = { x0: start, x1: x };
      start = -1;
    }
    if (best) runs.push({ y, ...best });
  }
  const tips = [];
  for (let i = 0; i < runs.length; ) {
    let j = i + 1;
    while (j < runs.length && runs[j].y - runs[j - 1].y <= pitch * 0.5) j++;
    const part = runs.slice(i, j);
    const t = { x0: Math.min(...part.map((p) => p.x0)), x1: Math.max(...part.map((p) => p.x1)), y0: part[0].y, y1: part.at(-1).y };
    if (t.y1 - t.y0 >= pitch * 0.4) tips.push(t);
    i = j;
  }
  return tips;
}
function cargoAt(det, x, y) {
  return det.cargos.find((c) => x >= c.x0 && x < c.x1 && y >= c.y0 && y < c.y1) ?? null;
}
var TYPE_LABELS = {
  "Mystery Cargo": ["Загадочный груз", "Таинственный груз"],
  "Uncommon Mystery Cargo": ["Необычный таинственный груз", "Необычный загадочный груз"],
  "Rare Mystery Cargo": ["Редкий таинственный груз", "Редкий загадочный груз"],
  "Flammables": ["Горючие предметы", "Горючие материалы"],
  "Building Materials": ["Стройматериалы", "Строительные материалы"],
  "Computer Parts": ["Детали компьютеров", "Компьютерные детали", "Комплектующие"],
  "Energy Items": ["Энергопредметы", "Энергетические предметы", "Энергетические товары"],
  "Tools": ["Инструменты"],
  "Household Items": ["Домашняя утварь", "Бытовые товары", "Бытовые предметы"],
  "Medical Supplies": ["Лекарства", "Медикаменты", "Медицинские товары", "Медицинские предметы", "Медприпасы"],
  "Rare Medical Supplies": ["Редкие лекарства", "Редкие медикаменты", "Редкие медицинские товары", "Редкие медицинские предметы", "Редкие медприпасы"],
  "Collectibles": ["Коллекционные предметы"],
  "Uncommon Collectibles": ["Необычные коллекционные предметы"],
  "Rare Collectibles": ["Редкие коллекционные предметы"],
  "Paper": ["Бумага"],
  "Instruments": ["Приборы", "Музыкальные инструменты"],
  "Military Items": ["Военные предметы"],
  "Uncommon Military Items": ["Необычные военные предметы"],
  "Electronics": ["Электроника"]
};
var HOMOGLYPH = { а: "a", в: "b", е: "e", ё: "e", к: "k", м: "m", н: "h", о: "o", р: "p", с: "c", т: "t", у: "y", х: "x" };
var norm = (s) => s.toLowerCase().replace(/[а-яё]/g, (c) => HOMOGLYPH[c] ?? c).replace(/[^a-zа-я]/g, "");
function levenshtein(a, b) {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[b.length];
}
function matchLabel(text, types) {
  const hay = norm(text);
  if (hay.length < 4) return null;
  let best = null;
  const prefix = [];
  for (const t of types) {
    for (const name of [...TYPE_LABELS[t.en] ?? [], t.en]) {
      const needle = norm(name);
      const d = levenshtein(hay, needle);
      if (d <= Math.max(1, Math.floor(needle.length * 0.2)) && (!best || d / needle.length < best.r)) {
        best = { typeId: t.id, label: name, r: d / needle.length };
      }
      if (hay.length >= 8 && hay.length >= needle.length * 0.6 && hay.length < needle.length && levenshtein(hay, needle.slice(0, hay.length)) <= Math.max(1, Math.floor(hay.length * 0.15))) prefix.push({ typeId: t.id, label: name });
    }
  }
  if (best) return { typeId: best.typeId, label: best.label };
  return new Set(prefix.map((x) => x.typeId)).size === 1 ? prefix[0] : null;
}
var MAX_SHIFT = 40;
var CONFIRM = 3;
var EMPTY_DROP_MS = 8e3;
var RESET_MISSES = 8;
var RESET_MS = 3e3;
var LOST_KEEP_MS = 15e3;
var LOCK_STABLE_MS = 3e3;
var RELOCK_MISSES = 15;
var RELOCK_MS = 6e3;
var HOVER_RISE = 6;
var BASE_DOWN = 0.5;
var BASE_UP = 0.05;
var DARK_MAX = 0.6;
var cellsOf = (c, dr = 0) => {
  const out = [];
  for (let r = c.r + dr; r < c.r + dr + c.h; r++) for (let q = c.q; q < c.q + c.w; q++) out.push(`${q},${r}`);
  return out;
};
function tipCovers(det, q, fr, tips) {
  const x0 = det.xs?.[q], x1 = det.xs?.[q + 1], y0 = det.ys?.[fr], y1 = det.ys?.[fr + 1];
  if (x0 == null || x1 == null || y0 == null || y1 == null) return 0;
  let worst = 0;
  for (const t of tips) {
    const w = Math.max(0, Math.min(t.x1, x1) - Math.max(t.x0, x0));
    const h = Math.max(0, Math.min(t.y1, y1) - Math.max(t.y0, y0));
    const share = w * h / Math.max(1, (x1 - x0) * (y1 - y0));
    if (share > worst) worst = share;
  }
  return worst;
}
var GridTracker = class {
  constructor() {
    this.version = 0;
    this.reset();
  }
  reset() {
    this.cargos = /* @__PURE__ */ new Map();
    this.baseline = /* @__PURE__ */ new Map();
    this.pending = /* @__PURE__ */ new Map();
    this.lost = [];
    this.shift = null;
    this.misses = 0;
    this.missSince = 0;
    this.locked = false;
    this.changedAt = 0;
    this.version++;
  }
  // Какая клетка чем занята: "q,r" → груз.
  occupancy() {
    const occ = /* @__PURE__ */ new Map();
    for (const c of this.cargos.values()) for (const k of cellsOf(c)) occ.set(k, c);
    return occ;
  }
  // Сдвиг рядов кадра относительно собранной сетки или null, если кадр к ней не подходит.
  matchShift(det) {
    const full = det.cargos.filter((c) => !c.partial);
    if (!this.cargos.size || !full.length) return null;
    const occ = this.occupancy();
    let best = null;
    for (let s = -MAX_SHIFT; s <= MAX_SHIFT; s++) {
      let score = 0;
      for (const c of full) {
        const g = this.cargos.get(`${c.q},${c.r + s}`);
        if (g && g.w === c.w && g.h === c.h) score++;
        else if (cellsOf(c, s).some((k) => occ.has(k))) score--;
      }
      for (let r = 0; r < det.rows; r++) for (let q = 0; q < GRID_COLS; q++) {
        if (det.cells[r][q] === "empty" && occ.has(`${q},${r + s}`)) score -= 0.5;
      }
      const v = score - (this.shift == null ? 0 : Math.abs(s - this.shift) * 0.01);
      if (!best || v > best.v) best = { s, score, v };
    }
    return best.score >= Math.max(2, full.length * 0.4) ? best.s : null;
  }
  /** Добавляет кадр. Вернёт true, если сетка изменилась. */
  update(det, now = Date.now()) {
    const full = det.cargos.filter((c) => !c.partial);
    if (this.locked) return this.updateLocked(det, full, now);
    let s;
    if (!this.cargos.size) {
      if (full.length < 3) return false;
      s = 0;
    } else {
      s = this.matchShift(det);
      if (s == null) {
        if (!this.misses++) this.missSince = now;
        if (full.length >= 4 && this.misses >= RESET_MISSES && now - this.missSince >= RESET_MS) {
          this.log("кадры не ложатся на сетку, собираю заново");
          this.reset();
          return this.update(det, now);
        }
        return false;
      }
    }
    this.misses = 0;
    this.shift = s;
    let changed = false;
    const seen = /* @__PURE__ */ new Set();
    const confirmed = (pk) => {
      seen.add(pk);
      const n = (this.pending.get(pk) ?? 0) + 1;
      this.pending.set(pk, n);
      return n >= CONFIRM;
    };
    for (const c of full) {
      const key = `${c.q},${c.r + s}`;
      const g = this.cargos.get(key);
      if (g && g.w === c.w && g.h === c.h) {
        g.seenAt = now;
        g.fullSeen = true;
        continue;
      }
      if (g && (g.fullSeen || g.sizeFixed) && c.w * c.h < g.w * g.h) {
        g.seenAt = now;
        continue;
      }
      const occ2 = this.occupancy();
      const conflicts = new Set(cellsOf(c, s).map((k) => occ2.get(k)).filter(Boolean));
      if (conflicts.size) {
        if ([...conflicts].some((old) => (old.fullSeen || old.sizeFixed) && c.w * c.h < old.w * old.h)) continue;
        if (!confirmed(`${key}|${c.w}x${c.h}`)) continue;
        for (const old of conflicts) {
          this.log(`груз ${old.key} ${old.w}×${old.h} заменён на ${key} ${c.w}×${c.h}`);
          this.drop(old, now);
        }
      }
      this.add({ q: c.q, r: c.r + s, w: c.w, h: c.h, full: true }, now);
      changed = true;
    }
    const occ = this.occupancy(), empty = /* @__PURE__ */ new Set();
    for (let r = 0; r < det.rows; r++) for (let q = 0; q < GRID_COLS; q++) {
      if (det.cells[r][q] === "empty" && occ.has(`${q},${r + s}`)) empty.add(occ.get(`${q},${r + s}`));
    }
    for (const g of this.cargos.values()) if (!empty.has(g)) delete g.emptySince;
    for (const g of empty) {
      g.emptySince ??= now;
      if (now - g.emptySince >= EMPTY_DROP_MS) {
        this.log(`груз ${g.key} пуст ${EMPTY_DROP_MS / 1e3} с, убран`);
        this.drop(g, now);
        changed = true;
      }
    }
    for (const k of this.pending.keys()) if (!seen.has(k)) this.pending.delete(k);
    if (changed) {
      this.version++;
      this.changedAt = now;
    }
    return changed;
  }
  // Сохранённая сетка: грузы не убираем и не меняем (взятый в руку груз на время пропадает из игры).
  // Только достраиваем ряды, которых ещё не видели (сетку докрутили ниже или выше).
  updateLocked(det, full, now) {
    const s = this.matchShift(det);
    if (s == null) {
      if (!this.misses++) this.missSince = now;
      if (full.length >= 6 && this.misses >= RELOCK_MISSES && now - this.missSince >= RELOCK_MS) {
        this.reset();
        return this.update(det, now);
      }
      return false;
    }
    this.misses = 0;
    this.shift = s;
    const { r0, r1 } = this.bounds();
    let changed = false;
    for (const c of full) {
      const cells = cellsOf(c, s);
      const occ = this.occupancy();
      if (cells.some((k) => occ.has(k))) continue;
      this.add({ q: c.q, r: c.r + s, w: c.w, h: c.h, full: true }, now);
      changed = true;
    }
    if (changed) this.version++;
    return changed;
  }
  /** ready — подписи всех грузов прочитаны (или попытки кончились). Вернёт true, если сетку только что сохранили. */
  tryLock(now, ready) {
    if (this.locked || !ready || this.cargos.size < 4 || now - this.changedAt < LOCK_STABLE_MS) return false;
    this.locked = true;
    this.version++;
    return true;
  }
  add({ q, r, w, h, full = false }, now) {
    for (const k of cellsOf({ q, r, w, h })) this.baseline.delete(k);
    this.lost = this.lost.filter((l) => now - l.at < LOST_KEEP_MS);
    const same = (l) => l.w === w && l.h === h || l.w === h && l.h === w;
    const back = this.lost.find((l) => l.q === q && l.r === r && same(l)) ?? this.lost.find((l) => l.q === q && l.r === r) ?? this.lost.filter(same).sort((a, b) => b.at - a.at)[0];
    if (back) this.lost.splice(this.lost.indexOf(back), 1);
    const key = `${q},${r}`;
    if (back) {
      const g = back.g;
      const keep = (g.fullSeen || g.sizeFixed) && w * h < g.w * g.h ? { w: g.w, h: g.h } : { w, h };
      Object.assign(g, { key, q, r, ...keep, seenAt: now });
      if (full) g.fullSeen = true;
      delete g.emptySince;
      this.cargos.set(key, g);
      this.log(`груз ${key} вернулся`);
      return;
    }
    this.cargos.set(key, { key, q, r, w, h, seenAt: now, typeId: null, label: null, price: null, events: [], labelTries: 0, fullSeen: full, sizeFixed: false });
  }
  drop(g, now) {
    if (this.cargos.get(g.key) !== g) return;
    this.cargos.delete(g.key);
    this.lost.push({ g, q: g.q, r: g.r, w: g.w, h: g.h, at: now });
  }
  log(text) {
    this.onLog?.(text);
  }
  // Груз сетки под грузом кадра (c — из det.cargos). Неполный груз (под подсказкой) ищем по любой его клетке.
  locate(det, c, shift = this.matchShift(det) ?? this.shift) {
    if (shift == null || !c) return null;
    const occ = this.occupancy();
    for (const k of cellsOf(c, shift)) if (occ.has(k)) return occ.get(k);
    return null;
  }
  // Видимые клетки груза g на кадре: [q, r кадра, fills] (не под подсказкой).
  // Чужая плашка подсказки не считается: её светлые края и белый текст поднимают яркость клетки,
  // и соседний груз принимался за наведённый — из-за этого звук цеплялся к соседу, а сам груз
  // оставался пустым. Своя плашка (угол в клетках груза) считается, иначе наведение пропадёт.
  *visibleCells(det, g, shift) {
    const owner = this.tipOwners(det, shift);
    const foreign = (det.tips ?? []).filter((t) => t && owner.get(t) !== g);
    const all = [];
    for (let r = g.r; r < g.r + g.h; r++) for (let q = g.q; q < g.q + g.w; q++) {
      const fr = r - shift, f = det.fills?.[fr]?.[q];
      if (f && det.cells[fr][q] === "cargo" && f[2] < DARK_MAX) all.push([`${q},${r}`, f, q, fr]);
    }
    const clean = foreign.length ? all.filter(([, , q, fr]) => tipCovers(det, q, fr, foreign) <= 0.15) : all;
    for (const [k, f] of clean) yield [k, f];
  }
  // Запоминает обычную яркость клеток грузов. skip — грузы, которые сейчас могут быть наведены.
  learn(det, skip = [], shift = this.matchShift(det) ?? this.shift) {
    if (shift == null) return;
    const mix = (old, v) => old + (v - old) * (v < old ? BASE_DOWN : BASE_UP);
    for (const g of this.cargos.values()) {
      if (skip.includes(g)) continue;
      for (const [k, [fill, lo]] of this.visibleCells(det, g, shift)) {
        const b = this.baseline.get(k);
        if (!b) {
          this.baseline.set(k, { fill, lo, n: 1 });
          continue;
        }
        b.fill = mix(b.fill, fill);
        b.lo = mix(b.lo, lo);
        b.n++;
      }
    }
  }
  // Наведённый груз: его клетки ярче своей обычной яркости (у цветного растёт самый тёмный канал, поэтому берём
  // больший прирост из яркости и lo). Обычный прирост по кадру (свет сцены) вычитаем.
  // { g, by } (g — null, если не наведён ни один) или null, если сравнивать пока не с чем.
  hoverOf(det, shift = this.matchShift(det) ?? this.shift) {
    if (shift == null || !det.fills) return null;
    const rises = /* @__PURE__ */ new Map();
    for (const g of this.cargos.values()) {
      const list = [];
      for (const [k, [fill, lo]] of this.visibleCells(det, g, shift)) {
        const b = this.baseline.get(k);
        if (b && b.n >= 2) list.push(Math.max(fill - b.fill, lo - b.lo));
      }
      if (list.length) rises.set(g, median2(list));
    }
    if (!rises.size) return null;
    const usual = rises.size >= 3 ? median2([...rises.values()]) : 0;
    let best = null;
    for (const [g, v] of rises) if (!best || v - usual > best.by) best = { g, by: v - usual };
    return best.by >= HOVER_RISE ? best : { g: null, by: best.by };
  }
  // Клетка сетки [q, r] под точкой кадра или null.
  cellAt(det, x, y, shift = this.shift) {
    const q = det.xs.findIndex((v, i) => i < GRID_COLS && x >= v && x < det.xs[i + 1]);
    const r = det.ys.findIndex((v, i) => i < det.rows && y >= v && y < det.ys[i + 1]);
    return shift == null || q < 0 || r < 0 ? null : [q, r + shift];
  }
  // Какая плашка подсказки от какого груза. Плашка открывается у курсора, поэтому принадлежит грузу,
  // к которому ближе её угол (обычно левый верхний; у края экрана она раскрывается в другую сторону —
  // тогда смотрим все четыре). Хвост плашки лежит на соседях: их клетки наведение не считает.
  tipOwners(det, shift = this.shift) {
    this._tipOwn ??= /* @__PURE__ */ new WeakMap();
    const hit = this._tipOwn.get(det);
    if (hit && hit.shift === shift) return hit.map;
    const map = /* @__PURE__ */ new Map();
    for (const t of det.tips ?? []) {
      if (!t) continue;
      let best = null;
      for (const g of this.cargos.values()) {
        const r = this.rectOf(det, g, shift);
        if (!r) continue;
        for (const [x, y] of [[t.x0, t.y0], [t.x1, t.y0], [t.x0, t.y1], [t.x1, t.y1]]) {
          const d = Math.hypot(Math.max(r.x0 - x, x - r.x1, 0), Math.max(r.y0 - y, y - r.y1, 0));
          if (!best || d < best.d) best = { g, d };
        }
      }
      if (best) map.set(t, best.g);
    }
    this._tipOwn.set(det, { shift, map });
    return map;
  }
  // Клетка груза g под курсором: угол подсказки. Обычно курсор у левого верхнего угла, у края экрана
  // подсказка открывается в другую сторону — тогда берём тот угол, что лежит на грузе.
  // Чёрных плашек на кадре может быть несколько: подсказка — та, у которой угол на грузе.
  // { cell, tip } или null.
  tipCell(det, g, shift = this.shift) {
    if (!det.tips?.length || !g) return null;
    const own = new Set(cellsOf(g));
    for (const t of det.tips) {
      for (const [x, y] of [[t.x0 + 2, t.y0 + 2], [t.x1 - 2, t.y0 + 2], [t.x0 + 2, t.y1 - 2], [t.x1 - 2, t.y1 - 2]]) {
        const c = this.cellAt(det, x, y, shift);
        if (c && own.has(`${c[0]},${c[1]}`)) return { cell: c, tip: t };
      }
    }
    const r = this.rectOf(det, g, shift);
    if (r) {
      let best = null;
      for (const t of det.tips) {
        const dx = Math.max(t.x0 - r.x1, r.x0 - t.x1, 0), dy = Math.max(t.y0 - r.y1, r.y0 - t.y1, 0);
        const gap = Math.hypot(dx, dy);
        if (gap <= 0.8 * det.pitch && (!best || gap < best.gap)) best = { t, gap };
      }
      if (best) {
        const t = best.t;
        const x = Math.min(Math.max(t.x0 + 2, r.x0 + 1), r.x1 - 1);
        const y = Math.min(Math.max(t.y0 + 2, r.y0 + 1), r.y1 - 1);
        return { cell: this.cellAt(det, x, y, shift), tip: t };
      }
    }
    return null;
  }
  // Рамка груза g на кадре (только видимые ряды) или null, если он за краем.
  rectOf(det, g, shift = this.shift) {
    const r0 = Math.max(0, g.r - shift), r1 = Math.min(det.rows, g.r - shift + g.h);
    if (shift == null || r1 <= r0) return null;
    return { x0: det.xs[g.q], x1: det.xs[g.q + g.w], y0: det.ys[r0], y1: det.ys[r1] };
  }
  // Груз под красными клетками кадра (его держат в руке): больше всего общих клеток.
  locateRed(det, shift = this.matchShift(det) ?? this.shift) {
    if (shift == null || !det.red?.length) return null;
    const occ = this.occupancy();
    const votes = /* @__PURE__ */ new Map();
    for (const [q, r] of det.red) {
      const g = occ.get(`${q},${r + shift}`);
      if (g) votes.set(g, (votes.get(g) ?? 0) + 1);
    }
    return [...votes].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  }
  // Ряды, где есть грузы: [r0, r1).
  bounds() {
    const list = [...this.cargos.values()];
    if (!list.length) return null;
    return { r0: Math.min(...list.map((c) => c.r)), r1: Math.max(...list.map((c) => c.r + c.h)) };
  }
};

// js/ocr.js
var BASE = new URL("../vendor/tesseract/", new URL("js/", document.baseURI)).href;
var MAX_WIDTH = 2560;
var BRIGHT_MIN = 170;
var GRAB_TIMEOUT_MS = 4e3;
var MIN_GRAB_GAP_MS = 60;
var FRAME_WAIT_MS = 6e3;
var FRAMES_KEEP = 14;
var FRAME_GAP_MS = 300;
var BEFORE_MS = 2800;
var CLICK_GUARD_MS = 50;
var EARLIER_FRAMES = 3;
var HOMOGLYPH2 = { а: "a", в: "b", е: "e", ё: "e", к: "k", м: "m", н: "h", о: "o", р: "p", с: "c", т: "t", у: "y", х: "x" };
var norm2 = (s) => s.toLowerCase().replace(/[а-яё]/g, (c) => HOMOGLYPH2[c] ?? c).replace(/[^a-zа-я]/g, "");
function fuzzyFind(hay, needle) {
  const m = needle.length;
  let prev = Array.from({ length: m + 1 }, (_, j) => j);
  let best = prev[m];
  for (const ch of hay) {
    const cur = [0];
    for (let j = 1; j <= m; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (needle[j - 1] === ch ? 0 : 1));
    best = Math.min(best, cur[m]);
    prev = cur;
  }
  return best;
}
var DIGITISH = { o: "0", O: "0", "о": "0", "О": "0", l: "1", I: "1", "|": "1", S: "5", B: "8" };
var PRICE_SEP = " ,.  ";
var DASH = "–—−-";
function numbersIn(text) {
  const fixed = text.replace(
    new RegExp(`[\\dOoОоlI|SB][\\dOoОоlI|SB${PRICE_SEP}${DASH}]*[\\dOoОоlI|SB]`, "g"),
    (m) => /\d/.test(m) ? m.replace(/[OoОоlI|SB]/g, (c) => DIGITISH[c]) : m
  );
  const out = [];
  const rest = fixed.replace(new RegExp(`\\d{1,3}(?:[${DASH}]\\d{3})+`, "g"), (m) => {
    out.push({ v: +m.replace(/\D/g, ""), struck: true });
    return " ".repeat(m.length);
  });
  for (const m of rest.matchAll(new RegExp(`\\d{1,3}(?:[${PRICE_SEP}]\\d{3})+|\\d{4,7}`, "g"))) {
    let acc = "";
    for (const g of m[0].split(new RegExp(`[${PRICE_SEP}]`))) {
      if (acc && (acc + g).replace(/\D/g, "").length > 7) break;
      acc += (acc ? " " : "") + g;
    }
    out.push({ v: +acc.replace(/\D/g, ""), struck: false });
  }
  return out;
}
function numbersFromWords(words) {
  const out = [];
  let acc = null;
  const flush = () => {
    if (!acc) return;
    const v = +acc.parts.join("");
    if ((v > 999 || acc.struck && v >= 100) && v <= 9999999) out.push({ v, struck: acc.struck });
    acc = null;
  };
  for (const w of words) {
    const t = w.text ?? "";
    const fixed = t.replace(/[OoОоlI|SB]/g, (c) => DIGITISH[c]);
    const numish = /\d/.test(fixed) && new RegExp(`^[\\d${PRICE_SEP}${DASH}]+$`).test(fixed.trim());
    if (!numish) {
      flush();
      continue;
    }
    const digits = fixed.replace(/\D/g, "");
    if (!digits) {
      flush();
      continue;
    }
    const dashStruck = new RegExp(`\\d[${DASH}]\\d`).test(fixed);
    const mergeable = acc && acc.groups === 1 && acc.parts[0].length <= 3 && digits.length === 3;
    if (mergeable) {
      acc.parts.push(digits);
      acc.groups += 1;
      acc.struck ||= w.struck === true || dashStruck;
    } else {
      flush();
      acc = { parts: [digits], groups: 1, struck: w.struck === true || dashStruck };
    }
  }
  flush();
  return out;
}
function brightLevels(gray) {
  const n = gray.length;
  const hist = new Array(256).fill(0);
  for (let i = 0; i < n; i++) hist[gray[i]]++;
  const pct2 = (q) => {
    let acc = 0;
    for (let v = 0; v < 256; v++) {
      acc += hist[v];
      if (acc >= q * n) return v;
    }
    return 255;
  };
  const bg = pct2(0.4), fg = pct2(0.95);
  return { bg, fg, thresh: fg - bg < 20 ? Infinity : bg + Math.round(0.45 * (fg - bg)) };
}
function grayOf(img, iw, ih) {
  const gray = new Uint8ClampedArray(iw * ih);
  for (let i = 0; i < iw * ih; i++) {
    gray[i] = Math.max(img.data[i * 4], img.data[i * 4 + 1], img.data[i * 4 + 2]);
  }
  return gray;
}
function strikeRows(image, bbox) {
  try {
    const w = Math.round(bbox.x1) - Math.round(bbox.x0), h = Math.round(bbox.y1) - Math.round(bbox.y0);
    if (w < 8 || h < 6) return { struck: false, rows: [] };
    const grow = Math.round(h * 0.55);
    const x0 = Math.max(0, Math.round(bbox.x0)), y0 = Math.max(0, Math.round(bbox.y0) - grow);
    const iw = Math.min(image.width, Math.round(bbox.x1)) - x0;
    const ih = Math.min(image.height, Math.round(bbox.y1) + grow) - y0;
    if (iw < 4 || ih < 4) return { struck: false, rows: [] };
    const img = image.getContext("2d", { willReadFrequently: true }).getImageData(x0, y0, iw, ih);
    const gray = grayOf(img, iw, ih);
    const { thresh } = brightLevels(gray);
    if (!isFinite(thresh)) return { struck: false, rows: [] };
    const need = Math.max(6, Math.round(w * 0.45));
    const rows = [];
    for (let y = Math.round(ih * 0.15); y <= Math.round(ih * 0.9); y++) {
      let run = 0, best = 0;
      for (let x = 0; x < iw; x++) {
        const bright = gray[y * iw + x] >= thresh;
        run = bright ? run + 1 : 0;
        if (run > best) best = run;
      }
      if (best >= need) rows.push(y0 + y);
    }
    return { struck: rows.length > 0, rows };
  } catch {
    return { struck: false, rows: [] };
  }
}
async function unstrikeText(worker, image, bbox, rows) {
  try {
    const pad = 3;
    const x0 = Math.max(0, Math.round(bbox.x0) - pad), y0 = Math.max(0, Math.round(bbox.y0) - pad);
    const x1 = Math.min(image.width, Math.round(bbox.x1) + pad), y1 = Math.min(image.height, Math.round(bbox.y1) + pad);
    const iw = x1 - x0, ih = y1 - y0;
    if (iw < 4 || ih < 4) return "";
    const img = image.getContext("2d", { willReadFrequently: true }).getImageData(x0, y0, iw, ih);
    const gray = grayOf(img, iw, ih);
    const local = rows.map((ry) => ry - y0).filter((y) => y >= 0 && y < ih);
    const band = /* @__PURE__ */ new Set();
    for (const y of local) for (const dy of [-1, 0, 1]) band.add(y + dy);
    if (band.size) {
      const top = Math.max(0, Math.min(...band) - 2), bot = Math.min(ih - 1, Math.max(...band) + 2);
      for (const y of band) {
        if (y < 0 || y >= ih) continue;
        for (let x = 0; x < iw; x++) {
          gray[y * iw + x] = Math.min(gray[top * iw + x], gray[bot * iw + x]);
        }
      }
    }
    const { thresh } = brightLevels(gray);
    for (let i = 0; i < iw * ih; i++) {
      const v = gray[i] >= thresh ? 0 : 255;
      img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
    }
    const up = 2;
    const tmp = document.createElement("canvas");
    tmp.width = iw;
    tmp.height = ih;
    tmp.getContext("2d").putImageData(img, 0, 0);
    const c = document.createElement("canvas");
    c.width = iw * up;
    c.height = ih * up;
    const cx = c.getContext("2d", { willReadFrequently: true });
    cx.imageSmoothingEnabled = true;
    cx.drawImage(tmp, 0, 0, c.width, c.height);
    const prevPsm = worker.setParameters ? await worker.setParameters({ tessedit_pageseg_mode: "7" }).then(() => "7") : null;
    const { data: data2 } = await worker.recognize(c);
    if (prevPsm) await worker.setParameters({ tessedit_pageseg_mode: "3" });
    return (data2.text ?? "").replace(/\s+/g, " ").trim();
  } catch {
    return "";
  }
}
function repairPrice(v, legal) {
  const s = String(v);
  let best = null, second = null;
  for (const p of legal) {
    const t = String(p);
    if (t.length !== s.length) continue;
    let d = 0;
    for (let i = 0; i < t.length; i++) if (t[i] !== s[i]) d++;
    if (d <= Math.max(2, t.length - 3)) {
      if (!best || d < best.d) {
        second = best;
        best = { p, d };
      } else if (!second || d < second.d) second = { p, d };
    }
  }
  if (best && (!second || best.d < second.d)) return best.p;
  const pref = [...legal].filter((p) => {
    const t = String(p);
    return t.length >= 5 && t.length - s.length <= 3 && t.startsWith(s);
  });
  return pref.length === 1 ? pref[0] : null;
}
function tipRect(title, price) {
  const t = title ?? { x0: price.x0, x1: price.x1, y0: price.y0 - 1.4 * (price.y1 - price.y0), y1: price.y0 };
  const lh = Math.max(8, t.y1 - t.y0);
  return { x0: Math.min(t.x0, price.x0) - 0.8 * lh, y0: t.y0 - 0.5 * lh, x1: Math.max(t.x1, price.x1) + lh, y1: price.y1 + 2.2 * lh };
}
function toCanvas(bitmap) {
  const k = Math.min(1, MAX_WIDTH / bitmap.width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * k);
  canvas.height = Math.round(bitmap.height * k);
  canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas;
}
var center = (b) => [(b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2];
var dist = (a, b) => {
  const [ax, ay] = center(a), [bx, by] = center(b);
  return Math.hypot(ax - bx, ay - by);
};
var TooltipReader = class _TooltipReader {
  constructor(model2) {
    this.model = model2;
    this.worker = null;
    this.loading = null;
    this.capture = null;
    this.frames = [];
    this.earlier = /* @__PURE__ */ new WeakMap();
    this.lastFrame = null;
    this.lastText = "";
  }
  // Язык игры запоминаем по первому найденному названию типа: один язык распознаётся почти вдвое быстрее.
  async load(lang = "eng+rus") {
    if (this.loading) return this.loading;
    this.loading = (async () => {
      if (!window.Tesseract) {
        await new Promise((resolve, reject) => {
          const s = document.createElement("script");
          s.src = `${BASE}tesseract.min.js`;
          s.onload = resolve;
          s.onerror = () => reject(new Error("Не удалось загрузить OCR"));
          document.head.append(s);
        });
      }
      await (window.tessReady?.() ?? Promise.resolve());
      const tessOpts = window.TESS_STATIC ?? {
        workerPath: `${BASE}worker.min.js`,
        corePath: BASE,
        langPath: `${BASE}lang`,
        workerBlobURL: false,
        gzip: true
      };
      const worker = await window.Tesseract.createWorker(lang.split("+"), 1, tessOpts);
      await worker.setParameters({ tessedit_pageseg_mode: "11" });
      this.worker = worker;
      this.lang = lang;
      return worker;
    })();
    this.loading.catch(() => {
      this.loading = null;
    });
    return this.loading;
  }
  attach(track) {
    this.detach();
    if (track && "ImageCapture" in window) {
      this.capture = new ImageCapture(track);
      this.pump(this.capture);
    }
  }
  // Частота кадров захвата: пока сетка на экране, чаще (наведение замечаем быстрее).
  setRate(fps) {
    if (!this.capture || this.rate === fps) return;
    this.rate = fps;
    this.capture.track.applyConstraints({ frameRate: { ideal: fps } }).catch(() => {
    });
  }
  detach() {
    this.rate = null;
    this.capture = null;
    for (const f of this.frames ?? []) f.bitmap.close();
    this.frames = [];
  }
  get canRead() {
    return !!this.capture && this.capture.track.readyState === "live";
  }
  // Держим последние несколько кадров: подсказка видна, пока мышь стоит на грузе, то есть до щелчка.
  // К моменту звука её уже нет (груз в руке), поэтому читать надо кадр, снятый перед звуком.
  // grabFrame ждёт следующий кадр захвата и сам задаёт темп, без таймеров (их Chrome замедляет в фоне).
  async pump(capture) {
    while (this.capture === capture && capture.track.readyState === "live") {
      const t0 = Date.now();
      let timer;
      try {
        const bitmap = await Promise.race([
          capture.grabFrame(),
          new Promise((_, reject) => {
            timer = setTimeout(() => reject(new Error("нет кадров")), GRAB_TIMEOUT_MS);
          })
        ]);
        if (this.capture !== capture) {
          bitmap.close();
          break;
        }
        const frame = { at: Date.now(), bitmap };
        const keep = !this.frames.length || frame.at - this.frames.at(-1).at >= FRAME_GAP_MS;
        if (keep) {
          this.frames.push(frame);
          while (this.frames.length > FRAMES_KEEP) this.frames.shift().bitmap.close();
          this.onFrame?.();
        }
        if (this.onCapture) this.onCapture(frame, !keep);
        else if (!keep) bitmap.close();
      } catch {
        await new Promise((r) => setTimeout(r, 1e3));
      } finally {
        clearTimeout(timer);
        const spent = Date.now() - t0;
        if (spent < MIN_GRAB_GAP_MS) await new Promise((r) => setTimeout(r, MIN_GRAB_GAP_MS - spent));
      }
    }
  }
  /**
   * Следующий кадр для чтения подсказки к щелчку по грузу в момент `click`: сначала снятые перед щелчком
   * (от ближнего), потом новые. `tried` — уже прочитанные кадры. Вернёт canvas или null, если кадров больше не будет.
   */
  async frameFor(click, tried) {
    const pick = () => {
      const fresh = this.frames.filter((f) => !tried.has(f));
      const before = fresh.filter((f) => f.at >= click - BEFORE_MS && f.at <= click - CLICK_GUARD_MS).sort((a, b) => b.at - a.at)[0];
      return before ?? fresh.filter((f) => f.at > click - CLICK_GUARD_MS).at(-1);
    };
    let frame = pick();
    const t0 = Date.now();
    while (!frame && this.canRead && Date.now() - t0 < FRAME_WAIT_MS) {
      await new Promise((resolve) => {
        const timer = setTimeout(resolve, Math.min(GRAB_TIMEOUT_MS, FRAME_WAIT_MS - (Date.now() - t0)));
        this.onFrame = () => {
          clearTimeout(timer);
          resolve();
        };
      });
      this.onFrame = null;
      frame = pick();
    }
    if (!frame) return null;
    tried.add(frame);
    const canvas = toCanvas(frame.bitmap);
    this.earlier.set(canvas, this.frames.filter((f) => f.at < frame.at).slice(-EARLIER_FRAMES).map((f) => toCanvas(f.bitmap)));
    return canvas;
  }
  // Размер груза под мышью в клетках или null. canvas — кадр из frameFor, tip — из parse.
  measureSize(canvas, tip) {
    try {
      return measureAcross(canvas, this.earlier.get(canvas) ?? [], tip)?.size ?? null;
    } catch (err) {
      console.warn("Размер груза:", err);
      return null;
    }
  }
  // Оставляет только светлый текст (подсказка в игре светлая на тёмном) чёрным по белому:
  // пёстрый фон игры пропадает, и OCR не тонет в мусоре.
  static bright(canvas, min = BRIGHT_MIN) {
    const out = document.createElement("canvas");
    out.width = canvas.width;
    out.height = canvas.height;
    const img = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height);
    const px = img.data;
    for (let i = 0; i < px.length; i += 4) {
      const v = Math.max(px[i], px[i + 1], px[i + 2]) >= min ? 0 : 255;
      px[i] = px[i + 1] = px[i + 2] = v;
    }
    out.getContext("2d").putImageData(img, 0, 0);
    return out;
  }
  // mode: "bright" — только светлый текст, "raw" — кадр как есть. В цикле их чередуем.
  async recognize(image, mode = "raw") {
    const worker = await this.load();
    const { data: data2 } = await worker.recognize(mode === "bright" ? _TooltipReader.bright(image) : image);
    this.lastFrame = image;
    this.lastText = data2.text;
    const lines = (data2.lines ?? []).map((l) => ({
      text: l.text,
      bbox: l.bbox,
      words: (l.words ?? data2.words?.filter((w) => w.bbox.y0 >= l.bbox.y0 - 2 && w.bbox.y1 <= l.bbox.y1 + 2) ?? []).map((w) => {
        const sr = strikeRows(image, w.bbox);
        return { text: w.text, bbox: w.bbox, struck: sr.struck, rows: sr.rows };
      }).sort((a, b) => a.bbox.x0 - b.bbox.x0 || a.bbox.y0 - b.bbox.y0)
    }));
    const flat = lines.flatMap((l) => l.words.map((w) => ({ w, l })));
    const struck = flat.filter((x) => x.w.struck);
    const near = (aw, bw) => {
      const xo = Math.min(aw.x1, bw.x1) - Math.max(aw.x0, bw.x0);
      const xgap = Math.max(0, Math.max(aw.x0, bw.x0) - Math.min(aw.x1, bw.x1));
      const yg = Math.max(0, Math.max(aw.y0, bw.y0) - Math.min(aw.y1, bw.y1));
      const minW = Math.min(aw.x1 - aw.x0, bw.x1 - bw.x0);
      const minH = Math.min(aw.y1 - aw.y0, bw.y1 - bw.y0);
      return (xo > 0.4 * minW || xgap <= 0.25 * minW) && yg <= 0.6 * minH;
    };
    const used = /* @__PURE__ */ new Set();
    for (const a of struck) {
      if (used.has(a)) continue;
      const group = [a];
      used.add(a);
      for (let i = 0; i < group.length; i++) {
        for (const b of struck) {
          if (used.has(b)) continue;
          if (near(group[i].w.bbox, b.w.bbox)) {
            group.push(b);
            used.add(b);
          }
        }
      }
      const bbox = {
        x0: Math.min(...group.map((g) => g.w.bbox.x0)),
        y0: Math.min(...group.map((g) => g.w.bbox.y0)),
        x1: Math.max(...group.map((g) => g.w.bbox.x1)),
        y1: Math.max(...group.map((g) => g.w.bbox.y1))
      };
      const rows = [...new Set(group.flatMap((g) => g.w.rows ?? []))];
      const orig = group.map((g) => g.w.text).join(" ");
      const text = await unstrikeText(worker, image, bbox, rows);
      const digits = (t) => (t.match(/\d/g) ?? []).length;
      a.w.text = text && digits(text) >= 3 && digits(text) + 2 >= digits(orig) ? text : orig;
      a.w.bbox = bbox;
      a.w.rows = rows;
      for (const b of group.slice(1)) {
        const idx = b.l.words.indexOf(b.w);
        if (idx >= 0) b.l.words.splice(idx, 1);
      }
    }
    return lines;
  }
  /**
   * Быстрое чтение куска кадра (rect в координатах кадра): подсказка рядом с грузом, весь кадр
   * читать секундами. Вернёт строки с bbox уже в координатах КАДРА (дальше parse/measureSize).
   */
  async recognizeIn(image, rect, mode = "raw") {
    const x0 = Math.max(0, Math.round(rect.x0)), y0 = Math.max(0, Math.round(rect.y0));
    const x1 = Math.min(image.width, Math.round(rect.x1)), y1 = Math.min(image.height, Math.round(rect.y1));
    if (x1 - x0 < 16 || y1 - y0 < 16) return this.recognize(image, mode);
    const crop = document.createElement("canvas");
    crop.width = x1 - x0;
    crop.height = y1 - y0;
    crop.getContext("2d", { willReadFrequently: true }).drawImage(image, x0, y0, crop.width, crop.height, 0, 0, crop.width, crop.height);
    const lines = await this.recognize(crop, mode);
    const shift = (b) => ({ x0: b.x0 + x0, y0: b.y0 + y0, x1: b.x1 + x0, y1: b.y1 + y0 });
    return lines.map((l) => ({
      text: l.text,
      bbox: shift(l.bbox),
      words: (l.words ?? []).map((w) => ({ ...w, bbox: shift(w.bbox) }))
    }));
  }
  /**
   * Ищет в строках подсказку груза. pricesOk(price) — цены, которые вообще могут быть у услышанного звука.
   * Вернёт { typeId, price, lang, tip } или null. Тип без цены не берём: короткие названия (Tools, Paper)
   * легко встретить на экране в другом месте.
   */
  parse(lines, profileId, pricesOk = () => true) {
    const pairs = /* @__PURE__ */ new Map();
    for (const p of this.model.data.pools) {
      if (profileId != null && p.profile !== profileId) continue;
      if (!pairs.has(p.typeId)) pairs.set(p.typeId, /* @__PURE__ */ new Set());
      pairs.get(p.typeId).add(p.price);
    }
    const allPrices = new Set([...pairs.values()].flatMap((s) => [...s]));
    const prices = [];
    for (const l of lines) {
      const nums = [...numbersIn(l.text), ...l.words?.length ? numbersFromWords(l.words) : []];
      for (const n of nums) {
        if (n.struck && !allPrices.has(n.v)) {
          const rep = repairPrice(n.v, allPrices);
          if (rep != null) n.v = rep;
        }
        if (!allPrices.has(n.v) || !pricesOk(n.v)) continue;
        const hit = prices.find((p) => p.v === n.v && p.bbox === l.bbox);
        if (hit) hit.struck ||= n.struck;
        else prices.push({ v: n.v, struck: n.struck, bbox: l.bbox });
      }
    }
    if (!prices.length) return null;
    const types = [];
    for (const line of lines) {
      const hay = norm2(line.text);
      if (hay.length < 4) continue;
      let best = null;
      for (const typeId of pairs.keys()) {
        const t = this.model.typeName(typeId);
        const names = [["eng", t.en], ["rus", t.ru], ...(TYPE_LABELS[t.en] ?? []).map((n) => ["rus", n])];
        for (const [lang, name] of names) {
          const needle = norm2(name);
          const d = fuzzyFind(hay, needle);
          const score = needle.length - 2 * d;
          if (d <= Math.max(1, Math.floor(needle.length * 0.15)) && (!best || score > best.score)) best = { typeId, lang, score, bbox: line.bbox };
        }
      }
      if (best) types.push(best);
    }
    let found = null;
    for (const t of types) {
      for (const p of prices) {
        if (!pairs.get(t.typeId).has(p.v)) continue;
        const d = dist(t.bbox, p.bbox);
        const rank = t.score - d / 50 + (p.struck ? 30 : 0);
        if (!found || rank > found.rank) found = { typeId: t.typeId, price: p.v, lang: t.lang, rank, title: t.bbox, priceBox: p.bbox };
      }
    }
    if (found) return { typeId: found.typeId, price: found.price, lang: found.lang, tip: tipRect(found.title, found.priceBox) };
    const distinct = new Set(prices.map((p) => p.v));
    let pick = distinct.size === 1 ? prices[0] : null;
    if (!pick) {
      const struck = prices.filter((p) => p.struck);
      if (struck.length && new Set(struck.map((p) => p.v)).size === 1) pick = struck[0];
    }
    if (!pick) return null;
    const pb = pick.bbox, lh = pb.y1 - pb.y0;
    const title = lines.map((l) => l.bbox).filter((b) => b.y1 <= pb.y0 + 4 && pb.y0 - b.y1 < 2.5 * lh && Math.abs(b.x0 - pb.x0) < 4 * lh).sort((a, b) => b.y1 - a.y1)[0];
    return { typeId: null, price: pick.v, lang: null, tip: tipRect(title, pb) };
  }
};

// js/grid-labels.js
var BASE2 = new URL("../vendor/tesseract/", new URL("js/", document.baseURI)).href;
var GAP = 28;
var TEXT_PX = 30;
var MIN_LIGHT = 105;
var FLOOR = 40;
var LabelReader = class {
  constructor(types) {
    this.types = types;
    this.loading = null;
  }
  /** Готов ли распознаватель: пока грузится, сканы сетки из-за него не должны останавливаться. */
  get ready() {
    return !!this.worker;
  }
  load(lang) {
    if (this.loading) return this.loading;
    this.loading = (async () => {
      if (!window.Tesseract) {
        await new Promise((resolve, reject) => {
          const s = document.createElement("script");
          s.src = `${BASE2}tesseract.min.js`;
          s.onload = resolve;
          s.onerror = () => reject(new Error("Не удалось загрузить OCR"));
          document.head.append(s);
        });
      }
      await (window.tessReady?.() ?? Promise.resolve());
      const tessOpts = window.TESS_STATIC ?? {
        workerPath: `${BASE2}worker.min.js`,
        corePath: BASE2,
        langPath: `${BASE2}lang`,
        workerBlobURL: false,
        gzip: true
      };
      const worker = await window.Tesseract.createWorker(lang.split("+"), 1, tessOpts);
      await worker.setParameters({ tessedit_pageseg_mode: "6" });
      this.worker = worker;
      return worker;
    })();
    this.loading.catch(() => {
      this.loading = null;
    });
    return this.loading;
  }
  /**
   * image — кадр (ImageBitmap или canvas), list — [{ id, x0, y0, x1, y1 }] грузы в пикселях кадра, pitch — шаг сетки.
   * Вернёт Map id → { typeId, label, text } (typeId = null, если подпись не узнали).
   */
  async read(image, list, pitch, lang = "eng+rus") {
    if (!list.length) return /* @__PURE__ */ new Map();
    const worker = await this.load(lang);
    const k = TEXT_PX / (pitch * 0.15);
    const crops = list.map((c) => {
      const sh = c.wide ? c.y1 - c.y0 - 4 : Math.min(c.y1 - c.y0 - 4, pitch * 0.95);
      const kk = c.wide ? k * 1.35 : k;
      const w = Math.round((c.x1 - c.x0 - 4) * kk), h = Math.round(sh * kk);
      return { c, w, h, sx: c.x0 + 2, sy: c.y0 + 2, sw: c.x1 - c.x0 - 4, sh };
    });
    const W = Math.max(...crops.map((x) => x.w)) + 2 * GAP;
    const H = crops.reduce((s, x) => s + x.h + GAP, GAP);
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const g = canvas.getContext("2d", { willReadFrequently: true });
    g.fillStyle = "#000";
    g.fillRect(0, 0, W, H);
    let y = GAP;
    for (const x of crops) {
      g.drawImage(image, x.sx, x.sy, x.sw, x.sh, GAP, y, x.w, x.h);
      x.top = y;
      y += x.h + GAP;
    }
    const img = g.getImageData(0, 0, W, H);
    const px = img.data;
    for (let i = 0; i < px.length; i += 4) {
      const m = Math.max(px[i], px[i + 1], px[i + 2]);
      const v = 255 - Math.max(0, Math.min(255, (m - FLOOR) * 255 / (MIN_LIGHT + 40 - FLOOR)));
      px[i] = px[i + 1] = px[i + 2] = v;
    }
    g.putImageData(img, 0, 0);
    const { data: data2 } = await worker.recognize(canvas);
    this.lastImage = canvas;
    const texts = crops.map(() => []);
    for (const line of data2.lines) {
      const cy = (line.bbox.y0 + line.bbox.y1) / 2;
      const i = crops.findIndex((x) => cy >= x.top - GAP / 2 && cy < x.top + x.h + GAP / 2);
      if (i >= 0) texts[i].push(line.text.trim());
    }
    const out = /* @__PURE__ */ new Map();
    crops.forEach((x, i) => {
      const text = texts[i].join(" ");
      out.set(x.c.id, { ...matchLabel(text, this.types) ?? { typeId: null, label: null }, text });
    });
    return out;
  }
};

// js/main.js
var $ = (id) => document.getElementById(id);
var fmt = (n) => new Intl.NumberFormat(locale).format(Math.round(n));
var timeStr = (at) => new Date(at).toLocaleTimeString(locale);
var pct = (p) => p >= 0.9995 ? "100%" : p <= 0 ? "0%" : p < 1e-3 ? "<0.1%" : `${(p * 100).toFixed(p < 0.1 ? 1 : 0)}%`;
var icon = (name, cls = "i") => `<svg class="${cls}" aria-hidden="true"><use href="#i-${name}"/></svg>`;
var esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
var BLANK_IMG = "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";
var iconBlobs = /* @__PURE__ */ new Map();
function swapIcons(url, src) {
  for (const doc of [document, pip?.document]) {
    doc?.querySelectorAll("img[data-icon]").forEach((img) => {
      if (img.dataset.icon === url) img.src = src;
    });
  }
}
function iconSrc(url) {
  if (!url) return BLANK_IMG;
  if (location.protocol === "file:") return url;
  const hit = iconBlobs.get(url);
  if (hit) return hit;
  if (hit === void 0) {
    iconBlobs.set(url, null);
    fetch(url).then((r) => r.ok ? r.blob() : Promise.reject(r.status)).then((b) => {
      const src = URL.createObjectURL(b);
      iconBlobs.set(url, src);
      swapIcons(url, src);
    }).catch(() => {
      iconBlobs.set(url, url);
      swapIcons(url, url);
    });
  }
  return BLANK_IMG;
}
var itemImg = (url, attrs = "") => `<img src="${esc(iconSrc(url))}" data-icon="${esc(url ?? "")}" alt="" ${attrs} onerror="this.style.visibility='hidden'">`;
var SIZES_ROTATED = [[1, 1], [1, 2], [2, 2], [2, 3], [3, 2]];
var SIZES_ALL = [[1, 1], [1, 2], [2, 1], [2, 2], [2, 3], [3, 2]];
var sizeList = () => state.rotation ? SIZES_ROTATED : SIZES_ALL;
function sizeIcon([w, h]) {
  return `<span class="size-icon" style="--w:${w}">${"<i></i>".repeat(w * h)}</span>`;
}
var OCR_WINDOW_MS = 6500;
var LINK_WAIT_MS = 2e3;
var KEYS_OCR_LANG = "ocrLang";
var MAX_EVENTS = 400;
var WEAK_MATCH = 0.7;
var MAX_REJECTED = 15;
var NCC_DELAY_MS = 0;
var OLD_DELAY_MS = 800;
var clickAt = (ev) => ev.at - (ev.delay ?? OLD_DELAY_MS);
var SHOW_MARGIN = 0.04;
var catalogRes = await fetch("/api/catalog", { cache: "no-store" });
if (catalogRes.status === 401) location.reload();
var data = await catalogRes.json();
var pip = null;
var pipSupported = "documentPictureInPicture" in window;
var pipPending = false;
var model = new MerchantModel(data);
var remote = new RemoteModel(model);
remote.addEventListener("change", () => update());
var reloading = false;
remote.addEventListener("unauthorized", () => {
  if (!reloading) {
    reloading = true;
    location.reload();
  }
});
var engine = new AudioEngine();
var reader = new TooltipReader(model);
var state = {
  // Карту выбирают заново при каждом открытии сайта: от рейда к рейду она меняется.
  mapLabel: null,
  profileId: null,
  mapPick: null,
  // { map, mode } — выбранная карта и режим из mapChoices
  typeId: null,
  // тип и цену груза уточняет опросник после звука
  price: null,
  size: null,
  rotation: true,
  manualSoundId: null,
  events: [],
  rejected: [],
  // посторонние звуки (голос, музыка) — ниже порога совпадения
  rejectedCount: 0,
  showRejected: false,
  minMatch: store.get(KEYS.minMatch, DEFAULTS2.minMatch),
  currentId: null,
  // событие «текущего предмета» — по умолчанию последнее услышанное
  showAll: false,
  // показать все предметы груза, а не только подходящие по звуку
  showBad: false,
  // показывать и неокупаемые товары (с 💩), не только математически выгодные
  seq: 0,
  custom: []
  // свои эталоны с сервера (сохраняются в админке)
};
var MODE_ART = {
  "Farm|Normal": "img/maps/farm-normal.webp",
  "Farm|Lockdown": "img/maps/farm-lockdown.webp",
  "Farm|SevereInfection": "img/maps/farm-forbidden.webp",
  "Valley|Normal": "img/maps/valley-normal.webp",
  // Жёлтая Долина, красные Ферма и Аэропорт в игре — заражение, а не локдаун и запретная зона.
  "Valley|Infection": "img/maps/valley-lockdown.webp",
  "Armory|Lockdown": "img/maps/armory-lockdown.webp",
  "Armory|Forbidden": "img/maps/armory-forbidden.webp",
  "Airport|Lockdown": "img/maps/airport-lockdown.webp",
  "Airport|SevereInfection": "img/maps/airport-forbidden.webp",
  "Northridge|Lockdown": "img/maps/northridge-lockdown.webp",
  "Northridge|Forbidden": "img/maps/northridge-forbidden.webp",
  "TV Station|Lockdown": "img/maps/tvstation-lockdown.webp",
  "TV Station|Forbidden": "img/maps/tvstation-forbidden.webp"
};
var lookAt = (title, color) => isRu ? { title, color } : { color };
var MODE_LOOK_AT = {
  "Valley|Infection": lookAt("Жёлтая", "#f2c230"),
  "Farm|SevereInfection": lookAt("Красная", "#ef4b4b"),
  "Airport|SevereInfection": lookAt("Красная", "#ef4b4b")
};
var mapChoices = model.mapChoices().map((m) => ({ ...m, modes: m.modes.filter((x) => MODE_ART[`${m.map}|${x.mode}`]).map((x) => ({ ...x, ...MODE_LOOK_AT[`${m.map}|${x.mode}`] })) })).filter((m) => m.modes.length);
var artStyle = (url) => url ? `--art:url('${new URL(url, location.href).href}')` : "";
var mapCover = (m) => (MODE_ART[`${m.map}|Normal`] ?? MODE_ART[`${m.map}|${m.modes[0]?.mode}`])?.replace(/\.webp$/, "-sm.webp");
var warmed = /* @__PURE__ */ new Set();
function warm(urls) {
  for (const url of urls) {
    if (!url || warmed.has(url)) continue;
    warmed.add(url);
    const img = new Image();
    img.decoding = "async";
    img.src = url;
  }
}
var modeArt = (m) => m.modes.map((x) => MODE_ART[`${m.map}|${x.mode}`]);
(window.requestIdleCallback ?? ((f) => setTimeout(f, 1500)))(() => {
  warm(mapChoices.map(mapCover));
  const last = mapChoices.find((m) => m.map === state.mapPick?.map);
  if (last) warm(modeArt(last));
});
function renderMapDialog(mapName = null) {
  const entry = mapChoices.find((m) => m.map === mapName);
  const body = $("mapDialogBody");
  if (!entry) {
    $("mapDialogTitle").textContent = L("Выберите карту", "Pick a map");
    $("mapBack").hidden = true;
    body.innerHTML = `<div class="map-grid">${mapChoices.map((m) => `
      <button class="map-card ${mapCover(m) ? "art" : ""} ${state.mapPick?.map === m.map ? "on" : ""}" style="${artStyle(mapCover(m))}" data-map="${esc(m.map)}">
        <b>${esc(m.name)}</b>
        <span class="map-dots">${m.modes.map((x) => `<i style="--c:${x.color}" title="${esc(x.title)}"></i>`).join("")}</span>
      </button>`).join("")}</div>`;
    return;
  }
  $("mapDialogTitle").textContent = L(`${entry.name}: какая карта?`, `${entry.name}: which mode?`);
  $("mapBack").hidden = false;
  body.innerHTML = `<div class="mode-grid">${entry.modes.map((x) => `
    <button class="mode-card ${MODE_ART[`${entry.map}|${x.mode}`] ? "art" : ""} ${state.mapPick?.map === entry.map && state.mapPick.mode === x.mode ? "on" : ""}" style="--c:${x.color};${artStyle(MODE_ART[`${entry.map}|${x.mode}`])}" data-map="${esc(entry.map)}" data-mode="${esc(x.mode)}">
      <span class="mode-swatch"></span>
      <b>${esc(x.title)}</b>
      ${x.title !== x.modeName ? `<small>${esc(x.modeName)}</small>` : ""}
    </button>`).join("")}</div>`;
}
function openMapDialog() {
  renderMapDialog(null);
  $("mapDialog").showModal();
}
$("mapDialog").addEventListener("click", (e) => {
  if (e.target === $("mapDialog") || e.target.closest("#mapClose")) {
    $("mapDialog").close();
    return;
  }
  if (e.target.closest("#mapBack")) {
    renderMapDialog(null);
    return;
  }
  const btn = e.target.closest("[data-map]");
  if (!btn) return;
  if (!btn.dataset.mode) {
    renderMapDialog(btn.dataset.map);
    return;
  }
  setMap(btn.dataset.map, btn.dataset.mode);
  $("mapDialog").close();
});
$("mapBtn").addEventListener("click", openMapDialog);
var warmModes = (e) => {
  const card = e.target.closest?.(".map-card[data-map]");
  const m = card && mapChoices.find((x) => x.map === card.dataset.map);
  if (m) warm(modeArt(m));
};
$("mapDialog").addEventListener("pointerover", warmModes);
$("mapDialog").addEventListener("focusin", warmModes);
function setMap(mapName, mode) {
  const entry = mapChoices.find((m) => m.map === mapName);
  const choice = entry?.modes.find((x) => x.mode === mode);
  if (!choice) return;
  state.mapPick = { map: mapName, mode };
  state.mapLabel = choice.label;
  state.profileId = choice.profileId;
  store.set(KEYS.mapLabel, state.mapLabel);
  engine.mapName = mapName;
  tracker.reset();
  syncMapUi();
  update();
}
function syncMapUi() {
  const entry = mapChoices.find((m) => m.map === state.mapPick?.map);
  const choice = entry?.modes.find((x) => x.mode === state.mapPick.mode);
  $("mapBtn").classList.toggle("primary", !choice);
  $("mapBtn").classList.toggle("ghost", !!choice);
  $("mapBtn").querySelector("span").innerHTML = choice ? `${esc(entry.name)} <i class="map-dot" style="--c:${choice.color}"></i>${esc(choice.title)}` : L("Выбрать карту", "Pick map");
  const canCapture = !!navigator.mediaDevices?.getDisplayMedia;
  $("listen").disabled = !choice || !canCapture;
  $("listen").title = !canCapture ? L(
    "Браузер не умеет захватывать звук экрана. Откройте сайт в Chrome или Edge на ПК",
    "This browser can't capture screen audio. Open the site in Chrome or Edge on PC"
  ) : !choice ? L("Сначала выберите карту", "Pick a map first") : "";
  $("pip").disabled = !choice && !pip;
  $("pip").title = choice ? L("Маленькое окно поверх игры с результатом", "Small window over the game with results") : L("Сначала выберите карту", "Pick a map first");
}
function currentGroup() {
  const enabled = allEvents().filter((e) => e.enabled);
  const base = enabled.find((e) => e.id === state.currentId) ?? enabled.sort((a, b) => b.at - a.at)[0];
  const same = (e) => e === base || base.cargo && e.cargo === base.cargo;
  return base ? { base, events: enabled.filter(same) } : null;
}
function matchingSounds(group, possible) {
  const ids = [...possible.keys()];
  const out = /* @__PURE__ */ new Set();
  for (const e of group.events) {
    let top = -1;
    for (const id of ids) top = Math.max(top, e.bySound.get(id)?.score ?? -1);
    for (const id of ids) if ((e.bySound.get(id)?.score ?? -1) >= top - SHOW_MARGIN) out.add(id);
  }
  return out;
}
var rowsFor = (slot, typeId, price, evidence, size) => remote.rows(slot, { p: state.profileId, t: typeId, c: price }, evidence, size, false);
var priceSeen = /* @__PURE__ */ new Map();
var priceKey = (g) => `${g.typeId}|${g.w}x${g.h}`;
function notePrice(g) {
  if (g.typeId == null || g.price == null || g.priceGuess) return;
  let set = priceSeen.get(priceKey(g));
  if (!set) priceSeen.set(priceKey(g), set = /* @__PURE__ */ new Set());
  set.add(g.price);
}
function syncPrices() {
  for (const g of tracker.cargos.values()) {
    if (g.typeId == null) continue;
    const seen = priceSeen.get(priceKey(g));
    if (seen && seen.size > 1 && g.priceGuess) {
      gridLog(`груз ${g.key}: цена ${fmt(g.price)} снята — у таких же грузов разные цены`);
      g.price = null;
      g.priceGuess = false;
      for (const ev of g.events) fillFromCargo(ev);
    }
    if (g.price != null) {
      notePrice(g);
      continue;
    }
    if (!seen || seen.size !== 1) continue;
    g.price = [...seen][0];
    g.priceGuess = true;
    gridLog(`груз ${g.key}: цена ${fmt(g.price)} — по таким же грузам (${g.w}×${g.h}), подсказку не читали`);
    for (const ev of g.events) fillFromCargo(ev);
  }
}
function update() {
  syncPrices();
  const group = currentGroup();
  const answer = group?.base.answer ?? {};
  const events = group ? group.events.map((e) => e.bySound) : [];
  const allowedSounds = group && !state.showAll && state.manualSoundId == null ? matchingSounds(group, remote.possible(state.profileId, answer.typeId ?? state.typeId, answer.price ?? state.price)) : null;
  const evidence = { manualSoundId: state.manualSoundId, events, allowedSounds };
  const heard = !!group || state.manualSoundId != null;
  const baseRows = heard ? rowsFor("base", state.typeId, state.price, evidence, state.size) : [];
  const typeId = answer.typeId ?? state.typeId;
  const price = answer.price ?? state.price;
  const size = answer.size ?? state.size;
  const rows = !heard || typeId === state.typeId && price === state.price && size === state.size ? baseRows : rowsFor("rows", typeId, price, evidence, size);
  state.currentGroupIds = new Set(group ? group.events.map((e) => e.id) : []);
  const typedRows = !group || typeId === state.typeId ? baseRows : rowsFor("typed", typeId, state.price, evidence, state.size);
  const rowsForSizes = group && answer.price != null && answer.price !== state.price ? rowsFor("sizes", typeId, answer.price, evidence, state.size) : typedRows;
  const rowsForPrices = group && answer.size && answer.size !== state.size ? rowsFor("prices", typeId, state.price, evidence, answer.size) : typedRows;
  state.view = { rows, group, allowedSounds, quiz: group ? quizOptions(rowsForSizes, rowsForPrices, group.base, typeId) : null };
  renderQuiz();
  renderNow();
  renderSummary(rows, group, allowedSounds);
  renderResults(rows);
  renderGrid();
  renderMini();
}
var sizeKey = ([w, h]) => (state.rotation && turns([w, h]) ? [Math.min(w, h), Math.max(w, h)] : [w, h]).join("x");
function quizOptions(rowsForSizes, rowsForPrices, base, typeId) {
  const sizes = /* @__PURE__ */ new Map(), prices = /* @__PURE__ */ new Map();
  for (const r of rowsForSizes) {
    const k = sizeKey(r.item.size);
    sizes.set(k, (sizes.get(k) ?? 0) + r.p);
  }
  for (const r of rowsForPrices) prices.set(r.cargoPrice, (prices.get(r.cargoPrice) ?? 0) + r.p);
  const answer = base.answer ?? {};
  const items = new Set([...rowsForSizes, ...rowsForPrices].map((r) => r.item.id)).size;
  const byType = /* @__PURE__ */ new Map();
  for (const r of rowsForPrices) if (r.p > 0) byType.set(r.typeId, (byType.get(r.typeId) ?? 0) + r.p);
  return {
    items,
    types: typeId != null ? [] : [...byType].sort((a, b) => b[1] - a[1]),
    sizes: state.size ? [] : sizeList().map((sz) => [sz, sizes.get(sizeKey(sz)) ?? 0]),
    // Цены — по возрастанию, но только возможные для этого звука (и уже выбранная, чтобы её можно было снять).
    prices: state.price != null ? [] : model.priceOptions(state.profileId, typeId).map((v) => [v, prices.get(v) ?? 0]).filter(([v, p]) => p > 0 || v === answer.price),
    answer
  };
}
function quizHtml() {
  const quiz = state.view?.quiz;
  if (!quiz) return "";
  const { sizes, prices, types = [], answer, items } = quiz;
  if (items <= 1) return "";
  const askSize = sizes.filter(([, p]) => p > 0).length > 1 || !!answer.size;
  const askPrice = prices.length > 1;
  const askType = types.length > 1;
  if (!askSize && !askPrice && !askType) return "";
  const picked = [
    answer.typeId != null && model.typeName(answer.typeId).name,
    answer.size && `${L("размер", "size")} ${answer.size.join("×")}`,
    answer.price != null && `${L("цена", "price")} ${fmt(answer.price)}`
  ].filter(Boolean);
  if (answer.done) return "";
  const sizeChosen = answer.size ? sizeKey(answer.size) : null;
  const hint = () => "";
  return `<div class="quiz">
    <div class="quiz-head"><b>${L("Уточните груз", "Narrow down the cargo")}</b><button class="btn small" data-quiz="skip">${picked.length ? L("Готово", "Done") : L("Пропустить", "Skip")}</button></div>
    ${ocrHtml(answer)}
    ${askSize ? `<div class="quiz-q"><span>${L("Размер ячейки?", "Cell size?")}</span><div class="size-row">${sizes.map(([sz, p]) => `<button class="size-btn ${sizeChosen === sizeKey(sz) ? "on" : ""} ${p > 0 ? "" : "zero"}" data-quiz="size" data-v="${sz.join("x")}">${sizeIcon(sz)}<small>${sz.join("×")}</small>${hint(p)}</button>`).join("")}</div></div>` : ""}
    ${askType ? `<div class="quiz-q"><span>${L("Тип груза?", "Cargo type?")}</span><div class="chips">${types.map(([t, p]) => `<button class="chip ${answer.typeId === t ? "on" : ""} ${p > 0 ? "" : "zero"}" data-quiz="type" data-v="${t}">${esc(model.typeName(t).name)}</button>`).join("")}</div></div>` : ""}
    ${askPrice ? `<div class="quiz-q"><span>${L("Цена в подсказке?", "Price in tooltip?")}</span><div class="chips">${prices.map(([v, p]) => `<button class="chip ${answer.price === v ? "on" : ""} ${p > 0 ? "" : "zero"}" data-quiz="price" data-v="${v}">${fmt(v)} ${hint(p)}</button>`).join("")}</div></div>` : ""}
  </div>`;
}
function ocrHtml(answer) {
  if (answer.ocr) {
    const { typeId, price, size } = answer.ocr;
    return `<div class="quiz-ocr">${icon("monitor")}<span>${L("С экрана", "From screen")}: <b>${typeId != null ? `${esc(model.typeName(typeId).name)} · ` : ""}${fmt(price)}${size ? ` · ${size.join("×")}` : ""}</b></span>
      <button class="btn small ghost" data-quiz="clear-ocr">${L("Не то", "Wrong")}</button></div>`;
  }
  if (state.ocrBusy && answer.price == null && !answer.ocrOff) {
    return `<div class="quiz-ocr busy">${icon("monitor")}<span>${L("Наведите мышь на груз, читаю подсказку", "Hover the cargo, reading the tooltip")}</span></div>`;
  }
  return "";
}
function renderQuiz() {
  $("quiz").innerHTML = quizHtml();
}
function onQuizClick(e) {
  const b = e.target.closest("[data-quiz]");
  const base = state.view?.group?.base;
  if (!b || !base) return;
  const answer = base.answer ??= {};
  const kind = b.dataset.quiz;
  if (kind === "size") {
    const v = b.dataset.v.split("x").map(Number);
    answer.size = answer.size && sizeKey(answer.size) === sizeKey(v) ? null : v;
  } else if (kind === "type") {
    const v = +b.dataset.v;
    answer.typeId = answer.typeId === v ? null : v;
    const cg = base.cargo;
    if (cg && cg.typeId == null && answer.typeId != null) {
      cg.typeId = answer.typeId;
      snapCargoSize(cg);
    }
    for (const ev of base.events ?? []) fillFromCargo(ev);
  } else if (kind === "price") {
    answer.price = answer.price === +b.dataset.v ? null : +b.dataset.v;
    if (answer.ocr) {
      delete answer.typeId;
      delete answer.ocr;
      answer.ocrOff = true;
    }
  } else if (kind === "clear-ocr") {
    if (answer.ocr?.size) delete answer.size;
    delete answer.typeId;
    delete answer.price;
    delete answer.ocr;
    answer.ocrOff = true;
  } else if (kind === "skip") {
    answer.done = true;
  }
  const quiz = state.view.quiz;
  if ((kind === "size" || kind === "price") && (quiz.sizes.length <= 1 || answer.size) && (quiz.prices.length <= 1 || answer.price != null)) answer.done = true;
  update();
}
$("quiz").addEventListener("click", onQuizClick);
function rainHtml() {
  if (!state.listening || !engine.rain) return "";
  return `<div class="rain-note" role="status">${icon("rain")}<span><b>${L("Идёт дождь", "It's raining")}</b>${L("Во время дождя детектор не работает", "The detector doesn't work in rain")}</span></div>`;
}
function nowHtml({ steps = true, rain = true } = {}) {
  return (rain ? rainHtml() : "") + nowBody(steps);
}
function nowBody(withSteps) {
  const group = state.view?.group;
  if (!group && !state.listening) return `<div class="idle">
      <div>
        <h3>${L("Сайт пока не слышит игру", "Not hearing the game yet")}</h3>
        <p>${state.mapPick ? L(
    "Включите прослушивание и подвигайте груз у Field Merchant. Результат появится здесь.",
    "Start listening and move cargo at the Field Merchant. Results show up here."
  ) : L("Сначала выберите карту и режим — без этого слушать игру нельзя.", "Pick a map and mode first.")}</p>
      </div>
      ${state.mapPick ? `<button class="btn primary lg" data-act="listen">${icon("wave")}${L("Слушать игру", "Listen to game")}</button>` : `<button class="btn primary lg" data-act="pick-map">${icon("map")}${L("Выбрать карту", "Pick map")}</button>`}
      <figure class="share-guide">
        <div class="share-shot">
          <img src="img/share-guide.webp" width="568" height="487" decoding="async" alt="${L("Окно выбора браузера: окно Arena Breakout: Infinite, переключатель звука приложения и кнопка «Поделиться с аудио»", "Browser share dialog: Arena Breakout: Infinite window, audio switch and Share button")}">
          <span class="mark" style="left:81%;top:39%">1</span>
          <span class="mark" style="left:94%;top:57%">2</span>
          <span class="mark" style="left:45%;top:89%">3</span>
        </div>
        <ol class="idle-steps">
${L(`
          <li>Во вкладке «Окно» кликните по окну <b>Arena Breakout: Infinite</b></li>
          <li>Включите переключатель <b>«Также транслировать звук приложения»</b></li>
          <li>Нажмите <b>«Поделиться с аудио»</b> и подвигайте груз у торговца</li>`, `
          <li>On the <b>Window</b> tab, click the <b>Arena Breakout: Infinite</b> window</li>
          <li>Turn on the <b>audio sharing</b> switch</li>
          <li>Click <b>Share</b> and move cargo at the merchant</li>`)}
        </ol>
      </figure>
    </div>`;
  const steps = withSteps ? flowHtml() : "";
  if (!group && steps) return steps;
  if (!group && waitingGrid()) return `<div class="waiting"><div class="now-state wait"><span class="radar"></span>${L("Жду сетку торговца", "Waiting for merchant grid")}</div>
      <p>${L("Откройте торговца и прокрутите сетку до конца. Звуки начну слушать, когда она сохранится.", "Open the merchant and scroll the grid to the end. Sounds count once it's saved.")}</p></div>`;
  if (!group) return `<div class="waiting"><div class="now-state wait"><span class="radar"></span>${L("Жду звук груза", "Waiting for cargo sound")}</div>
      <p>${L("Возьмите груз у торговца и переложите его — звук подбора появится на осциллографе выше.", "Pick up cargo at the merchant and move it. The sound shows on the scope above.")}</p></div>`;
  const base = group.base;
  const share = /* @__PURE__ */ new Map();
  for (const r of state.view?.rows ?? []) share.set(r.item.soundId, (share.get(r.item.soundId) ?? 0) + r.p);
  const [topId, topShare] = [...share].sort((a, b) => b[1] - a[1])[0] ?? [];
  const best = topId != null && base.bySound.get(topId) || base.cargoBest || [...base.bySound.values()].sort((a, b) => b.score - a.score)[0];
  const sound = data.sounds.find((x) => x.id === best.template.soundId);
  const conf = topId != null ? topShare : null;
  const q = conf != null ? conf >= 0.9 ? ["good", L("уверенно", "sure")] : conf >= 0.6 ? ["mid", L("похоже", "likely")] : ["low", L("слабо", "weak")] : best.score >= 0.85 ? ["good", L("уверенно", "sure")] : best.score >= 0.7 ? ["mid", L("похоже", "likely")] : ["low", L("слабо", "weak")];
  const ago = Math.round((Date.now() - base.at) / 1e3);
  return `${steps}<div class="now-state heard">
    <span class="now-sound">${L("Звук", "Sound")} #${best.template.soundId}</span>
    <span class="now-label">${esc(sound ? soundLabel(sound) : "")}</span>
    <span class="badge q-${q[0]}" title="${L("Похожесть на эталон", "Match score")}: ${best.score.toFixed(2)}">${q[1]} · ${conf != null ? `${Math.round(conf * 100)}%` : best.score.toFixed(2)}</span>
    <small>${ago < 60 ? L(`${ago} с назад`, `${ago}s ago`) : timeStr(base.at)}</small>
  </div>`;
}
function renderNow() {
  $("now").innerHTML = nowHtml();
}
$("now").addEventListener("click", (e) => {
  if (e.target.closest("[data-act='listen']")) $("listen").click();
  if (e.target.closest("[data-act='pick-map']")) openMapDialog();
});
setInterval(() => {
  if (pip?.closed) dropPip();
  if (state.view?.group) {
    renderNow();
    renderMini();
  }
}, 5e3);
function renderSummary(rows, group, allowedSounds) {
  if (!group && state.manualSoundId == null) {
    $("summary").innerHTML = "";
    $("filterNote").hidden = true;
    return;
  }
  const top = viewRows(rows)[0] ?? null;
  const stats = heardStats(rows);
  const pay = stats.pay;
  const redP = rows.reduce((s, r) => s + (r.item.rarity >= RED_RARITY ? r.p : 0), 0);
  const rareStat = (rarity, nameRu, nameEn) => {
    const all = rows.reduce((sum, r) => sum + (r.item.rarity === rarity ? r.p : 0), 0);
    if (all <= 0) return "";
    const ok = rows.reduce((sum, r) => sum + (r.item.rarity === rarity && isGood(r) ? r.p : 0), 0);
    const body = ok < all - 1e-6 ? `${pct(all)} · ${L("выгодная", "profitable")} ${pct(ok)}` : pct(all);
    return `<div class="stat"><span style="color:${RARITY[rarity]?.color ?? "#fff"}">${nameEn}</span><b>${body}</b></div>`;
  };
  $("summary").innerHTML = `
    <div class="stat"><span>${L("Скорее всего", "Most likely")}</span><b title="${esc(top?.item.name ?? "")}">${top ? `${pct(top.p)}` : "—"}</b>
      <span>${top ? esc(top.item.name) : L("нет выгодных", "no profitable")}</span></div>
    ${rareStat(GOLD_RARITY, "золотуха", "GOLD")}${rareStat(RED_RARITY, "краснуха", "RED")}
    ${stats.good ? `<div class="stat"><span>${L("Окуп", "Payoff")}</span><b>${pct(pay)}</b><span>${L("запас ≥ 50к", "margin 50k+")}</span></div>` : ""}`;
  const notes = [];
  if (state.manualSoundId != null) notes.push(`${L("Звук выбран вручную", "Sound picked manually")}: <b>#${state.manualSoundId}</b> <button class="btn small" data-act="clear-manual">${icon("x")}${L("Снять", "Clear")}</button>`);
  if (group) {
    const time = timeStr(group.base.at);
    const sounds = allowedSounds ? [...allowedSounds].map((id) => `#${id}`).join(", ") : "";
    notes.push(`${L("Текущий предмет: звук", "Current item: sound at")} ${time}${group.events.length > 1 ? ` (+${group.events.length - 1})` : ""}` + (allowedSounds ? ` · ${L("показаны только подходящие", "showing matches only")} (${sounds})` : ` · ${L("показаны все предметы", "showing all items")}`) + ` <button class="btn small" data-act="toggle-all">${state.showAll ? L("Только подходящие", "Matches only") : L("Показать все", "Show all")}</button>`);
  }
  if (state.size) notes.push(`${L("Размер", "Size")}: ${state.size[0]}×${state.size[1]}${state.rotation && turns(state.size) ? L(" (с поворотом)", " (rotated too)") : ""}`);
  $("filterNote").hidden = !notes.length;
  $("filterNote").innerHTML = notes.join(" · ");
}
$("filterNote").addEventListener("click", (e) => {
  const act = e.target.closest("[data-act]")?.dataset.act;
  if (act === "clear-manual") {
    state.manualSoundId = null;
    update();
  }
  if (act === "toggle-all") {
    state.showAll = !state.showAll;
    update();
  }
});
var collapsed = new Set(store.get("collapsedCargoTypes", []));
var RD_RULES = {
  14: [{ size: [2, 3], items: ["Double-Neck Lute"] }],
  18: [
    { size: [2, 3], items: ["Capsule TV", "Quantum 2000 Toy Robot", "Amber Heart of Heaven"] },
    { size: [3, 2], prices: [47e4], items: ["Three-Axis Gyro Controller Prototype"] },
    { size: [1, 2], prices: [47e4], items: ["Skyhook Synchronized Array Mirror", "Raw Diamond Ore"] },
    { size: [1, 2], prices: [25e4], items: ["Skyhook Synchronized Array Mirror", "Raw Diamond Ore", "Gold Block", "Hydraulic Wrench", "Sergey 1 Satellite Model"] },
    // Аудит по картам (24.10 v2): 2×2 Редкого за 470к — EV +208к обычные / +426к заражённые, RED 34–54%.
    { size: [2, 2], prices: [47e4], items: ["Porcelain", "Prototype Calculation Module", "Hefra Egg", "Lyre", "Heavenly Sphere", "MRID Clamshell Laptop"] },
    // Таинственный за 70к: 1×2 (Skyhook/Raw Diamond по 5.9%) EV +60к; 2×1 — в минусе (−4к).
    { size: [1, 2], prices: [7e4], items: ["Skyhook Synchronized Array Mirror", "Raw Diamond Ore", "Gold Block", "Hydraulic Wrench", "Sergey 1 Satellite Model", "Spur", "Pipe Wrench"] },
    // Аудит: Коллекционные 200к — Gold Block/Sergey 1/Spur, маржа +60к.
    { size: [1, 2], prices: [2e5], items: ["Gold Block", "Sergey 1 Satellite Model", "Spur"] }
  ],
  22: [
    { size: [2, 3], items: ["Ancient Golden Mask Replica", "Gilded Cage Music Box"] },
    { size: [2, 2], prices: [45e4, 1e5], items: ["Phaethon's Clock", "Real Matrix", "Peacock Fan", "Voice of Civilization Gold Record"] },
    // Аудит по картам: 2×2 за 250к (+78к/+109к) и 550к (+125к/+432к), RED 11–63%.
    { size: [2, 2], prices: [25e4, 55e4], items: ["Phaethon's Clock", "Real Matrix", "EEG", "Peacock Fan", "Voice of Civilization Gold Record", "Metal Heart", "Gungnir Blueprint Fragments"] },
    // Аудит: 3×2 за 70к/270к/550к — Space Lab Toybox + Aerospace Navigator + "Dawn", маржа +76к…+713к.
    { size: [3, 2], prices: [7e4, 27e4, 55e4], items: ["Space Lab Toybox", "Aerospace Navigator", '"Dawn"'] },
    // Аудит: Таинственный 2×2 за 70к — Metal Heart/Gungnir + красные, +139к.
    { size: [2, 2], prices: [7e4], items: ["EEG", "Gungnir Blueprint Fragments", "Metal Heart", "Phaethon's Clock", "Real Matrix"] },
    // Аудит: Коллекционные 1×1 за 70к — Gold Pen/Gold Watch/Jade Bracelet, +56к.
    { size: [1, 1], prices: [7e4], items: ["Gold Pen", "Gold Watch", "Jade Bracelet"] }
  ],
  28: [
    { size: [3, 2], items: ["Gold Lion Statue"] },
    { size: [2, 1], items: ["Gold Cheetah Statue"] }
  ],
  30: [
    { size: [2, 2], items: ["Northern Stars Amber Drink", "Vase"] },
    { size: [2, 2], prices: [1e5], items: ["Northern Stars Amber Drink"] },
    // Аудит: Таинственный 2×3 за 70к — Mutant Heart Sample, всегда +187 520.
    { size: [2, 3], prices: [7e4], items: ["Mutant Heart Sample"] }
  ],
  32: [{ size: [2, 2], items: ["Antique Teapot"] }],
  33: [{ size: [2, 2], items: ["Gem Necklace", "Star of Kamona Pendant"] }],
  36: [
    { size: [2, 3], prices: [47e4], items: ["Majestic Sculpture"] },
    { size: [1, 1], prices: [7e4, 21e4], items: ["Gold Cube", "Mutated Tissue Mass"] },
    { size: [1, 2], items: ["Gold Cup", "Military Canteen"], max: 27e4 },
    { size: [2, 2], prices: [45e4], items: ["Gold Snake", "Optoelectronic Hyperspace Model"] },
    // Аудит: Таинственный 2×2 за 70к — K7-L/Gold Snake, +130к.
    { size: [2, 2], prices: [7e4], items: ["Gold Snake", "K7-L Cipher Machine"] }
  ],
  3: [{ size: [3, 2], prices: [7e4], items: ["Large-Caliber Artillery Gunpowder Pack"] }],
  10: [
    { size: [2, 2], prices: [3e4], items: ["Palladium Wire"] },
    { size: [3, 2], prices: [7e4], items: ["UPS Unit", "Vector Processor"] },
    // Аудит по картам: 2×1 Военных за 50к — EV +57к (Leveler 34%, TI Module 3%). За 450к НЕ выгодно (+9к).
    { size: [2, 1], prices: [5e4], items: ["Leveler", "TI Module"] }
  ],
  17: [
    { size: [2, 3], prices: [7e4], items: ["Hydraulic Expander"] },
    // Полный аудит 24.10: единственный кандидат, всегда +122 115 (70к) / +92 115 (100к).
    { size: [3, 2], prices: [7e4, 1e5], items: ["Battery-Powered Positive Electrode Module"] }
  ],
  // Проверено 24.10: единственный кандидат, всегда в плюсе. Только заражённые карты и цена 70к!
  24: [{ size: [3, 2], prices: [7e4], items: ["Pheromone Test Kit"] }],
  35: [{ size: [2, 2], prices: [7e4], items: ["Mutant Evolution Sketch"] }],
  // Аудит: Таинственный 2×2 за 70к — Патефон/Пишущая машинка/Акустическая панель, +130…+139к.
  8: [{ size: [2, 2], prices: [7e4], items: ["Acoustic Panel", "Record Player", "Vintage Typewriter"] }],
  // Аудит: Комплектующие 1×2 за 20к — Graphics Card, +55 548.
  12: [{ size: [1, 2], prices: [2e4], items: ["Graphics Card"] }]
};
function rdItem(name) {
  return data.items.find((i) => i.name === name) ?? null;
}
function soundVerdict(g) {
  let best = null, second = null;
  for (const ev of g.events ?? []) {
    for (const [id, sc] of ev.bySound ?? []) {
      const v = sc?.score ?? 0;
      if (!best || v > best.v) {
        second = best;
        best = { id, v };
      } else if (best.id !== id && (!second || v > second.v)) second = { id, v };
    }
  }
  return { soundId: best?.id ?? null, disputed: best != null && second != null && second.v >= 0.3 && best.v - second.v < 0.1 };
}
function rdRuleFor(g, soundId) {
  if (soundId == null) return null;
  const rules = RD_RULES[soundId];
  if (!rules) return null;
  for (const r of rules) {
    if (r.size) {
      const [w, h] = r.size;
      const fit = g.w === w && g.h === h || state.rotation && g.w === h && g.h === w;
      if (!fit) continue;
    }
    if (r.prices && (g.price == null || !r.prices.includes(g.price))) continue;
    return r;
  }
  return null;
}
function hintItems(rule, have) {
  return (rule?.items ?? []).map(rdItem).filter((i) => i && (!have || have.has(i.id)));
}
function ruleRows(g, heard) {
  const sv = soundVerdict(g);
  if (sv.disputed) return null;
  const rule = rdRuleFor(g, sv.soundId);
  if (!rule) return null;
  const have = new Set((heard ?? []).map((x) => x.item.id));
  const items = hintItems(rule, have);
  if (!items.length) return null;
  const noBuy = rule.max != null && g.price != null && g.price > rule.max;
  const rows = items.map((item) => {
    const model2 = (heard ?? []).find((x) => x.item.id === item.id) ?? null;
    return {
      item,
      p: model2?.p ?? 0,
      cargoPrice: g.price ?? model2?.cargoPrice ?? null,
      ok: noBuy ? false : model2?.ok ?? true
    };
  });
  const keep = rows.filter((r) => r.item.rarity === RED_RARITY || isGood(r) || r.p >= 0.1 && r.item.contactPrice >= PROFIT_MIN);
  const out = keep.length ? keep : rows;
  if (out.every((r) => r.item.rarity === RED_RARITY)) {
    const s = out.reduce((a, r) => a + r.p, 0);
    out.forEach((r) => r.p = s > 0 ? r.p / s : 1 / out.length);
  }
  return out;
}
function viewRows(rows) {
  const clean = rows.filter((r) => r.item.rarity !== 4);
  return state.showBad ? clean : clean.filter((r) => isGood(r));
}
function badCount(rows) {
  const good = rows.filter((r) => isGood(r)).length;
  const hidden = rows.filter((r) => r.item.rarity === 4).length;
  return { good, bad: rows.length - good, hidden };
}
function itemRow(row) {
  const { item, p, cargoPrice } = row;
  const ok = isGood(row);
  const r = RARITY[item.rarity] ?? RARITY[1];
  return `<div class="item ${p < 5e-3 ? "unlikely" : ""}" style="--rc:${r.color}">
    ${ok ? itemImg(item.iconUrl) : `<span class="row-poop" title="${L("не выгодно: запас меньше 50к", "not profitable: under 50k margin")}">💩</span>`}
    <div>
      <div class="name">${esc(item.name)}</div>
      <div class="meta"><span style="color:${r.color}">${r.name}</span> · ${item.size[0]}×${item.size[1]}</div>
    </div>
    <div class="price" title="${L("груз за", "cargo at")} ${fmt(cargoPrice)} · ${L("справочная", "reference")} ${fmt(item.referencePrice ?? item.contactPrice)}">${fmt(item.contactPrice)}<small>${ok ? L("выгодно", "good") : L("запас < 50к", "under 50k")}</small></div>
    <div class="prob"><b>${pct(p)}</b><div class="bar"><i style="width:${(p * 100).toFixed(1)}%"></i></div></div>
  </div>`;
}
function singleItem(rows) {
  if (!rows.length || new Set(rows.map((r) => r.item.id)).size !== 1) return null;
  return { ...rows[0], p: 1 };
}
function groupRows(rows) {
  const groups = /* @__PURE__ */ new Map();
  for (const row of rows) {
    const name = `${row.typeNameEn} · ${row.cargoPrice}`;
    if (!groups.has(name)) groups.set(name, { name, typeName: row.typeName, typeNameEn: row.typeNameEn, price: row.cargoPrice, rows: [], p: 0, prior: 0 });
    const g = groups.get(name);
    g.rows.push(row);
    g.p += row.p;
    g.prior += row.prior;
  }
  return [...groups.values()].sort((a, b) => b.p - a.p || b.prior - a.prior);
}
function renderResults(rows) {
  if (!state.view?.group && state.manualSoundId == null) {
    $("results").innerHTML = "";
    return;
  }
  const g0 = state.view?.group?.base?.cargo;
  const ruled = g0 ? ruleRows(g0, rows) : null;
  if (ruled) rows = ruled;
  const { good, bad, hidden } = badCount(rows);
  const shown = viewRows(rows);
  const toggle = bad ? ` <button class="btn small" data-act="toggle-bad">${state.showBad ? L("Только выгодные", "Profitable only") : `${L("Показать все", "Show all")} 💩`}</button>` : "";
  const crate = state.view?.group?.base?.cargo;
  const cratePrice = crate?.price ?? state.view?.group?.base?.answer?.price ?? rows[0]?.cargoPrice ?? null;
  const crateText = cratePrice == null ? "" : ` · ${L("ящик", "crate")} ${crate?.price != null ? "" : "≈"}${fmt(cratePrice)}`;
  const toolbar = `<div class="rd-bar"><b>${L("Выгодных (запас ≥ 50к)", "Profitable (50k+ margin)")}: ${good}</b> · ${L("не выгодно", "not profitable")}: ${bad}${hidden ? ` (${L("из них фиолок", "incl. purples")}: ${hidden})` : ""}${toggle}${crateText}</div>`;
  if (!rows.length) {
    $("results").innerHTML = `<div class="card"><p class="empty">${L("Нет предметов, подходящих под фильтры. Проверьте тип груза, размер ячейки или выбранный звук.", "No items match the filters. Check cargo type, cell size or the picked sound.")}</p></div>`;
    return;
  }
  if (!shown.length) {
    $("results").innerHTML = toolbar + `<div class="card"><p class="empty">${L("Нет математически выгодных позиций — все варианты не окупаются.", "No profitable plays — every option loses money.")}${toggle}</p></div>`;
    return;
  }
  const single = singleItem(shown);
  if (single) {
    $("results").innerHTML = toolbar + `<section class="category"><div class="category-body">${itemRow(single)}</div></section>`;
    return;
  }
  $("results").innerHTML = toolbar + groupRows(shown).map((g) => {
    return `<section class="category ${collapsed.has(g.name) ? "closed" : ""} ${g.p < 5e-3 ? "unlikely" : ""}" data-cat="${esc(g.name)}">
      <button class="category-head" data-act="toggle-cat">
        <span class="category-arrow">${icon("chevron")}</span>
        <span class="category-name">${esc(g.typeName)} <span class="category-price">${g.price != null ? fmt(g.price) : "?"}</span></span>
        <span></span>
        <span class="category-prob"><b>${pct(g.p)}</b><span class="bar"><i style="width:${(g.p * 100).toFixed(1)}%"></i></span></span>
      </button>
      <div class="category-body">${g.rows.map(itemRow).join("")}</div>
    </section>`;
  }).join("");
}
$("results").addEventListener("click", (e) => {
  if (e.target.closest("[data-act='toggle-bad']")) {
    state.showBad = !state.showBad;
    renderResults(state.view?.rows ?? []);
    return;
  }
  const head = e.target.closest("[data-act='toggle-cat']");
  if (!head) return;
  const section = head.closest(".category");
  const name = section.dataset.cat;
  if (collapsed.has(name)) collapsed.delete(name);
  else collapsed.add(name);
  section.classList.toggle("closed", collapsed.has(name));
  store.set("collapsedCargoTypes", [...collapsed]);
});
function soundLabel(s) {
  return s.pickup.replace(/^(Item_|Prop_Acc_)/, "").replace(/_(Up|UP)(_\d+)?$/, "").replace(/_/g, " ");
}
var allEvents = () => [...state.events, ...state.rejected];
var waitingGrid = () => reader.canRead && !tracker.locked;
engine.addEventListener("event", async (e) => {
  if (waitingGrid()) return;
  const { at, candidates = [e.detail] } = e.detail;
  const possible = await remote.possibleAsync(state.profileId, state.typeId, state.price);
  const result = classify(candidates, possible, state.minMatch);
  if (!result) {
    pushLog(`звук ${new Date(at).toLocaleTimeString("ru-RU")}: тишина/шум, мимо (совпадений нет)`);
    return;
  }
  const { chosen, scored, accepted, reason } = result;
  const ev = {
    id: ++state.seq,
    at,
    peakDb: chosen.peakDb,
    scores: chosen.scores,
    bySound: chosen.bySound,
    data: chosen.data,
    inCargo: chosen.inCargo,
    cargoBest: chosen.cargoBest,
    overlapped: scored.length,
    quiet: chosen.quiet,
    fresh: true,
    delay: e.detail.ncc ? NCC_DELAY_MS : OLD_DELAY_MS
  };
  const ranked = [...chosen.bySound ?? []].sort((a, b) => (b[1]?.score ?? 0) - (a[1]?.score ?? 0));
  const top3 = ranked.slice(0, 3).map(([id, m]) => `${id}:${(m?.score ?? 0).toFixed(2)}`).join(" ");
  const weak = accepted && (ranked[0]?.[1]?.score ?? 0) < WEAK_MATCH ? " · СЛАБОЕ совпадение" : "";
  pushLog(`звук ${new Date(at).toLocaleTimeString("ru-RU")} пик ${chosen.peakDb.toFixed(1)} дБ ${accepted ? "ПРИНЯТ" : `отброшен (${reason})`} · звуки [${top3}] · порог ${state.minMatch}${weak}`);
  if (!accepted) {
    state.rejected.unshift({ ...ev, enabled: false, rejected: true, reason });
    state.rejected.length = Math.min(state.rejected.length, MAX_REJECTED);
    state.rejectedCount++;
    flowTick();
    return;
  }
  const event = { ...ev, enabled: true, checking: true };
  state.events.unshift(event);
  state.currentId = ev.id;
  state.events.length = Math.min(state.events.length, MAX_EVENTS);
  update();
  linkCargo(event);
  readTooltip().finally(() => {
    event.checking = false;
    flowTick();
  });
});
var ocrRun = 0;
async function readTooltip() {
  const run = ++ocrRun;
  const base = state.view?.group?.base;
  if (!base || !reader.canRead) return;
  const click = clickAt(base);
  const tried = /* @__PURE__ */ new Set();
  const until = Date.now() + OCR_WINDOW_MS;
  const answer = base.answer ??= {};
  const pending = () => run === ocrRun && reader.canRead && Date.now() < until && state.view?.group?.base === base && base.answer === answer && answer.price == null && !answer.done && !answer.ocrOff;
  state.ocrBusy = true;
  update();
  let attempt = 0;
  try {
    const t0 = Date.now();
    while (!base.linked && Date.now() - t0 < LINK_WAIT_MS) await new Promise((r) => setTimeout(r, 100));
    if (base.cargo?.price != null) return;
    while (pending()) {
      const okPrices = () => new Set((state.view.quiz?.prices ?? []).filter(([, p]) => p > 0).map(([v]) => v));
      if (!okPrices().size) break;
      const frame = await reader.frameFor(click, tried);
      if (!frame || !pending()) break;
      const mode = attempt++ % 2 ? "bright" : "raw";
      let lines = null, cropped = false;
      if (base.cargo && tracker.locked && grid.full) {
        const det = await detectLightOn(frame, grid.full).catch(() => null);
        const rect = det && tracker.rectOf(det, base.cargo);
        if (rect) {
          cropped = true;
          const p = det.pitch;
          lines = await reader.recognizeIn(
            frame,
            { x0: rect.x0 - 5 * p, y0: rect.y0 - 3 * p, x1: rect.x1 + 6 * p, y1: rect.y1 + 4 * p },
            mode
          );
          if (!lines.some((l) => /\d/.test(l.text))) lines = null;
        }
      }
      if (!lines) {
        lines = await reader.recognize(frame, mode);
        cropped = false;
      }
      if (run !== ocrRun || base.answer !== answer || state.view?.group?.base !== base) break;
      const ok = okPrices();
      let found = reader.parse(lines, state.profileId, (v) => ok.has(v));
      if (!found && cropped) {
        lines = await reader.recognize(frame, mode);
        if (run !== ocrRun || base.answer !== answer || state.view?.group?.base !== base) break;
        found = reader.parse(lines, state.profileId, (v) => ok.has(v));
      }
      if (!found) continue;
      if (base.cargo && found.typeId != null) snapCargoSize(base.cargo, found.typeId, found.price);
      if (base.cargo && !cargoFits(base.cargo, base.cargo.typeId ?? found.typeId, found.price)) {
        gridLog(`подсказка ${fmt(found.price)} не подходит к грузу ${base.cargo.key}, пропускаю`);
        continue;
      }
      answer.price = found.price;
      if (found.typeId != null && !base.cargo?.typeId) answer.typeId = found.typeId;
      answer.ocr = { typeId: found.typeId, price: found.price, size: null };
      if (found.lang && reader.lang !== found.lang) store.set(KEYS_OCR_LANG, found.lang);
      if (!base.cargo && tracker.cargos.size) {
        const det = await detectOn(frame);
        const hov = grid.hoverLog.filter((x) => x.key && x.at <= base.at - 50 && x.at >= base.at - 3300).at(-1);
        let g = hov ? tracker.cargos.get(hov.key) ?? null : null;
        if (!g && det && found.tip) {
          const votes = /* @__PURE__ */ new Map();
          for (const [x, y] of [
            [found.tip.x0 + 2, found.tip.y0 + 2],
            [found.tip.x1 - 2, found.tip.y0 + 2],
            [found.tip.x0 + 2, found.tip.y1 - 2],
            [found.tip.x1 - 2, found.tip.y1 - 2]
          ]) {
            const c = cargoAt(det, x, y), gg = c && tracker.locate(det, c);
            if (gg) votes.set(gg.key, (votes.get(gg.key) ?? 0) + 1);
          }
          if (votes.size === 1) g = tracker.cargos.get([...votes.keys()][0]) ?? null;
        }
        gridLog(`подсказка ${fmt(found.price)}: ${g ? `груз ${g.key}` : "груз под мышью не найден"}`);
        if (g) placeCargo(base, g);
      }
      if (base.cargo && cargoFits(base.cargo, base.cargo.typeId ?? found.typeId, found.price)) {
        base.cargo.price = found.price;
        if (base.cargo.typeId == null && found.typeId != null) base.cargo.typeId = found.typeId;
        snapCargoSize(base.cargo);
        for (const ev of base.cargo.events ?? []) fillFromCargo(ev);
      }
      update();
      const sizes = (state.view.quiz?.sizes ?? []).filter(([, p]) => p > 0);
      const size = sizes.length > 1 && answer.size == null ? reader.measureSize(frame, found.tip) : null;
      if (size && sizes.some(([sz]) => sizeKey(sz) === sizeKey(size))) {
        answer.size = size;
        answer.ocr.size = size;
      }
      if (answer.size || sizes.length <= 1) answer.done = true;
    }
    if (base.cargo?.price == null && answer.price == null && state.view?.group?.base === base && state.view.quiz?.items <= 1) {
      const prices = (state.view.quiz.prices ?? []).filter(([, p]) => p > 0);
      const price = prices.length === 1 ? prices[0][0] : null;
      if (price != null && (!base.cargo || cargoFits(base.cargo, base.cargo.typeId ?? null, price))) {
        answer.price = price;
        if (base.cargo) {
          base.cargo.price = price;
          if (base.cargo.typeId == null && answer.typeId != null) base.cargo.typeId = answer.typeId;
          snapCargoSize(base.cargo);
          for (const ev of base.cargo.events ?? []) fillFromCargo(ev);
        }
        gridLog(`цена ${fmt(price)} — один вариант из базы (звук однозначный)`);
        update();
      }
    }
  } catch (err) {
    console.warn("OCR:", err);
  } finally {
    if (run === ocrRun) {
      state.ocrBusy = false;
      update();
    }
  }
}
var tracker = new GridTracker();
var labels = new LabelReader(data.types.map((t) => ({ id: t.id, en: t.name })));
setTimeout(() => {
  const lang = store.get(KEYS_OCR_LANG, "eng+rus");
  if (reader.canRead) reader.load(lang).catch((err) => console.warn("OCR:", err));
  labels.load(lang).catch((err) => console.warn("OCR подписей:", err));
}, 100);
var gridWorker = null;
try {
  gridWorker = makeWorker("grid-worker.js", reviveGridWorker);
} catch (err) {
  console.error("grid-worker:", err);
}
var gridWaiting = /* @__PURE__ */ new Map();
var gridSeq = 0;
var lastScanMs = 0;
function onGridMessage({ data: { id, det, ms } }) {
  if (ms != null) lastScanMs = ms;
  gridWaiting.get(id)?.(det);
  gridWaiting.delete(id);
}
if (gridWorker) gridWorker.onmessage = onGridMessage;
function reviveGridWorker(w) {
  if (!w) return;
  gridLog("воркер сетки из файла не поднялся — взял встроенный");
  gridWorker = w;
  w.onmessage = onGridMessage;
  for (const [, fn] of gridWaiting) fn(null);
  gridWaiting.clear();
}
var GRID_STUCK_MS = 15e3;
var DETECT_TIMEOUT_MS = 5e3;
var GRID_EVERY_MS = 200;
var GRID_IDLE_MS = 2e3;
var SCAN_STEPS = [
  { light: 60, full: 700, fps: 30 },
  { light: 120, full: 1500, fps: 20 },
  { light: 200, full: 2500, fps: 12 }
];
var scanStep = 0;
var scanMs = 0;
var scanSlow = 0;
var scanFast = 0;
function scanTune(ms) {
  scanMs = scanMs ? scanMs * 0.7 + ms * 0.3 : ms;
  const step = scanMs > 60 ? 2 : scanMs > 25 ? 1 : 0;
  if (step > scanStep && ++scanSlow >= 2) {
    scanSlow = scanFast = 0;
    setScanStep(step, ms);
  } else if (step < scanStep && ++scanFast >= 2) {
    scanSlow = scanFast = 0;
    setScanStep(step, ms);
  } else if (step === scanStep) {
    scanSlow = scanFast = 0;
  }
}
function setScanStep(step, ms) {
  scanStep = step;
  gridLog(`скан ${ms.toFixed(0)} мс → режим ${step} (${SCAN_STEPS[step].light} мс, ${SCAN_STEPS[step].fps} к/с)`);
}
var scanCfg = () => SCAN_STEPS[scanStep];
var FPS_IDLE = 10;
var FPS_KEEP_MS = 5e3;
var LABEL_TRIES = 4;
var HOVER_LOG_MS = 8e3;
var grid = { busy: 0, lastAt: 0, seen: false, seenAt: 0, full: null, fullAt: 0, firstAt: 0, hardAt: 0, ocrAt: 0, hoverKey: null, hoverSince: 0, hoverSinceKey: null, hoverCell: null, hoverLog: [], journal: [], scans: 0, light: 0, found: 0, frame: "", inFrame: 0 };
var LOG_LIMIT = 5e3;
var logLines = [];
function pushLog(text) {
  const d = /* @__PURE__ */ new Date();
  logLines.push(`${d.toLocaleTimeString("ru-RU")}.${String(d.getMilliseconds()).padStart(3, "0")} ${text}`);
  if (logLines.length > LOG_LIMIT) logLines.splice(0, 1e3);
}
function gridLog(text) {
  grid.journal.push(`${(/* @__PURE__ */ new Date()).toLocaleTimeString("ru-RU")} ${text}`);
  if (grid.journal.length > 100) grid.journal.shift();
  pushLog(text);
}
var logNum = (v) => v == null ? "?" : String(v);
function saveLog() {
  const head = [
    `ABIEAR ${window.APP_VERSION ?? ""} — журнал`,
    `время: ${(/* @__PURE__ */ new Date()).toLocaleString("ru-RU")}`,
    `профиль ${logNum(state.profileId)} · карта ${state.mapPick?.name ?? state.mapPick?.id ?? state.mapPick ?? "?"} · мин. совпадение ${state.minMatch}`,
    `кадр ${grid.frame || "?"} · сканов ${grid.scans} (лёгких ${grid.light}) · сетка ${tracker.locked ? "сохранена" : "не сохранена"}`,
    `звуков ${state.events.length} · отброшено ${state.rejectedCount} · грузов ${tracker.cargos.size}`,
    "",
    "--- грузы ---",
    ...[...tracker.cargos.values()].map((g) => `  ${g.key} ${g.w}×${g.h} · тип ${g.typeId ?? "?"} (${g.label ?? "?"}) · цена ${g.price ?? "?"} · звуков ${g.events?.length ?? 0}`),
    "--- журнал ---"
  ].join("\n");
  const blob = new Blob([head + logLines.join("\n") + "\n"], { type: "text/plain;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `abiear-log-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 19).replace(/[:T]/g, "-")}.txt`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2e4);
  gridLog(`журнал сохранён: ${logLines.length} строк`);
}
var gridHint = null;
function detectHere(bitmap, light) {
  let det = null;
  const t0 = performance.now();
  try {
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    canvas.getContext("2d", { willReadFrequently: true }).drawImage(bitmap, 0, 0);
    det = light ? detectLight(canvas, light.prev, light.ox, light.oy) : detectGrid(canvas, gridHint);
    if (!light) gridHint = det;
  } catch (err) {
    console.warn("Сетка:", err);
  } finally {
    lastScanMs = performance.now() - t0;
    bitmap.close?.();
  }
  return det;
}
function postDetect(bitmap, light) {
  if (!gridWorker) return Promise.resolve(detectHere(bitmap, light));
  const id = ++gridSeq;
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      gridWaiting.delete(id);
      resolve(null);
    }, DETECT_TIMEOUT_MS);
    gridWaiting.set(id, (det) => {
      clearTimeout(timer);
      resolve(det);
    });
    gridWorker.postMessage({ id, bitmap, light }, [bitmap]);
  });
}
async function detectOn(image) {
  return postDetect(await createImageBitmap(image));
}
async function detectLightOn(image, prev) {
  const a = lightArea(prev, image.width, image.height);
  const bitmap = await createImageBitmap(image, a.x, a.y, a.w, a.h);
  return postDetect(bitmap, { prev: { pitch: prev.pitch, xs: prev.xs, ys: prev.ys, rows: prev.rows, cells: prev.cells }, ox: a.x, oy: a.y });
}
tracker.onLog = gridLog;
reader.onCapture = (frame, owned) => {
  scanGrid(frame).catch((err) => console.warn("Сетка:", err)).finally(() => {
    if (owned) frame.bitmap.close();
  });
};
var LIGHT_EARLY_MS = 1500;
var LOCK_MAX_MS = 4e3;
var LABEL_LOAD_MS = 500;
var LOCK_HARD_MS = 2e4;
async function scanGrid(frame) {
  if (linking > 0) return;
  const fresh = grid.full && frame.at - grid.fullAt < scanCfg().full;
  const light = fresh && (tracker.locked || frame.at - tracker.changedAt > LIGHT_EARLY_MS && !labelsLeft());
  const every = light ? labels.ready ? scanCfg().light : LABEL_LOAD_MS : grid.seen ? GRID_EVERY_MS : GRID_IDLE_MS;
  if (grid.busy && frame.at - grid.busy < GRID_STUCK_MS || frame.at - grid.lastAt < every) return;
  if (grid.busy) gridLog("поиск сетки завис, начинаю заново");
  const run = grid.busy = frame.at;
  grid.lastAt = frame.at;
  let image = null;
  try {
    if (light) {
      const det2 = await detectLightOn(frame.bitmap, grid.full);
      scanTune(lastScanMs);
      if (det2) {
        seenGrid(frame, det2);
        grid.light++;
        if (trackHover(det2, frame, frame.bitmap)) renderGridAll();
        else flowTick();
        return;
      }
    }
    image = await createImageBitmap(frame.bitmap);
    const t1 = performance.now();
    const det = await detectOn(image);
    const fullMs = performance.now() - t1;
    if (fullMs > 200) gridLog(`полный поиск ${fullMs.toFixed(0)} мс (воркер ${lastScanMs.toFixed(0)} мс)`);
    seenGrid(frame, det);
    grid.full = det;
    grid.fullAt = frame.at;
    grid.inFrame = det ? det.cargos.filter((c) => !c.partial).length : 0;
    if (!det) return;
    let changed = tracker.update(det, frame.at);
    if (labels.ready && !grid.ocrAt) {
      grid.ocrAt = frame.at;
      gridLog("распознаватель подписей готов");
    }
    if (tracker.cargos.size >= 4 && !grid.hardAt) {
      grid.hardAt = frame.at;
      grid.firstAt = frame.at;
    }
    if (tracker.cargos.size < 4) {
      grid.hardAt = 0;
      grid.firstAt = 0;
    }
    if (!labels.ready) grid.firstAt = frame.at;
    if (trackHover(det, frame, image)) changed = true;
    if (changed) renderGridAll();
    else flowTick();
    await readLabels(image, det);
    const onScreen = (g) => frame.at - (g.seenAt ?? 0) < 2500;
    const ready = grid.hardAt && frame.at - grid.hardAt > LOCK_HARD_MS || grid.firstAt && frame.at - grid.firstAt > LOCK_MAX_MS || [...tracker.cargos.values()].filter(onScreen).every((g) => g.typeId != null || g.labelTries >= LABEL_TRIES || g.labelDone);
    if (tracker.tryLock(frame.at, ready)) {
      gridLog(`сетка сохранена: ${tracker.cargos.size} грузов`);
      renderGridAll();
    }
  } finally {
    image?.close();
    if (grid.busy === run) grid.busy = 0;
  }
}
function seenGrid(frame, det) {
  grid.seen = !!det;
  if (det) {
    grid.seenAt = frame.at;
    grid.found++;
  }
  grid.scans++;
  grid.frame = `${frame.bitmap.width}×${frame.bitmap.height}`;
  reader.setRate(frame.at - grid.seenAt < FPS_KEEP_MS ? scanCfg().fps : FPS_IDLE);
}
function trackHover(det, frame, image) {
  const shift = tracker.matchShift(det) ?? tracker.shift;
  const hov = det.cargos.find((c) => c.hover);
  const near = hov ? tracker.locate(det, hov, shift) : null;
  const own = tracker.hoverOf(det, shift);
  const g = own ? own.g : near;
  tracker.learn(det, [g, near], shift);
  const at = tracker.tipCell(det, g, shift);
  const cell = at?.cell ?? null;
  const hoverKey = g?.key ?? null;
  const heldNow = tracker.locked ? tracker.locateRed(det, shift) : null;
  if (!heldNow) grid.hoverLog.push({ at: frame.at, key: hoverKey, cell });
  while (frame.at - grid.hoverLog[0].at > HOVER_LOG_MS) grid.hoverLog.shift();
  grid.hoverCell = cell;
  const changed = hoverKey !== grid.hoverKey;
  if (hoverKey && hoverKey !== grid.hoverSinceKey) {
    grid.hoverSince = frame.at;
    grid.hoverSinceKey = hoverKey;
    if (g) g.priceTries = 0;
  }
  if (hoverKey) grid.hoverLastAt = frame.at;
  else if (frame.at - (grid.hoverLastAt ?? 0) > HOVER_GAP_MS) grid.hoverSinceKey = null;
  grid.hoverKey = hoverKey;
  if (tracker.locked) {
    if (g) readHoverPrice(image, det, g, shift, at?.tip ?? null);
    const held = heldNow;
    if (held) {
      if (flow.holdKey !== held.key || frame.at - flow.holdSeen > HOLD_GAP_MS) flow.holdAt = frame.at;
      flow.holdKey = held.key;
      flow.holdSeen = frame.at;
    }
  }
  return changed;
}
function labelsLeft() {
  if (!labels.ready) return false;
  const now = Date.now();
  for (const g of tracker.cargos.values()) if (g.typeId == null && !g.labelDone && now - (g.seenAt ?? 0) < 2500) return true;
  return false;
}
var LABEL_GAP_MS = 250;
var LABEL_RESET_MS = 15e3;
var LABEL_BATCH = 12;
async function readLabels(image, det) {
  if (!labels.ready) return;
  const now = Date.now();
  const list = det.cargos.filter((c) => !c.partial).map((c) => ({ ...c, g: tracker.locate(det, c, tracker.shift) })).filter((c) => c.g && c.g.typeId == null && now - (c.g.labelAt ?? 0) > (c.g.labelTries >= LABEL_TRIES ? LABEL_RESET_MS : LABEL_GAP_MS)).sort((a, b) => (a.g.labelDone ? 1 : 0) - (b.g.labelDone ? 1 : 0) || (a.g.labelTries ?? 0) - (b.g.labelTries ?? 0)).slice(0, LABEL_BATCH);
  if (!list.length) return;
  const res = await labels.read(image, list.map((c, id) => ({ ...c, id, wide: !!c.g.labelWide })), det.pitch, store.get(KEYS_OCR_LANG, "eng+rus"));
  list.forEach((c, i) => {
    const r = res.get(i);
    if (tracker.cargos.get(c.g.key) !== c.g) return;
    c.g.labelAt = now;
    if (r?.typeId != null) {
      c.g.typeId = r.typeId;
      c.g.label = r.label;
      snapCargoSize(c.g);
    } else if (c.g.labelTries >= LABEL_TRIES) {
      c.g.labelTries = 0;
      if (c.g.labelWide) c.g.labelDone = true;
      else c.g.labelWide = true;
    } else c.g.labelTries = (c.g.labelTries ?? 0) + 1;
  });
  for (const c of list) for (const ev of c.g.events) fillFromCargo(ev);
  update();
}
var RED_WAIT_MS = 2500;
var RED_NEAR_MS = 1e3;
var linking = 0;
var linkDetect = async (fn) => {
  linking++;
  try {
    return await fn();
  } finally {
    linking--;
  }
};
var LINK_MIN_PITCH = 82;
async function detectFrame(f) {
  const src = f.bitmap;
  const pitch = grid.full?.pitch ?? 0;
  const scale = pitch > 0 ? Math.min(1, Math.max(0.6, LINK_MIN_PITCH / pitch)) : 1;
  if (scale > 0.95) return detectOn(src).catch(() => null);
  let small = null;
  try {
    small = await createImageBitmap(src, {
      resizeWidth: Math.round(src.width * scale),
      resizeHeight: Math.round(src.height * scale)
    });
  } catch (err) {
    return detectOn(src).catch(() => null);
  }
  try {
    return await detectOn(small).catch(() => null);
  } finally {
    small.close();
  }
}
async function linkCargo(ev) {
  const linked = () => {
    ev.linked = true;
    flowTick();
  };
  if (!tracker.cargos.size) return linked();
  const when = new Date(ev.at).toLocaleTimeString("ru-RU");
  const tried = /* @__PURE__ */ new Set();
  const click = clickAt(ev);
  const redFrom = click - (ev.delay ? 700 : 100);
  const newer = () => state.events.find((e) => e.at > ev.at);
  const mine = (f) => {
    const n = newer();
    return !n || f.at < clickAt(n) - 700;
  };
  const redIn = async (frames) => {
    for (const f of frames.slice(0, 3)) {
      tried.add(f);
      const det = await linkDetect(() => detectFrame(f));
      const g2 = det && tracker.locateRed(det);
      if (g2) {
        gridLog(`звук ${when}: красное на кадре +${f.at - ev.at} мс → груз ${g2.key}`);
        return g2;
      }
    }
    return null;
  };
  const near = (f) => f.at > redFrom && (ev.delay || f.at <= click + RED_NEAR_MS) && mine(f);
  const redFrames = reader.frames.filter(near);
  let g = await redIn(ev.delay ? redFrames.reverse() : redFrames);
  if (g) {
    placeCargo(ev, g);
    update();
    return linked();
  }
  if (flow.holdKey && flow.holdSeen >= ev.at - 1500 && flow.holdSeen <= ev.at + 400) {
    g = tracker.cargos.get(flow.holdKey) ?? null;
    if (g) {
      gridLog(`звук ${when}: груз ${g.key} держали в руке (красное) — привязал к нему`);
      placeCargo(ev, g);
      update();
      return linked();
    }
  }
  const h = grid.hoverLog.filter((x) => x.key && x.at <= click - 50 && x.at >= click - 3300).at(-1);
  g = h ? tracker.cargos.get(h.key) ?? null : null;
  if (g) gridLog(`звук ${when}: наведён груз ${g.key}${h.cell ? `, клетка ${h.cell.join(",")}` : ""} (история, −${Math.round(click - h.at)} мс до щелчка)`);
  else if (!grid.hoverLog.length) gridLog(`звук ${when}: история наведений пуста — подсветку не видели вообще`);
  else gridLog(`звук ${when}: в истории наведений за 3,3 с до щелчка никого (${grid.hoverLog.length} записей, последняя −${Math.round(click - grid.hoverLog.at(-1).at)} мс, ключ ${grid.hoverLog.at(-1).key ?? "нет"})`);
  const rd = grid.lastRead;
  if (!g && rd && rd.at >= click - 3300 && rd.at <= click + 200) {
    g = tracker.cargos.get(rd.key) ?? null;
    if (g) gridLog(`звук ${when}: перед щелчком читали подсказку груза ${g.key} (−${Math.round(click - rd.at)} мс) — привязал к нему`);
  }
  const before = g ? [] : reader.frames.filter((f) => f.at <= click - 50 && f.at >= click - 3300).reverse().slice(0, 2);
  for (const f of before) {
    const det = await linkDetect(() => detectFrame(f));
    const hov = det?.cargos.find((c) => c.hover);
    g = hov && tracker.locate(det, hov);
    gridLog(`звук ${when}: кадр −${ev.at - f.at} мс, ${!det ? "сетки нет" : !hov ? "подсветки нет" : g ? `наведён груз ${g.key}` : "груз не найден в сетке"}`);
    if (g) break;
  }
  if (g) {
    placeCargo(ev, g);
    update();
  } else gridLog(`звук ${when}: ГРУЗ НЕ НАЙДЕН — звук остался без привязки (шансы посчитаны «по любому грузу»)`);
  linked();
  if (!ev.delay) return;
  const until = Date.now() + RED_WAIT_MS;
  while (Date.now() < until && reader.canRead) {
    await new Promise((r) => setTimeout(r, 400));
    const red = await redIn(reader.frames.filter((f) => near(f) && !tried.has(f)));
    if (red) {
      if (red !== ev.cargo) {
        placeCargo(ev, red);
        update();
      }
      return;
    }
    if (newer()) {
      gridLog(`звук ${when}: был следующий звук, красное больше не жду`);
      return;
    }
  }
}
function attachCargo(ev, g) {
  ev.cargo = g;
  pruneStale(g, ev);
  if (!g.events.includes(ev)) g.events.push(ev);
  fillFromCargo(ev);
}
function pruneStale(g, ev) {
  const best = (e) => {
    let b = null;
    for (const [id, sc] of e.bySound ?? []) {
      const v = sc?.score ?? 0;
      if (!b || v > b.v) b = { id, v };
    }
    return b;
  };
  const nb = best(ev);
  if (!nb || nb.v < 0.45) return;
  for (const old of [...g.events]) {
    if (old === ev) continue;
    const ob = best(old);
    if (ob && ob.id !== nb.id && ob.v <= nb.v) {
      g.events.splice(g.events.indexOf(old), 1);
      detachCargo(old);
    }
  }
}
function detachCargo(ev) {
  const a = ev.answer ?? {};
  for (const k of a.fromGrid ?? []) delete a[k];
  delete a.fromGrid;
  ev.cargo = null;
}
function placeCargo(ev, g) {
  if (ev.cargo === g || !state.events.includes(ev)) return;
  if (ev.cargo) reattachCargo(ev, g);
  else attachCargo(ev, g);
}
function reattachCargo(ev, g) {
  const old = ev.cargo, a = ev.answer ?? {};
  for (const k of a.fromGrid ?? []) delete a[k];
  delete a.fromGrid;
  for (const e of state.events) {
    if (e !== ev && !(old && e.cargo === old && e.answer === ev.answer)) continue;
    if (old) old.events = old.events.filter((x) => x !== e);
    attachCargo(e, g);
  }
}
function fillFromCargo(ev) {
  const g = ev.cargo, a = ev.answer ??= {};
  if (!g || a.ocrOff) return;
  const set = (k, v) => {
    a[k] = v;
    (a.fromGrid ??= []).push(k);
  };
  if (a.typeId == null && g.typeId != null) set("typeId", g.typeId);
  if (a.price == null && g.price != null) set("price", g.price);
  if (a.size == null) set("size", [g.w, g.h]);
  if (a.price != null && !a.done) {
    if (!a.ocr) set("ocr", { typeId: a.typeId ?? null, price: a.price, size: a.size });
    set("done", true);
  }
}
function resetAll() {
  tracker.reset();
  state.events = [];
  state.rejected = [];
  state.rejectedCount = 0;
  state.currentId = null;
  state.manualSoundId = null;
  state.showAll = false;
  ocrRun++;
  state.ocrBusy = false;
  Object.assign(grid, { hoverKey: null, hoverSince: 0, hoverSinceKey: null, hoverCell: null, hoverLog: [], full: null, fullAt: 0, firstAt: 0, hardAt: 0, ocrAt: 0, seen: false, lastAt: 0, lastRead: null });
  Object.assign(flow, { holdKey: null, holdAt: 0, holdSeen: 0, key: "" });
  miniPop = null;
  miniCur = null;
  gridLog("сброс: сетка и звуки забыты");
  update();
  renderGridAll();
}
$("gridReset").addEventListener("click", resetAll);
function snapCargoSize(g, typeId = null, price = null) {
  if (!g || g.sizeFixed || !state.profileId) return;
  typeId ??= g.typeId ?? null;
  price ??= g.price ?? null;
  if (typeId == null && price == null) return;
  const opts = [];
  for (const p of data.pools) {
    if (p.profile !== state.profileId) continue;
    if (typeId != null && p.typeId !== typeId) continue;
    if (price != null && p.price !== price) continue;
    for (const s of p.sizes) {
      const [w, h] = s.split("x").map(Number);
      if (!opts.some(([x, y]) => x === w && y === h)) opts.push([w, h]);
    }
  }
  if (!opts.length) return;
  const fits2 = ([w, h]) => w === g.w && h === g.h || state.rotation && turns([w, h]) && w === g.h && h === g.w;
  if (opts.some(fits2)) return;
  let best = null;
  for (const [w, h] of opts) {
    const d = (w === g.w ? 0 : 4) + (h >= g.h ? h - g.h : 2 + g.h - h);
    if (!best || d < best.d) best = { w, h, d };
  }
  if (best && (best.w !== g.w || best.h !== g.h)) {
    gridLog(`груз ${g.key}: размер ${g.w}×${g.h} уточнён до ${best.w}×${best.h} по витрине`);
    g.w = best.w;
    g.h = best.h;
    for (const ev of g.events ?? []) {
      const a = ev.answer;
      if (a?.fromGrid?.includes("size")) a.size = [g.w, g.h];
    }
  }
  g.sizeFixed = true;
}
function cargoFits(g, typeId, price) {
  if (!state.profileId) return true;
  const fits2 = (s) => {
    const [w, h] = s.split("x").map(Number);
    return w === g.w && h === g.h;
  };
  return data.pools.some((p) => p.profile === state.profileId && (typeId == null || p.typeId === typeId) && (price == null || p.price === price) && p.sizes.some(fits2));
}
var shortPrice = (v) => v >= 1e6 ? `${+(v / 1e6).toFixed(v < 1e7 ? 2 : 1)}${L("м", "M")}` : `${Math.round(v / 1e3)}${L("к", "K")}`;
var TYPE_SHORT = isRu ? {
  "Flammables": ["Горюч.", 1],
  "Building Materials": ["Строй", 1],
  "Computer Parts": ["Комп.", 1],
  "Energy Items": ["Энерг.", 1],
  "Tools": ["Инстр.", 1],
  "Household Items": ["Быт", 1],
  "Medical Supplies": ["Мед.", 1],
  "Rare Medical Supplies": ["Р.Мед.", 3],
  "Collectibles": ["Колл.", 1],
  "Uncommon Collectibles": ["Н.Колл.", 2],
  "Rare Collectibles": ["Р.Колл.", 3],
  "Paper": ["Бум.", 1],
  "Instruments": ["Приб.", 1],
  "Military Items": ["Воен.", 1],
  "Uncommon Military Items": ["Н.Воен.", 2],
  "Electronics": ["Электр.", 1],
  // Одинаковая подпись у разных типов — беда: у «загадочного» и «необычного загадочного» груза
  // разные пулы и разные шансы, а в клетке было просто «Груз». Различаем приставкой.
  "Mystery Cargo": ["Груз", 1],
  "Uncommon Mystery Cargo": ["Н.Груз", 2],
  "Rare Mystery Cargo": ["Р.Груз", 3]
} : {
  "Flammables": ["Flam.", 1],
  "Building Materials": ["Build", 1],
  "Computer Parts": ["PC", 1],
  "Energy Items": ["Energy", 1],
  "Tools": ["Tools", 1],
  "Household Items": ["Home", 1],
  "Medical Supplies": ["Med", 1],
  "Rare Medical Supplies": ["R.Med", 3],
  "Collectibles": ["Coll.", 1],
  "Uncommon Collectibles": ["U.Coll.", 2],
  "Rare Collectibles": ["R.Coll.", 3],
  "Paper": ["Paper", 1],
  "Instruments": ["Instr.", 1],
  "Military Items": ["Mil.", 1],
  "Uncommon Military Items": ["U.Mil.", 2],
  "Electronics": ["Elec.", 1],
  "Mystery Cargo": ["Cargo", 1],
  "Uncommon Mystery Cargo": ["U.Cargo", 2],
  "Rare Mystery Cargo": ["R.Cargo", 3]
};
var cargoName = (g) => g.typeId != null ? model.typeName(g.typeId).name : g.label;
function heardItems(g) {
  const events = g.events.filter((e) => e.enabled);
  if (!events.length || !state.profileId) {
    g.heardSig = null;
    g.heard = null;
    return null;
  }
  const sig = `${state.profileId}|${remote.version}|${g.typeId}|${g.price}|${g.w}x${g.h}|${events.length}|${events.map((e) => e.id).join(",")}`;
  if (g.heardSig === sig) return g.heard;
  g.heardSig = sig;
  g.heard = heardItemsCalc(g, events);
  return g.heard;
}
function heardItemsCalc(g, events) {
  const allowedSounds = matchingSounds({ events }, remote.possible(state.profileId, g.typeId, g.price));
  let best = 0;
  for (const e of events) for (const [id, m] of e.bySound) if (allowedSounds.has(id)) best = Math.max(best, m.score ?? 0);
  g.bestScore = best;
  const rows = rowsFor(`cargo:${g.key}`, g.typeId, g.price, { events: events.map((e) => e.bySound), allowedSounds }, [g.w, g.h]);
  if ((g.logRows ?? -1) !== rows.length) {
    g.logRows = rows.length;
    pushLog(rows.length ? `груз ${g.key}: ${rows.length} строк` : `груз ${g.key}: ПУСТО — тип ${g.typeId ?? "?"}, цена ${g.price ?? "?"}, размер ${g.w}×${g.h}, звуков ${events.length}, разрешённые звуки [${[...allowedSounds].join(",")}]`);
  }
  const gemKey = `${rows.length}|${gemOk(g)}`;
  if (gemKey !== g.logGem) {
    g.logGem = gemKey;
    const redAll = rows.length ? rows.reduce((sum, r) => sum + (r.item.rarity >= RED_RARITY ? r.p : 0), 0) : 0;
    if (redAll >= 0.9995 && !gemOk(g)) {
      pushLog(`груз ${g.key}: алмаз НЕ показан — звук ${best.toFixed(2)}${g.priceGuess ? ", цена угадана по соседним клеткам" : ""}, тип ${g.typeId ?? "?"}`);
    }
  }
  const byItem = /* @__PURE__ */ new Map();
  for (const r of rows) {
    let cur2 = byItem.get(r.item.id);
    if (!cur2) {
      cur2 = { item: r.item, p: 0, cargoPrice: r.cargoPrice, ok: isGood(r), rowP: -1 };
      byItem.set(r.item.id, cur2);
    }
    cur2.p += r.p;
    if (r.p > cur2.rowP) {
      cur2.rowP = r.p;
      cur2.cargoPrice = r.cargoPrice;
      cur2.ok = isGood(r);
    }
  }
  const all = [...byItem.values()].filter((x) => x.p >= 0.01).sort((a, b) => b.p - a.p);
  const items = all.filter((x) => x.item.rarity !== 4);
  if (!items.length && all.length) items.push(all[0]);
  if (!items.length) return null;
  items.stats = heardStats([...byItem.values()]);
  const cur = g.showId != null ? items.find((x) => x.item.id === g.showId) : null;
  if (cur && cur !== items[0] && cur.p >= items[0].p / 1.5) {
    items.splice(items.indexOf(cur), 1);
    items.unshift(cur);
  }
  g.showId = items[0].item.id;
  return items;
}
var RED_RARITY = 6;
var GOLD_RARITY = 5;
var RED_MIN = 0.01;
var RED_BLINK_MS = 1e3;
var PROFIT_MIN = 5e4;
var isGood = (r) => typeof r.ok === "boolean" ? r.ok : r.item.contactPrice - (r.cargoPrice ?? 0) >= PROFIT_MIN;
var RED_SHOW = 0.02;
function heardStats(list) {
  const rows = list ?? [];
  const m = (r) => (r.item.contactPrice ?? 0) - (r.cargoPrice ?? 0);
  const p = rows.reduce((s, r) => s + r.p, 0);
  const pay = rows.reduce((s, r) => s + (m(r) >= PROFIT_MIN ? r.p : 0), 0);
  const margin = p > 0 ? rows.reduce((s, r) => s + r.p * m(r), 0) / p : NaN;
  return { pay, margin, good: margin >= PROFIT_MIN };
}
function cargoMarks(heard, crateOk = true) {
  const list = heard ?? [];
  const redP = list.reduce((sum, x) => sum + (x.item.rarity >= RED_RARITY ? x.p : 0), 0);
  const red = redP >= RED_SHOW;
  const gold = crateOk && !red && list.some((x) => x.item.rarity === GOLD_RARITY && x.p >= RED_SHOW && x.ok);
  return { redP, red, gold };
}
var ICON_MAX = 200;
var ICON_GAP = 2;
var ICON_STRIP = 4;
var TITLE_ITEMS = 12;
var GEM_GUESS_MATCH = 0.85;
var gemOk = (g) => {
  if (!g || g.typeId == null || g.price == null) return false;
  const score = g.bestScore ?? 0;
  return score >= (g.priceGuess ? GEM_GUESS_MATCH : WEAK_MATCH);
};
var itemAspect = (item) => item.size ? item.size[0] / item.size[1] : 1;
var fitIcon = (a, w, h) => {
  const iw = Math.min(w, h * a);
  return { w: iw, h: iw / a };
};
function iconGrid(aspects, extra, W, H) {
  const k = aspects.length + extra;
  let best = null;
  for (let cols = 1; cols <= k; cols++) {
    const rows = Math.ceil(k / cols);
    const w = (W - (cols - 1) * ICON_GAP) / cols, h = (H - (rows - 1) * ICON_GAP) / rows;
    const icons = aspects.map((a) => fitIcon(a, w, h - ICON_STRIP));
    const min = Math.min(...icons.map((s) => Math.min(s.w, s.h)));
    const area = icons.reduce((sum, s) => sum + s.w * s.h, 0);
    if (!best || min > best.min + 0.5 || min > best.min - 0.5 && area >= best.area) best = { cols, w, h, min, area };
  }
  return best;
}
function heardHtml(heard, box, price = null, blink = 0, stripH = 0, solid = true) {
  const { W, H } = box;
  const bad = (x) => !x.ok;
  const { redP, red } = cargoMarks(heard);
  const over = (html, cls, style = "") => `<span class="${cls}" style="left:${box.s}px;top:${box.t}px;width:${W}px;height:${H}px;${style}">${html}</span>`;
  if (redP >= 0.9995 && solid) return over("💎", "g-trash g-gem");
  const goodCrate = (heard.stats ?? heardStats(heard)).good;
  const iconsIn = (bx) => {
    const { W: W2, H: H2 } = bx;
    const list = heard.length > 1 ? [heard.find((x2) => !bad(x2) && x2.p >= RED_SHOW) ?? heard[0]] : heard;
    const x = list[0];
    const isBad = !goodCrate || bad(x);
    const sq = Math.floor(Math.min(H2 - ICON_STRIP, ICON_MAX));
    const a = isBad ? 1 : itemAspect(x.item);
    const g0 = iconGrid([a], 0, W2, H2);
    const fit = fitIcon(a, g0.w, g0.h - ICON_STRIP), scale = Math.min(1, ICON_MAX / Math.max(fit.w, fit.h));
    const sizes = [{ w: isBad ? sq : Math.floor(fit.w * scale), h: isBad ? sq : Math.floor(fit.h * scale) }];
    const cw = Math.max(...sizes.map((z) => z.w)), ch = Math.max(...sizes.map((z) => z.h)) + ICON_STRIP;
    const cells = list.map((it, i) => {
      const rc = RARITY[it.item.rarity] ?? RARITY[1];
      const { w, h } = sizes[i];
      const mt = ch - h - ICON_STRIP, ml = cw - w >> 1;
      const img = isBad ? `<span class="g-poop" title="${L("не выгодно: запас меньше 50к", "not profitable: under 50k margin")}">💩</span>` : itemImg(it.item.iconUrl);
      const nostrip = it.item.rarity >= RED_RARITY ? " nostrip" : "";
      return `<span class="g-ic${isBad ? " dead" : ""}${nostrip}" style="--rc:${rc.color};width:${w}px;height:${h + ICON_STRIP}px;margin:${mt}px ${cw - w - ml}px 0 ${ml}px;--sw:${w}px;--sh:${h}px">${img}</span>`;
    });
    const rows = Math.ceil(cells.length / g0.cols), cols = Math.min(g0.cols, cells.length), width = cols * cw + (cols - 1) * ICON_GAP;
    const left = bx.s + Math.floor((W2 - width) / 2), top = bx.t + Math.floor((H2 - rows * ch - (rows - 1) * ICON_GAP) / 2);
    return `<span class="g-heard" style="left:${left}px;top:${top}px;width:${width}px;--cw:${cw}px;--ch:${ch}px">${cells.join("")}</span>`;
  };
  if (red) {
    const pc = pct(redP), wide = W >= 64;
    const html = wide ? `RED&nbsp;${pc}` : pc;
    const rFs = Math.max(12, Math.min(24, (W - 6) / ((wide ? `RED ${pc}` : pc).length * 0.62)));
    const bl = redP >= RED_MIN ? " blink" : "", delay = redP >= RED_MIN ? `animation-delay:${blink}ms` : "";
    const fsz = `font-size:${rFs.toFixed(1)}px;`;
    if (!goodCrate) return over(html, `g-redchance${bl}`, fsz + delay);
    const PH = Math.min(Math.max(16, Math.round(rFs * 1.15) + 6), Math.max(16, H - 16));
    const plate = `<span class="g-redchance${bl}" style="left:${box.s}px;top:${box.t + H - PH}px;width:${W}px;height:${PH}px;${fsz}${delay}">${html}</span>`;
    return iconsIn(box) + plate;
  }
  const sh = Math.min(stripH, Math.max(0, H - 30));
  return iconsIn(sh ? { ...box, t: box.t + sh, H: H - sh } : box);
}
function priceTag(g, rows, mini) {
  if (!mini || g.w * g.h > 1) {
    if (g.price != null) return `<span class="g-price">${shortPrice(g.price)}</span>`;
    const calc = rows?.find((r) => r.cargoPrice != null)?.cargoPrice ?? null;
    if (calc != null) return `<span class="g-price calc" title="${esc(L("цена не прочитана с экрана — расчётная", "price not read from screen — estimated"))}">≈${shortPrice(calc)}</span>`;
  }
  return "";
}
function gridHtml(mini = false, cell = GRID_CELL_MIN) {
  const bounds = tracker.bounds();
  if (!bounds) return "";
  const { r0, r1 } = bounds;
  const occ = tracker.occupancy();
  const cur = state.view?.group?.base.cargo?.key;
  const out = [];
  const blink = -(Date.now() % RED_BLINK_MS);
  const gap = mini ? MINI_GAP : GRID_GAP;
  const pad = mini ? { t: 2, s: 2, b: 2 } : { t: 4, s: 4, b: Math.round(Math.min(12, Math.max(8, cell * 0.135))) + 5 };
  for (let r = r0; r < r1; r++) for (let q = 0; q < 9; q++) {
    if (!occ.has(`${q},${r}`)) out.push(`<i class="g-empty" style="grid-area:${r - r0 + 1}/${q + 1}"></i>`);
  }
  for (const g of tracker.cargos.values()) {
    const heard = heardItems(g);
    const en = g.typeId != null ? model.typeName(g.typeId).en : null;
    const [short, tier] = TYPE_SHORT[en] ?? [g.label ?? "?", 1];
    const rows = ruleRows(g, heard) ?? heard;
    const stats = rows === heard && heard?.stats ? heard.stats : heardStats(rows);
    let marks = cargoMarks(rows, stats.good);
    const pay = stats.pay;
    const red = marks.red, gold = marks.gold;
    const cw = g.w * cell + (g.w - 1) * gap - 2 - 2 * pad.s;
    const pTxt = `${Math.round(pay * 100)}%`;
    const wide = cw >= 64;
    const cTxt = mini ? `<span>${L("Окуп", "Payoff")}</span><span>${pTxt}</span>` : wide ? `Окуп ${pTxt}` : `<span>Окуп</span><span>${pTxt}</span>`;
    const cFs = mini ? Math.max(7, Math.min(10, cell * 0.26)) : wide ? Math.max(10, Math.min(17, (cw - 8) / (9 * 0.62))) : Math.max(10, Math.min(15, (cw - 8) / (4 * 0.62)));
    const strip = 0;
    const cls = ["g-cargo", `tier${tier}`, heard && "heard", red && "red", gold && "gold", g.key === cur && "cur", g.key === grid.hoverKey && "now"].filter(Boolean).join(" ");
    const title = [
      [cargoName(g) ?? L("Тип не прочитан", "Type not read"), g.price != null && fmt(g.price), `${g.w}×${g.h}`].filter(Boolean).join(" · "),
      ...(heard ?? []).slice(0, TITLE_ITEMS).map((x) => `${x.item.name} ${pct(x.p)}`),
      heard?.length > TITLE_ITEMS && `+${heard.length - TITLE_ITEMS}`
    ].filter(Boolean).join("\n");
    const box = { ...pad, W: g.w * cell + (g.w - 1) * gap - 2 - 2 * pad.s, H: g.h * cell + (g.h - 1) * gap - 2 - pad.t - pad.b };
    out.push(`<button class="${cls}" data-cargo="${g.key}" title="${esc(title)}" style="grid-area:${g.r - r0 + 1}/${g.q + 1}/span ${g.h}/span ${g.w}${red ? `;animation-delay:${blink}ms` : ""}">
      ${rows?.length ? heardHtml(rows, box, g.price, blink, strip, gemOk(g)) : `<span class="g-label">${esc(mini ? short : cargoName(g) ?? "")}</span>`}
      ${rows?.length && stats.good && marks.redP < 0.9995 ? `<span class="g-chance${mini ? " tiny" : ""}" style="color:${pay >= 0.5 ? "#7ee787" : "#e8c46b"};font-size:${cFs.toFixed(1)}px">${cTxt}</span>` : ""}
      ${mini ? "" : `<span class="g-size">${g.w}×${g.h}</span>`}
      ${priceTag(g, rows, mini)}
    </button>`);
  }
  return out.join("");
}
var gridLastHtml = "";
function renderGrid() {
  const has = tracker.cargos.size > 0;
  $("gridBox").hidden = !has;
  if (!has) return;
  const { r0, r1 } = tracker.bounds();
  $("gridBox").style.setProperty("--rows", r1 - r0);
  fitMainGrid(r1 - r0);
  const cell = parseFloat(getComputedStyle($("gridBox")).getPropertyValue("--gcell")) || GRID_CELL_MIN;
  const html = gridHtml(false, cell);
  if (html !== gridLastHtml) $("grid").innerHTML = gridLastHtml = html;
  const typed = [...tracker.cargos.values()].filter((g) => g.typeId != null).length;
  const priced = [...tracker.cargos.values()].filter((g) => g.price != null).length;
  $("gridNote").textContent = `${tracker.cargos.size} ${L("грузов", "cargos")}${typed < tracker.cargos.size ? ` · ${L("подписи", "labels")}: ${typed}` : ""} · ${L("цены", "prices")}: ${priced}/${tracker.cargos.size}${tracker.locked ? L(" · сохранена", " · saved") : ""}`;
}
var GRID_CELL_MIN = 40;
var GRID_GAP = 3;
var GRID_BOTTOM = 16;
var gridWide = matchMedia("(min-width: 1100px)");
function fitMainGrid(rows = +$("gridBox").style.getPropertyValue("--rows") || 1) {
  const box = $("gridBox");
  if (box.hidden || !gridWide.matches) return;
  const top = document.querySelector(".now-card").getBoundingClientRect().top + scrollY + $("grid").offsetTop;
  const h = innerHeight - top - GRID_BOTTOM;
  if ((h - (rows - 1) * GRID_GAP) / rows >= GRID_CELL_MIN) box.style.setProperty("--grid-h", `${h}px`);
  else box.style.removeProperty("--grid-h");
}
addEventListener("resize", () => renderGrid());
var GRID_RENDER_MS = 80;
var gridRenderAt = 0;
var gridRenderTimer = 0;
function renderGridAll() {
  const wait = GRID_RENDER_MS - (performance.now() - gridRenderAt);
  if (wait > 0) {
    if (!gridRenderTimer) gridRenderTimer = setTimeout(() => {
      gridRenderTimer = 0;
      renderGridAll();
    }, wait);
    renderNow();
    renderMini();
    return;
  }
  clearTimeout(gridRenderTimer);
  gridRenderTimer = 0;
  gridRenderAt = performance.now();
  renderGrid();
  renderNow();
  renderMini();
}
function onGridClick(e) {
  const key = e.target.closest?.("[data-cargo]")?.dataset.cargo;
  const g = key && tracker.cargos.get(key);
  const last = g?.events.filter((ev) => ev.enabled).sort((a, b) => b.at - a.at)[0];
  if (!last) return;
  state.currentId = last.id;
  update();
}
$("grid").addEventListener("click", onGridClick);
var HOVER_TRIES = 14;
var HOVER_SCANS = 200;
var TIP_WAIT_MS = 250;
var HOVER_GAP_MS = 300;
var HOLD_GAP_MS = 1200;
var NO_SOUND_MS = 4e3;
var DONE_MS = 15e3;
var CHECK_MAX_MS = 8e3;
var flow = { holdKey: null, holdAt: 0, holdSeen: 0, key: "" };
var hoverOcr = { busy: false, key: null };
function readHoverPrice(image, det, g, shift, tip) {
  if (!g || hoverOcr.busy || g.price != null && !g.priceGuess || (g.priceTries ?? 0) >= HOVER_TRIES || (g.priceScans ?? 0) >= HOVER_SCANS) return;
  if (!tip && Date.now() - grid.hoverSince < TIP_WAIT_MS) return;
  const hov = tracker.rectOf(det, g, shift);
  if (!hov) return;
  const p = det.pitch;
  const grow = (g.priceTries ?? 0) >= 4 ? 0.9 : 0.3;
  const box = tip ? { x0: tip.x0 - grow * p, y0: tip.y0 - grow * p, x1: tip.x1 + grow * p, y1: tip.y1 + grow * p } : { x0: hov.x0 - 5 * p, y0: hov.y0 - 3 * p, x1: hov.x1 + 6 * p, y1: hov.y1 + 4 * p };
  const x0 = Math.max(0, Math.round(box.x0)), y0 = Math.max(0, Math.round(box.y0));
  const x1 = Math.min(image.width, Math.round(box.x1)), y1 = Math.min(image.height, Math.round(box.y1));
  if (x1 - x0 < p || y1 - y0 < p) return;
  const small = p < SMALL_UI_PITCH;
  const k = small ? Math.min(4, 144 / p) : Math.min(2, Math.max(1, 128 / p));
  const crop = document.createElement("canvas");
  crop.width = Math.round((x1 - x0) * k);
  crop.height = Math.round((y1 - y0) * k);
  const cg = crop.getContext("2d", { willReadFrequently: true });
  if (small) cg.imageSmoothingQuality = "high";
  cg.drawImage(image, x0, y0, x1 - x0, y1 - y0, 0, 0, crop.width, crop.height);
  g.priceTries = (g.priceTries ?? 0) + 1;
  g.priceScans = (g.priceScans ?? 0) + 1;
  hoverOcr.busy = true;
  hoverOcr.key = g.key;
  flowTick();
  const mode = small ? g.priceScans % 2 ? "raw" : "bright" : g.priceScans % 2 ? "bright" : "raw";
  const t0 = performance.now(), how = `${tip ? "плашка" : "кусок"} ${crop.width}×${crop.height} ${mode}`;
  reader.recognize(crop, mode).then((lines) => {
    const ms = Math.round(performance.now() - t0);
    if (tracker.cargos.get(g.key) !== g || g.price != null) return;
    const found = reader.parse(lines, state.profileId, (v) => cargoFits(g, g.typeId, v));
    if (!found || g.typeId != null && found.typeId != null && found.typeId !== g.typeId) {
      if (!lines.some((l) => /\d[\d  ,.]{2,}\d/.test(l.text))) g.priceTries--;
      gridLog(`наведён ${g.key}: цену не прочитал (${g.priceTries}/${HOVER_TRIES}; ${how}, ${ms} мс)`);
      return;
    }
    g.price = found.price;
    g.priceGuess = false;
    notePrice(g);
    grid.lastRead = { key: g.key, at: Date.now() };
    if (g.typeId == null && found.typeId != null) g.typeId = found.typeId;
    gridLog(`наведён ${g.key}: цена ${fmt(found.price)} (${how}, ${ms} мс, ${Math.round(Date.now() - grid.hoverSince)} мс с наведения)`);
    for (const ev of g.events) fillFromCargo(ev);
    update();
  }).catch((err) => console.warn("Цена при наведении:", err)).finally(() => {
    hoverOcr.busy = false;
    renderGridAll();
  });
}
var FLOW_STEPS = isRu ? ["Сетка", "Наведи", "Перетащи", "Проверка"] : ["Grid", "Hover", "Drag", "Check"];
function flowStep() {
  if (!state.listening || !state.mapPick || !reader.canRead) return null;
  const now = Date.now();
  if (!tracker.locked) {
    const n = tracker.cargos.size;
    return n ? { step: 0, text: L("Прокрути сетку до конца", "Scroll the grid to the end"), sub: `${L("Найдено грузов", "Cargos found")}: ${n}`, busy: true } : { step: 0, text: L("Открой торговца", "Open the merchant"), sub: L("Сетка найдётся сама", "The grid is found automatically") };
  }
  const last = state.events[0];
  if (last?.checking && !(last.linked && last.answer?.price != null) && now - last.at < CHECK_MAX_MS) {
    return { step: 3, text: L("Проверяю звук", "Checking sound"), sub: !last.linked ? L("Ищу груз", "Finding cargo") : state.ocrBusy ? L("Читаю цену", "Reading price") : L("Считаю шансы", "Computing odds"), busy: true };
  }
  const rej = state.rejected[0];
  const rejFresh = (t) => rej && rej.at >= t && !(last && last.at > rej.at);
  const holding = flow.holdKey && now - flow.holdSeen < HOLD_GAP_MS;
  if (holding && !(last && last.at >= flow.holdAt - 1500)) {
    if (rejFresh(flow.holdAt - 1500)) return { step: 2, warn: true, text: L("Звук не похож на груз", "Doesn't sound like cargo"), sub: L("Положи и перетащи ещё раз", "Drop it and drag again") };
    if (now - flow.holdAt > NO_SOUND_MS) return { step: 2, warn: true, text: L("Звука нет", "No sound"), sub: L("Проверь, что звук игры передаётся", "Check that game audio is shared") };
    return { step: 2, text: L("Слушаю", "Listening"), sub: L("Положи груз на место", "Put the cargo down"), busy: true };
  }
  const hover = grid.hoverKey && tracker.cargos.get(grid.hoverKey);
  if (last && now - last.at < DONE_MS && (!hover || hover === last.cargo)) {
    const top = last.cargo ? heardItems(last.cargo)?.[0] : null;
    return { step: 4, text: L("Готово", "Done"), sub: top ? `${top.item.name} ${pct(top.p)} · ${L("наведи на следующий груз", "hover the next cargo")}` : L("Наведи на следующий груз", "Hover the next cargo") };
  }
  if (hover) {
    const name = cargoName(hover) ?? `${hover.w}×${hover.h}`;
    if (hover.price != null) return { step: 2, text: L("Перетащи груз", "Drag the cargo"), sub: `${name} · ${fmt(hover.price)}` };
    if (state.profileId && (hover.priceTries ?? 0) < HOVER_TRIES && (hover.priceScans ?? 0) < HOVER_SCANS) return { step: 1, text: L("Читаю цену", "Reading price"), sub: L("Держи курсор на грузе", "Keep the cursor on the cargo"), busy: true };
    return { step: 2, text: L("Перетащи груз", "Drag the cargo"), sub: L("Цену не прочитал, попробую по звуку", "Couldn't read the price, will try by sound") };
  }
  if (rejFresh(now - 4e3)) return { step: 1, warn: true, text: L("Звук не похож на груз", "Doesn't sound like cargo"), sub: L("Наведи на груз и перетащи ещё раз", "Hover the cargo and drag again") };
  return { step: 1, text: L("Наведи курсор на груз", "Hover the cursor over a cargo") };
}
function flowHtml() {
  const f = flowStep();
  if (!f) return "";
  const li = FLOW_STEPS.map((s, i) => {
    const cls = i < f.step ? "done" : i === f.step ? "on" : "";
    return `<li class="${cls}"><b>${i + 1}</b><span>${s}</span></li>`;
  }).join("");
  return `<div class="flow${f.warn ? " warn" : f.step === 4 ? " ok" : ""}">
    <ol class="flow-steps">${li}</ol>
    <div class="flow-now">
      ${f.busy ? `<span class="flow-spin" aria-hidden="true"></span>` : ""}
      <span class="flow-text">${esc(f.text)}</span>
      ${f.sub ? `<span class="flow-sub">${esc(f.sub)}</span>` : ""}
    </div>
    ${f.busy ? `<div class="flow-bar" aria-hidden="true"><i></i></div>` : ""}
  </div>`;
}
function flowTick() {
  const key = JSON.stringify(flowStep());
  if (key === flow.key) return;
  flow.key = key;
  renderNow();
  renderMini();
}
setInterval(flowTick, 500);
function miniHtml() {
  const rowsN = (({ r0, r1 } = { r0: 0, r1: 1 }) => r1 - r0)(tracker.bounds() ?? void 0);
  const { debug } = miniPanels;
  const map = `<section class="mini-map">
      ${rainHtml()}
      ${flowHtml()}
      <div class="mini-map-head">
        <span>${L("Сетка", "Grid")}${tracker.locked ? L(" · сохранена", " · saved") : ""}</span>
        <button class="mini-debug" data-mini-reset title="${L("Забыть сетку и все звуки", "Forget the grid and all sounds")}">${icon("reset")}${L("Сбросить", "Reset")}</button>
        <button class="mini-debug ${debug ? "on" : ""}" data-mini-panel="debug" aria-pressed="${debug}">${icon("activity")}${L("Дебаг", "Debug")}</button>
        ${debug ? `<button class="mini-debug" data-mini-savelog title="${L("Сохранить журнал в файл", "Save the log to a file")}">${icon("activity")}${L("Журнал .txt", "Log .txt")}</button>` : ""}
      </div>
      ${tracker.cargos.size ? `<div class="mgrid-scroll"><div class="mgrid" data-rows="${rowsN}">${gridHtml(true, miniCell || 36)}</div></div>` : `<p class="mini-empty">${L("Откройте торговца, сетка появится здесь", "Open the merchant, the grid shows up here")}</p>`}
    </section>`;
  return `<div class="mini-wrap ${debug ? "" : "only-grid"}">${map}${debug ? debugHtml() : ""}</div>${miniPopHtml()}`;
}
function debugHtml() {
  const { rows = [] } = state.view ?? {};
  const shownRows = viewRows(rows);
  const single = singleItem(shownRows);
  const heard = !!state.view?.group || state.manualSoundId != null;
  const groups = !heard ? [] : single ? [{ single: true, rows: [single] }] : groupRows(shownRows).slice(0, 3);
  const { ev, profit } = summarize(rows);
  const answer = state.view?.group?.base.answer ?? {};
  const typeId = answer.typeId ?? state.typeId;
  const g = state.view?.group?.base.cargo;
  const price = answer.price ?? state.price ?? g?.price ?? rows[0]?.cargoPrice ?? null;
  const priceCalc = answer.price == null && state.price == null;
  const cargo = [(g && cargoName(g)) ?? (typeId == null ? L("Любой груз", "Any cargo") : model.typeName(typeId).name), g && `${g.w}×${g.h}`, price != null && `${priceCalc ? "≈" : ""}${fmt(price)}`].filter(Boolean).join(" · ");
  const last = state.events[0];
  const stats = (isRu ? [
    `звуков ${state.events.length}`,
    `отброшено ${state.rejectedCount}`,
    `грузов ${tracker.cargos.size}`,
    `сетка ${grid.found}/${grid.scans} кадров (лёгких ${grid.light})${grid.frame ? ` · кадр ${grid.frame} · в кадре ${grid.inFrame}` : ""} · ${reader.rate ?? "-"} к/с`,
    grid.hoverKey && `наведён ${grid.hoverKey}${grid.hoverCell ? ` клетка ${grid.hoverCell.join(",")}` : ""}`,
    last && `пик ${last.peakDb?.toFixed?.(1) ?? "-"} дБ${last.quiet ? " · тихий" : ""}`
  ] : [
    `sounds ${state.events.length}`,
    `rejected ${state.rejectedCount}`,
    `cargos ${tracker.cargos.size}`,
    `grid ${grid.found}/${grid.scans} frames (light ${grid.light})${grid.frame ? ` · frame ${grid.frame} · in frame ${grid.inFrame}` : ""} · ${reader.rate ?? "-"} fps`,
    grid.hoverKey && `hover ${grid.hoverKey}${grid.hoverCell ? ` cell ${grid.hoverCell.join(",")}` : ""}`,
    last && `peak ${last.peakDb?.toFixed?.(1) ?? "-"} dB${last.quiet ? " · quiet" : ""}`
  ]).filter(Boolean).join(" · ");
  const det = [
    engine.nccReady ? `${engine.builtinTemplates.length} ${L("эталонов", "refs")}${engine.nccInline ? ` (${L("в основном потоке", "inline")})` : ""}` : L("детектор НЕ ГОТОВ", "detector NOT READY"),
    `${L("лучшее", "best")} ${(engine.nccStats?.best ?? 0).toFixed(2)}`,
    `${L("порог", "thr")} ${(engine.nccThr ?? 0.38).toFixed(2)}`,
    engine.nccStats ? `${L("окон", "hops")} ${engine.nccStats.hops}${engine.nccStats.skipped ? ` (${L("пропущено", "skipped")} ${engine.nccStats.skipped})` : ""}` : "",
    engine.nccError ? `${L("причина", "reason")}: ${engine.nccError}` : ""
  ].filter(Boolean).join(" · ");
  return `<div class="mini-main">
    <div class="mini-dbg">${esc(stats)}</div>
    <div class="mini-dbg">${esc(det)}</div>
    ${engine.nccError ? `<div class="mini-dbg mini-err">⚠ ${esc(engine.nccError)}</div>` : ""}
    <div class="mini-head">${nowHtml({ steps: false, rain: false })}</div>
    ${answer.done ? "" : quizHtml()}
    ${state.view?.group ? `<div class="mini-cargo">${esc(cargo)}${rows.length ? ` · ${L("ожидаемо", "expected")} <b>${fmt(ev)}</b> · ${L("окупит", "profit")} <b>${pct(profit)}</b>` : ""}</div>` : ""}
    ${groups.map((g2) => `<section class="category">
      ${g2.single ? "" : `<div class="category-head static">
        <span class="category-name">${esc(g2.typeName)} <span class="category-price">${g2.price != null ? fmt(g2.price) : "?"}</span></span>
        <span class="category-prob"><b>${pct(g2.p)}</b></span>
      </div>`}
      <div class="category-body">${g2.rows.map((r) => {
    const rc = RARITY[r.item.rarity] ?? RARITY[1];
    return `<div class="mini-item" style="--rc:${rc.color}">${isGood(r) ? itemImg(r.item.iconUrl) : `<span class="row-poop" title="${L("не выгодно: запас меньше 50к", "not profitable: under 50k margin")}">💩</span>`}<span>${esc(r.item.name)}</span><span class="muted">${fmt(r.item.contactPrice)}</span><b>${pct(r.p)}</b></div>`;
  }).join("")}</div>
    </section>`).join("")}
  </div>`;
}
var miniPop = null;
var POP_SIZES = [64, 56, 48, 40, 32];
var POP_COLS = 3;
var POP_GAP = 6;
var POP_OUTER = 32 + 2;
var POP_HEAD = 44;
var POP_RED = 40;
var POP_PAD_W = 20;
var POP_PAD_H = 12;
var POP_TILE_H = 45;
var POP_TILE_W = 36;
function popLayout(n, withRed) {
  const win = pip ?? window;
  const availW = win.innerWidth - POP_OUTER - POP_PAD_W;
  const availH = win.innerHeight - POP_OUTER - POP_HEAD - POP_PAD_H - (withRed ? POP_RED : 0);
  let last;
  for (const size of POP_SIZES) {
    const tile = size + POP_TILE_W, maxCols = Math.max(1, Math.floor((availW + POP_GAP) / (tile + POP_GAP)));
    for (let cols = Math.min(POP_COLS, maxCols); cols <= maxCols; cols++) {
      const rows = Math.ceil(n / cols);
      last = { size, tile, cols };
      if (rows * (size + POP_TILE_H) + (rows - 1) * POP_GAP <= availH) return last;
    }
  }
  return last;
}
function miniPopHtml() {
  const g = miniPop && tracker.cargos.get(miniPop);
  const heard = g && heardItems(g);
  if (!heard) return "";
  const rows = ruleRows(g, heard) ?? heard;
  const modelPrice = g.price ?? rows.find((r) => r.cargoPrice != null)?.cargoPrice ?? null;
  const head = [
    cargoName(g) ?? L("Груз", "Cargo"),
    `${g.w}×${g.h}`,
    modelPrice != null && `${g.price != null ? "" : "≈"}${fmt(modelPrice)}`
  ].filter(Boolean).join(" · ");
  const stats = heardStats(rows);
  const { ev } = summarize(rows);
  const { redP: red } = cargoMarks(rows);
  const { size, tile, cols } = popLayout(rows.length, red >= RED_SHOW);
  const width = cols * tile + (cols - 1) * POP_GAP + POP_PAD_W + 2;
  return `<div class="mini-pop">
    <div class="mini-pop-card" role="dialog" aria-label="${esc(head)}" style="width:${width}px">
      <div class="mini-pop-head"><span>${esc(head)}</span><button class="mini-pop-x" aria-label="${L("Закрыть", "Close")}">×</button></div>
      ${red >= RED_SHOW ? `<div class="mini-pop-red"><span>RED</span><b>${pct(red)}</b></div>` : ""}
      <div class="mini-pop-sum"><span>${L("Окуп", "Payoff")}</span><b>${pct(stats.pay)}</b><span>${L("ожидаемо", "expected")}</span><b>${fmt(ev)}</b></div>
      <div class="mini-pop-grid" style="--pop-tile:${tile}px;--pop-ic:${size}px">${rows.map((x) => {
    const rc = RARITY[x.item.rarity] ?? RARITY[1];
    const a = itemAspect(x.item), w = Math.round(a >= 1 ? size : size * a), h = Math.round(a >= 1 ? size / a : size);
    return `<div class="mini-pop-tile" title="${esc(`${x.item.name} · ${fmt(x.item.contactPrice)}`)}">
          <span class="mini-pop-ic"><span class="g-ic" style="--rc:${rc.color};width:${w}px;height:${h + ICON_STRIP}px">${!x.ok ? `<span class="g-poop" title="${L("не выгодно: запас меньше 50к", "not profitable: under 50k margin")}">💩</span>` : itemImg(x.item.iconUrl)}</span></span>
          <b>${pct(x.p)}</b>
        </div>`;
  }).join("")}</div>
    </div>
  </div>`;
}
function closeMiniPop() {
  if (miniPop == null) return;
  miniPop = null;
  renderMini();
}
function onMiniPop(e) {
  if (e.target.matches?.(".mini-pop") || e.target.closest?.(".mini-pop-x")) return closeMiniPop();
  const key = e.target.closest?.("[data-cargo]")?.dataset.cargo;
  const g = key && tracker.cargos.get(key);
  if (!g || (heardItems(g)?.length ?? 0) < 2) return;
  miniPop = key;
  renderMini();
}
var miniPanels = { debug: !!store.get("miniDebug", false) };
function onMiniPanel(e) {
  if (e.target.closest?.("[data-mini-savelog]")) {
    saveLog();
    return;
  }
  if (!e.target.closest?.("[data-mini-panel]")) return;
  miniPanels.debug = !miniPanels.debug;
  store.set("miniDebug", miniPanels.debug);
  miniCur = null;
  renderMini();
}
function dropPip() {
  pip = null;
  clearTimeout(miniTimer);
  miniTimer = null;
  miniPop = null;
  miniCur = null;
  miniLast.doc = null;
  miniLast.html = "";
  $("pip").innerHTML = `${icon("pip")}<span>${L("Поверх игры", "Over game")}</span>`;
  syncMapUi();
}
var miniCur = null;
var miniLast = { doc: null, html: "" };
var miniAt = 0;
var miniTimer = null;
function renderMini(again = true) {
  if (!pip) return;
  if (pip.closed) {
    dropPip();
    return;
  }
  const wait = 200 - (Date.now() - miniAt);
  if (wait > 0) {
    if (!miniTimer) miniTimer = setTimeout(() => {
      miniTimer = null;
      miniAt = Date.now();
      renderMiniSafe(again);
    }, wait);
    return;
  }
  miniAt = Date.now();
  try {
    renderMiniSafe(again);
  } catch (err) {
    console.warn("Отрисовка мини-окна:", err);
  }
}
function renderMiniSafe(again = true) {
  if (!pip) return;
  const doc = pip.document;
  const html = miniHtml();
  if (doc === miniLast.doc && html === miniLast.html) return;
  miniLast.doc = doc;
  miniLast.html = html;
  const scroll = doc.querySelector(".mgrid-scroll")?.scrollTop ?? 0;
  doc.body.innerHTML = $("sprite").outerHTML + html;
  const box = doc.querySelector(".mgrid-scroll");
  if (!box) return;
  const resized = fitMiniGrid();
  box.scrollTop = scroll;
  const cur = state.view?.group?.base.cargo?.key ?? null;
  if (cur !== miniCur) {
    miniCur = cur;
    box.querySelector(".g-cargo.cur")?.scrollIntoView({ block: "nearest" });
  }
  if (resized && again) renderMiniSafe(false);
}
var MINI_CELL_MIN = 16;
var MINI_GAP = 2;
var miniCell = 0;
function fitMiniGrid(doc = pip?.document) {
  const box = doc?.querySelector(".mgrid-scroll"), g = box?.querySelector(".mgrid");
  if (!g) return false;
  const rows = Math.max(1, +g.dataset.rows || 1);
  const win = doc.defaultView;
  const stacked = !doc.querySelector(".mini-wrap.only-grid") && win.innerWidth < 620;
  const pad = parseFloat(win.getComputedStyle(doc.body).paddingBottom) || 0;
  let h = win.innerHeight - box.getBoundingClientRect().top + win.scrollY - pad;
  if (stacked) h = Math.max(160, Math.min(h, win.innerHeight * 0.55 - box.getBoundingClientRect().top));
  const byW = (box.clientWidth - 8 * MINI_GAP) / 9, byH = (h - (rows - 1) * MINI_GAP) / rows;
  const cell = Math.max(MINI_CELL_MIN, Math.floor(Math.min(byW, byH)));
  g.style.setProperty("--cell", `${cell}px`);
  const changed = cell !== miniCell;
  miniCell = cell;
  return changed;
}
async function openPip({ quiet = false } = {}) {
  if (!pipSupported || pip || !state.mapPick) return !!pip;
  try {
    pip = await window.documentPictureInPicture.requestWindow({ width: 380, height: 640 });
  } catch (err) {
    if (!quiet) setStatus(L("Не удалось открыть окно поверх игры", "Couldn't open the overlay window"));
    console.warn(err);
    return false;
  }
  setPipPending(false);
  {
    const link = pip.document.createElement("link");
    link.rel = "stylesheet";
    link.href = new URL("css/style.css", location.href).href;
    const fonts = document.querySelector("link[rel='stylesheet'][href*='fonts']");
    if (fonts) {
      const copy = fonts.cloneNode();
      copy.href = new URL(fonts.getAttribute("href"), location.href).href;
      pip.document.head.append(copy);
    }
    pip.document.head.append(link);
    pip.document.title = "ABI Merchant Unlimited";
    pip.document.documentElement.lang = document.documentElement.lang;
    pip.document.body.className = "mini";
    pip.document.addEventListener("click", onQuizClick);
    pip.document.addEventListener("click", onGridClick);
    pip.document.addEventListener("click", onMiniPanel);
    pip.document.addEventListener("click", onMiniPop);
    pip.document.addEventListener("click", (e) => {
      if (e.target.closest?.("[data-mini-reset]")) resetAll();
    });
    pip.document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeMiniPop();
    });
    miniPop = null;
    $("pip").innerHTML = `${icon("x")}<span>${L("Закрыть окно", "Close window")}</span>`;
    pip.addEventListener("resize", () => {
      if (fitMiniGrid() || miniPop != null) renderMini();
    });
    pip.addEventListener("pagehide", () => {
      dropPip();
      setTimeout(() => {
        try {
          engine.stop();
        } catch (err) {
          console.warn(err);
        }
      }, 0);
    });
    renderMini();
  }
  return true;
}
function setPipPending(on) {
  pipPending = on;
  $("pip").classList.toggle("attention", on);
  $("pipHint").hidden = !on;
}
if (pipSupported) {
  $("pip").hidden = false;
  $("pip").addEventListener("click", () => {
    if (pip) pip.close();
    else openPip();
  });
  document.addEventListener("pointerdown", (e) => {
    if (pipPending && state.listening && !e.target.closest("#pip, #stop")) openPip();
  }, true);
}
function setStatus(text, live = false) {
  const el = $("status");
  if (!el) return;
  el.textContent = text;
  el.classList.toggle("live", live);
}
function showCaptureError(text) {
  const el = $("captureError");
  el.textContent = text ?? "";
  el.hidden = !text;
}
engine.addEventListener("ended", () => setTimeout(() => {
  try {
    pip?.close();
  } catch (err) {
    console.warn(err);
  }
}, 0));
engine.addEventListener("state", (e) => {
  const { running, label: label2 } = e.detail;
  state.listening = running;
  $("listen").hidden = running;
  $("stop").hidden = !running;
  setStatus(running ? `${L("Слушаю", "Listening")}: ${label2}` : L("Остановлено", "Stopped"), running);
  if (!running && pipSupported) setPipPending(false);
  if (running) {
    showCaptureError(null);
    reader.attach(engine.stream?.getVideoTracks()[0]);
    if (reader.canRead) reader.load(store.get(KEYS_OCR_LANG, "eng+rus")).catch((err) => console.warn("OCR:", err));
    labels.load(store.get(KEYS_OCR_LANG, "eng+rus")).catch((err) => console.warn("OCR подписей:", err));
  } else {
    reader.detach();
    ocrRun++;
    state.ocrBusy = false;
  }
  document.body.classList.toggle("listening", running);
  if (running) $("app").scrollIntoView({ behavior: "smooth", block: "start" });
  scope.reset();
  renderNow();
  renderMini();
});
var scope = createScope($("scope"), {
  onSignal: () => {
    $("scopeIdle").hidden = true;
  },
  onReset: () => {
    $("scopeIdle").hidden = false;
  }
});
engine.addEventListener("level", (e) => {
  const { energyDb, thresholdDb, windDb } = e.detail;
  scope.push(energyDb, thresholdDb);
  renderWind(e.detail);
});
function renderWind(level = null) {
  const mode = engine.windMode;
  for (const b of document.querySelectorAll("[data-wind]")) {
    const on = b.dataset.wind === mode;
    b.classList.toggle("on", on);
    b.setAttribute("aria-checked", on);
  }
  const drop = level?.windDb ?? 0;
  const text = !level ? "" : mode === "off" ? L("порог обычный", "normal threshold") : mode === "auto" && !level.calmKnown ? L("запоминаю обычный фон", "learning background level") : drop >= 1 ? L(`сейчас ветер · порог −${drop.toFixed(0)} дБ`, `windy · threshold −${drop.toFixed(0)} dB`) : L("ветра нет · порог обычный", "no wind · normal threshold");
  const el = $("windState");
  if (el.textContent !== text) el.textContent = text;
  el.classList.toggle("active", mode !== "off" && drop >= 1);
}
engine.windMode = store.get(KEYS.windMode, "auto");
renderWind();
for (const b of document.querySelectorAll("[data-wind]")) {
  b.addEventListener("click", () => {
    engine.windMode = b.dataset.wind;
    store.set(KEYS.windMode, engine.windMode);
    renderWind();
  });
}
engine.addEventListener("onset", () => scope.hit());
engine.addEventListener("rain", () => {
  renderNow();
  renderMini();
});
async function guarded(fn) {
  showCaptureError(null);
  try {
    await fn();
  } catch (err) {
    console.error(err);
    if (err?.name === "NotAllowedError" || err?.name === "AbortError") return;
    showCaptureError(err?.message ?? String(err));
  }
}
async function startDisplay() {
  await engine.startDisplayCapture();
  if (pipSupported && !pip && !await openPip({ quiet: true })) setPipPending(true);
}
$("listen").addEventListener("click", () => {
  if (state.mapPick) guarded(startDisplay);
  else openMapDialog();
});
$("stop").addEventListener("click", () => engine.stop());
function saveRecording() {
  const stamp = (/* @__PURE__ */ new Date()).toISOString().slice(0, 19).replace(/[:T]/g, "-");
  const download = (blob, name) => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5e3);
  };
  download(engine.recordingWav(), `merchant-ear-${stamp}.wav`);
  const log = {
    cargo: { map: state.mapLabel, profileId: state.profileId, typeId: state.typeId, price: state.price, size: state.size },
    minMatch: state.minMatch,
    threshold: engine.thresholdDb,
    userAgent: navigator.userAgent,
    events: allEvents().sort((a, b) => a.at - b.at).map((ev) => ({
      at: new Date(ev.at).toISOString(),
      rejected: !!ev.rejected,
      reason: ev.reason ?? null,
      peakDb: +ev.peakDb.toFixed(1),
      quiet: !!ev.quiet,
      top: [...ev.bySound.values()].sort((a, b) => b.score - a.score).slice(0, 5).map((m) => [m.template.soundId, +m.score.toFixed(3)]),
      cargoBest: ev.cargoBest ? [ev.cargoBest.template.soundId, +ev.cargoBest.score.toFixed(3)] : null
    }))
  };
  log.ocr = { lang: reader.lang ?? null, text: reader.lastText };
  log.grid = {
    journal: grid.journal,
    scans: grid.scans,
    found: grid.found,
    frame: grid.frame,
    inFrame: grid.inFrame,
    cargos: [...tracker.cargos.values()].map((g) => ({ at: g.key, size: `${g.w}x${g.h}`, label: g.label, price: g.price, events: g.events.length }))
  };
  download(new Blob([JSON.stringify(log, null, 1)], { type: "application/json" }), `merchant-ear-${stamp}.json`);
  reader.lastFrame?.toBlob((blob) => blob && download(blob, `merchant-ear-${stamp}.png`));
  const last = reader.frames.at(-1)?.bitmap;
  if (last) {
    const c = document.createElement("canvas");
    c.width = last.width;
    c.height = last.height;
    c.getContext("2d").drawImage(last, 0, 0);
    c.toBlob((blob) => blob && download(blob, `merchant-ear-${stamp}-frame.png`));
  }
  setStatus(L("Запись сохранена в «Загрузки»", "Recording saved to Downloads"));
}
document.addEventListener("dragover", (e) => {
  if (e.dataTransfer?.types.includes("Files")) e.preventDefault();
});
document.addEventListener("drop", async (e) => {
  const file = [...e.dataTransfer?.files ?? []].find((f) => f.type.startsWith("image/"));
  if (!file) return;
  e.preventDefault();
  if (!state.profileId) {
    setStatus(L("Сначала выберите карту", "Pick a map first"));
    return;
  }
  setStatus(L("Читаю скриншот…", "Reading screenshot…"));
  try {
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    canvas.getContext("2d").drawImage(bitmap, 0, 0);
    let found = null;
    for (const mode of ["bright", "raw"]) {
      found = reader.parse(await reader.recognize(canvas, mode), state.profileId);
      console.log(`OCR (${mode}):`, reader.lastText);
      if (found) break;
    }
    const size = found && reader.measureSize(canvas, found.tip);
    setStatus(found ? `${L("Со скриншота", "From screenshot")}: ${found.typeId != null ? `${model.typeName(found.typeId).name} · ` : ""}${fmt(found.price)}${size ? ` · ${size.join("×")}` : ""}` : L("Подсказку груза на скриншоте не нашёл", "No cargo tooltip found in the screenshot"));
  } catch (err) {
    console.error(err);
    setStatus(`OCR: ${err.message ?? err}`);
  }
});
document.addEventListener("keydown", (e) => {
  if (!e.ctrlKey || !e.shiftKey) return;
  if (e.code === "KeyD") {
    e.preventDefault();
    saveRecording();
  }
  if (e.code === "KeyS") {
    e.preventDefault();
    saveLog();
  }
});
engine.thresholdDb = store.get(KEYS.threshold, DEFAULTS2.threshold);
window.addEventListener("storage", (e) => {
  if (e.key === `merchant-ear.${KEYS.threshold}`) engine.thresholdDb = store.get(KEYS.threshold, DEFAULTS2.threshold);
  if (e.key === `merchant-ear.${KEYS.minMatch}`) state.minMatch = store.get(KEYS.minMatch, DEFAULTS2.minMatch);
  if (e.key === `merchant-ear.${KEYS.customRev}`) refreshCustom();
});
async function refreshCustom() {
  const list = await fetchCustomTemplates();
  if (!list) return;
  state.custom = list;
  engine.setCustomTemplates(list);
}
engine.mapName = mapNameOf(state.mapLabel);
syncMapUi();
update();
try {
  await engine.loadTemplates(data.sounds, (name) => `audio/${name}.ogg`);
  await refreshCustom();
  setStatus(L(`Готово · ${engine.builtinTemplates.length} эталонов`, `Ready · ${engine.builtinTemplates.length} references`));
} catch (err) {
  console.error(err);
  setStatus(`${L("Не удалось загрузить звуки", "Failed to load sounds")}: ${err.message}`);
}
window.__abiear = { tracker, grid, state, priceSeen, syncPrices, engine, reader };

})();
