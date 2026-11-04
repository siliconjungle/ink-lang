// Evaluates circuits on the JavaScript host for tests/circuit_target.rs.
//   node circuit-host.mjs CIRCUIT.json EDIT_ROWS.json
import {readFileSync} from 'node:fs';
import {loadCircuit} from '../../runtime/hosts/circuit.mjs';

const circuit = loadCircuit(JSON.parse(readFileSync(process.argv[2], 'utf8')));
const rows = JSON.parse(readFileSync(process.argv[3], 'utf8'));
const params = circuit.circuit.params;
const inputs = [];
const total = params.reduce((n, p) => n * p.values.length, 1);
for (let i = 0; i < total; i++) {
  let rest = i;
  inputs.push(params.map(p => { const v = p.values[rest % p.values.length]; rest = Math.floor(rest / p.values.length); return v; }));
}
const batched = circuit.batch(inputs);
const single = inputs.map(x => circuit.call(...x));
const before = circuit.table('override');
circuit.setTable('override', rows);
console.log(JSON.stringify({batched, single, before, after: circuit.batch(inputs), table: circuit.table('override')}));
