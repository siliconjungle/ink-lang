// Paired, interleaved timing of baseline and structure-instance artifacts.
// Usage: node bench.mjs BASELINE.mjs CANDIDATE.mjs FUNCTION CASES.json
import {performance} from 'node:perf_hooks';
const [baselinePath, candidatePath, name, casesPath] = process.argv.slice(2);
const base = (await import(baselinePath)).functions[name];
const cand = (await import(candidatePath)).functions[name];
const cases = JSON.parse((await import('node:fs')).readFileSync(casesPath, 'utf8'));
const revive = (v) => typeof v === 'string' && /^[0-9]+n$/.test(v) ? BigInt(v.slice(0, -1)) : Array.isArray(v) ? v.map(revive) : v;
const results = [];
for (const c of cases) {
  const args = revive(c.args);
  const expected = base(...args), actual = cand(...args);
  if (String(expected) !== String(actual)) throw new Error(`output mismatch on ${c.label}: ${expected} vs ${actual}`);
  const time = (f, reps) => { const t = performance.now(); let sink; for (let i = 0; i < reps; i++) sink = f(...args); globalThis.__sink = sink; return (performance.now() - t) / reps; };
  let reps = 1; while (time(base, reps) * reps < 2) reps *= 2;           // ~2 ms per sample
  for (let w = 0; w < 20; w++) { time(base, reps); time(cand, reps); }  // warm both
  const ratios = [];
  for (let s = 0; s < 60; s++) {                                         // interleave, alternate order
    const first = s % 2 === 0;
    const a = first ? time(base, reps) : null, b = time(cand, reps), a2 = first ? a : time(base, reps);
    ratios.push(a2 / b);                                                 // >1 means candidate faster
  }
  ratios.sort((x, y) => x - y);
  const median = (xs) => xs[Math.floor(xs.length / 2)];
  let seed = 7; const rand = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  const boots = []; for (let b = 0; b < 2000; b++) { const s = []; for (let i = 0; i < ratios.length; i++) s.push(ratios[Math.floor(rand() * ratios.length)]); s.sort((x, y) => x - y); boots.push(median(s)); }
  boots.sort((x, y) => x - y);
  results.push({label: c.label, speedup: median(ratios), low: boots[50], high: boots[1949], reps});
}
console.log(JSON.stringify(results));
