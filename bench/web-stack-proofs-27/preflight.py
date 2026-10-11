"""Untimed complete-source/oracle/staged/expert corroboration; no targets or timing."""
import hashlib,json,subprocess,tempfile,re,importlib.util
from pathlib import Path
from types import SimpleNamespace
from spec import TASKS,source
from fixtures import make_fixtures
HERE=Path(__file__).resolve().parent

def preflight():
 args=SimpleNamespace(seed=20261105,sizes=[32,65536],cases=[t['name'] for t in TASKS],repeats=9,warmup=2,seconds=.015)
 fixture=make_fixtures(args);assert len(TASKS)==8 and len(fixture['inputs'])==148 and len(fixture['cells'])==32
 root=HERE.parents[1];author=root/'knowledge/producers/web_zip27_laws.py'
 module_spec=importlib.util.spec_from_file_location('old26spec',root/'bench/web-stack-proofs-26/spec.py');old=importlib.util.module_from_spec(module_spec);module_spec.loader.exec_module(old)
 mix=next(t for t in TASKS if t['operation']=='modular_mix');assert source(mix)==old.source(next(t for t in old.TASKS if t['operation']=='modular_mix'))
 for row in fixture['inputs']:
  if row['case']==mix['name'] and row['id'].split('/')[-1] in ['small-32','small-65536','full-32','full-65536']:assert row['factor']==(768 if row['id'].split('/')[-1].startswith('small') else 0xc0000001)
 # Author source is corroborated using the producer API rather than guessed file paths.
 import sys;sys.path.insert(0,str(root/'knowledge'))
 from producers.web_zip27_laws import source_functions
 authored={n:text for n,typ,text in source_functions(False) if typ=='u32'}
 for t in TASKS[:2]:assert re.sub(r'\s+','',source(t))==re.sub(r'\s+','',authored[t['name']]),t['name']
 old_rows={x['id']:x for x in json.loads((root/'reports/web-stack-proofs-26-2026-10-11/fixtures.json').read_text())['inputs']}
 for cell in fixture['cells']:
  row=fixture['inputs'][cell['input']]
  if row['case']==mix['name']:
   old_row=old_rows[row['id']];assert all(row[k]==old_row[k] for k in ['case','xs','ys','seed','factor','expected'])
 with tempfile.TemporaryDirectory(prefix='ink27-controls-') as directory:
  file=Path(directory)/'fixtures.json';file.write_text(json.dumps(fixture,separators=(',',':')))
  script="""import fs from 'node:fs';import * as literal from LITERAL;import {createExpert} from EXPERT;
const f=JSON.parse(fs.readFileSync(process.argv[1],'utf8')),expert=createExpert(Math.max(2,...f.inputs.map(x=>x.xs.length)));let comparisons=0;
for(const x of f.inputs)for(const c of [literal,expert]){const xs=Uint32Array.from(x.xs),ys=Uint32Array.from(x.ys),value=c.call(x.case,[xs,ys,x.seed,x.factor]),gold=x.expected[x.case];
if(Array.isArray(gold)?value.length!==gold.length||value.some((v,i)=>v!==gold[i]):String(value)!==String(gold))throw Error(x.id+': control mismatch');
if(xs.some((v,i)=>v!==x.xs[i])||ys.some((v,i)=>v!==x.ys[i]))throw Error(x.id+': input mutation');comparisons++;}console.log(JSON.stringify({status:'passed',comparisons}));"""
  script=script.replace('LITERAL',json.dumps((HERE/'literal.mjs').as_uri())).replace('EXPERT',json.dumps((HERE/'expert.mjs').as_uri()))
  result=subprocess.run(['node','--input-type=module','-e',script,str(file)],capture_output=True,text=True,check=True)
 bindings={n:hashlib.sha256((HERE/n).read_bytes()).hexdigest() for n in ['spec.py','spec.json','kernels.ink','generate.py','literal.mjs','expert.mjs','literal.rs','expert.rs','fixtures.py','donor-fixtures.json','preflight.py','runner.mjs']}
 return dict(status='passed',tasks=8,inputs=len(fixture['inputs']),cells=len(fixture['cells']),python_complete_outputs=len(fixture['inputs']),python_input_values_exercised=fixture['python_literal_checks'],js=json.loads(result.stdout),bindings=bindings,profiles=fixture['profiles'],source_author_bindings={str(author.relative_to(root)):hashlib.sha256(author.read_bytes()).hexdigest()},continuity_mix_source_exact=True,scope='Two byte-faithful U32 author sources, five modest helper references and exact immutable26 modular mix source.148 full frames/32 timed cells;296 original/expert JS complete outputs/nonmutation. Literal source stages versus independent wrapped integer goldens. Three independent two-list ABIs truncate to min; ordered fold keeps reverse order. Experts inline/fuse legal passes and hoist7*k and16 mix multipliers. Fixed32/65536 timing and4096 correctness, preset seed/k constant perdistribution acrosssizes. No targets or timings.')
if __name__=='__main__':
 result=preflight();(HERE/'preflight-receipt.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({k:v for k,v in result.items() if k not in ['profiles','bindings','source_author_bindings']},indent=2))
