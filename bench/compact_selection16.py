"""Archive checked selected roots, retaining full-discovery hashes and policy.

The planner/checker are unchanged. Unused discovery objects are temporary data;
every selected dependency is archived and the compact package is replayed.
"""
import hashlib,json,subprocess,sys,tempfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'knowledge'))
from ink_knowledge import Store

def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def plan(compiler,core,store,model,out,budget=4096):
    out=Path(out);store=store if isinstance(store,Store) else Store(store)
    with tempfile.TemporaryDirectory(prefix='ink-compact16-') as tmp:
        full=Path(tmp)/'full.json'
        command=list(map(str,[sys.executable,ROOT/'planner/plan.py','--compiler',compiler,'--core',core,'--knowledge-root',store.root,'--snapshot',store.data/'snapshot.json','--cost-model',model,'--budget',budget,'-o',full]))
        r=subprocess.run(command,cwd=ROOT,capture_output=True,text=True)
        if r.returncode:raise RuntimeError(r.stderr+'\n'+r.stdout)
        package=json.loads(full.read_text());roots=set()
        def walk(v):
            if isinstance(v,dict):
                if 'law' in v:roots.add(v['law'])
                for x in v.values():walk(x)
            elif isinstance(v,list):
                for x in v:walk(x)
        walk(package['applications'])
        receipt=dict(command=command,search=json.loads(r.stdout),full_selection_sha256=sha(full),full_selection_bytes=full.stat().st_size,full_roots=len(package['knowledge']['roots']),full_objects=len(package['knowledge']['objects']),applications_sha256=hashlib.sha256(json.dumps(package['applications'],sort_keys=True,separators=(',',':')).encode()).hexdigest())
        package['knowledge']=store.bundle(sorted(roots))
        out.parent.mkdir(parents=True,exist_ok=True);out.write_text(json.dumps(package,separators=(',',':'))+'\n')
        checked=subprocess.run(list(map(str,[compiler,'check-selection',core,out])),capture_output=True,text=True)
        if checked.returncode:raise RuntimeError(checked.stderr+'\n'+checked.stdout)
        receipt.update(status='passed',compact_selection_sha256=sha(out),compact_selection_bytes=out.stat().st_size,selected_roots=sorted(roots),loaded_dependency_objects=len(package['knowledge']['objects']),check=json.loads(checked.stdout))
        out.with_suffix('.receipt.json').write_text(json.dumps(receipt,indent=2)+'\n')
        return receipt
