// Web Worker нового детектора (ncc-detector.js): звук приходит кусками, находки уходят обратно.
//   ← {type: "init", templates: [{name, soundId, kind, wave: Float32Array 48 кГц}], opts}
//   ← {type: "audio", block: Float32Array}      ← {type: "reset"}
//   → {type: "ready", count}   → {type: "hits", hits: [...], at}   → {type: "stats", stats}

import { NccDetector, prepareTemplate } from "./ncc-detector.js";

let det = null;
let fed = 0;

self.onmessage = (e) => {
  const m = e.data;
  if (m.type === "init") {
    const t0 = performance.now();
    const templates = m.templates.map((t) => prepareTemplate(t.wave, { name: t.name, soundId: t.soundId, kind: t.kind }, m.opts));
    det = new NccDetector(templates, m.opts);
    fed = 0;
    self.postMessage({ type: "ready", count: templates.length, ms: performance.now() - t0 });
  } else if (m.type === "reset") {
    det?.reset();
    fed = 0;
  } else if (m.type === "audio" && det) {
    const t0 = performance.now();
    const hits = det.feed(m.block);
    fed += m.block.length;
    if (hits.length) self.postMessage({ type: "hits", hits, at: Date.now() });
    // Раз в ~5 с: сколько процессора уходит на распознавание.
    if (fed >= 48000 * 5) {
      self.postMessage({ type: "stats", stats: { ...det.stats, lastMs: performance.now() - t0 } });
      det.stats.best = 0;   // лучшее сходство — за следующие 5 с
      fed = 0;
    }
  }
};
