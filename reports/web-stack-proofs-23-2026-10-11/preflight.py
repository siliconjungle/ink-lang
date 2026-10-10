"""Untimed complete source/oracle/staged/expert control corroboration."""
import hashlib,json,subprocess,tempfile,re
from pathlib import Path
from types import SimpleNamespace
from spec import TASKS,source
from fixtures import make_fixtures
HERE=Path(__file__).resolve().parent

def preflight():
    args=SimpleNamespace(seed=20261101,sizes=[32,4096,65536],cases=[t['name'] for t in TASKS],repeats=9,warmup=2,seconds=.015)
    fixture=make_fixtures(args);assert len(TASKS)==12 and len(fixture['inputs'])==228 and len(fixture['cells'])==120
    tasks={t['name']:t for t in TASKS}
    for p in fixture['profiles']:
        if p['match_location'] is not None:assert p['first_match_index']==(0 if p['match_location']=='first' else p['length']//2 if p['match_location']=='interior' else None)
    root=HERE.parents[1];author_files=['knowledge/research/web-stack-proofs-23/skip/examples.ink','knowledge/research/web-stack-proofs-23/skip/alternate.ink','knowledge/research/web-stack-proofs-23/pipeline/representative.ink']
    author='\n'.join((root/f).read_text() for f in author_files)
    for t in TASKS:
        definition=re.search(r'pub fn '+re.escape(t['name'])+r'\([^\n]+',author).group()
        assert re.sub(r'\s+','',definition)==re.sub(r'\s+','',source(t)),t['name']
    with tempfile.TemporaryDirectory(prefix='ink23-controls-') as directory:
        file=Path(directory)/'fixtures.json';file.write_text(json.dumps(fixture,separators=(',',':')))
        script='''import fs from 'node:fs';import * as literal from LITERAL;import {createExpert} from EXPERT;
const f=JSON.parse(fs.readFileSync(process.argv[1],'utf8')),expert=createExpert(Math.max(2,...f.inputs.map(x=>x.xs.length)));let comparisons=0;
for(const x of f.inputs)for(const c of [literal,expert]){const xs=Uint32Array.from(x.xs),ys=Uint32Array.from(x.ys),value=c.call(x.case,[xs,ys,x.seed,x.factor]),gold=x.expected[x.case];
if(Array.isArray(gold)?value.length!==gold.length||value.some((v,i)=>v!==gold[i]):String(value)!==String(gold))throw Error(x.id+': control mismatch');
if(xs.some((v,i)=>v!==x.xs[i])||ys.some((v,i)=>v!==x.ys[i]))throw Error(x.id+': input mutation');comparisons++;}console.log(JSON.stringify({status:'passed',comparisons}));'''
        script=script.replace('LITERAL',json.dumps((HERE/'literal.mjs').as_uri())).replace('EXPERT',json.dumps((HERE/'expert.mjs').as_uri()))
        result=subprocess.run(['node','--input-type=module','-e',script,str(file)],capture_output=True,text=True,check=True)
    bindings={n:hashlib.sha256((HERE/n).read_bytes()).hexdigest() for n in ['spec.py','spec.json','kernels.ink','generate.py','literal.mjs','expert.mjs','literal.rs','expert.rs','fixtures.py','donor-fixtures.json','preflight.py']}
    return dict(status='passed',tasks=12,inputs=228,cells=120,python_complete_outputs=228,python_input_values_exercised=fixture['python_literal_checks'],js=json.loads(result.stdout),bindings=bindings,profiles=fixture['profiles'],source_author_bindings={f:hashlib.sha256((root/f).read_bytes()).hexdigest() for f in author_files},scope='Twelve exact author sources; 228 complete frames and120 timed cells. Python materialized stages independently agree with cardinality/forward-match/scan-erasure goldens; 456 original/expert JS complete outputs and source nonmutation checked. Same parameters per distribution across sizes. First/interior/absent lookup modes preset before timing and checked exactly. Cardinality is true U64; original controls preserve filter/map/scan/zip arrays, experts count length or early-exit/erase scan. No compiler/target build or timing.')
if __name__=='__main__':
    result=preflight();(HERE/'preflight-receipt.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({k:v for k,v in result.items() if k not in ['profiles','bindings','source_author_bindings']},indent=2))
