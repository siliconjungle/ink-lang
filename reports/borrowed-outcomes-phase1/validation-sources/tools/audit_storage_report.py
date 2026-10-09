#!/usr/bin/env python3
"""Audit and replay original timed storage binaries without rebuilding them."""
import argparse,hashlib,importlib.util,json,math,re,statistics,subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--report',type=Path,default=ROOT/'reports/ordered-storage-phase1')
    parser.add_argument('--compiler',type=Path,default=ROOT/'build/ordered-storage-event-original/lang')
    parser.add_argument('--execute',action='store_true');args=parser.parse_args()
    out=args.report.resolve();meta=json.loads((out/'metadata.json').read_text());samples=json.loads((out/'samples.json').read_text())
    for path,identity in meta['source_sha256'].items():assert digest(out/'sources'/path)==identity,path
    for path,identity in meta['artifact_sha256'].items():assert digest(out/path)==identity,path
    variants=sorted({s['variant'] for s in samples});repeats=meta['parameters']['repeats'];steps=meta['parameters']['steps']
    assert len(variants)==(14 if out.name=='borrowed-outcomes-phase1' else 12)
    assert repeats==7 and steps==30000 and len(samples)==len(variants)*18*repeats
    observations=['checksum','total_lo','total_hi','version','events','event_hash','state_hash','statuses'];cells={}
    for s in samples:
        assert s['steps']==steps and math.isfinite(s['seconds']) and s['seconds']>0
        assert math.isclose(s['ns_per_step'],s['seconds']*1e9/steps,rel_tol=1e-12)
        key=(s['variant'],s['repeat']);c=(s['rows'],s['workload'],s['queries_per_update']);group=cells.setdefault(c,{})
        assert key not in group;group[key]=s
    assert set(cells)=={(n,w,q) for n in [64,4096,65536] for w in ['steady','mixed'] for q in [0,1,10]}
    medians={}
    for c,group in cells.items():
        assert set(group)=={(v,r) for v in variants for r in range(repeats)}
        assert len({json.dumps({k:s[k] for k in observations},sort_keys=True) for s in group.values()})==1,c
        medians[c]={v:statistics.median(group[v,r]['ns_per_step'] for r in range(repeats)) for v in variants}
    gm=lambda xs:math.exp(statistics.mean(map(math.log,xs)))
    summary=dict(samples=len(samples),cells=18,old_time_divided_by_current_tree=gm([m['old_tree']/m['tree'] for m in medians.values()]),time_divided_by_rust_tree={v:gm([m[v]/m['rust_tree'] for m in medians.values()]) for v in variants},small_table_time_divided_by_rust_tree={v:gm([m[v]/m['rust_tree'] for c,m in medians.items() if c[0]==64]) for v in variants},flat_ink_time_divided_by_same_layout_rust={v:gm([m[v]/m['rust_'+v] for m in medians.values()]) for v in ['rows_flat','columns_flat','columns_small']})
    if 'old_columns_small' in variants:summary['old_time_divided_by_current_columns']={v:gm([m['old_'+v]/m[v] for m in medians.values()]) for v in ['columns_small','columns_flat']}
    def compare(a,b):
        if isinstance(a,dict):assert set(a)==set(b);[compare(a[k],b[k]) for k in a]
        else:assert math.isclose(a,b,rel_tol=1e-12),(a,b)
    compare(summary,json.loads((out/'summary.json').read_text()))
    verification=json.loads((out/'verification.json').read_text())
    expected_tests=75 if out.name=='borrowed-outcomes-phase1' else 74
    assert verification['tests']==expected_tests
    for path,identity in verification['artifact_sha256'].items():assert digest(out/path)==identity,path
    assert sum(map(int,re.findall(r'test result: ok\. (\d+) passed',(out/'tests.log').read_text())))==expected_tests
    audit=dict(status='passed',mode='static',sample_matrix=True,summary=summary,archived_measured_sources=len(meta['source_sha256']),validation_sources=True,scope='Evidence audit, not a proof of native/storage soundness or a new timing run.')
    if args.execute:
        compiler=args.compiler.resolve();original=Path(meta['parameters']['original']).resolve()
        assert digest(compiler)==meta['compiler_sha256']['current'];assert digest(original)==meta['compiler_sha256']['original']
        for path,identity in meta['binary_sha256'].items():assert digest(ROOT/path)==identity,path
        spec=importlib.util.spec_from_file_location('state_bench',out/'sources/bench/state/run.py');bench=importlib.util.module_from_spec(spec);spec.loader.exec_module(bench)
        bench.ROOT=ROOT
        env=bench.environment();temporary=ROOT/'build'/f'{out.name}-audit';temporary.mkdir(parents=True,exist_ok=True)
        def run(argv):return subprocess.run(list(map(str,argv)),cwd=ROOT,env=env,capture_output=True,text=True,check=True).stdout
        run([compiler,'verify-maintenance',out/'maintenance.json'])
        # Relative source argument preserves the emitted plan's recorded path.
        source='examples/state-benchmark.lang';assert digest(ROOT/source)==meta['source_sha256'][source]
        for variant,definition in meta['definitions'].items():
            if 'compiler' not in definition:continue
            generator=original if definition['compiler']=='original' else compiler
            project=temporary/variant
            argv=[generator,'emit-state',source,'--maintenance',out/'maintenance.json','--bounded-totals','-o',project]
            if definition['storage']:argv+=['--storage',out/'sources/knowledge/storage'/f"inventory-{definition['storage']}.json"]
            run(argv)
            assert (project/'src/lib.rs').read_bytes()==(out/f'{variant}-emitted.rs').read_bytes(),variant
            assert json.loads((project/'plan.json').read_text())==json.loads((out/f'{variant}-plan.json').read_text()),variant
        audit['exact_codegen_and_plan_replay']=True
        bench.BUILD=Path(meta['parameters']['build_directory']).resolve();bench.OUT=temporary;bench.VARIANTS=variants
        audit['correctness']=bench.validate(compiler);assert audit['correctness']==meta['correctness']
        audit['native_replayed_streams']=0
        for c,group in cells.items():
            expected=next(iter(group.values()))
            for v in variants:
                got=json.loads(run([bench.BUILD/v,c[0],steps,c[2],c[1]]))
                assert {k:got[k] for k in observations}=={k:expected[k] for k in observations},(c,v)
                audit['native_replayed_streams']+=1
        for path,identity in meta['binary_sha256'].items():assert digest(ROOT/path)==identity,path
        assert digest(compiler)==meta['compiler_sha256']['current'];assert digest(original)==meta['compiler_sha256']['original']
        audit['measured_binaries_preserved']=True;audit['mode']='executed'
    (out/('audit.json' if args.execute else 'audit-static.json')).write_text(json.dumps(audit,indent=2)+'\n')
    print(json.dumps(audit,indent=2))
if __name__=='__main__':main()
