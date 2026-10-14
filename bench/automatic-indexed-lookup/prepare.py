"""Freeze checked explicit alternatives before measuring complete batch calls."""
import datetime,hashlib,json,pathlib,subprocess,sys
ROOT=pathlib.Path(__file__).resolve().parents[2]
sys.path[:0]=[str(ROOT/'knowledge'),str(ROOT/'planner')]
from ink_knowledge import Store,canonical,identity,semantic_entry
from producers.indexed_lookup import specialize
compiler=pathlib.Path(sys.argv[1]).resolve();out=pathlib.Path(sys.argv[2]).resolve()
out.mkdir(exist_ok=False,parents=True)
source=pathlib.Path(__file__).with_name('source.ink')
def run(*args):subprocess.run(list(map(str,[compiler,*args])),check=True)
run('emit-core',source,'-o',out/'core.json')
run('emit-semantic',source,'-o',out/'subject.json')
meaning=json.loads((out/'subject.json').read_text())
laws=specialize(meaning,json.loads((out/'core.json').read_text()))
bank=Store.publish(out/'knowledge',[semantic_entry(l)for _,l in laws])
roots=[];applications=[]
for name,law in laws:
 if name.startswith('index_membership_'):continue
 key=identity(semantic_entry(law));roots.append(key)
 applications.append(dict(function=name.split('_indexed_lookup_')[0],path=[],law=key,
  arguments={n:{'sort':s,'node':{'Free':n}}for n,s in law['params'].items()},premises=[]))
selection=out/'selection.json'
selection.write_bytes(canonical(dict(schema=1,semantics='ink-evidence-v1',
 input_core_sha256=meaning['input_core_sha256'],knowledge=bank.bundle(roots),applications=applications)))
run('check-selection',out/'core.json',selection)
run('build',source,'--target','javascript','-o',out/'baseline.mjs')
run('build',source,'--target','javascript','--selection',selection,'-o',out/'indexed.mjs')
hashes={str(p.relative_to(ROOT))if p.is_relative_to(ROOT)else str(p):hashlib.sha256(p.read_bytes()).hexdigest()
 for p in [source,compiler,pathlib.Path(__file__).with_name('run.mjs'),selection,out/'baseline.mjs',out/'indexed.mjs']}
registration=dict(schema=1,registered_at=datetime.datetime.now(datetime.timezone.utc).isoformat(),
 sizes=[0,1,16,256,4096],queries=[1,16,512],distributions=['unique','repeated16'],
 processes=5,samples=9,batch_ns=3000000,hashes=hashes,
 scope='Explicit checked alternatives, not automatic profitability selection. Complete call includes index construction, queries, output allocation and consumption. Input preparation, module import and compilation excluded. Native JavaScript Set is an independent control. No held-out data fits any model.')
(out/'registration.json').write_text(json.dumps(registration,indent=2)+'\n')
