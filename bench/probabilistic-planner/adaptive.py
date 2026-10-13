#!/usr/bin/env python3
"""Fit saved search-choice evidence and measure complete adaptive planner calls."""
import json,os,subprocess,sys,time
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];sys.path[:0]=[str(ROOT/'planner'),str(ROOT/'knowledge')]
from ink_planner.adaptive_search import STRATEGIES,code_identity,digest,select
from ink_knowledge import Store
BUILD=ROOT/'build/probabilistic-planner';OUT=ROOT/'reports/probabilistic-planner-2026-10-12'
data=json.loads((OUT/'planning.json').read_text());gpu=json.loads((OUT/'gpu.json').read_text())
target=BUILD/'adaptive-target.json';target.write_text(json.dumps(dict(cpu=gpu['hostCpu'],browser=gpu['browser'],adapter=gpu['adapter']),sort_keys=True)+'\n')
core=BUILD/'heldout-core.json';snapshot=BUILD/'knowledge/store/snapshot.json';compiler=ROOT/'target/debug/ink'
context=dict(compiler=digest(compiler),target=digest(target),code=code_identity(),python=list(sys.version_info[:3]))
def count(v):return 1+sum(count(x) for x in v.values()) if isinstance(v,dict) else sum(count(x) for x in v) if isinstance(v,list) else 0
features=dict(catalogue_entries=len(Store(BUILD/'knowledge',snapshot).members()),core_nodes=count(json.loads(core.read_text())),budget=64,rounds=12)
rows=[]
for label in sorted({r['label'] for r in data['samples']} & STRATEGIES):
    samples=[r for r in data['samples'] if r['label']==label]
    rows.append(dict(strategy=label,correct=True,fallback=False,training_ns=[r['ns'] for r in samples if r['round']<4],
        heldout=[dict(round=r['round'],ns=r['ns'],selected_cost=r['selected_cost']) for r in samples if r['round']>=4],
        timing_scope='complete child planner subprocess including per-call index setup and proof work'))
profile=dict(schema=1,context=context,cohorts=[dict(inputs=dict(core=digest(core),snapshot=digest(snapshot)),features=features,rows=rows)],
    scope='saved measured cohort only; no interpolation/extrapolation; raw planning evidence includes setup; adaptive wrapper overhead measured separately')
path=BUILD/'adaptive-profile.json';path.write_text(json.dumps(profile,indent=2)+'\n')
samples=[];env={**os.environ,'PYTHONPATH':str(ROOT/'planner')+':'+str(ROOT/'knowledge')}
for round_index in range(7):
    for label in ['ordinary','adaptive'] if round_index%2 else ['adaptive','ordinary']:
        output=BUILD/f'adaptive-{label}-{round_index}.json'
        command=[sys.executable,'-m','ink_planner.adaptive_search','--compiler',str(compiler),'--core',str(core),
            '--snapshot',str(snapshot),'--knowledge-root',str(BUILD/'knowledge'),'--target-context',str(target),
            '--budget','64','--seed',str(831+round_index),'-o',str(output)]
        if label=='adaptive':command+=['--profile',str(path)]
        start=time.perf_counter_ns();run=subprocess.run(command,cwd=ROOT,env=env,capture_output=True,text=True,check=True,timeout=300);elapsed=time.perf_counter_ns()-start
        receipt=json.loads(run.stdout.splitlines()[-1]);subprocess.run([compiler,'check-selection',core,output],check=True,capture_output=True)
        samples.append(dict(round=round_index,label=label,ns=elapsed,decision=receipt['adaptive']['decision'],selected_cost=receipt['selected_cost'],attempts=receipt['attempts']))
        print(f'Checked {label}: {elapsed/1e6:.1f} ms; {receipt["adaptive"]["decision"]["strategy"]}',flush=True)
(OUT/'adaptive.json').write_text(json.dumps(dict(schema=1,samples=samples,profile=profile,
    scope='whole wrapper plus child subprocess; seven alternating rounds, new seeds 831..837; exact final proof replay; no installed default profile'),indent=2)+'\n')
