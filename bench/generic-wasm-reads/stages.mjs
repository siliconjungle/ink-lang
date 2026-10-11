// Diagnostic breakdown of the existing complete-state host, after the main run.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {StatefulModule, stringifyExactJSON} from '../../build/generic-wasm-reads/fixed/state-wasm.mjs';
const root = new URL('../../build/generic-wasm-reads/', import.meta.url);
const fixture = JSON.parse(fs.readFileSync(new URL('fixtures.json', root))).find(f => f.id === 'rows-16384-sparse');
const module = await StatefulModule.instantiate(fs.readFileSync(new URL('fixed/cpu/compiled_state.wasm', root)));
const state = module.create();
function numbers(value) {
  if (typeof value === 'bigint') { assert(value >= 0n && value <= 0xffffffffn); return Number(value); }
  if (Array.isArray(value)) return value.map(numbers);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, numbers(v)]));
  return value;
}
function run() {
  const times = {}; let start = performance.now();
  const bytes = module.encoder.encode(stringifyExactJSON({pure: 'rows_final', args: [fixture.before, fixture.after]}));
  assert(bytes.length <= 4 * 1024 * 1024);
  times.request_encoding_ms = performance.now() - start; start = performance.now();
  const input = module.input(bytes);
  times.input_transfer_ms = performance.now() - start;
  let reply;
  try {
    start = performance.now(); const output = module.call('lang_invoke', state.handle, input) >>> 0;
    times.wasm_invoke_ms = performance.now() - start; start = performance.now();
    reply = module.response(output);
    times.response_decode_parse_ms = performance.now() - start;
  } finally { module.release(input); }
  start = performance.now(); const result = numbers(reply);
  let digest = 2166136261;
  for (const row of result) for (const key of ['id', 'x', 'y', 'score', 'flags']) digest = Math.imul(digest ^ row[key], 16777619) >>> 0;
  times.number_materialization_digest_ms = performance.now() - start;
  assert.deepEqual(result, fixture.after);
  return {times, digest, request_bytes: bytes.length};
}
for (let i = 0; i < 3; i++) run();
const samples = Array.from({length: 9}, run);
state.dispose();
const median = values => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
const result = {schema: 1, status: 'passed', case: fixture.id, scope: 'diagnostic stage timers using the same complete-state host; separate process from main timing, not a replacement call boundary', samples, median_ms: Object.fromEntries(Object.keys(samples[0].times).map(key => [key, median(samples.map(s => s.times[key]))]))};
assert(process.argv[2]); fs.writeFileSync(process.argv[2], JSON.stringify(result, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify(result.median_ms));
