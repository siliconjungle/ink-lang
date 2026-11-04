// Runs the traces the JavaScript host recorded (effect-tasks-host.mjs) again
// on the concurrent task host, with the state compiled to Wasm and every
// effect answered from the recording, and prints the new traces and final
// state for tests/effect_tasks.rs.
//   node effect-tasks-wasm.mjs DIR TASKS.json TRACES.json
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {join} from 'node:path';
import {runTask, stateCaller, TaskFailed} from '../../runtime/hosts/tasks.mjs';

const [dir, tasks, recorded] = process.argv.slice(2);
const manifest = JSON.parse(readFileSync(tasks, 'utf8'));
const {StatefulModule, stringifyExactJSON} = await import(pathToFileURL(join(dir, 'state-wasm.mjs')));
const module = await StatefulModule.instantiate(new Uint8Array(readFileSync(join(dir, 'rust/target/wasm32-unknown-unknown/release/compiled_state.wasm'))));
const state = module.create(), call = stateCaller(state);
let live = 0, peak = 0;
const traces = [];
for (const trace of JSON.parse(readFileSync(recorded, 'utf8'))) {
  peak = 0;
  const reply = async (...args) => {
    const {step} = args.pop();
    live++; peak = Math.max(peak, live);
    try {
      await new Promise(r => setTimeout(r, 15));
      const r = trace.effects.find(e => e.step === step);
      if (!r) throw Error('not started in the recording');
      if (Object.hasOwn(r, 'error')) throw Error(r.error);
      return r.reply;
    } finally { live--; }
  };
  const effects = Object.fromEntries(manifest.effects.map(e => [e.name, reply]));
  let out;
  try { out = (await runTask({manifest, call, task: 'triage', args: trace.args, effects})).trace; }
  catch (error) { if (!(error instanceof TaskFailed)) throw error; out = error.trace; }
  traces.push({trace: out, peak});
}
const labels = [];
for (let id = 1; id <= 6; id++) labels.push(call('label_of', [id]));
console.log(stringifyExactJSON({traces, final: {triaged: call('triaged', []), labels}}));
