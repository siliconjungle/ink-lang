#!/usr/bin/env python3
"""Untrusted, capture-safe known-callback specialization certificates.

Every candidate is either Normalize, or an independently checked generic law
followed by Normalize. No source shape/backend/law receives trusted status.
"""
import argparse,copy,hashlib,importlib,json,subprocess,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'knowledge'));sys.path.insert(0,str(ROOT/'planner'))
from ink_knowledge import Store,identity,semantic_entry
from producers.semantic_laws import law
from ink_planner.semantic_search import children,set_child,shift,match,substitute,replace
DATA=ROOT/'knowledge/research/web-stack-proofs-15/specialization/witnesses.json'

def instantiate_bound(body,arg,depth=0):
    body=copy.deepcopy(body);n=body['node']
    if isinstance(n,dict) and 'Bound' in n:
        if n['Bound']==depth:return shift(arg,depth)
        if n['Bound']>depth:n['Bound']-=1
        return body
    for i,c in enumerate(children(body)):
        body=set_child(body,i,instantiate_bound(c,arg,depth+int(isinstance(n,dict) and 'Lambda' in n)))
    return body

def beta_normalize(t,budget=10000):
    remaining=[budget]
    def visit(t):
        remaining[0]-=1
        if remaining[0]<0:raise ValueError('beta specialization budget exceeded')
        t=copy.deepcopy(t)
        for i,c in enumerate(children(t)):t=set_child(t,i,visit(c))
        n=t['node']
        if isinstance(n,dict) and 'Op' in n and n['Op'][0]=='apply':
            f,arg=n['Op'][1]
            if isinstance(f['node'],dict) and 'Lambda' in f['node']:
                return visit(instantiate_bound(f['node']['Lambda'],arg))
        return t
    return visit(t)

def free_parameters(t):
    result={}
    def walk(v):
        n=v['node']
        if isinstance(n,dict) and 'Free' in n:
            name=n['Free']
            if name in result and result[name]!=v['sort']:raise ValueError('inconsistent free sort')
            result[name]=v['sort']
        for c in children(v):walk(c)
    walk(t);return dict(sorted(result.items()))

def outside_lambda_positions(t,path=()):
    yield path,t
    if isinstance(t['node'],dict) and 'Lambda' in t['node']:return
    for i,c in enumerate(children(t)):yield from outside_lambda_positions(c,path+(i,))

def lift_use(body,path,use):
    if not path:return use
    return {'Congruence':[lift_use(c,path[1:],use) if i==path[0] else 'Normalize' for i,c in enumerate(children(body))]}

def derive(subject,generic_named):
    """Whole-function patterns avoid capturing map/reducer-local binders."""
    derived=[]
    for fn,body in sorted(subject['functions'].items()):
        normalized=beta_normalize(body)
        if normalized!=body:
            derived.append((fn+'_beta',law(free_parameters(body),body,normalized)))
        for path,target in outside_lambda_positions(body):
            for generic_name,generic in generic_named:
                args={}
                if not match(generic['from'],target,generic['params'],args) or set(args)!=set(generic['params']):continue
                updated=replace(body,path,substitute(generic['to'],args));normalized=beta_normalize(updated)
                if normalized==updated:continue
                gid=identity(semantic_entry(generic))
                use={'Use':dict(law=gid,arguments=dict(sorted(args.items())),premises=['Normalize']*len(generic['conditions']))}
                proof={'Trans':dict(middle=updated,left=lift_use(body,path,use),right='Normalize')}
                params=free_parameters(body)
                if free_parameters(normalized).keys()-params.keys():raise ValueError('new free variable')
                derived.append((fn+'_'+generic_name+'_'+('_'.join(map(str,path)) or 'root'),law(params,body,normalized,proof,dependencies=[gid])))
    unique={identity(semantic_entry(v)):(name,v) for name,v in derived}
    return [unique[k] for k in sorted(unique)]

def named_laws():
    rows=json.loads(DATA.read_text())['laws']
    return [(r['name'],r['law']) for r in rows]

def main():
    p=argparse.ArgumentParser();p.add_argument('--compiler',type=Path,required=True);p.add_argument('--input-core',type=Path,nargs='+',required=True);p.add_argument('--producer',action='append',default=[]);p.add_argument('--data',type=Path,default=DATA);p.add_argument('--output-store',type=Path,required=True);p.add_argument('--knowledge',type=Path,default=ROOT/'knowledge');p.add_argument('--report',type=Path,required=True);a=p.parse_args()
    if a.data.exists():raise ValueError('immutable witness data already exists')
    generic=[]
    for name in a.producer:generic+=importlib.import_module('producers.'+name).named_laws()
    derived=[];sources=[];a.report.mkdir(parents=True,exist_ok=True)
    for i,core in enumerate(a.input_core):
        dest=a.report/f'subject-{i}.json';cmd=[str(a.compiler.resolve()),'emit-semantic',str(core.resolve()),'--core','-o',str(dest.resolve())];r=subprocess.run(cmd,text=True,capture_output=True)
        if r.returncode:raise RuntimeError(r.stderr)
        rows=derive(json.loads(dest.read_text()),generic);derived+=rows;sources.append(dict(core=str(core.resolve()),sha256=hashlib.sha256(core.read_bytes()).hexdigest(),subject=str(dest.resolve()),derived=len(rows)))
    unique={identity(semantic_entry(v)):(n,v) for n,v in derived};named=[unique[k] for k in sorted(unique)]
    a.data.parent.mkdir(parents=True,exist_ok=True);a.data.write_text(json.dumps(dict(schema=1,laws=[dict(name=n,law=v) for n,v in named],sources=sources,scope='Generic capture-safe knownLambda beta specialization and composition with checked generic equalities. Values/parameters universal; static callback bodies specialized. No runtime checks or target profitability premise.'),indent=2)+'\n')
    old=Store(a.knowledge);objects={i:old.object(i) for i in old.members()}
    for _,v in generic+named:
        e=semantic_entry(v);objects[identity(e)]=e
    store=Store.publish(a.output_store,list(objects.values()));store.rebuild()
    roots=[identity(semantic_entry(v)) for _,v in named]
    view=a.report/'view.json';view.write_text(json.dumps(store.bundle(roots),indent=2)+'\n')
    check=subprocess.run([str(a.compiler.resolve()),'knowledge-check',str(a.input_core[0].resolve()),str(view.resolve())],capture_output=True,text=True)
    (a.report/'admission.stdout').write_text(check.stdout);(a.report/'admission.stderr').write_text(check.stderr)
    receipt=dict(status='passed' if not check.returncode else 'failed',derived_laws=len(named),snapshot=store.snapshot_id,sources=sources,command=check.args,exit_code=check.returncode,compiler_sha256=hashlib.sha256(a.compiler.read_bytes()).hexdigest(),data_sha256=hashlib.sha256(a.data.read_bytes()).hexdigest())
    (a.report/'derivation.json').write_text(json.dumps(receipt,indent=2)+'\n');print(json.dumps(receipt))
    if check.returncode:raise SystemExit(check.returncode)
if __name__=='__main__':main()
