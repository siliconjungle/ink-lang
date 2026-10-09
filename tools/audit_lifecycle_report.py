#!/usr/bin/env python3
"""Audit lifecycle sources, independent outcomes, memory counts and original binaries."""
import argparse, hashlib, importlib.util, json, math, re, subprocess, sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def load(name,path):
    spec=importlib.util.spec_from_file_location(name,path);module=importlib.util.module_from_spec(spec)
    sys.modules[name]=module;spec.loader.exec_module(module);return module
def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--report',type=Path,default=ROOT/'reports/lifecycle-phase1')
    parser.add_argument('--execute',action='store_true');args=parser.parse_args()
    out=args.report.resolve();meta=json.loads((out/'metadata.json').read_text());params=meta['parameters']
    for name,h in meta['source_sha256'].items():assert digest(out/'sources'/name)==h,name
    for name,h in meta['implementation_sha256'].items():assert digest(out/name)==h,name
    parent=Path(params['archive']);assert digest(parent/'metadata.json')==meta['archived_implementation_metadata_sha256']
    archived=json.loads((parent/'metadata.json').read_text())
    for name,h in archived['artifact_sha256'].items():assert digest(parent/name)==h,name
    if 'input_validation' not in meta:
        assert meta['cpu']==archived['cpu'] and meta['clang']==archived['clang'] and meta['rustc']==archived['rustc']
        assert meta['backend_targets']==archived['backend_targets']
    assert re.search(r'"-target-cpu" "([^"]+)"',meta['backend_targets']['clang_driver']).group(1)==meta['backend_targets']['clang_cpu']
    assert re.search(r'"target-cpu"="([^"]+)"',meta['backend_targets']['rust_llvm_ir']).group(1)==meta['backend_targets']['rust_cpu']
    verification=json.loads((out/'verification.json').read_text());assert verification['status']=='passed'
    for name,h in verification['artifact_sha256'].items():assert digest(out/name)==h,name
    probe_validation=json.loads((out/'probe-validation.json').read_text());assert probe_validation['status']=='passed'
    for name,h in probe_validation['source_sha256'].items():
        source=out/('validation-sources' if name.startswith('tools/') else 'sources')/name
        assert digest(source)==h,name
    for name,h in probe_validation['generated_source_sha256'].items():
        assert digest(out/'validation-sources/probe-smoke'/name)==h,name
    if (out/'input-validation-tests.json').exists():
        inputs=json.loads((out/'input-validation-tests.json').read_text())
        assert inputs['status']=='passed' and inputs['exact_codegen_and_plan_replays']==5 and inputs['compiler_preserved']
        assert inputs['rejections']==['body mismatch rejected','plan mismatch rejected','source mismatch rejected']
        assert digest(out/'validation-sources/bench/state/lifecycle.py')==inputs['harness_sha256']
        for name,h in inputs['source_sha256'].items():assert digest(out/name)==h,name
    core=json.loads((parent/'verification.json').read_text());assert core['tests']==75
    if 'input_validation' not in meta:assert archived['compiler_sha256']['current']==meta['compiler_sha256']
    else:
        iv=meta['input_validation'];assert iv['status']=='passed' and iv['compiler_sha256']==meta['compiler_sha256']
        assert iv['source_sha256']==archived['source_sha256']['examples/state-benchmark.lang']
        for variant,identity in iv['exact_codegen_and_plan_replay'].items():assert identity['emitted_sha256']==digest(parent/(variant+'-emitted.rs'))
        assert set(iv['exact_codegen_and_plan_replay'])=={'tree','rows_small','columns_small','rows_flat','columns_flat'}
    # Verify that measured implementation bodies really are the pinned preceding
    # implementations, and that probe instrumentation is their only source change.
    probe=(out/'sources/bench/state/allocation_probe.rs').read_text()
    for variant in meta['variants']:
        base=out/'implementations/timed'/variant;instrumented=out/'implementations/probe'/variant
        if variant in ['c_flat','cpp_tree']:
            filename='baseline.cpp' if variant=='cpp_tree' else 'baseline.c'
            expected=(parent/'sources/bench/state'/filename).read_text()
            assert (base/filename).read_text()==expected
            marker='struct Event' if variant=='cpp_tree' else 'typedef struct'
            i=expected.index(marker)
            assert (instrumented/filename).read_text()==expected[:i]+'#include "allocation_probe.h"\n'+expected[i:]
            assert (instrumented/'allocation_probe.h').read_bytes()==(out/'sources/bench/state/allocation_probe.h').read_bytes()
        else:
            expected=(parent/(variant+'-lib.rs')).read_text() if variant!='rust_tree' else (parent/'sources/bench/state/baseline.rs').read_text()
            assert (base/'src/lib.rs').read_text()==expected
            assert (instrumented/'src/lib.rs').read_text()==expected+'\n'+probe
            assert (base/'Cargo.toml').read_bytes()==(instrumented/'Cargo.toml').read_bytes()
    state=load('run',out/'sources/bench/state/run.py')
    bench=load('lifecycle',out/'sources/bench/state/lifecycle.py')
    samples=json.loads((out/'samples.json').read_text());profiles=json.loads((out/'allocation-profiles.json').read_text())
    expected={(n,mode):bench.oracle(n,params['steps'],mode) for n in [64,4096,65536] for mode in ['bulk','incremental']}
    oracle=json.loads((out/'oracle.json').read_text())
    assert oracle==[dict(rows=n,initialization=mode,observations=want) for (n,mode),want in expected.items()]
    assert meta['variants']==bench.VARIANTS and len(samples)==len(expected)*len(bench.VARIANTS)*params['repeats']
    keys=set()
    for s in samples:
        key=s['rows'],s['initialization'],s['variant'],s['repeat'];assert key not in keys;keys.add(key)
        assert [p['name'] for p in s['phases']]==bench.PHASES
        assert s['cycles']=={64:16,4096:4,65536:1}[s['rows']]
        assert [p['observation'] for p in s['phases'][:-1]]==expected[s['rows'],s['initialization']]
        assert math.isfinite(s['seconds']) and s['seconds']>0
        assert math.isclose(s['seconds_per_lifecycle'],s['seconds']/s['cycles'],rel_tol=1e-12)
        assert math.isclose(sum(p['seconds'] for p in s['phases']),s['seconds'],abs_tol=1e-10)
        for p in s['phases']:
            assert p['seconds']>=0
            assert all(p[k]==0 for k in ['allocation_calls','reallocations','requested_bytes','live_bytes','peak_bytes'])
    assert keys=={(n,m,v,r) for n,m in expected for v in bench.VARIANTS for r in range(params['repeats'])}
    def compare(a,b):
        if isinstance(a,dict):assert set(a)==set(b);[compare(a[k],b[k]) for k in a]
        elif isinstance(a,list):assert len(a)==len(b);[compare(x,y) for x,y in zip(a,b)]
        elif isinstance(a,float):assert math.isclose(a,b,rel_tol=1e-12),(a,b)
        else:assert a==b,(a,b)
    compare(bench.summarize(samples),json.loads((out/'summary.json').read_text()))
    profile_keys=set()
    for s in profiles:
        key=s['rows'],s['initialization'],s['variant'];assert key not in profile_keys;profile_keys.add(key)
        assert s['cycles']==1 and [p['name'] for p in s['phases']]==bench.PHASES
        assert [p['observation'] for p in s['phases'][:-1]]==expected[s['rows'],s['initialization']]
        assert s['phases'][-1]['live_bytes']==0
        previous={k:0 for k in ['allocation_calls','reallocations','requested_bytes','peak_bytes']}
        for p in s['phases']:
            assert all(isinstance(p[k],int) and p[k]>=0 for k in [*previous,'live_bytes'])
            assert p['live_bytes']<=p['peak_bytes']<=p['requested_bytes']
            assert p['reallocations']<=p['allocation_calls']
            for k in previous:assert p[k]>=previous[k];previous[k]=p[k]
        assert s['phases'][-1]['requested_bytes']==s['phases'][-2]['requested_bytes']
    assert profile_keys=={(n,m,v) for n,m in expected for v in bench.VARIANTS}
    audit=dict(status='passed',mode='static',samples=len(samples),profiles=len(profiles),
               phase_observations=(len(samples)+len(profiles))*6,independent_oracle=True,
               instrumented_sources_only_add_probes=True,all_states_return_requested_live_bytes_to_zero=True,
               scope='Implementation requested bytes; no allocator overhead/RSS/end-to-end formal refinement. Replay timing fields are discarded.')
    if args.execute:
        compiler=Path(params.get('compiler',ROOT/'target/release/lang'));assert digest(compiler)==meta['compiler_sha256']
        if 'input_validation' in meta:
            state.ROOT=ROOT
            assert bench.validate_inputs(compiler,parent,archived,ROOT/'build/lifecycle-input-audit')==meta['input_validation']
            audit['exact_codegen_and_plan_replay']=True
        for name,h in probe_validation['binary_sha256'].items():
            assert digest(ROOT/name)==h,name
            subprocess.check_call([str(ROOT/name)],cwd=ROOT)
            assert digest(ROOT/name)==h,name
        audit['known_size_probe_sequences_replayed']=3
        for name,h in meta['binary_sha256'].items():assert digest(ROOT/name)==h,name
        build=Path(params['build_directory']);audit['native_streams_replayed']=0
        for n,mode in expected:
            for variant in bench.VARIANTS:
                result=json.loads(subprocess.check_output([str(build/'timed'/variant),str(n),str(params['steps']),mode,'1'],cwd=ROOT,text=True))
                assert [p['observation'] for p in result['phases'][:-1]]==expected[n,mode]
                audit['native_streams_replayed']+=1
        audit['allocation_profiles_replayed']=0
        for s in profiles:
            result=json.loads(subprocess.check_output([str(build/'probe'/s['variant']),str(s['rows']),str(s['steps']),s['initialization'],'1'],cwd=ROOT,text=True))
            for got,want in zip(result['phases'],s['phases']):
                assert {k:v for k,v in got.items() if k!='seconds'}=={k:v for k,v in want.items() if k!='seconds'}
            audit['allocation_profiles_replayed']+=1
        # Repeat source/reference integration using the pinned original libraries.
        state.ROOT=ROOT;state.BUILD=build/'timed';state.OUT=build;state.VARIANTS=bench.VARIANTS
        assert state.validate(compiler)==meta['correctness']
        for name,h in meta['binary_sha256'].items():assert digest(ROOT/name)==h,name
        assert digest(compiler)==meta['compiler_sha256']
        audit['measured_binaries_preserved']=True;audit['mode']='executed'
    (out/('audit.json' if args.execute else 'audit-static.json')).write_text(json.dumps(audit,indent=2)+'\n')
    print(json.dumps(audit,indent=2))
if __name__=='__main__':main()
