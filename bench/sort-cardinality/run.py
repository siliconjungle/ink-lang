#!/usr/bin/env python3
"""Compare unchanged source with and without a replayed database selection."""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import time
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import methodology
ROOT=Path(__file__).resolve().parents[2]
HERE=Path(__file__).resolve().parent
OUT=ROOT/'build/sort-cardinality-bench'
OUT.mkdir(parents=True,exist_ok=True)
env=os.environ.copy();env.update(CARGO_PROFILE_DEV_DEBUG='0',CARGO_PROFILE_TEST_DEBUG='0',CARGO_INCREMENTAL='0')
def run(args,**kwargs):return subprocess.run([str(x) for x in args],cwd=ROOT,env=env,check=True,**kwargs)
run(['cargo','build','--bin','ink'])
phase_seconds={}
compiler=ROOT/'target/debug/ink'
before=hashlib.sha256(compiler.read_bytes()).hexdigest()
source=ROOT/'examples/sort-cardinality.ink'
core=OUT/'core.json';selection=OUT/'selection.json'
run([compiler,'emit-core',source,'-o',core])
start=time.perf_counter()
run(['python3',ROOT/'planner/plan.py','--compiler',compiler,'--core',core,'--snapshot',ROOT/'knowledge/store/snapshot.json','--knowledge-root',ROOT/'knowledge','--budget','4096','--rounds','32','-o',selection])
phase_seconds['search_and_local_checks']=time.perf_counter()-start
projects={}
for name in ['baseline','selected']:
    project=OUT/name;args=[compiler,'build',source,'--target','rust','-o',project]
    if name=='selected':args+=['--selection',selection]
    start=time.perf_counter();run(args)
    phase_seconds[name+'_emission_and_selection_replay']=time.perf_counter()-start
    cargo=project/'Cargo.toml';text=cargo.read_text().replace('name="compiled-state"',f'name="sort-{name}"').replace('["rlib","cdylib","staticlib"]','["rlib"]');cargo.write_text(text)
    projects[name]=project
bench=OUT/'driver';(bench/'src').mkdir(parents=True,exist_ok=True)
(bench/'src/main.rs').write_text((HERE/'driver.rs').read_text())
(bench/'Cargo.toml').write_text('[package]\nname="sort-cardinality-bench"\nversion="0.1.0"\nedition="2021"\n[dependencies]\nbaseline={package="sort-baseline",path="../baseline"}\nselected={package="sort-selected",path="../selected"}\nserde_json="=1.0.151"\n[workspace]\n')
run(['cargo','build','--release','--manifest-path',bench/'Cargo.toml'],stdout=subprocess.DEVNULL)
samples=json.loads(subprocess.check_output([str(bench/'target/release/sort-cardinality-bench')],env=env,text=True))
for sample in samples:
    a,b=sample['samples_ns']
    sample['baseline_over_selected_ci95']=methodology.ratio_ci(a,b)[1:]
assert hashlib.sha256(compiler.read_bytes()).hexdigest()==before
package=json.loads(selection.read_text())
environment=methodology.environment(env)
for name in ('planner','runtime'):
    path=ROOT/name
    environment['git'][name]={'commit':subprocess.check_output(['git','-C',str(path),'rev-parse','HEAD'],text=True).strip(),'dirty':bool(subprocess.check_output(['git','-C',str(path),'status','--porcelain'],text=True).strip())}
report={'schema':1,'source':source.read_text(),'compiler_sha256':before,'compiler_unchanged':True,'selection':package,'environment':environment,'phase_seconds':phase_seconds,'method':'9 alternating rounds; two calibration warmups per method/size; repetition count targets 100ms, capped at 2000. Typed full calls include input copy, execution, output allocation and destruction; exclude JSON, compilation and proof/search costs. Same source/compiler/backend for baseline and selected. Paired bootstrap 95% ratio intervals use 4000 resamples. Phase times are single observations, not benchmarks.','order':['baseline','selected'],'results':samples}
(HERE/'results.json').write_text(json.dumps(report,indent=2)+'\n')
for r in samples:print(r['case'],r['n'],round(r['baseline_over_selected'],2))
