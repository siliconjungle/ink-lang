"""Untimed complete source/oracle/staged/expert control corroboration."""
import hashlib,json,subprocess,tempfile,re
from pathlib import Path
from types import SimpleNamespace
from spec import TASKS,source
from fixtures import make_fixtures
HERE=Path(__file__).resolve().parent

def preflight():
    args=SimpleNamespace(seed=20261103,sizes=[32,65536],cases=[t['name'] for t in TASKS],repeats=9,warmup=2,seconds=.015)
    fixture=make_fixtures(args);assert len(TASKS)==9 and len(fixture['inputs'])==207 and len(fixture['cells'])==72
    tasks={t['name']:t for t in TASKS}
    for p in fixture['profiles']:
        if p['match_location'] is not None:assert p['first_match_index']==(0 if p['match_location']=='first' else p['length']//2 if p['match_location']=='interior' else p['length']-1 if p['match_location']=='last' else None)
    root=HERE.parents[1];author_files=['knowledge/research/web-stack-proofs-25/accepted/discovery/representative.ink','knowledge/research/web-stack-proofs-24/demand/representative.ink','knowledge/research/web-stack-proofs-23/skip/examples.ink','knowledge/research/web-stack-proofs-23/skip/alternate.ink']
    author='\n'.join((root/f).read_text() for f in author_files)
    for t in TASKS:
        if t['operation']=='indexed':continue
        definition=re.search(r'pub fn '+re.escape(t['name'])+r'\([^\n]+',author).group()
        assert re.sub(r'\s+','',definition)==re.sub(r'\s+','',source(t)),t['name']
    with tempfile.TemporaryDirectory(prefix='ink25-controls-') as directory:
        file=Path(directory)/'fixtures.json';file.write_text(json.dumps(fixture,separators=(',',':')))
        script='''import fs from 'node:fs';import * as literal from LITERAL;import {createExpert} from EXPERT;
const f=JSON.parse(fs.readFileSync(process.argv[1],'utf8')),expert=createExpert(Math.max(2,...f.inputs.map(x=>x.xs.length)));let comparisons=0;
for(const x of f.inputs)for(const c of [literal,expert]){const xs=Uint32Array.from(x.xs),ys=Uint32Array.from(x.ys),value=c.call(x.case,[xs,ys,x.seed,x.factor]),gold=x.expected[x.case];
if(Array.isArray(gold)?value.length!==gold.length||value.some((v,i)=>v!==gold[i]):String(value)!==String(gold))throw Error(x.id+': control mismatch');
if(xs.some((v,i)=>v!==x.xs[i])||ys.some((v,i)=>v!==x.ys[i]))throw Error(x.id+': input mutation');comparisons++;}console.log(JSON.stringify({status:'passed',comparisons}));'''
        script=script.replace('LITERAL',json.dumps((HERE/'literal.mjs').as_uri())).replace('EXPERT',json.dumps((HERE/'expert.mjs').as_uri()))
        result=subprocess.run(['node','--input-type=module','-e',script,str(file)],capture_output=True,text=True,check=True)
    bindings={n:hashlib.sha256((HERE/n).read_bytes()).hexdigest() for n in ['spec.py','spec.json','kernels.ink','generate.py','literal.mjs','expert.mjs','literal.rs','expert.rs','fixtures.py','donor-fixtures.json','preflight.py']}
    return dict(status='passed',tasks=9,inputs=207,cells=72,python_complete_outputs=207,python_input_values_exercised=fixture['python_literal_checks'],js=json.loads(result.stdout),bindings=bindings,profiles=fixture['profiles'],source_author_bindings={f:hashlib.sha256((root/f).read_bytes()).hexdigest() for f in author_files},scope='Eight exact author sources and one unchanged indexed reference;207 complete frames and72 timed cells. Python eager stages independently agree with explicit integer predicate/mapper and ordered reverse goldens plus existing first-match references;414 original/expert JS complete outputs and source nonmutation.32/65536 timing,4096 correctness-only;first/interior/last/absent preset before performance. All parameters fixed per distribution across sizes; variable filtered vectors and scalar U32 outputs are compared completely. Staged validation-only controls versus optimized experts; no compiler/target build or timings.')
if __name__=='__main__':
    result=preflight();(HERE/'preflight-receipt.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({k:v for k,v in result.items() if k not in ['profiles','bindings','source_author_bindings']},indent=2))
