(() => {
  // js/grid.js
  var GRID_COLS = 9;
  var SMALL_UI_PITCH = 56;
  var median = (a) => {
    if (!a.length) return null;
    a.sort((x, y) => x - y);
    return a[a.length >> 1];
  };
  function luminance(canvas) {
    const W = canvas.width, H = canvas.height;
    const px = canvas.getContext("2d", { willReadFrequently: true }).getImageData(0, 0, W, H).data;
    const L = new Uint8Array(W * H);
    for (let i = 0, j = 0; j < L.length; i += 4, j++) L[j] = 77 * px[i] + 150 * px[i + 1] + 29 * px[i + 2] >> 8;
    return { L, W, H, px };
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
  function detectGrid(canvas, hint2 = null) {
    const { L, W, H, px } = luminance(canvas);
    const lum = (x, y) => L[y * W + x];
    const colScore = new Float32Array(W);
    for (let y = 0; y < H; y += 2) {
      const row = y * W;
      for (let x = 3; x < W - 3; x++) {
        const v = L[row + x];
        if (v >= LINE_MIN && v - Math.max(L[row + x - 3], L[row + x + 3]) >= LINE_RISE) colScore[x]++;
      }
    }
    const typical = median(Array.from(colScore.subarray(3, W - 3))) ?? 0;
    const columns = (gx2) => {
      if (!gx2 || gx2.v < 20) return null;
      const xs2 = Array.from({ length: GRID_COLS + 1 }, (_, k) => snap(colScore, gx2.off + k * gx2.p));
      const teeth = xs2.map((x) => Math.max(colScore[x - 1], colScore[x], colScore[x + 1]));
      const mean = teeth.reduce((a2, b2) => a2 + b2, 0) / teeth.length;
      return mean < Math.max(20, typical * 4) || teeth.filter((t) => t >= typical * 2).length < GRID_COLS - 1 ? null : xs2;
    };
    let gx = null, xs = null;
    if (hint2?.comb) {
      const { off, p, v } = hint2.comb;
      const near = fitComb(colScore, Math.max(3, off - 4), Math.min(W - 3, off + 4 + GRID_COLS * p), GRID_COLS + 1, p - 0.5, p + 0.5, 0.125);
      if (near && near.v >= v * 0.7 && (xs = columns(near))) gx = near;
    }
    const panelScore = (cand) => {
      const p = (cand[GRID_COLS] - cand[0]) / GRID_COLS;
      if (!(p >= 30)) return 0;
      const colOn = (x, y) => {
        const v = Math.max(L[y * W + x - 1], L[y * W + x], L[y * W + x + 1]);
        return v >= LINE_MIN - 4 && v - Math.max(L[y * W + x - 4], L[y * W + x + 4]) >= 3;
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
    const cellFill = (q, y0, y1) => cellStats(L, px, W, xs[q], xs[q + 1], y0, y1, pitch);
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
      return vals.length >= n * 0.25 ? { v: median(vals), seen: seen / vals.length, hidden: hidden / n } : { v: 0, seen: 0, hidden: 1 };
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
    const iconH = iconHs.length ? median(iconHs) : 0;
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
      const at = (k) => median(list.map(([q, r]) => fills[r][q][k]));
      const fill = at("fill"), tone = { rg: at("rg"), bg: at("bg"), lo: at("lo") };
      tone.tinted = tinted(tone);
      cargos.push({ q: qa, r: ra - up, w, h: hUse, x0: xs[qa], y0: ys[ra] - up * pitch, x1: xs[qb + 1], y1: ys[ra] - up * pitch + hUse * pitch, fill, tone, partial });
    }
    const grey = cargos.filter((c) => !c.tone.tinted);
    const usual = median(grey.map((c) => c.fill)), usualLo = median(grey.map((c) => c.tone.lo));
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
  function cellStats(L, px, W, x0, x1, y0, y1, pitch) {
    const m = Math.round(pitch * 0.12), v = [], rg = [], bg = [], lo = [];
    let all = 0, hi = 0;
    for (let y = Math.round(y0 + m); y < Math.round(y1 - m); y += 3) for (let x = Math.round(x0 + m); x < Math.round(x1 - m); x += 3) {
      all++;
      const l = L[y * W + x];
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
    return { fill, flat: v.filter((l) => Math.abs(l - fill) <= 4).length / v.length, dark: 1 - v.length / all, hi: hi / all, rg: median(rg), bg: median(bg), lo: median(lo) };
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
  function detectLight(canvas, prev, ox, oy) {
    const { L, W, H, px } = luminance(canvas);
    const lum = (x, y) => L[y * W + x];
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
        const f = cellStats(L, px, W, xs[q], xs[q + 1], ys[r], ys[r + 1], pitch);
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
    const hMax = (w > 3 * pitch ? 2.6 : 4.5) * pitch;
    if (w > Math.min(6 * pitch, (xs[GRID_COLS] - xs[0]) * 0.75) || h > hMax || h < 0.35 * pitch) return false;
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

  // js/grid-worker.js
  var hint = null;
  var cv = null;
  var ctx = null;
  var surface = (w, h) => {
    if (!cv || cv.width !== w || cv.height !== h) {
      cv = new OffscreenCanvas(w, h);
      ctx = cv.getContext("2d", { willReadFrequently: true });
      ctx.globalCompositeOperation = "copy";
    }
    return ctx;
  };
  self.onmessage = ({ data: { id, bitmap, light } }) => {
    let det = null, ms = 0;
    try {
      const t0 = performance.now();
      surface(bitmap.width, bitmap.height).drawImage(bitmap, 0, 0);
      det = light ? detectLight(cv, light.prev, light.ox, light.oy) : detectGrid(cv, hint);
      ms = performance.now() - t0;
    } catch (err) {
      console.warn("Сетка:", err);
    }
    bitmap.close();
    if (!light) hint = det;
    if (det) {
      det = {
        pitch: det.pitch,
        xs: det.xs,
        ys: det.ys,
        rows: det.rows,
        cells: det.cells,
        cargos: det.cargos,
        red: det.red,
        tips: det.tips,
        fills: det.fills.map((row) => row.map((f) => [f.fill, f.lo, f.dark])),
        light: !!light
      };
    }
    self.postMessage({ id, det, ms });
  };
})();
