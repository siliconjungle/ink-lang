#!/usr/bin/env python3
"""Audit measured cache reports; optionally replay their original native artifacts."""
import argparse, hashlib, importlib.util, json, math, re, statistics, subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def module(name,path):
    spec=importlib.util.spec_from_file_location(name,path);value=importlib.util.module_from_spec(spec);spec.loader.exec_module(value);return value
def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--execute',action='store_true');args=parser.parse_args()
    state=module('state_bench',ROOT/'bench/state/run.py');env=state.environment()
    def run(command):return subprocess.run(list(map(str,command)),cwd=ROOT,env=env,text=True,capture_output=True,check=True).stdout
    results={}
    for name in ['cache-lowering-phase1','wide-cache-phase1']:
        out=ROOT/'reports'/name;metadata=json.loads((out/'metadata.json').read_text());rows=json.loads((out/'samples.json').read_text());summary=json.loads((out/'summary.json').read_text())
        for path,want in metadata['source_sha256'].items():assert sha(out/'sources'/path)==want,path
        for path,want in metadata['artifact_sha256'].items():assert sha(out/path)==want,path
        wide=name=='wide-cache-phase1';variants=['cloned','borrowed','delta','rust_bigint'] if wide else ['language_cloned','language','language_delta','language_bounded','c_flat','cpp_tree','rust_tree','rust_bigint']
        fields=['bits','profile','queries_per_update'] if wide else ['rows','workload','queries_per_update']
        observations=['checksum','observation'] if wide else ['checksum','total_lo','total_hi','version','events','event_hash','state_hash','statuses']
        cells={}
        for row in rows:
            assert row['variant'] in variants and row['steps']==metadata['parameters']['steps'] and math.isfinite(row['seconds']) and row['seconds']>0
            assert math.isclose(row['ns_per_step'],row['seconds']*1e9/row['steps'],rel_tol=1e-12)
            cell=tuple(row[f] for f in fields);group=cells.setdefault(cell,{})
            key=(row['variant'],row['repeat']);assert key not in group;group[key]=row
        assert len(cells)==(16 if wide else 18)
        assert len(rows)==len(cells)*len(variants)*metadata['parameters']['repeats']
        medians={}
        for cell,group in cells.items():
            assert set(group)=={(v,r) for v in variants for r in range(metadata['parameters']['repeats'])}
            assert len({json.dumps({k:r[k] for k in observations},sort_keys=True) for r in group.values()})==1,cell
            medians[cell]={v:statistics.median(group[v,r]['ns_per_step'] for r in range(metadata['parameters']['repeats'])) for v in variants}
        geo=lambda xs:math.exp(statistics.mean(map(math.log,xs)))
        ratios={'cloned_time_divided_by_borrowed':('cloned','borrowed'),'borrowed_time_divided_by_delta':('borrowed','delta'),'delta_time_divided_by_rust':('delta','rust_bigint')} if wide else {'cloned_time_divided_by_borrowed':('language_cloned','language'),'borrowed_time_divided_by_delta':('language','language_delta'),'delta_time_divided_by_rust_bigint':('language_delta','rust_bigint'),'bounded_time_divided_by_rust_tree':('language_bounded','rust_tree')}
        for key,(left,right) in ratios.items():assert math.isclose(summary[key],geo([m[left]/m[right] for m in medians.values()]),rel_tol=1e-12),key
        assert summary['samples']==len(rows) and summary['cells']==len(cells)
        if wide:
            for profile in [0,1]:assert math.isclose(summary['delta_ratios_by_profile'][str(profile)],geo([m['borrowed']/m['delta'] for c,m in medians.items() if c[1]==profile]),rel_tol=1e-12)
        result=dict(status='passed',mode='static',samples=len(rows),cells=len(cells),archived_sources=len(metadata['source_sha256']),source_and_artifact_hashes=True,sample_matrix=True,summary_recomputed=True)
        if (out/'verification.json').exists():
            verification=json.loads((out/'verification.json').read_text());assert verification['tests']==63
            for path,want in verification['verification_source_sha256'].items():assert sha(out/'verification-sources'/path)==want,path
            assert sum(map(int,re.findall(r'test result: ok\. (\d+) passed',(out/'tests.log').read_text())))==63
            result['archived_validation_sources']=True
        if args.execute:
            bench=module('wide_cache' if wide else 'cache_lowering',ROOT/('bench/wide-cache.py' if wide else 'bench/cache-lowering.py'))
            build=bench.BUILD
            for path,want in metadata['binary_sha256'].items():assert sha(build/path)==want,path
            compilers=metadata['compiler_sha256']
            current=ROOT/'target/release/lang';original=ROOT/'build/cache-lowering-original/lang'
            assert sha(current)==(compilers['current'] if wide else compilers)
            if wide:assert sha(original)==compilers['original']
            run([current,'verify-maintenance','knowledge/delta-maintenance/delta.json'])
            if wide: result['correctness']=bench.validate()
            else:
                state.BUILD=build;state.OUT=out;state.VARIANTS=variants;result['correctness']=state.validate(current)
            assert result['correctness']==metadata['correctness']
            # Replay complete observed signatures, not the timing values.
            trials=0
            for cell,group in cells.items():
                reference=next(iter(group.values()))
                for variant in variants:
                    command=[build/variant,*cell[:2],metadata['parameters']['steps'],cell[2]] if wide else [build/variant,cell[0],metadata['parameters']['steps'],cell[2],cell[1]]
                    observed=json.loads(run(command));assert {k:observed[k] for k in observations}=={k:reference[k] for k in observations}
                    trials+=1
            result['native_replayed_streams']=trials;result['recorded_binary_hashes']=True
            # Exact emit and plan replay for the new compiler, and for the
            # original compiler where the report relies on its emitted source.
            tmp=ROOT/'build/cache-reports-audit'/name
            if wide:cases=[('cloned',original,'knowledge/exact-maintenance/canonical.json',False),('borrowed',current,'knowledge/exact-maintenance/canonical.json',False),('delta',current,'knowledge/delta-maintenance/delta.json',False)]
            else:cases=[('generated',current,'knowledge/exact-maintenance/canonical.json',False),('generated-bounded',current,'knowledge/exact-maintenance/canonical.json',True),('language_delta',current,'knowledge/delta-maintenance/delta.json',False)]
            source='bench/wide-cache/program.ink' if wide else 'examples/state-benchmark.lang'
            wrapper='bench/wide-cache/wrapper.rs' if wide else 'bench/state/generated_abi.rs'
            for variant,compiler,cert,bounded in cases:
                project=tmp/variant;run([compiler,'emit-state',source,'-o',project,'--maintenance',cert]+(['--bounded-totals'] if bounded else []))
                code=(project/'src/lib.rs').read_bytes()+(out/'sources'/wrapper).read_bytes()
                assert code==(out/variant/'src/lib.rs').read_bytes(),variant
                assert json.loads((project/'plan.json').read_text())==json.loads((out/variant/'plan.json').read_text()),variant
            result['exact_codegen_and_plan_replay']=True;result['mode']='executed'
        if wide and (out/'allocations.json').exists():
            allocations=json.loads((out/'allocations.json').read_text());assert allocations['status']=='passed' and len(allocations['rows'])==32
            for variant,want in allocations['measured_source_sha256'].items():assert sha(out/variant/'src/lib.rs')==want
            expected={(v,b,p) for v in variants for b in [64,512,4096,8192] for p in [0,1]}
            assert {(r['variant'],r['bits'],r['profile']) for r in allocations['rows']}==expected
            for r in allocations['rows']:
                assert r['steps']==128 and r['allocation_and_reallocation_calls']>=0 and r['requested_bytes']>=0
                assert r['calls_per_update']==r['allocation_and_reallocation_calls']/128
                assert r['requested_bytes_per_update']==r['requested_bytes']/128
            if args.execute:
                run(['python3','tools/cache_allocations.py'])
                replay=json.loads((out/'allocations.json').read_text());assert replay['rows']==allocations['rows']
                result['instrumented_allocations_replayed']=True
            else:result['instrumented_allocation_matrix']=True
        (out/('audit.json' if args.execute else 'audit-static.json')).write_text(json.dumps(result,indent=2)+'\n');results[name]=result
    # Check that the extension used the previous compiler before base lowering.
    extension=json.loads((ROOT/'reports/cache-lowering-phase1/proof-extension.json').read_text())
    previous=json.loads((ROOT/'reports/database-maintenance-phase1/metadata.json').read_text())
    assert extension['compiler_sha256']==previous['compiler_sha256']
    for path,want in extension['source_sha256'].items():assert previous['source_sha256'][path]==want,path
    if args.execute:
        original=ROOT/'build/cache-lowering-original/lang';assert sha(original)==extension['compiler_sha256']
        temporary=ROOT/'build/cache-reports-audit/delta-replay'
        run(['python3','tools/delta_maintenance_proofs.py',temporary,'--compiler',original])
        for source in (ROOT/'knowledge/delta-maintenance').rglob('*'):
            if source.is_file() and source.suffix in ('.json','.ink'):assert source.read_bytes()==(temporary/source.relative_to(ROOT/'knowledge/delta-maintenance')).read_bytes(),source
        for name in ['cache-lowering-phase1','wide-cache-phase1']:
            path=ROOT/'reports'/name/'audit.json';result=json.loads(path.read_text());result['original_compiler_delta_extension_replayed']=True;path.write_text(json.dumps(result,indent=2)+'\n')
    print(json.dumps(results,indent=2))
if __name__=='__main__':main()
