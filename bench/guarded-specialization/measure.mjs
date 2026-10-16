import assert from 'node:assert/strict';
import {readFileSync, statSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {pathToFileURL} from 'node:url';

const [image, dataPath, variant, pairArg] = process.argv.slice(2);
const data = JSON.parse(readFileSync(dataPath, 'utf8'));
const started = performance.now();
const program = await import(pathToFileURL(image));
const imported = performance.now();
const pair = Number(pairArg);
const records = [];
const median = xs => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
function consume(values) {
  let sum = 0;
  for (const value of values) sum += value;
  return sum;
}

// Independent reference values cover every input/graph/weight used below.
for (const item of data.values) {
  assert.deepEqual(program.functions.evaluate(...item.args), item.value, item.name);
  const state = program.createState();
  state.bind('recode', {resultOnly: true})(item.args[0]);
  state.bind('retune', {resultOnly: true})(item.args[1]);
  assert.deepEqual(state.bind('serve', {resultOnly: true})(item.args[2]), item.value, item.name);
}

// Repeat the retained independent-reference history, including errors/events,
// transaction rollback and byte-exact portable snapshots, outside timed work.
const historyState = program.createState();
let historyIndex = 0;
for (const step of data.history.steps) {
  if (step.restore) {
    await historyState.restore(step.restore);
    continue;
  }
  const expected = data.history.expected[historyIndex++];
  const normalize = v => typeof v === 'bigint' ? String(v) :
    typeof v === 'number' && Number.isInteger(v) ? (Object.is(v, -0) ? 'negative zero' : String(v)) :
    Array.isArray(v) ? v.map(normalize) : v && typeof v === 'object' ?
      Object.fromEntries(Object.entries(v).map(([k, x]) => [k, normalize(x)])) : v;
  assert.deepEqual(normalize(historyState.invoke(step.call, step.args)), normalize(expected.reply.outcome));
  assert.deepEqual(Array.from(await historyState.checkpoint()), expected.snapshot);
}
assert.equal(historyIndex, 335);

for (const scenario of data.scenarios) {
  const setup = performance.now();
  const state = program.createState();
  const recode = state.bind('recode', {resultOnly: true});
  const retune = state.bind('retune', {resultOnly: true});
  const serve = state.bind('serve', {resultOnly: true});
  recode(data.graphs[scenario.graph]);
  retune(data.weights[0]);
  const initialized = performance.now();
  const first = serve(data.inputs[scenario.input][0]);
  const firstDone = performance.now();
  const run = cycles => {
    let checksum = 0;
    for (let cycle = 0; cycle < cycles; cycle++) {
      let current = state;
      let serveNow = serve;
      if (scenario.lifetime === 'short') {
        current = program.createState();
        current.bind('recode', {resultOnly: true})(data.graphs[scenario.graph]);
        current.bind('retune', {resultOnly: true})(data.weights[cycle & 1]);
        serveNow = current.bind('serve', {resultOnly: true});
      } else if (scenario.lifetime === 'learning') {
        recode(data.graphs[cycle & 1 ? scenario.graph : 'match']);
        retune(data.weights[cycle & 1]);
      }
      for (let i = 0; i < scenario.reads; i++) {
        const value = serveNow(data.inputs[scenario.input][(cycle + i) % 3]);
        checksum += consume(value);
      }
    }
    return checksum;
  };
  run(scenario.warmup);
  const samples = [];
  const checksums = [];
  for (let sample = 0; sample < data.samples; sample++) {
    const before = performance.now();
    checksums.push(run(scenario.cycles));
    samples.push(performance.now() - before);
  }
  assert.ok(checksums.every(x => x === checksums[0]));
  records.push({name: scenario.name, scenario, samples_ms: samples,
    median_ms: median(samples), checksum: checksums[0], first,
    setup_ms: initialized - setup, first_call_ms: firstDone - initialized,
    snapshot: Buffer.from(await state.checkpoint()).toString('hex')});
}

// Recovery includes validation and rebuilding compiled state. Snapshot creation
// is measured independently; neither is hidden in a steady-state read ratio.
const recovery = program.createState();
recovery.bind('recode', {resultOnly: true})(data.graphs.match);
recovery.bind('retune', {resultOnly: true})(data.weights[0]);
const saved = await recovery.checkpoint();
const checkpointMs = [], restoreMs = [];
for (let i = 0; i < 9; i++) {
  let before = performance.now();
  assert.deepEqual(Array.from(await recovery.checkpoint()), Array.from(saved));
  checkpointMs.push(performance.now() - before);
  before = performance.now();
  await recovery.restore(saved);
  restoreMs.push(performance.now() - before);
}
assert.deepEqual(Array.from(await recovery.checkpoint()), Array.from(saved));
console.log(JSON.stringify({schema: 1, pair, variant, node: process.version,
  executable: process.execPath, image, image_bytes: statSync(image).size,
  import_ms: imported - started, records, checkpoint_ms: checkpointMs,
  restore_ms: restoreMs, max_rss_kib: process.resourceUsage().maxRSS,
  reference_values: data.values.length, reference_history_outcomes: historyIndex}));
