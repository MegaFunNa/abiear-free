// js/local-model.js
var round4 = (v) => Math.floor(v * 1e4 + 0.5) / 1e4;
var turns = ([w, h]) => Math.max(w, h) < 3;
var fits = (size, slot, rot) => {
  const [w, h] = size, [sw, sh] = slot;
  return w === sw && h === sh || bool(rot) && turns([w, h]) && w === sh && h === sw;
};
var bool = (v) => !!v;
var LocalModel = class {
  constructor(modelData) {
    this.mass = modelData.mass ?? {};
    this.temp = modelData.soundTemperature ?? 0.05;
    this.items = modelData.items ?? null;
  }
  /** Априорные строки фильтра «тип|цена» с нормировкой внутри фильтра — как prior_rows в serve.py. */
  priorRows(profileId, typeId = null, price = null) {
    const keys = (this.mass[String(profileId)] ?? []).filter((r) => (typeId == null || r[0] === typeId) && (price == null || r[1] === price));
    const total = keys.reduce((s, r) => s + r[3], 0);
    if (total <= 0) return [];
    return keys.map((r) => [r[0], r[1], r[2], r[3] / total, r[4]]);
  }
  /**
   * Полный расчёт — как posterior() в serve.py. q: { p, t, c, s, r, m, e, a }.
   * e: [[ [soundId, score], … ], …] или [Map soundId → { score }].
   * Результат: компактные строки [[itemId, typeId, cargoPrice, p, prior, ok, soundId], …] с round4.
   */
  posterior(q) {
    const profileId = q.p;
    const t = q.t ?? null;
    const c = q.c ?? null;
    const size = q.s ?? null;
    const rot = bool(q.r ?? true);
    const manual = q.m ?? null;
    const allowed = q.a ? new Set(q.a) : null;
    const events = (q.e ?? []).map((ev) => {
      const m = /* @__PURE__ */ new Map();
      if (ev instanceof Map) {
        for (const [k, v] of ev) m.set(Number(k), v?.score ?? v);
      } else {
        for (const [k, v] of ev) m.set(Number(k), v);
      }
      return m;
    });
    const rows = [];
    for (const [t_, c_, itemId, p_, soundId] of this.priorRows(profileId, t, c)) {
      const item = this.items?.get(itemId);
      if (!item) continue;
      if (size && !fits(item.size, size, rot)) continue;
      if (manual != null && soundId !== manual) continue;
      if (allowed != null && !allowed.has(soundId)) continue;
      let logLik = 0;
      for (const ev of events) logLik += (ev.get(soundId) ?? -1) / this.temp;
      const ok = item.contactPrice >= c_ ? 1 : 0;
      rows.push({ itemId, typeId: t_, cargoPrice: c_, prior: p_, logLik, ok, soundId });
    }
    if (!rows.length) return [];
    const maxLog = Math.max(0, ...rows.map((r) => r.logLik));
    let norm = 0;
    for (const r of rows) {
      r.weight = r.prior * Math.exp(r.logLik - maxLog);
      norm += r.weight;
    }
    for (const r of rows) r.p = norm > 0 ? r.weight / norm : 0;
    rows.sort((a, b) => b.p - a.p);
    return rows.map((r) => [r.itemId, r.typeId, r.cargoPrice, round4(r.p), round4(r.prior), r.ok, r.soundId]);
  }
  /**
   * Доли звуков в грузе — как possible() в serve.py, сразу в wire-формате ответа сервера:
   * { "typeId|price" (пустая часть = любой) → [[soundId, доля], …] }.
   */
  possible(profileId) {
    const masses = this.mass[String(profileId)] ?? [];
    const combos = /* @__PURE__ */ new Set();
    for (const [t, c] of masses) {
      combos.add(`${t}|${c}`);
      combos.add(`${t}|`);
      combos.add(`|${c}`);
    }
    combos.add("|");
    const out = {};
    for (const combo of combos) {
      const [ts, cs] = combo.split("|");
      const t = ts === "" ? null : Number(ts);
      const c = cs === "" ? null : Number(cs);
      const keys = masses.filter((r) => (t == null || r[0] === t) && (c == null || r[1] === c));
      const total = keys.reduce((s, r) => s + r[3], 0);
      if (total <= 0) continue;
      const bySound = /* @__PURE__ */ new Map();
      for (const r of keys) bySound.set(r[4], (bySound.get(r[4]) ?? 0) + r[3] / total);
      out[combo] = [...bySound].sort((a, b) => a[0] - b[0]).map(([sid, share]) => [sid, round4(share)]);
    }
    return out;
  }
};

