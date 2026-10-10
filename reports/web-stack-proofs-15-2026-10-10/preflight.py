"""Untimed independent fixture/oracle and staged/expert JS value checks."""
import json,subprocess,tempfile
from pathlib import Path
from types import SimpleNamespace
from spec import TASKS
from fixtures import make_fixtures
HERE=Path(__file__).resolve().parent

def preflight():
    args=SimpleNamespace(seed=20261025,sizes=[32,4096,65536],cases=[t['name'] for t in TASKS],repeats=9,warmup=1,seconds=.015)
    fixture=make_fixtures(args)
    for p in fixture['profiles']:
        if p['source']!='exact-round14-fixture' and p['accepted_count'] is not None:
            assert 0<p['accepted_count']<p['length'],p
    with tempfile.TemporaryDirectory(prefix='ink-batch15-controls-') as directory:
        file=Path(directory)/'fixtures.json';file.write_text(json.dumps(fixture,separators=(',',':')))
        script='''import fs from 'node:fs';
import * as literal from LITERAL;
import {createExpert} from EXPERT;
const fixtures=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));
const expert=createExpert(Math.max(2,...fixtures.inputs.map(x=>x.xs.length)));
let comparisons=0;
for(const x of fixtures.inputs)for(const control of [literal,expert]){
const value=control.call(x.case,[Uint32Array.from(x.xs),new Uint32Array(0),x.seed,x.factor]);
if(value!==x.expected[x.case])throw Error(x.id+': '+value+' vs '+x.expected[x.case]);
comparisons++;
}
console.log(JSON.stringify({status:'passed',comparisons}));'''
        script=script.replace('LITERAL',json.dumps((HERE/'literal.mjs').as_uri())).replace('EXPERT',json.dumps((HERE/'expert.mjs').as_uri()))
        result=subprocess.run(['node','--input-type=module','-e',script,str(file)],capture_output=True,text=True,check=True)
    return dict(status='passed',tasks=len(TASKS),inputs=len(fixture['inputs']),cells=len(fixture['cells']),python_aggregate_comparisons=len(fixture['inputs']),python_input_values_exercised=fixture['python_literal_checks'],js=json.loads(result.stdout),profile_scope='New timed predicated fixtures exercise both predicate outcomes; anchors copy exact archived round14 profiles.')
if __name__=='__main__':print(json.dumps(preflight(),indent=2))
