// Complete interface calls with the original validity check, plus a strong
// handwritten u32 control. This fixture establishes no general profitability.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';

const directory = path.resolve(process.argv[2]);
const baseline = await import(pathToFileURL(path.join(directory, 'value-baseline.mjs')));
const selected = await import(pathToFileURL(path.join(directory, 'value-selected.mjs')));
const name = 'known_unique';
const argumentCodec = baseline.valueCodecs[name].arguments;
const resultCodec = baseline.valueCodecs[name].result;
assert.equal(argumentCodec.descriptor.identity, selected.valueCodecs[name].arguments.descriptor.identity);
assert.equal(resultCodec.descriptor.identity, selected.valueCodecs[name].result.descriptor.identity);
const now = () => process.hrtime.bigint();
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const checked = value => {
  if (new Set(value.items).size !== value.items.length) throw Error('contract precondition failed');
  return true;
};
const handwrittenBinary = bytes => resultCodec.encode(checked(argumentCodec.decode(bytes).value));
let consumed = 0;
const rows = [];
const invalid = { items: [1, 1] };
for (const module of [baseline, selected]) {
  assert.throws(() => module.call(name, [invalid]), /contract precondition failed/);
  assert.throws(() => module.callBinary(name, argumentCodec.encode({ value: invalid })), /contract precondition failed/);
}
assert.throws(() => checked(invalid), /contract precondition failed/);
assert.throws(() => handwrittenBinary(argumentCodec.encode({ value: invalid })), /contract precondition failed/);

for (const n of [0, 16, 64, 128, 512]) {
  const value = { items: Array.from({ length: n }, (_, i) => i === 0 ? 0xffffffff : i - 1) };
  const original = JSON.stringify(value);
  const encodedAt = now();
  const bytes = argumentCodec.encode({ value });
  const inputEncodingNs = Number(now() - encodedAt);
  const repetitions = Math.max(4, Math.floor(4096 / Math.max(n, 16)));
  for (const boundary of ['trusted-values-with-invariant-validation', 'checked-value-wire']) {
    const methods = boundary === 'checked-value-wire'
      ? [() => baseline.callBinary(name, bytes), () => selected.callBinary(name, bytes), () => handwrittenBinary(bytes)]
      : [() => baseline.call(name, [value]), () => selected.call(name, [value]), () => checked(value)];
    const want = boundary === 'checked-value-wire' ? resultCodec.encode(true) : true;
    for (const method of methods) {
      assert.deepEqual(method(), want);
      for (let i = 0; i < 30; i++) method();
    }
    const samples = methods.map(() => []);
    for (let round = 0; round < 11; round++) {
      for (let offset = 0; offset < methods.length; offset++) {
        const lane = (round + offset) % methods.length;
        const begin = now();
        for (let i = 0; i < repetitions; i++) {
          const result = methods[lane]();
          if (boundary === 'checked-value-wire') for (const byte of result) consumed = (consumed + byte) >>> 0;
          else consumed = (consumed + Number(result)) >>> 0;
        }
        samples[lane].push(Number(now() - begin) / repetitions);
      }
    }
    assert.equal(JSON.stringify(value), original);
    const medians = samples.map(xs => [...xs].sort((a, b) => a - b)[5]);
    rows.push({ n, boundary, repetitions, inputEncodingNs, samplesNs: samples, medianNs: medians,
      selectedOverBaseline: medians[1] / medians[0], selectedOverHandwritten: medians[1] / medians[2] });
  }
}
console.log(JSON.stringify({ schema: 1, scope: 'One u32 uniqueness interface; interleaved complete calls; no automatic profitability claim',
  lanes: ['literal', 'checked-selection', 'handwritten-set'], platform: process.platform, architecture: process.arch,
  node: process.version, modules: ['value-baseline.mjs', 'value-selected.mjs'].map(file => ({ file, sha256: hash(path.join(directory, file)) })),
  planning: JSON.parse(fs.readFileSync(path.join(directory, 'fact-selection-frozen.log'))),
  inputSetup: 'Construction and argument encoding outside call timing; encoding separately recorded; result consumption inside',
  validity: 'Invalid duplicates reject in every lane; decoded values share the same wire codecs; complete outputs agree', consumed, rows }, null, 2));
