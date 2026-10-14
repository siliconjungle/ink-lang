import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import path from 'node:path';

const source = process.argv[2] ?? 'build/crdt/bucket-hinted-index.mjs';
const ink = await import(pathToFileURL(path.resolve(source)));
let seed = 192837;
const random = n => {
  seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
  return (seed >>> 0) % n;
};
let queriesChecked = 0;
for (let trial = 0; trial < 140; trial++) {
  const entries = [];
  for (let i = 0; i < 100; i++) {
    const start = (BigInt(random(10)) << 32n) + BigInt(i * 11 + 1);
    entries.push({start, end: start + 7n, value: i + 1, hint: random(i + 1)});
  }
  const queries = Array.from({length: 600}, () => ({
    key: (BigInt(random(12)) << 32n) + BigInt(random(1150)), hint: random(130)
  }));
  const expected = queries.map(q => entries.find(e => e.start <= q.key && q.key < e.end)?.value ?? 0);
  assert.deepEqual(ink.call('hinted_values', [entries, queries]), expected, `history ${trial}`);
  queriesChecked += queries.length;
}
for (let actor = 0; actor < 20; actor++) {
  const start = (BigInt(actor) << 32n) + 1n;
  const end = start + 100n;
  const cuts = Array.from({length: 19}, (_, i) => start + BigInt((i + 1) * 5));
  const keys = Array.from({length: 110}, (_, i) => start + BigInt(i) - 2n);
  const expected = keys.map(k => k < start || k >= end ? 0 : 1 + cuts.filter(c => c <= k).length);
  assert.deepEqual(ink.call('refined_values', [start, end, cuts, keys]), expected);
}
const maximum = (1n << 64n) - 1n;
assert.deepEqual(ink.call('refined_values', [maximum - 10n, 0n, [maximum - 5n, maximum],
  [maximum - 11n, maximum - 10n, maximum - 6n, maximum - 5n, maximum - 1n, maximum]]), [0, 1, 1, 2, 2, 3]);
assert.equal(ink.call('valid', [[{start: 4294967295n, end: 4294967297n, value: 1, hint: 0}]]), false);
const report = {initial_seed: 192837, histories: 140, queriesChecked, refinements: 21,
  scope: 'Independent interval membership with stale cross-bucket handles, refinements and boundary rejection'};
await fs.writeFile(process.argv[3] ?? 'build/crdt/bucket-interval-reproducible-tests.json', JSON.stringify(report, null, 2) + '\n');
console.log(report);
