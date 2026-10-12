#!/usr/bin/env python3
"""Replay point dependency discovery, proof gates and a matched JS workload.

Timing samples are local observations, never proof premises or automatic selection.
"""
import argparse
import copy
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import time

ROOT=Path(__file__).resolve().parents[1]
sys.path[:0]=[str(ROOT/'knowledge'),str(ROOT/'planner')]


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--compiler',type=Path,default=ROOT/'target/debug/ink')
    parser.add_argument('--output',type=Path,default=ROOT/'build/access-cache-check')
    parser.add_argument('--planner',action='store_true')
    args=parser.parse_args();compiler=args.compiler.resolve();out=args.output.resolve()
    out.mkdir(parents=True,exist_ok=True)
    os.environ['PYTHONPATH']=os.pathsep.join([str(ROOT/'knowledge'),str(ROOT/'planner'),os.environ.get('PYTHONPATH','')])
    source=ROOT/'examples/access-point-cache.ink'
    phases=[]
    def invoke(command,success=True):
        start=time.perf_counter_ns()
        p=subprocess.run([str(x)for x in command],cwd=ROOT,capture_output=True,text=True,
                         env={**os.environ,'INK_COMPILER':str(compiler),'PYTHONPATH':os.environ['PYTHONPATH']},timeout=300)
        phases.append(dict(command=str(command[1]),elapsed_ns=time.perf_counter_ns()-start))
        if success and p.returncode:raise ValueError(p.stderr)
        if not success and not p.returncode:raise ValueError('false artifact was accepted')
        return p
    for command,file in [('emit-core','core.json'),('emit-access','access.json'),('emit-action-model','model.json')]:
        invoke([compiler,command,source,'-o',out/file])
    invoke([compiler,'check-access',source,out/'access.json'])
    model=json.loads((out/'model.json').read_bytes())
    access=json.loads((out/'access.json').read_bytes())
    from producers.representations import generate
    refreshed=generate(model,out/'refresh-database',cache_query='watched')
    invoke([sys.executable,'-m','producers.access_cache',out/'model.json','--access',out/'access.json',
            '--query','watched','-o',out/'access-request.json'])
    request=json.loads((out/'access-request.json').read_bytes())
    notes=json.loads((out/'access-request.discovery.json').read_bytes())
    for name in ['put','edit']:assert notes['actions'][name]['strategy']=='guarded maintenance'
    for name in ['from_state','remove_many']:assert notes['actions'][name]['strategy']=='refresh fallback'
    plans={'direct':refreshed['requests'][0],'refresh':refreshed['requests'][1],'access':request}
    for name,package in plans.items():
        path=out/(name+'-request.json');path.write_text(json.dumps(package))
        checked=json.loads(invoke([compiler,'check-representation',source,path]).stdout)
        assert checked['status']=='checked'
        invoke([compiler,'emit-representation',source,path,'--target','javascript','-o',out/(name+'.mjs')])

    bad_access=copy.deepcopy(access)
    bad_access['actions']['watched']['accesses'][0]['scope']['Point']['key']={'Number':99}
    (out/'false-access.json').write_text(json.dumps(bad_access))
    rejected=invoke([compiler,'check-access',source,out/'false-access.json'],False)
    assert 'does not describe checked actions' in rejected.stderr

    # Remove an actual same-key guard from the executable definition, then
    # authenticate the complete modified mathematical closure from scratch.
    from ink_knowledge import Store,identity
    from ink_knowledge.store import operations
    forged=copy.deepcopy(request);objects=forged['knowledge']['objects']
    plan=objects[forged['representation']]['payload']
    body=objects[plan['actions']['put']['execute']]['payload']['declaration']['Function']['body']
    def remove_guard(term):
        if isinstance(term,dict):
            branch=term.get('If',{})
            c=branch.get('condition',{}).get('Binary',{})
            if c.get('op')=='==' and c.get('left')=={'Var':'arg_0'} and c.get('right')=={'U64':0}:
                branch['condition']={'Bool':False};return True
            return any(remove_guard(value)for value in term.values())
        if isinstance(term,list):return any(remove_guard(value)for value in term)
        return False
    assert remove_guard(body),'candidate must contain a real key guard'
    renamed={};pending=dict(objects);rebuilt={}
    def rename(x):
        if isinstance(x,str):return renamed.get(x,x)
        if isinstance(x,list):return [rename(v)for v in x]
        if isinstance(x,dict):return {k:rename(v)for k,v in x.items()}
        return x
    while pending:
        ready=[i for i,e in pending.items()if not any(d in pending for d in e.get('dependencies',[]))]
        assert ready
        for old in ready:
            e=rename(pending.pop(old));e['dependencies']=sorted(set(e['dependencies']))
            e['interface']['operations']=(sorted(e['payload']['actions'])
                if e['semantics']=='ink-source-representation-v1' else operations(e['payload']))
            new=identity(e);renamed[old]=new;rebuilt[new]=e
    forged['representation']=renamed[forged['representation']]
    forged['knowledge']=Store.publish(out/'false-database',rebuilt.values()).bundle(list(rebuilt))
    (out/'false-retention.json').write_text(json.dumps(forged))
    rejected=invoke([compiler,'check-representation',source,out/'false-retention.json'],False)
    assert 'identity mismatch' not in rejected.stderr
    assert 'interface mismatch' not in rejected.stderr
    assert 'interface/dependency mismatch' not in rejected.stderr
    (out/'negative-controls.json').write_text(json.dumps(dict(
        forged_access='rejected',authenticated_false_retention='rejected',reason=rejected.stderr),indent=2))

    # Count only lookups of the watched key in a separate instrumented copy.
    # Keep timing samples on untouched literal output.
    get=model['tables'][0]['get']
    for name in plans:
        text=(out/(name+'.mjs')).read_text()
        pattern=r'(function\*? d_'+get+r'\(a0,a1\)\{)'
        text,count=re.subn(pattern,r'\1if(a1===0n)__watchedLookups++;',text)
        assert count==1,(name,count)
        text='let __watchedLookups=0;export const resetLookups=()=>{__watchedLookups=0};export const lookups=()=>__watchedLookups;\n'+text
        (out/(name+'-counted.mjs')).write_text(text)
    harness=ROOT/'tools/access-cache-workload.mjs'
    result=json.loads(invoke(['node',harness,out]).stdout)
    assert result['mechanism']['refresh']['watched_lookups']>0
    assert result['mechanism']['access']['watched_lookups']==0
    result['phases']=phases
    result['source']=model['source']
    result['compiler_sha256']=hashlib.sha256(compiler.read_bytes()).hexdigest()
    if args.planner:
        from ink_planner.automatic_candidates import propose
        from ink_planner.implementation_selection import invoke as compiler_invoke,check_package
        from ink_knowledge.recipes import load
        registry,_=load();registry['recipes']=[r for r in registry['recipes'] if r['id']=='precise-point-cache']
        registry_path=out/'point-registry.json';registry_path.write_text(json.dumps(registry))
        store,baseline,candidates,discovery=propose(compiler,source,model['source'],out/'automatic-database',
            compiler_invoke,check_package,out/'core.json',timeout=120,proposal_timeout=300,
            registry_path=registry_path,budget=4,state_limit=4,time_seconds=300)
        assert candidates,discovery
        assert any(r.get('recipe')=='precise-point-cache' and r.get('status')=='visited'
                   for n in discovery for r in n.get('recipes',[])),discovery
        result['planner']=dict(baseline=baseline,candidates=candidates,notes=discovery,snapshot=store.snapshot_id)
    (out/'results.json').write_text(json.dumps(result,indent=2)+'\n')
    print(json.dumps(dict(status='checked',output=str(out/'results.json'),mechanism=result['mechanism'],
                         timing_ns=result['timing_ns'])))


if __name__=='__main__':main()
