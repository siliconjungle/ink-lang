import importlib.util,json,subprocess
from pathlib import Path
p=Path(__file__).resolve().parent;r=p.parents[1];spec=importlib.util.spec_from_file_location('h',r/'bench/web-stack-proofs-11.py');h=importlib.util.module_from_spec(spec);spec.loader.exec_module(h)
f=json.loads((p/'fixtures.json').read_text());script="import fs from 'node:fs';import {call} from './literal.mjs';const f=JSON.parse(fs.readFileSync('fixtures.json'));let n=0;for(const x of f.inputs)for(const name of f.cases){const v=call(name,[new Uint32Array(x.xs),x.seed,x.factor]);if(JSON.stringify(v)!==JSON.stringify(x.expected[name]))throw Error(name+'/'+x.id);n++;}console.log(n);"
t=subprocess.run(['node','--input-type=module','-e',script],cwd=p,text=True,capture_output=True,check=True);assert int(t.stdout)==78
for x in f['inputs']:
 for name in f['cases']:assert h.literal(name,x['xs'] if x['id'].startswith('boundary') else x['xs'][:4],x['seed'],x['factor'])==x['expected'][name][:len(x['xs']) if x['id'].startswith('boundary') else 4]
(p/'control-preflight.json').write_text(json.dumps(dict(status='passed',comparisons=78,python_literal_checks=f['python_literal_checks'],scope='complete original JS outputs vs independent Python; all boundary and first4 other source-stage values'))+'\n');print('78 original control outputs pass')
