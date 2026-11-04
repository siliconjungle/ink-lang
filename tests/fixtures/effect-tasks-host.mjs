// Runs examples/effect-tasks.ink's `triage` task on the concurrent JavaScript
// task host with fake effect handlers, then prints the traces, the observed
// concurrency and the final state for tests/effect_tasks.rs to replay against
// the sequential reference evaluator.
//   node effect-tasks-host.mjs PROGRAM.mjs TASKS.json [compiled]
// With `compiled`, the same runs use the module's own compiled `tasks`
// (printed from the mid-level IR) instead of the interpreted host.
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {runTask, replayTask, stateCaller, TaskFailed} from '../../runtime/hosts/tasks.mjs';
import {modelEffect} from '../../runtime/hosts/model-effect.mjs';
import {stringifyExactJSON} from '../../runtime/hosts/state-wasm.mjs';

const [program, tasks, mode] = process.argv.slice(2);
const manifest = JSON.parse(readFileSync(tasks, 'utf8'));
const compiledModule = await import(pathToFileURL(program));
const {createState} = compiledModule;
const compiled = mode === 'compiled';
if (compiled && !compiledModule.tasks?.triage) throw Error('the module has no compiled tasks');
const runOne = (args, effects) => compiled
  ? compiledModule.tasks.triage(state, args, effects)
  : runTask({manifest, call, task: 'triage', args, effects});
const Failed = compiled ? compiledModule.TaskFailed : TaskFailed;
const state = await createState();
const call = stateCaller(state);
const delay = ms => new Promise(r => setTimeout(r, ms));
let live = 0, peak = 0;
const tracked = f => async (...a) => { live++; peak = Math.max(peak, live); try { await delay(15); return await f(...a); } finally { live--; } };
const sent = [], prompts = [];

// A fake model: replies are scripted per call, as a real model's text would be.
const scripted = replies => modelEffect(async prompt => { prompts.push(prompt); return replies.shift() ?? 'no reply'; });
function handlers({classify, summarise, notify = () => ({Ok: null}), ticket = id => ({Ok: {id, customer: `c${id}`, text: `ticket ${id}`}})}) {
  return {
    fetch_ticket: tracked(ticket),
    lookup_customer: tracked(name => (name === 'c1' ? {Some: {name, plan: 'enterprise'}} : {None: null})),
    classify: tracked(scripted(classify)),
    summarise: tracked(scripted(summarise)),
    notify: tracked((channel, message) => { sent.push([channel, message]); return notify(channel, message); }),
  };
}
const runs = [
  // Accepted label; a summary that is not JSON falls back to "".
  [1, handlers({classify: ['```json\n"Label.Bug"\n```'], summarise: ['not json']})],
  // Rejected label (fails `ensures`) and a summary of the wrong type fall back.
  [2, handlers({classify: ['"Label.Other"'], summarise: ['42']})],
  // A label outside the enum is rejected by the declared type; the summary is accepted.
  [3, handlers({classify: ['"Label.Urgent"'], summarise: ['"short"']})],
  // fetch_ticket returns Err: the task ends with that error and nothing is recorded or sent.
  [4, handlers({classify: ['"Label.Bug"'], summarise: ['"s"'], ticket: () => ({Err: 'no such ticket'})})],
  // An ordered effect fails after the change has committed.
  [5, handlers({classify: ['"Label.Billing"'], summarise: ['"s"'], notify: () => ({Err: 'channel closed'})})],
  // An unguarded effect throws: the task fails with an error, not an Ink value.
  [6, {...handlers({classify: ['"Label.Bug"'], summarise: ['"s"']}), lookup_customer: () => { throw Error('directory offline'); }}],
];
const traces = [];
for (const [id, effects] of runs) {
  peak = 0;
  try {
    const {trace} = await runOne([id], effects);
    traces.push({trace, peak});
  } catch (e) {
    if (!(e instanceof Failed)) throw e;
    traces.push({trace: e.trace, peak});
  }
}
// The JavaScript host also replays its own traces without calling handlers.
const fresh = await createState();
for (const {trace} of traces) await replayTask({manifest, call: stateCaller(fresh), trace});
const final = {triaged: call('triaged', []), labels: [1, 2, 3, 4, 5, 6].map(id => call('label_of', [id]))};
console.log(stringifyExactJSON({traces, sent, final, prompt: prompts.find(p => p.includes('classify('))}));
