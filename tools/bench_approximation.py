#!/usr/bin/env python3
"""Checked inexact refinement, independent per-plan oracles and frozen holdout.

Measures the existing pure-call boundary; module setup is reported separately.
This small designed kernel is a capability check, not a generalisation estimate.
"""
import argparse
import hashlib
import json
import subprocess
import sys
from pathlib import Path
from types import SimpleNamespace

ROOT=Path(__file__).resolve().parents[1]
sys.path[:0]=[str(ROOT/'knowledge'),str(ROOT/'planner')]
from ink_knowledge import Store,canonical,identity
from ink_planner.compiled_planning import code_fingerprint
from ink_planner.offline_measurements import acquire,validated
from ink_planner.representation_selection import rank
from producers.contract_candidates import propose


def run(compiler,output,target):
    compiler=Path(compiler).resolve();output=Path(output).resolve();output.mkdir(parents=True,exist_ok=True)
    candidates=output/'candidates'
    report=propose(compiler,ROOT/'examples/approximation.ink',candidates,max_per_spec=1,max_proposals=1)
    store=Store(candidates)
    selected=store.object(report['candidates'][0])['payload']['package']
    if 'knowledge_ref'in selected:
        selected=dict(selected,knowledge=store.bundle(selected['knowledge_ref']['roots']));selected.pop('knowledge_ref')
    packages=[dict(schema=1,semantics='ink-compiled-plan-v1',input_core_sha256=report['source'],steps=steps)
              for steps in [[],[dict(kind='rewrite',package=selected)]]]
    options=SimpleNamespace(target=target,measure_timeout=600,check_timeout=120,measure_processes=3,memory_bytes=512000000)
    def invoke(*args,timeout=120):
        result=subprocess.run([str(compiler),*map(str,args)],capture_output=True,text=True,timeout=timeout)
        if result.returncode:raise ValueError(result.stderr)
        return json.loads(result.stdout)if result.stdout.lstrip().startswith(('{','['))else result.stdout
    planner=SimpleNamespace(directory=output,root=output,original=candidates/'input-core.json',compiler=compiler,
        compiler_hash=hashlib.sha256(compiler.read_bytes()).hexdigest(),code_hash=code_fingerprint(),options=options,invoke=invoke)
    states=[];measurements=[]
    for index,package in enumerate(packages):
        packet=output/f'{index}.plan.json';packet.write_bytes(canonical(package)+b'\n')
        states.append(invoke('check-plan',planner.original,packet,'--core','--target',target)['state'])
        measurements.append(identity(dict(package=package,compiler=planner.compiler_hash,target=target)))
    def workload(name,inputs):
        row=lambda x:dict(function='coarse',args=[{'Int':str(x)}],**({'boundary':'portable'}if target=='javascript'else{}))
        spec=dict(schema=3 if target=='javascript'else 1,phases={'call:coarse':[row(x)for x in inputs]},profile={'call:coarse':1},
            workload=dict(shape={'calls':len(inputs)},distribution=name,concurrency=1,residency='host'))
        path=output/(name+'.json');path.write_text(json.dumps(spec));return path
    receipts=[];choices=[]
    for name,inputs in [('training',[-100,0,37,100000]),('holdout',[-2**80,-1,2**90,42])]:
        path=workload(name,inputs)
        context,domain,profile,acquisition=acquire(planner,store,packages,states,measurements,path)
        chosen,costs=rank(store,report['source'],validated(measurements,acquisition),context,domain,profile,measurements[0],minimum_gain_ppm=100000,sample_guard=True)
        choices.append(chosen);receipts.append(dict(cohort=name,chosen=chosen,costs=costs,acquisition=acquisition))
    chosen=choices[0]if choices[0]==choices[1]else measurements[0]
    package=packages[measurements.index(chosen)]
    (output/'selected.plan.json').write_bytes(canonical(package)+b'\n')
    result=dict(status='checked',target=target,baseline=measurements[0],alternative=measurements[1],selected=chosen,
        independent_holdout_accepted=choices[0]==choices[1],cohorts=receipts,
        scope='Designed warm pure-call kernel with separate setup; proof-checked inexact refinement, complete outputs independently interpreted per plan; no population performance or backend proof claim')
    (output/'report.json').write_text(json.dumps(result,indent=2)+'\n')
    return {k:v for k,v in result.items()if k!='cohorts'}


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--compiler',required=True);p.add_argument('--output',required=True);p.add_argument('--target',choices=['javascript','rust'],default='javascript');a=p.parse_args()
    print(json.dumps(run(a.compiler,a.output,a.target)))
