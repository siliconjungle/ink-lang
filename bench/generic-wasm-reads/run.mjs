// Full immutable final-state calls, serial timing, every returned field consumed.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {performance} from 'node:perf_hooks';
const root = new URL('../../build/generic-wasm-reads/', import.meta.url);
const originalFetch = globalThis.fetch;
globalThis.fetch = async value => {
  const url = new URL(value);
  if (url.protocol !== 'file:') return originalFetch(value);
  const bytes = fs.readFileSync(url);
  return {ok: true, json: async () => JSON.parse(bytes), arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)};
};
const frontier = await import(new URL('frontier/dist/index.js', root));
const js = await import(new URL('fixed/program.mjs', root));
const engines = {};
for (const name of ['before', 'fixed']) {
  const {loadInk} = await import(new URL(name + '/ink-gpu.mjs', root));
  engines[name] = await loadInk(new URL(name + '/', root), {gpu: false});
}
function numbers(value) {
  if (typeof value === 'bigint') { assert(value >= 0n && value <= 0xffffffffn); return Number(value); }
  if (Array.isArray(value)) return value.map(numbers);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, numbers(v)]));
  return value;
}
function digest(rows) {
  let h = 2166136261;
  const mix = x => { h = Math.imul(h ^ x, 16777619) >>> 0; };
  for (const row of rows) {
    if (typeof row === 'number') mix(row);
    else { mix(row.id); mix(row.x); mix(row.y); mix(row.score); mix(row.flags); }
  }
  return h;
}
function freeze(value) { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } }
let seed = 71431;
const rng = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return seed >>> 0; };
function shuffle(values) { values = [...values]; for (let i = values.length - 1; i > 0; i--) { const j = rng() % (i + 1); [values[i], values[j]] = [values[j], values[i]]; } return values; }
const output = {schema: 1, status: 'running', host: process.version, protocol: {
  rounds: 9, target_ms: 20, max_iterations: 4096, warmups: {wasm: 3, js: {64: 256, 1024: 96, 16384: 24}},
  boundary: 'full logical call, including Wasm JSON transport, exact-integer to u32 Number conversion, and every output field digest; input creation and module instantiation excluded',
  baseline_exclusion: 'changed 16384-row baseline calls excluded using the previously recorded 30-second row timeout; no completed timing assigned',
}, validation: [], samples: [], hashes: {}, excluded: [], sink: 0};
for (const file of ['fixtures.json', 'fixed/program.mjs', 'fixed/cpu/compiled_state.wasm', 'before/cpu/compiled_state.wasm', 'frontier/dist/index.js']) {
  output.hashes[file] = crypto.createHash('sha256').update(fs.readFileSync(new URL(file, root))).digest('hex');
}
const fixtures = JSON.parse(fs.readFileSync(new URL('fixtures.json', root)));
if (process.argv.includes('--probe')) {
  const f = fixtures.find(f => f.id === 'rows-16384-sparse');
  const start = performance.now();
  const result = numbers((await engines.fixed.call('rows_final', [f.before, f.after], {backend: 'cpu'})).value);
  const elapsed_ms = performance.now() - start;
  assert.deepEqual(result, f.after);
  console.log(JSON.stringify({status: 'passed', case: f.id, elapsed_ms, digest: digest(result), scope: 'first complete logical call after module instantiation'}));
} else {
  for (const f of fixtures) {
    if (f.kind === 'rows-shared') { const changed = new Set(f.edits.map(e => e.index)); f.after = f.after.map((row, i) => changed.has(i) ? row : f.before[i]); }
    freeze(f.before); freeze(f.after);
    const name = f.kind === 'scalar' ? 'scalar_final' : 'rows_final';
    const variants = {
      frontier: () => frontier.applyPatchImmutable(f.before, frontier.diff(f.before, f.after)),
      javascript: () => js.functions[name](f.before, f.after),
      fixed: async () => numbers((await engines.fixed.call(name, [f.before, f.after], {backend: 'cpu'})).value),
    };
    if (f.kind === 'scalar' || f.rows < 16384 || f.changes === 0) variants.before = async () => numbers((await engines.before.call(name, [f.before, f.after], {backend: 'cpu'})).value);
    else output.excluded.push({case: f.id, variant: 'before', reason: output.protocol.baseline_exclusion});
    const expected = digest(f.after), iterations = {};
    // Keep synchronous JS calls synchronous so the control does not time await overhead.
    function syncBatch(run, n) { let sum = 0, last; const start = performance.now(); for (let i = 0; i < n; i++) { last = run(); sum = (sum + digest(last)) >>> 0; } const ms = performance.now() - start; return checked(last, sum, n, ms); }
    async function asyncBatch(run, n) { let sum = 0, last; const start = performance.now(); for (let i = 0; i < n; i++) { last = await run(); sum = (sum + digest(last)) >>> 0; } const ms = performance.now() - start; return checked(last, sum, n, ms); }
    function checked(last, sum, n, ms) { assert.equal(sum, Math.imul(expected, n) >>> 0); assert.deepEqual(last, f.after); output.sink ^= sum; return {iterations: n, total_ms: ms, us: ms * 1000 / n}; }
    const batch = (key, n) => key === 'fixed' || key === 'before' ? asyncBatch(variants[key], n) : syncBatch(variants[key], n);
    for (const key of shuffle(Object.keys(variants))) {
      assert.deepEqual(await variants[key](), f.after);
      const warmups = key === 'fixed' || key === 'before' ? 3 : output.protocol.warmups.js[f.rows];
      for (let i = 0; i < warmups; i++) output.sink ^= digest(await variants[key]());
      let n = 1;
      for (;;) { const sample = await batch(key, n); if (sample.total_ms >= 20 || n === 4096) break; n = Math.min(4096, n * 2); }
      iterations[key] = n; output.validation.push({case: f.id, variant: key, digest: expected});
    }
    for (let round = 0; round < 9; round++) for (const key of shuffle(Object.keys(variants))) {
      assert.deepEqual(await variants[key](), f.after);
      const sample = await batch(key, iterations[key]);
      assert.deepEqual(await variants[key](), f.after);
      output.samples.push({case: f.id, kind: f.kind, mode: f.mode, rows: f.rows, variant: key, round, ...sample});
    }
    console.error('validated ' + f.id);
  }
  output.status = 'passed';
  assert(process.argv[2] && !process.argv[2].startsWith('--'));
  fs.writeFileSync(process.argv[2], JSON.stringify(output, null, 2) + '\n', {flag: 'wx'});
}
for (const engine of Object.values(engines)) await engine.dispose();
