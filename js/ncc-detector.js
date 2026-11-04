// Распознавание звуков предметов по форме волны: многополосная нормированная взаимная корреляция (NCC).
//
// Игра на каждую группу предметов проигрывает один и тот же сэмпл без случайного питча, поэтому
// звук ищется как точная копия эталона. Фон (ветер, дождь, речь) с эталоном по фазе не совпадает
// и в корреляции почти обнуляется — отдельно вычитать фон не нужно.
//
//  * 5 полос (фильтры Баттерворта), затем 48 → 24 кГц. Сходство считается в каждой полосе и
//    складывается с весами «доля энергии эталона в полосе»: гул внизу не мешает узнать звонкий металл.
//  * Второй, «низкий» счёт — только полосы до 4.5 кГц; берётся лучший из двух (верх может быть приглушён).
//  * Поток сканируется непрерывно, без детектора громкости. Явное совпадение (≥ fastMin и отрыв
//    ≥ fastMargin от других звуков) отдаётся сразу; остальные кандидаты через ~0.35 с разбирает pursuit.
//  * pursuit — жадный разбор окна: лучший эталон вычитается с подобранной громкостью, поиск
//    продолжается в остатке. Так разбираются наложения («взял» + «положил», выстрел + предмет).

import { SOS, BANDS } from "./ncc-sos.js";
import { fft, fftReal2, nextPow2 } from "./fft.js";

export const IN_SR = 48000;
export const DECIM = 2;
export const SR = IN_SR / DECIM;
const NB = BANDS.length;
const LF_MAX_HZ = 4500;
const LF_BANDS = BANDS.map(([, hi], b) => (hi <= LF_MAX_HZ ? b : -1)).filter((b) => b >= 0);

export const DEFAULTS = {
  matchSec: 0.2,      // сколько от начала эталона сравниваем
  threshold: 0.38,    // порог срабатывания (у эталона может быть свой: template.threshold). Часть звуков
                      // игра смешивает со случайным слоем, и они дают только 0.43–0.56; фон без звуков ≤ ~0.32
  candThr: 0.28,      // с какого сходства место становится кандидатом на разбор
  fastMin: 0.75,      // быстрый путь: сходство не ниже …
  fastMargin: 0.25,   // … и отрыв от лучшего другого звука рядом
  minW: 0.03,         // полосы с меньшей долей энергии эталона не участвуют
  subMargin: 0.1,     // pursuit вычитает находки от threshold − subMargin
  pastSec: 0.5,       // окно разбора: до кандидата …
  futureSec: 0.35,    // … и после
  clusterSec: 0.25,   // одна и та же находка эталона в пределах этого — одна
  maxIters: 10,
  maxPursuit: 12,     // сколько эталонов-кандидатов разбирать в одном окне
  useLF: true,
  minLevelDb: -80,    // тише этого (на отсчёт) — тишина, корреляцию не считаем
  preThr: 0.2,        // предотбор по главной полосе (0 — без предотбора)
  fftSize: 8192,      // размер БПФ сканирования: шаг = fftSize − длина эталона (8192 → ~0.14 с)
};

// ---------- фильтры ----------
class BandFilter {
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
}

// Весь сигнал 48 кГц → полосы 24 кГц (с нулевого состояния фильтров).
export function splitBands(x48) {
  const tmp = new Float64Array(x48.length);
  return SOS.map((sos) => {
    new BandFilter(sos).process(x48, tmp);
    const out = new Float64Array(Math.ceil(x48.length / DECIM));
    for (let i = 0, j = 0; i < x48.length; i += DECIM, j++) out[j] = tmp[i];
    return out;
  });
}

