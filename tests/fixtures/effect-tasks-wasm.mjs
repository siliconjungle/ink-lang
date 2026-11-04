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
// A reply of the wrong type traps the Wasm instance inside its typed ingress
// (where JavaScript throws). The host keeps the state's last snapshot, starts a
// fresh instance from it after a trap, and reports the call as failed, which
// is what the generated accept query's rejection means to the scheduler.
const bytes = new Uint8Array(readFileSync(join(dir, 'rust/target/wasm32-unknown-unknown/release/compiled_state.wasm')));
let module = await StatefulModule.instantiate(bytes), state = module.create(), saved = state.snapshot(), traps = 0;
const call = async (name, args) => {
  try {
    const result = stateCaller(state)(name, args);
    saved = state.snapshot();
    return result;
  } catch (error) {
    if (module.trapped) {
      traps++;
      module = await StatefulModule.instantiate(bytes);
      state = module.restore(saved);
    }
    throw error;
  }
};
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
for (let id = 1; id <= 6; id++) labels.push(await call('label_of', [id]));
console.log(stringifyExactJSON({traces, traps, final: {triaged: await call('triaged', []), labels}}));
