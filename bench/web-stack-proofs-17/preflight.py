"""Untimed complete source/oracle/staged/expert control corroboration."""
import hashlib,json,subprocess,tempfile
from pathlib import Path
from types import SimpleNamespace
from spec import TASKS
from fixtures import make_fixtures
HERE=Path(__file__).resolve().parent

def preflight():
    args=SimpleNamespace(seed=20261026,sizes=[32,4096,65536],cases=[t['name'] for t in TASKS],repeats=9,warmup=1,seconds=.015)
    fixture=make_fixtures(args)
    for p in fixture['profiles']:
        if p['case'].startswith('independent_') and '_heldout' in p['case']:
            assert p['gate_true']>0 and p['gate_false']>0,p
        if p['case'].startswith('mapped_') and '_heldout' not in p['case']:
            assert p['reducer_true']>0 and p['reducer_false']>0,p
    with tempfile.TemporaryDirectory(prefix='ink17-controls-') as directory:
        file=Path(directory)/'fixtures.json';file.write_text(json.dumps(fixture,separators=(',',':')))
        script='''import fs from 'node:fs';import * as literal from LITERAL;import {createExpert} from EXPERT;
const f=JSON.parse(fs.readFileSync(process.argv[1],'utf8')),expert=createExpert(Math.max(2,...f.inputs.flatMap(x=>[x.xs.length,x.ys.length])));let comparisons=0;
for(const x of f.inputs)for(const c of [literal,expert]){const xs=Uint32Array.from(x.xs),ys=Uint32Array.from(x.ys),value=c.call(x.case,[xs,ys,x.seed,x.factor]),gold=x.expected[x.case];
if(Array.isArray(gold)?value.length!==gold.length||value.some((v,i)=>v!==gold[i]):value!==gold)throw Error(x.id+': control mismatch');
if(xs.some((v,i)=>v!==x.xs[i])||ys.some((v,i)=>v!==x.ys[i]))throw Error(x.id+': input mutation');comparisons++;}console.log(JSON.stringify({status:'passed',comparisons}));'''
        script=script.replace('LITERAL',json.dumps((HERE/'literal.mjs').as_uri())).replace('EXPERT',json.dumps((HERE/'expert.mjs').as_uri()))
        result=subprocess.run(['node','--input-type=module','-e',script,str(file)],capture_output=True,text=True,check=True)
    bindings={n:hashlib.sha256((HERE/n).read_bytes()).hexdigest() for n in ['spec.py','spec.json','kernels.ink','generate.py','literal.mjs','expert.mjs','literal.rs','expert.rs','fixtures.py','donor-fixtures.json','preflight.py']}
    return dict(status='passed',tasks=len(TASKS),inputs=len(fixture['inputs']),cells=len(fixture['cells']),python_complete_outputs=len(fixture['inputs']),python_input_values_exercised=fixture['python_literal_checks'],js=json.loads(result.stdout),bindings=bindings,profiles=fixture['profiles'],scope='All expected complete outputs corroborated by ordered literal AST and separate mathematical/state oracles; JS original and expert exact values/nonmutation. No compiler/target builds/timings.')
if __name__=='__main__':
    result=preflight();(HERE/'preflight-receipt.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({k:v for k,v in result.items() if k not in ['profiles','bindings']},indent=2))