// ---------- эталоны ----------
// wave — Float32Array/Float64Array 48 кГц моно. meta — {name, soundId, kind, threshold?}.
export function prepareTemplate(wave, meta, opts = {}) {
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
  while (on < n && env[on] <= peak * 1e-3) on++;          // −30 дБ от пика
  let end = n - 1;
  while (end > on && env[end] <= peak * 1e-6) end--;       // хвост до −60 дБ
  const start = Math.max(0, on - Math.round(0.01 * SR));
  const L = Math.min(Math.round(opts.matchSec * SR), end + 1 - start);
  const seg = bands.map((x) => x.slice(start, start + L));
  const full = bands.map((x) => x.slice(start, end + 1));
  const segE = seg.map((x) => x.reduce((s, v) => s + v * v, 0));
  const total = segE.reduce((a, b) => a + b, 0);
  const share = segE.map((e) => e / total);
  const used = share.map((w) => w >= opts.minW);
  const norm = (idx) => {
    const w = new Float64Array(NB);
    const s = idx.reduce((a, b) => a + share[b], 0);
    if (s > 0) for (const b of idx) w[b] = share[b] / s;
    return w;
  };
  const all = [...Array(NB).keys()].filter((b) => used[b]);
  const lf = LF_BANDS.filter((b) => used[b]);
  return {
    ...meta,
    L, seg, full, segE, segTotal: total,
    segNorm: segE.map(Math.sqrt),
    bands: all,
    w: norm(all),
    lfBands: lf,
    wLF: lf.length ? norm(lf) : null,
    spec: new Map(),      // N → [{re, im}] спектры полос эталона (уже сопряжённые)
  };
}

