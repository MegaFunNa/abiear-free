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
  function detectGrid(canvas, hint = null) {
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
    if (hint?.comb) {
      const { off, p, v } = hint.comb;
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
  function withMax(data, meta) {
    let max = -Infinity;
    for (const v of data) if (v > max) max = v;
    return { ...meta, data, max, length: data.length / N_BANDS };
  }
  function makeTemplate(frames, frameSeconds, meta) {
    return withMax(flatten(trimSilence(frames, START_DROP_DB), maxFrames(frameSeconds)), meta);
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
    const data = live.slice(top.offset * N_BANDS, end * N_BANDS);
    let dataMax = -Infinity;
    for (const v of data) if (v > dataMax) dataMax = v;
    for (let i = 0; i < data.length; i++) if (!(data[i] > dataMax - TUNE.RANGE)) data[i] = dataMax - TUNE.RANGE;
    return { scores, data };
  }

  // js/i18n.js
  var root = document.documentElement;
  var current = root.lang === "en" ? "en" : "ru";
  var isRu = current === "ru";
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
  function prior(data, items, profileId, typeId = null, price = null) {
    const pools = data.pools.filter((p) => p.profile === profileId && (typeId == null || p.typeId === typeId) && (price == null || p.price === price));
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
    let norm2 = 0;
    for (const r of rows) {
      r.weight = r.prior * Math.exp(r.logLik - maxLog);
      norm2 += r.weight;
    }
    for (const r of rows) r.p = norm2 > 0 ? r.weight / norm2 : 0;
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
  var MerchantModel = class {
    constructor(data) {
      this.data = data;
      this.items = new Map(data.items.map((i) => [i.id, i]));
      this.types = new Map(data.types.map((t) => {
        const ru = TYPE_RU[t.name] ?? t.name;
        return [t.id, { en: t.name, ru, name: isRu ? ru : t.name }];
      }));
      this.sounds = new Map(data.sounds.map((s) => [s.id, s]));
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

  // js/cells.js
  var MAX_CELLS = 6;
  var ROI = 520;
  var PITCH_SHARE = 0.68;
  var median2 = (a) => {
    if (!a.length) return null;
    a.sort((x, y) => x - y);
    return a[a.length >> 1];
  };
  function luminance2(canvas, x, y, W, H) {
    const px = canvas.getContext("2d", { willReadFrequently: true }).getImageData(x, y, W, H).data;
    const L = new Uint8Array(W * H);
    for (let i = 0, j = 0; j < L.length; i += 4, j++) L[j] = 77 * px[i] + 150 * px[i + 1] + 29 * px[i + 2] >> 8;
    return { L, W, H };
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
    const area = luminance2(canvas, rx, ry, Math.min(canvas.width, Math.round(tip.x0) + ROI + 16) - rx, Math.min(canvas.height, Math.round(tip.y0) + ROI + 16) - ry);
    const result = measureArea(area, { x0: tip.x0 - rx, y0: tip.y0 - ry, x1: tip.x1 - rx, y1: tip.y1 - ry }, hide);
    return result && { ...result, lines: { xs: result.lines.xs.map((x) => x + rx), ys: result.lines.ys.map((y) => y + ry) } };
  }
  function measureArea({ L, W, H }, tip, hide) {
    const lum = (x, y) => L[y * W + x];
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
      return a.length >= all * 0.25 ? median2(a) : null;
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
      return a.length >= all * 0.25 ? median2(a) : null;
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
  var HOMOGLYPH = { а: "a", в: "b", е: "e", ё: "e", к: "k", м: "m", н: "h", о: "o", р: "p", с: "c", т: "t", у: "y", х: "x" };
  var norm = (s) => s.toLowerCase().replace(/[а-яё]/g, (c) => HOMOGLYPH[c] ?? c).replace(/[^a-zа-я]/g, "");
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
    const pct = (q) => {
      let acc = 0;
      for (let v = 0; v < 256; v++) {
        acc += hist[v];
        if (acc >= q * n) return v;
      }
      return 255;
    };
    const bg = pct(0.4), fg = pct(0.95);
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
      const { data } = await worker.recognize(c);
      if (prevPsm) await worker.setParameters({ tessedit_pageseg_mode: "3" });
      return (data.text ?? "").replace(/\s+/g, " ").trim();
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
    constructor(model) {
      this.model = model;
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
      const { data } = await worker.recognize(mode === "bright" ? _TooltipReader.bright(image) : image);
      this.lastFrame = image;
      this.lastText = data.text;
      const lines = (data.lines ?? []).map((l) => ({
        text: l.text,
        bbox: l.bbox,
        words: (l.words ?? data.words?.filter((w) => w.bbox.y0 >= l.bbox.y0 - 2 && w.bbox.y1 <= l.bbox.y1 + 2) ?? []).map((w) => {
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
        const hay = norm(line.text);
        if (hay.length < 4) continue;
        let best = null;
        for (const typeId of pairs.keys()) {
          const t = this.model.typeName(typeId);
          const names = [["eng", t.en], ["rus", t.ru], ...(TYPE_LABELS[t.en] ?? []).map((n) => ["rus", n])];
          for (const [lang, name] of names) {
            const needle = norm(name);
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

  // ../../../tmp/tmp7sxyxp1p/test-api-entry.js
  window.__TEST_API = {
    grid: { detectGrid, GRID_COLS },
    features: { FeatureExtractor },
    matcher: { makeTemplate, matchSegment, PRE_FRAMES },
    model: { MerchantModel },
    ocr: { TooltipReader }
  };
})();
