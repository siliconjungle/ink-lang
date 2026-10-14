import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {call} from './program.mjs';
const module = await WebAssembly.compile(readFileSync(new URL('cpu.wasm', import.meta.url)));
assert.deepEqual(WebAssembly.Module.imports(module), [], 'packed CPU needs no worker host');
const {exports: e} = await WebAssembly.instantiate(module, {});
const words = () => new Uint32Array(e.memory.buffer);
function put(xs) {
  const ptr = e.ink_alloc(xs.length, 4);
  words().set(xs, ptr / 4);
  return ptr;
}
let checks = 0;
for (const xs of [[], [0], [0xffffffff, 7], Array.from({length: 257}, (_, i) => Math.imul(i, 2654435761) >>> 0)]) {
  for (const grain of [0, 1, 8, 0xffffffff]) {
    for (const bias of [0, 13, 0xffffffff]) {
      for (const f of [0, 1]) {
        const data = put([put(xs), put([bias]), put([grain])]);
        const lengths = put([xs.length, 1, 1]);
        const out = put([0]), count = put([0]);
        e.ink_compute_call(f, data, lengths, out, count);
        const ptr = words()[out / 4], n = words()[count / 4];
        const actual = Array.from(words().slice(ptr / 4, ptr / 4 + n));
        const expected = xs.map((x, i) => (x + bias + (f === 0 ? 2 * i + 1 : i)) >>> 0);
        assert.deepEqual(actual, expected, JSON.stringify({f, grain, bias, length: xs.length}));
        assert.deepEqual(call(f === 0 ? 'mapped' : 'updated', [xs, bias, grain]), expected);
        e.ink_compute_reset();
        checks++;
      }
    }
  }
}
console.log(`${checks} packed Wasm parallel fallback cases passed`);
