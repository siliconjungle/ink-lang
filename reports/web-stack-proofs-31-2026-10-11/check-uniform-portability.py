"""A new nested helper computes the uniform increment; private proof deployment."""
from pathlib import Path
import json,subprocess,sys,hashlib
R=Path(__file__).resolve().parent;B=R.parents[1];P=R/'uniform-portability';P.mkdir(exist_ok=True)
sys.path[:0]=[str(B/'knowledge'),str(B/'planner'),str(B/'bench')]
from producers.web_pipeline31_laws import specialize,publish
from compact_selection28 import plan
pins=json.loads((R/'initial-pins.json').read_text());C=pins['compiler'];commands=[]
def run(*args):
 argv=list(map(str,args));p=subprocess.run(argv,capture_output=True,text=True,cwd=B)
 commands.append(dict(argv=argv,exit_code=p.returncode,stdout=p.stdout,stderr=p.stderr));(P/'commands.json').write_text(json.dumps(commands,indent=2)+'\n')
 assert p.returncode==0,p.stderr;return p.stdout
name='unseen_uniform_prefix'
src=P/'source.ink';src.write_text('module UnseenUniform;\npub fn '+name+'(xs:List<u32>,cut:u32)->List<u32>{return xs.map(fn(x)=>third_increment(cut)).scan();}\nfn third_increment(cut:u32)->u32{return fourth_increment(cut);}\nfn fourth_increment(cut:u32)->u32{return choose(cut>17,cut*3+1,cut+2);}\n')
core=P/'literal.core.json';subject=P/'subject.json'
run(C,'emit-core',src,'-o',core);run(C,'emit-semantic',core,'--core','-o',subject)
rows=specialize(json.loads(subject.read_text()),json.loads(core.read_text()));assert len(rows)==1,len(rows)
st=publish(P/'private-store',rows);selection=P/'selection.json'
receipt=plan(C,core,st,R/'cpu-cost-model.json',selection)
assert len(json.loads(selection.read_text())['applications'])>=1
selected=P/'selected.core.json';run(C,'emit-core',core,'--core','--selection',selection,'-o',selected)
run(C,'build',selected,'--core','--target','javascript','-o',P/'selected.mjs')
records=[]
for at,(xs,cut)in enumerate([([],7),([0,1,3,7,8,11],7),([(i*19)%101 for i in range(129)],0xf0000001)]):
 step=(cut*3+1 if cut>17 else cut+2)%2**32;expected=[((i+1)*step)%2**32 for i in range(len(xs))]
 arg=P/f'args-{at}.json';arg.write_text(json.dumps([xs,cut]))
 for f in [core,selected]:assert json.loads(run(C,'run',f,name,arg,'--core'))==expected
 records.append(dict(args=[xs,cut],expected=expected))
(P/'javascript-frames.json').write_text(json.dumps(records,indent=2)+'\n')
js="""import fs from'node:fs';import{pathToFileURL}from'node:url';const m=await import(pathToFileURL(process.argv[2]));const fsx=JSON.parse(fs.readFileSync(process.argv[3]));for(const f of fsx)if(JSON.stringify(m.functions.unseen_uniform_prefix(...f.args))!==JSON.stringify(f.expected))throw Error('mismatch');console.log(JSON.stringify({status:'passed',full_output_checks:fsx.length}));"""
(P/'check.mjs').write_text(js);out=json.loads(run('node',P/'check.mjs',P/'selected.mjs',P/'javascript-frames.json'))
result=dict(status='passed',private_snapshot=st.snapshot_id,private_objects=len(st.members()),new_private_context_certificates=1,canonical_objects_added=0,automatic_selected_sources=1,selected_laws=receipt['selected_roots'],interpreter_executions=6,javascript_complete_output_checks=out['full_output_checks'],compiler_sha256=hashlib.sha256(Path(C).read_bytes()).hexdigest(),scope='Unseen transitive helper computes a capture-only U32 increment; constant-map scan selects direct indexed generation. Exact wrapping, no caller guard or generic-only matching claim.')
(P/'evidence.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))