function templateSpec(t, N) {
  t = t.base ?? t;   // предотбор работает с видом эталона — спектры всегда считаем по всем полосам
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

// ---------- сходство ----------
// X — полосы окна (Float64Array каждая, одной длины n). Возвращает Map template → Float32Array(n)
// со сходством по позициям (позиции, где эталон не помещается, = −Infinity).
export function scoreWindow(X, templates, opts = DEFAULTS) {
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
  const out = new Map();
  const acc = new Map();
  const jobs = [];
  for (const t of templates) {
    const m = n - t.L + 1;
    acc.set(t, { full: new Float64Array(Math.max(0, m)), lf: t.wLF && opts.useLF ? new Float64Array(Math.max(0, m)) : null, m });
    if (m <= 0) continue;
    const spec = templateSpec(t, N);
    for (const b of t.bands) jobs.push([t, b, spec[b]]);
  }
  // 1 / ‖X_b[p, p+L)‖ — общий для всех эталонов с той же длиной L.
  const invCache = new Map();
  const invNorm = (b, L, m) => {
    const key = b * 1e6 + L;
    let v = invCache.get(key);
    if (!v) {
      v = new Float64Array(m);
      const cb = c2[b];
      for (let p = 0; p < m; p++) v[p] = 1 / (Math.sqrt(cb[p + L] - cb[p] + eps * L) + 1e-30);
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
        re[k] = p1r - p2i; im[k] = p1i + p2r;   // P1 + i·P2
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
      if (wl) for (let p = 0; p < a.m; p++) { const v = corr[p] * inv[p]; full[p] += wf * v; lf[p] += wl * v; }
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

const thresholdOf = (t, opts) => t.threshold ?? opts.threshold;

// ---------- pursuit ----------
// X — полосы окна (не меняются). Возвращает находки [{template, pos, score, gain, second}] по убыванию.
export function pursuit(X, templates, opts = DEFAULTS) {
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
    for (const t of templates) {
      const s = S.get(t), ex = excl.get(t);
      for (let p = 0; p < n; p++) {
        if (!(s[p] > (best?.score ?? -Infinity))) continue;
        if (ex.some(([lo, hi]) => p >= lo && p <= hi)) continue;
        best = { template: t, pos: p, score: s[p] };
      }
    }
    if (!best || best.score < thresholdOf(best.template, opts) - opts.subMargin) break;
    const { template: t, pos: p } = best;
    excl.get(t).push([p - cluster, p + cluster]);
    // След вычитания: место стало громче исходного — это не звук.
    let eR = 0, eO = 0;
    for (const b of t.bands) {
      for (let i = p; i < Math.min(n, p + t.L); i++) { eR += R[b][i] ** 2; eO += X[b][i] ** 2; }
    }
    if (eR > eO * 1.05 + 1e-20) continue;
    // Громкость — по началу эталона, не отрицательная.
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

// ---------- поток ----------
export class NccDetector {
  constructor(templates, opts = {}) {
    if (!templates.length) throw new Error("пустая библиотека звуков");
    this.opts = { ...DEFAULTS, ...opts };
    this.templates = templates;
    this.Lmax = Math.max(...templates.map((t) => t.L));
    this.fullMax = Math.max(...templates.map((t) => t.full[0].length));
    this.N = Math.max(this.opts.fftSize ?? 0, nextPow2(this.Lmax + 1024));
    // Главная полоса эталона — для предотбора (spec и прочее берутся из самого эталона).
    this.pre = templates.map((t) => {
      const b = t.bands.reduce((a, c) => (t.w[c] > t.w[a] ? c : a));
      const v = Object.create(t);
      v.bands = [b];
      v.w = Float64Array.from({ length: NB }, (_, i) => (i === b ? 1 : 0));
      v.wLF = null;
      v.base = t;
      return v;
    });
    this.hop = this.N - this.Lmax + 1;          // все позиции, что даёт одно БПФ
    this.cluster = Math.round(this.opts.clusterSec * SR);
    this.past = Math.round(this.opts.pastSec * SR);
    this.future = Math.round(this.opts.futureSec * SR);
    this.reset();
  }

  reset() {
    this.filters = SOS.map((s) => new BandFilter(s));
    this.phase = 0;
    this.buf = Array.from({ length: NB }, () => new Float64Array(8 * SR));
    this.len = 0;               // сколько отсчётов в buf занято
    this.bufStart = 0;          // абсолютный номер первого отсчёта buf (24 кГц)
    this.scanPos = 0;
    this.pending = [];          // кандидаты [{template, pos, score}]
    this.emitted = [];          // уже отданные находки [{template, pos}]
    this.stats = { hops: 0, skipped: 0, pursuits: 0, scanMs: 0, pursuitMs: 0, best: 0 };
  }

  get bufEnd() { return this.bufStart + this.len; }

  // Кормить моно 48 кГц любыми кусками. Возвращает находки.
  feed(block) {
    const x = block instanceof Float64Array ? block : Float64Array.from(block);
    const tmp = new Float64Array(x.length);
    const first = this.phase === 0 ? 0 : DECIM - this.phase;
    const count = first < x.length ? Math.floor((x.length - 1 - first) / DECIM) + 1 : 0;
    if (this.len + count > this.buf[0].length) {
      const cap = Math.max(this.len + count, this.buf[0].length * 2);
      this.buf = this.buf.map((old) => { const y = new Float64Array(cap); y.set(old.subarray(0, this.len)); return y; });
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
      name: t.name, soundId: t.soundId, kind: t.kind, score: hit.score, how,
      time: (hit.pos * DECIM) / IN_SR,
      second: hit.second ? { name: hit.second.template.name, soundId: hit.second.template.soundId, score: hit.second.score } : null,
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
      // Предотбор: только главная полоса каждого эталона; полный счёт — тем, у кого она хоть как-то похожа.
      let S;
      if (o.preThr > 0) {
        const P = scoreWindow(X, this.pre, { ...o, useLF: false });
        const sel = [];
        S = new Map();
        for (const v of this.pre) {
          const s = P.get(v);
          let mx = -Infinity;
          for (let p = 0; p < this.hop; p++) if (s[p] > mx) mx = s[p];
          if (mx >= o.preThr) sel.push(v.base);
          else S.set(v.base, s);     // для оценки «второго» хватит и главной полосы
        }
        this.stats.full = (this.stats.full ?? 0) + sel.length;
        for (const [t, s] of scoreWindow(X, sel, o)) S.set(t, s);
        this.selected = new Set(sel);
      } else {
        S = scoreWindow(X, this.templates, o);
        this.selected = null;
      }
      // Кандидаты: лучшее место каждого эталона в этом шаге.
      const tops = [];
      for (const t of this.templates) {
        if (this.selected && !this.selected.has(t)) continue;
        const s = S.get(t);
        let bp = -1, bs = -Infinity;
        for (let p = 0; p < this.hop; p++) if (s[p] > bs) { bs = s[p]; bp = p; }
        // Лучшее сходство за шаг — даже ниже порога: по нему видно, насколько звук близок к эталону.
        if (bs > this.stats.best) this.stats.best = bs;
        if (bs >= o.candThr) tops.push({ template: t, pos: p0 + bp, score: bs, rel: bp });
      }
      for (const c of tops) this.addCandidate(c);
      // Быстрый путь: явное совпадение с отрывом от других звуков рядом.
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
      const byT = new Map();
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
}
