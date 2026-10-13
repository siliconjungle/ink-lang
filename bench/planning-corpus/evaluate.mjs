// Paired, interleaved complete-call timing of two emitted artifacts.
// Usage: node evaluate.mjs BASELINE.mjs CANDIDATE.mjs FUNCTION INPUTS.json
// INPUTS.json: [{label, path}] where each file holds the positional argument list.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {performance} from 'node:perf_hooks';
const [baselinePath, candidatePath, name, inputsPath] = process.argv.slice(2);
const base = (await import(pathToFileURL(baselinePath))).functions[name];
const cand = (await import(pathToFileURL(candidatePath))).functions[name];
const inputs = JSON.parse(fs.readFileSync(inputsPath, 'utf8'));
let sink = 0;
function consume(v) {
  if (v === null || v === undefined) return 0;
  if (typeof v === 'number') return (Math.imul(Math.trunc(v), 31) ^ Math.trunc(v * 65536)) | 0;
  if (typeof v === 'boolean') return Number(v);
  if (typeof v === 'bigint') return Number(v & 0xffffn);
  if (typeof v === 'string') { let h = 0; for (let i = 0; i < v.length; i++) h = Math.imul(h, 31) ^ v.charCodeAt(i); return h; }
  let h = 0; for (const x of Object.values(v)) h = Math.imul(h, 31) ^ consume(x); return h;
}
const median = (xs) => { const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };
const results = [];
for (const input of inputs) {
  const args = JSON.parse(fs.readFileSync(input.path, 'utf8'));
  const before = structuredClone(args);
  assert.deepStrictEqual(cand(...args), base(...args), `output differs on ${input.label}`);
  assert.deepStrictEqual(args, before, `input mutated on ${input.label}`);
  const time = (f, reps) => { const t = performance.now(); for (let i = 0; i < reps; i++) sink ^= consume(f(...args)); return (performance.now() - t) / reps; };
  let reps = 1; while (time(base, reps) * reps < 2 && reps < (1 << 22)) reps *= 2;
  for (let w = 0; w < 10; w++) { time(base, reps); time(cand, reps); }
  const ratios = [];
  for (let s = 0; s < 40; s++) {
    let a, b;
    if (s % 2 === 0) { a = time(base, reps); b = time(cand, reps); } else { b = time(cand, reps); a = time(base, reps); }
    ratios.push(a / b);
  }
  let seed = 17; const rand = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  const boots = [];
  for (let k = 0; k < 2000; k++) { const s = []; for (let i = 0; i < ratios.length; i++) s.push(ratios[Math.floor(rand() * ratios.length)]); boots.push(median(s)); }
  boots.sort((x, y) => x - y);
  results.push({label: input.label, speedup: median(ratios), low: boots[50], high: boots[1949], reps});
}
console.log(JSON.stringify({node: process.version, sink, results}));
