// Комплексное БПФ radix-2 на месте. Таблицы (перестановка, поворотные множители) кешируются по размеру.

const tables = new Map();

function tablesFor(n) {
  let t = tables.get(n);
  if (t) return t;
  const bits = Math.log2(n);
  if (!Number.isInteger(bits)) throw new Error(`размер БПФ не степень двойки: ${n}`);
  const rev = new Uint32Array(n);
  for (let i = 0; i < n; i++) {
    let r = 0;
    for (let b = 0; b < bits; b++) r |= ((i >> b) & 1) << (bits - 1 - b);
    rev[i] = r;
  }
  // Поворотные множители по этапам подряд (этап size: half штук), чтобы читать их без шага.
  const stages = [];
  for (let size = 8; size <= n; size <<= 1) {
    const half = size >> 1;
    const c = new Float64Array(half), s = new Float64Array(half);
    for (let k = 0; k < half; k++) {
      c[k] = Math.cos((2 * Math.PI * k) / size);
      s[k] = Math.sin((2 * Math.PI * k) / size);
    }
    stages.push({ size, half, c, s });
  }
  t = { rev, stages };
  tables.set(n, t);
  return t;
}

export function nextPow2(n) {
  let p = 1;
  while (p < n) p <<= 1;
  return p;
}

// inverse = true — обратное преобразование с делением на n.
export function fft(re, im, inverse = false) {
  const n = re.length;
  if (n < 4) throw new Error("БПФ меньше 4 точек не нужно");
  const { rev, stages } = tablesFor(n);
  for (let i = 0; i < n; i++) {
    const j = rev[i];
    if (j > i) {
      let t = re[i]; re[i] = re[j]; re[j] = t;
      t = im[i]; im[i] = im[j]; im[j] = t;
    }
  }
  const sgn = inverse ? 1 : -1;
  // Этапы 2 и 4 вместе, без умножений (множители 1 и ∓i).
  for (let a = 0; a < n; a += 4) {
    const r0 = re[a] + re[a + 1], i0 = im[a] + im[a + 1];
    const r1 = re[a] - re[a + 1], i1 = im[a] - im[a + 1];
    const r2 = re[a + 2] + re[a + 3], i2 = im[a + 2] + im[a + 3];
    const r3 = re[a + 2] - re[a + 3], i3 = im[a + 2] - im[a + 3];
    // w = ∓i для второй пары: (r3 + i·i3)·(∓i) = ±i3 ∓ i·r3
    const t3r = -sgn * i3, t3i = sgn * r3;
    re[a] = r0 + r2; im[a] = i0 + i2;
    re[a + 2] = r0 - r2; im[a + 2] = i0 - i2;
    re[a + 1] = r1 + t3r; im[a + 1] = i1 + t3i;
    re[a + 3] = r1 - t3r; im[a + 3] = i1 - t3i;
  }
  for (const { size, half, c, s } of stages) {
    for (let start = 0; start < n; start += size) {
      for (let k = 0; k < half; k++) {
        const wr = c[k], wi = sgn * s[k];
        const a = start + k, b = a + half;
        const br = re[b], bi = im[b];
        const tr = br * wr - bi * wi;
        const ti = br * wi + bi * wr;
        re[b] = re[a] - tr; im[b] = im[a] - ti;
        re[a] += tr; im[a] += ti;
      }
    }
  }
  if (inverse) for (let i = 0; i < n; i++) { re[i] /= n; im[i] /= n; }
}

// Спектры двух вещественных сигналов одним комплексным БПФ: z = a + i·b.
// Возвращает [{re, im}, {re, im}] длины n (b может быть null).
export function fftReal2(a, b, n) {
  const re = new Float64Array(n), im = new Float64Array(n);
  re.set(a.length > n ? a.subarray(0, n) : a);
  if (b) im.set(b.length > n ? b.subarray(0, n) : b);
  fft(re, im);
  const A = { re: new Float64Array(n), im: new Float64Array(n) };
  const B = b ? { re: new Float64Array(n), im: new Float64Array(n) } : null;
  for (let k = 0; k < n; k++) {
    const k2 = (n - k) & (n - 1);
    const zr = re[k], zi = im[k], cr = re[k2], ci = -im[k2]; // conj(Z[n-k])
    A.re[k] = (zr + cr) / 2; A.im[k] = (zi + ci) / 2;
    if (B) { B.re[k] = (zi - ci) / 2; B.im[k] = -(zr - cr) / 2; }
  }
  return [A, B];
}
