#!/usr/bin/env python3
"""Replay database maintenance evidence and audit its archived native report."""
import argparse, hashlib, importlib.util, json, math, re, statistics, subprocess, time
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'reports/database-maintenance-phase1'

def digest(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--execute',action='store_true')
    parser.add_argument('--compiler',type=Path,default=ROOT/'target/release/lang');args=parser.parse_args()
    metadata=json.loads((OUT/'metadata.json').read_text());rows=json.loads((OUT/'samples.json').read_text())
    for path,want in metadata['source_sha256'].items():assert digest(OUT/'sources'/path)==want,path
    variants=('language','language_bounded','c_flat','cpp_tree','rust_tree','rust_bigint')
    assert len(rows)==756
    cells={}
    for row in rows:
        assert row['variant'] in variants and 0<=row['repeat']<7 and row['steps']==30000
        assert math.isfinite(row['seconds']) and row['seconds']>0
        assert math.isclose(row['ns_per_step'],row['seconds']*1e9/row['steps'],rel_tol=1e-12)
        cell=(row['rows'],row['workload'],row['queries_per_update']);group=cells.setdefault(cell,{})
        key=(row['variant'],row['repeat']);assert key not in group;group[key]=row
    assert len(cells)==18
    medians=[]
    for cell,group in cells.items():
        assert set(group)=={(v,r) for v in variants for r in range(7)},cell
        observations=['checksum','total_lo','total_hi','version','events','event_hash','state_hash','statuses']
        assert len({json.dumps({k:r[k] for k in observations},sort_keys=True) for r in group.values()})==1,cell
        medians.append({v:statistics.median(group[v,r]['ns_per_step'] for r in range(7)) for v in variants})
    geo=lambda xs:math.exp(statistics.mean(map(math.log,xs)))
    summary={'samples':756,'cells':18,'bounded_time_divided_by_rust_tree':geo([m['language_bounded']/m['rust_tree'] for m in medians]),
             'bounded_time_divided_by_fastest_baseline':geo([m['language_bounded']/min(m[v] for v in variants[2:]) for m in medians]),
             'bigint_time_divided_by_bounded':geo([m['language']/m['language_bounded'] for m in medians])}
    recorded=json.loads((OUT/'summary.json').read_text())
    for key,value in summary.items():assert math.isclose(value,recorded[key],rel_tol=1e-12),key
    cert=json.loads((OUT/'maintenance.json').read_text());assert cert['version']==2
    assert cert['id']==metadata['maintenance_id'] and cert['semantics']==metadata['maintenance_semantics']
    audit={'status':'passed','mode':'static','sample_matrix':True,'archived_measured_sources':len(metadata['source_sha256']),
           'summary':summary,'scope':'Audit evidence, not a soundness proof or a new timing run.'}
    verification=OUT/'verification.json'
    if verification.exists():
        checked=json.loads(verification.read_text());assert checked['tests']==62
        for path,want in checked['verification_source_sha256'].items():assert digest(OUT/'verification-sources'/path)==want,path
        assert sum(map(int,re.findall(r'test result: ok\. (\d+) passed',(OUT/'tests.log').read_text())))==62
        audit['archived_validation_sources']=True
    selections=OUT/'selections.json'
    if selections.exists():
        choices=json.loads(selections.read_text())['selections'];assert [s['name'] for s in choices]==['empty','canonical','commuted']
        for s in choices:
            assert s['compiler_sha256']==metadata['compiler_sha256']
            assert digest(OUT/f"selection-{s['name']}.rs")==s['code_sha256']
            assert json.loads((OUT/f"selection-{s['name']}.plan.json").read_text())==s['plan']
        assert len({s['code_sha256'] for s in choices})==3;audit['three_database_selections']=True
    if args.execute:
        # Recorded native binaries must still be present; do not silently rebuild
        # them and call that a replay of the measured artifacts.
        spec=importlib.util.spec_from_file_location('state_bench',ROOT/'bench/state/run.py')
        bench=importlib.util.module_from_spec(spec);spec.loader.exec_module(bench)
        env=bench.environment();bench.BUILD=(ROOT/metadata['parameters']['build_directory']).resolve();bench.OUT=OUT
        compiler=args.compiler.resolve();assert digest(compiler)==metadata['compiler_sha256']
        audit['binary_sha256']={str(p.relative_to(ROOT)):digest(p) for v in variants
                                for p in [bench.BUILD/v,bench.BUILD/f'{v}.dylib']}
        previous=OUT/'audit.json'
        if previous.exists():
            old=json.loads(previous.read_text())
            if old.get('mode')=='executed':assert audit['binary_sha256']==old['binary_sha256'],'measured binaries changed'
        def run(command):
            result=subprocess.run(list(map(str,command)),cwd=ROOT,env=env,capture_output=True,text=True,check=True)
            return result.stdout
        run([compiler,'verify-maintenance',OUT/'maintenance.json'])
        temp=ROOT/'build/database-maintenance-audit';temp.mkdir(exist_ok=True)
        for mode,bounded in [('generated',False),('generated-bounded',True)]:
            project=temp/mode
            run([compiler,'emit-state','examples/state-benchmark.lang','-o',project,'--maintenance',OUT/'maintenance.json']+
                (['--bounded-totals'] if bounded else []))
            actual=(project/'src/lib.rs').read_bytes()+(OUT/'sources/bench/state/generated_abi.rs').read_bytes()
            assert actual==(OUT/f'{mode}-lib.rs').read_bytes(),mode
            assert json.loads((project/'plan.json').read_text())==json.loads((OUT/f'{mode}-plan.json').read_text()),mode
        # Legacy and new authority must emit identical code for the canonical
        # expressions. The selection plan intentionally records different proof evidence.
        legacy=temp/'legacy.json';run([compiler,'prove-maintenance','knowledge/sum-maintenance.lang','-o',legacy])
        for mode,bounded in [('generated',False),('generated-bounded',True)]:
            project=temp/f'legacy-{mode}'
            run([compiler,'emit-state','examples/state-benchmark.lang','-o',project,'--maintenance',legacy]+
                (['--bounded-totals'] if bounded else []))
            assert (project/'src/lib.rs').read_bytes()==(temp/mode/'src/lib.rs').read_bytes()
        audit['exact_codegen_and_plan_replay']=True;audit['legacy_database_codegen_identical']=True
        # Producer replay uses the same compiler, not a newly built producer/checker.
        replay=temp/'producer';run(['python3','tools/maintenance_proofs.py',replay,'--compiler',compiler])
        for path in (ROOT/'knowledge/exact-maintenance').iterdir():
            if path.suffix in ('.json','.ink'):assert path.read_bytes()==(replay/path.name).read_bytes(),path.name
        audit['deterministic_producer_replay']=True
        audit['correctness']=bench.validate(compiler);assert audit['correctness']==metadata['correctness']
        costs={}
        for name in ['canonical','commuted']:
            timings=[]
            for _ in range(7):
                start=time.perf_counter();run([compiler,'verify-maintenance',ROOT/f'knowledge/exact-maintenance/{name}.json']);timings.append((time.perf_counter()-start)*1000)
            costs[name]={'fresh_process_warm_fs_ms':timings,'median_ms':statistics.median(timings)}
        audit['verification_costs']=costs
        # Preserve a non-eliminable probe; the original measurement's private
        # Rust function was removed, leaving its CPU metadata unavailable.
        probe=temp/'cpu-probe.rs';probe.write_text('#[no_mangle] pub extern "C" fn probe(x:u64)->u64{x+1}\n')
        cpu_command=['rustc','--crate-type=lib','-O','-C','target-cpu=native','--emit=llvm-ir',probe,'-o',temp/'cpu-probe.ll']
        run(cpu_command);ir=(temp/'cpu-probe.ll').read_text();found=re.search(r'"target-cpu"="([^"]+)"',ir);assert found
        targets=json.loads((OUT/'backend-targets.json').read_text());targets['rust_cpu']=found.group(1)
        targets['rust_llvm_ir']=ir;targets['rust_probe_command']=list(map(str,cpu_command))
        targets['rust_probe_note']='Postmeasurement metadata repair using the same rustc and target-cpu setting; timing samples untouched.'
        (OUT/'backend-targets.json').write_text(json.dumps(targets,indent=2)+'\n')
        audit['backend_cpus']={k:targets[k] for k in ['clang_cpu','rust_cpu']}
        audit['mode']='executed'
    (OUT/('audit.json' if args.execute else 'audit-static.json')).write_text(json.dumps(audit,indent=2)+'\n')
    print(json.dumps(audit,indent=2))

if __name__=='__main__':main()
