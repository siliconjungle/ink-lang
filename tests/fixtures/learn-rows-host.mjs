// Gated edits on the JavaScript host for tests/learn_rows.rs: a scripted
// "model" proposes rows, the gate admits or rejects them against held-out data.
//   node learn-rows-host.mjs PROGRAM.mjs HOLES.json HELDOUT.json
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {learnRows, gatedEdit, proposeEdit, EDIT_FORMAT} from '../../runtime/hosts/learn-rows.mjs';

const [program, holesPath, dataPath] = process.argv.slice(2);
const holes = JSON.parse(readFileSync(holesPath, 'utf8'));
const data = JSON.parse(readFileSync(dataPath, 'utf8'));
const {createState} = await import(pathToFileURL(program));
const live = await createState(), scratch = await createState();
const call = (name, args) => live.invoke(name, args).result;
const scratchCall = (name, args) => scratch.invoke(name, args).result;
const rows = () => learnRows(holes, call('__learn_get', []));
const prompts = [];
const complete = async prompt => { prompts.push(prompt); return '```json\n{"reason": "a quote inside a quoted field ends it", "rows": [{"hole": "recover", "key": ["State.Quoted", "Class.Quote"], "value": "Step.End"}]}\n```'; };
const edit = await proposeEdit({complete, holes, rows: rows().filter(r => r.hole === 'recover'), failures: [data[0][0]]});
if (!prompts[0].includes('recover(State.Quoted, Class.Quote) = Step.Keep')) throw Error('prompt does not list rows');
const proposed = await gatedEdit({call, scratch: scratchCall, holes, edit, objective: 'mistakes', data});
const liveAfterAdmission = rows();
const worse = await gatedEdit({call, holes, objective: 'mistakes', data,
  edit: {format: EDIT_FORMAT, rows: [{hole: 'recover', key: ['State.Quoted', 'Class.Other'], value: 'Step.Drop'}]}});
let invalid = null;
try { await gatedEdit({call, holes, objective: 'mistakes', data, edit: {format: EDIT_FORMAT, rows: [{hole: 'recover', key: ['State.Start', 'Class.Quote'], value: 'Step.Later'}]}}); }
catch (e) { invalid = e.message; }
console.log(JSON.stringify({proposed, worse, invalid, live_after_admission: liveAfterAdmission, live_after_rejection: rows()}));