// js/static-boot.js
var SD = window.STATIC_DATA;
if (!SD) throw new Error("static-boot: window.STATIC_DATA не загружен (нужен js/static-data.js)");
window.APP_VERSION = SD.version ?? "dev";
var SESSION_KEY = "me_session";
var hasSession = () => localStorage.getItem(SESSION_KEY) === "1";
var items = new Map((SD.catalog.items ?? []).map((i) => [i.id, { contactPrice: i.contactPrice, size: i.size }]));
var local = new LocalModel({ ...SD.model, items });
var json = (obj, status = 200) => Promise.resolve(new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json; charset=utf-8" } }));
var tessShim = (tess) => `
(function () {
  var CORES = ${JSON.stringify(tess.cores ?? {})};
  var LANGS = ${JSON.stringify(tess.lang ?? {})};
  var origImport = self.importScripts ? self.importScripts.bind(self) : null;
  if (origImport) {
    self.importScripts = function () {
      return origImport.apply(self, [].map.call(arguments, function (u) {
        var s = String(u);
        for (var k in CORES) { if (s.indexOf(k) !== -1) return CORES[k]; }
        return u;
      }));
    };
  }
  var origFetch = self.fetch ? self.fetch.bind(self) : null;
  self.fetch = function (input, init) {
    var u = String((input && input.url) || input);
    var m = u.match(/([\\w+-]+)\\.traineddata(\\.gz)?$/);
    if (m && LANGS[m[1]]) return origFetch(LANGS[m[1]]);
    if (u.indexOf("static-tess://") === 0) {
      var lm = u.match(/([\\w+-]+)\\.traineddata(\\.gz)?$/);
      if (lm && LANGS[lm[1]]) return origFetch(LANGS[lm[1]]);
      for (var k in CORES) { if (u.indexOf(k) !== -1) return origFetch(CORES[k]); }
    }
    return origFetch(input, init);
  };
})();
`;
window.TESS_STATIC = {
  workerPath: "",
  // ставит tessReady(): blob-адрес воркера
  corePath: "static-tess://core/",
  langPath: "static-tess://lang",
  workerBlobURL: false,
  // НЕ перепаковывать воркер в свой blob: на file:// (origin null) такой
  // воркер не может сделать importScripts ядра — OCR умирал, из-за чего
  // сетка торговца не сохранялась и программа целиком вставала.
  // такой воркер не может сделать importScripts ядра — OCR умирал,
  // из-за чего сетка торговца не сохранялась и всё вставало.
  gzip: true
};
var tessLoading = null;
function ensureTess() {
  if (SD.tess) return Promise.resolve(SD.tess);
  tessLoading ??= new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = new URL("js/static-tess.js", document.baseURI).href;
    s.onload = () => resolve(SD.tess ?? null);
    s.onerror = () => reject(new Error("Не удалось загрузить OCR"));
    document.head.append(s);
  });
  return tessLoading;
}
var workerUrl = null;
window.tessReady = async () => {
  if (workerUrl) return workerUrl;
  const tess = await ensureTess();
  if (!tess) return null;
  const src = tessShim(tess) + "\n" + (tess.workerText ?? "");
  workerUrl = URL.createObjectURL(new Blob([src], { type: "text/javascript" }));
  window.TESS_STATIC.workerPath = workerUrl;
  return workerUrl;
};
setTimeout(() => {
  window.tessReady().catch(() => {
  });
}, 1500);
var onGate = /(^|\/)gate\.html$/.test(location.pathname);
if (hasSession() && onGate) {
  location.replace("index.html" + location.search);
} else if (!hasSession() && !onGate) {
  location.replace("gate.html" + location.search);
}
var realFetch = window.fetch.bind(window);
function audioDataUri(name) {
  const map = SD.audio ?? {};
  return map[name] ?? map[`${name}.ogg`] ?? null;
}
window.fetch = (input, init) => {
  const raw = String(input?.url ?? input);
  let u = null;
  try {
    u = new URL(raw, location.href);
  } catch {
  }
  if (!u) return realFetch(input, init);
  if (u.protocol === "static-tess:" || raw.startsWith("static-tess:")) {
    return ensureTess().then((tess) => {
      if (!tess) return new Response("", { status: 404 });
      if (/worker\.min\.js$/.test(raw)) {
        return new Response(tessShim(tess) + "\n" + (tess.workerText ?? ""), {
          headers: { "Content-Type": "text/javascript" }
        });
      }
      const lm = raw.match(/([\w+-]+)\.traineddata(\.gz)?$/);
      if (lm && tess.lang?.[lm[1]]) return realFetch(tess.lang[lm[1]]);
      return new Response("", { status: 404 });
    });
  }
  const path = u.pathname.replace(/\/+$/, "");
  if (path.endsWith("/api/session")) return json(hasSession() ? { ok: true, role: "user" } : { ok: false });
  if (path.endsWith("/api/login")) {
    let key = "";
    try {
      key = String(JSON.parse(init?.body ?? "{}").key ?? "").trim();
    } catch {
    }
    if (!key) return json({ ok: false, error: "key" }, 200);
    localStorage.setItem(SESSION_KEY, "1");
    return json({ ok: true, role: "user" });
  }
  if (path.endsWith("/api/logout")) {
    localStorage.removeItem(SESSION_KEY);
    return json({ ok: true });
  }
  if (path.endsWith("/api/catalog")) return hasSession() ? json(SD.catalog) : json({ error: "unauthorized" }, 401);
  if (path.endsWith("/api/templates")) return json({ templates: [] });
  if (path.endsWith("/api/model/possible")) {
    if (!hasSession()) return json({ error: "unauthorized" }, 401);
    let pid = 1;
    try {
      pid = Number(u.searchParams.get("p") ?? "1") || 1;
    } catch {
      pid = 1;
    }
    return json({ possible: local.possible(pid) });
  }
  if (path.endsWith("/api/model")) {
    if (!hasSession()) return json({ error: "unauthorized" }, 401);
    let q = [];
    try {
      q = JSON.parse(init?.body ?? "{}").q ?? [];
    } catch {
      q = [];
    }
    const rows = [];
    for (const one of q.slice(0, 24)) {
      try {
        rows.push(one?.p != null ? local.posterior(one) : []);
      } catch {
        rows.push([]);
      }
    }
    return json({ rows });
  }
  const am = raw.match(/\/audio\/([^/?#]+?)(?:\.ogg)?(?:[?#].*)?$/);
  if (am) {
    const uri = audioDataUri(decodeURIComponent(am[1]));
    if (uri) return realFetch(uri);
  }
  return realFetch(input, init);
};
