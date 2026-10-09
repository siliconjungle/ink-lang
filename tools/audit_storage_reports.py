#!/usr/bin/env python3
"""Audit archived ownership-lowering experiments and replay measured binaries without rebuilding them."""
import argparse, hashlib, importlib.util, json, math, re, statistics, subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def module(name,p):
    spec=importlib.util.spec_from_file_location(name,p);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);return m
def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--execute',action='store_true');args=parser.parse_args()
    bench=module('storage',ROOT/'bench/storage-reuse.py');env=bench.state.environment()
    def run(cmd):return subprocess.run(list(map(str,cmd)),cwd=ROOT,env=env,text=True,capture_output=True,check=True).stdout
    current=ROOT/'target/release/lang';original=ROOT/'build/storage-original/lang';results={}
    for wide in [True,False]:
        out=ROOT/'reports'/('storage-reuse-phase1' if wide else 'storage-inventory-phase1')
        build=ROOT/'build'/('storage-reuse-bench' if wide else 'storage-inventory-bench')
        m=json.loads((out/'metadata.json').read_text());rows=json.loads((out/'samples.json').read_text());summary=json.loads((out/'summary.json').read_text())
        for p,want in m['source_sha256'].items():assert sha(out/'sources'/p)==want,p
        for p,want in m['artifact_sha256'].items():assert sha(out/p)==want,p
        verification=json.loads((out/'verification.json').read_text())
        for p,want in verification['source_sha256'].items():assert sha(out/'verification-sources'/p)==want,p
        assert verification['tests']==65 and sum(map(int,re.findall(r'test result: ok\. (\d+) passed',(out/'tests.log').read_text())))==65
        change=json.loads((out/'lowering-change.json').read_text())
        prior=json.loads((ROOT/'reports/reversible-cache-phase1/metadata.json').read_text())
        assert change['original_compiler_sha256']==prior['compiler_sha256']
        for p,want in change['unchanged_source_sha256'].items():
            assert sha(out/'sources'/p)==want==prior['source_sha256'][p],p
        variants=bench.VARIANTS if wide else ['language','language_bounded','c_flat','cpp_tree','rust_tree','rust_bigint']
        fields=['bits','profile','queries_per_update'] if wide else ['rows','workload','queries_per_update']
        observed=['checksum','observation'] if wide else ['checksum','total_lo','total_hi','version','events','event_hash','state_hash','statuses']
        cells={};oracle_cache={}
        for row in rows:
            assert row['variant'] in variants and row['steps']==m['parameters']['steps']
            assert row['seconds']>0 and math.isfinite(row['seconds'])
            assert math.isclose(row['ns_per_step'],row['seconds']*1e9/row['steps'],rel_tol=1e-12)
            cell=tuple(row[f] for f in fields);group=cells.setdefault(cell,{})
            key=(row['variant'],row['repeat']);assert key not in group;group[key]=row
            if wide:
                oracle_key=(cell[0],cell[1],row['steps'],cell[2])
                if oracle_key not in oracle_cache:oracle_cache[oracle_key]=bench.wide.oracle(*oracle_key)
                want=oracle_cache[oracle_key]
                assert {k:row[k] for k in want}==want
        assert len(cells)==(16 if wide else 18) and len(rows)==len(cells)*len(variants)*m['parameters']['repeats']
        expected_cells={(b,p,q) for b in [64,512,4096,8192] for p in [0,1] for q in [0,1]} if wide else {
            (n,w,q) for n in [64,4096,65536] for w in ['steady','mixed'] for q in [0,1,10]}
        assert set(cells)==expected_cells
        medians={}
        for c,g in cells.items():
            assert set(g)=={(v,r) for v in variants for r in range(m['parameters']['repeats'])}
            assert len({json.dumps({k:r[k] for k in observed},sort_keys=True) for r in g.values()})==1
            medians[c]={v:statistics.median(g[v,r]['ns_per_step'] for r in range(m['parameters']['repeats'])) for v in variants}
        geo=lambda xs:math.exp(statistics.mean(map(math.log,xs)))
        ratios={'old_journal_divided_by_journal':('old_journal','journal'),'old_snapshot_divided_by_snapshot':('old_snapshot','snapshot'),'journal_divided_by_rust':('journal','rust_bigint')} if wide else {
            'bounded_time_divided_by_rust_tree':('language_bounded','rust_tree'),'bigint_time_divided_by_bounded':('language','language_bounded')}
        for key,(l,r) in ratios.items():assert math.isclose(summary[key],geo([x[l]/x[r] for x in medians.values()]),rel_tol=1e-12),key
        if wide:
            for p in [0,1]:assert math.isclose(summary['ratios_by_profile'][str(p)],geo([x['old_journal']/x['journal'] for c,x in medians.items() if c[1]==p]),rel_tol=1e-12)
        else:assert math.isclose(summary['bounded_time_divided_by_fastest_baseline'],geo([x['language_bounded']/min(x[v] for v in variants[2:]) for x in medians.values()]),rel_tol=1e-12)
        assert summary['samples']==len(rows) and summary['cells']==len(cells)
        result=dict(status='passed',mode='static',samples=len(rows),cells=len(cells),source_artifact_validation_hashes=True,sample_matrix=True,summary_recomputed=True,unchanged_kernel_bridge_and_certificates=True)
        if args.execute:
            assert sha(current)==(m['compiler_sha256']['current'] if wide else m['compiler_sha256'])==verification['compiler_sha256']==change['current_compiler_sha256']
            assert sha(original)==change['original_compiler_sha256']
            if wide:assert sha(original)==m['compiler_sha256']['original']
            for p,want in m['binary_sha256'].items():assert sha(build/p)==want,p
            if wide:
                bench.wide.BUILD=build;bench.wide.OUT=out;bench.wide.VARIANTS=variants
                correctness=bench.wide.validate()
            else:
                bench.state.BUILD=build;bench.state.OUT=out;bench.state.VARIANTS=variants
                correctness=bench.state.validate(current)
            assert correctness==m['correctness']
            trials=0
            for c,g in cells.items():
                reference=next(iter(g.values()))
                for v in variants:
                    command=[build/v,c[0],c[1],m['parameters']['steps'],c[2]] if wide else [build/v,c[0],m['parameters']['steps'],c[2],c[1]]
                    got=json.loads(run(command));assert {k:got[k] for k in observed}=={k:reference[k] for k in observed}
                    if wide:
                        want=oracle_cache[(c[0],c[1],m['parameters']['steps'],c[2])];assert {k:got[k] for k in want}==want
                    trials+=1
            temporary=ROOT/'build/storage-reports-audit'/out.name
            cases=[('old_snapshot','knowledge/reversible-maintenance/snapshot.json',False),('old_journal','knowledge/reversible-maintenance/reversible.json',False),('snapshot','knowledge/reversible-maintenance/snapshot.json',False),('journal','knowledge/reversible-maintenance/reversible.json',False)] if wide else [('generated','knowledge/reversible-maintenance/reversible.json',False),('generated-bounded','knowledge/reversible-maintenance/reversible.json',True)]
            source='bench/wide-cache/program.ink' if wide else 'examples/state-benchmark.lang'
            wrapper='bench/wide-cache/wrapper.rs' if wide else 'bench/state/generated_abi.rs'
            for variant,cert,bounded in cases:
                project=temporary/variant
                run([original if variant.startswith('old_') else current,'emit-state',source,'-o',project,'--maintenance',cert]+(['--bounded-totals'] if bounded else []))
                code=(project/'src/lib.rs').read_bytes()+(out/'sources'/wrapper).read_bytes()
                archived=out/variant/'src/lib.rs' if wide else out/f'{variant}-lib.rs'
                assert code==archived.read_bytes(),variant
                archived_plan=out/variant/'plan.json' if wide else out/f'{variant}-plan.json'
                assert json.loads((project/'plan.json').read_text())==json.loads(archived_plan.read_text())
            if not wide:
                assert (out/'generated-bounded-lib.rs').read_bytes()==(ROOT/'reports/reversible-inventory-phase1/generated-bounded-lib.rs').read_bytes()
                result['bounded_inventory_source_unchanged']=True
            for p,want in m['binary_sha256'].items():assert sha(build/p)==want,p
            result.update(mode='executed',correctness=correctness,native_replayed_streams=trials,measured_binaries_preserved=True,exact_codegen_and_plan_replay=True)
        if wide and (out/'allocations.json').exists():
            allocations=json.loads((out/'allocations.json').read_text());ar=allocations['rows']
            assert allocations['status']=='passed' and len(ar)==40
            assert {(r['variant'],r['bits'],r['profile']) for r in ar}=={(v,b,p) for v in variants for b in [64,512,4096,8192] for p in [0,1]}
            for v,want in allocations['measured_source_sha256'].items():assert sha(out/v/'src/lib.rs')==want
            for r in ar:
                assert r['steps']==128 and r['calls_per_update']==r['allocation_and_reallocation_calls']/128 and r['requested_bytes_per_update']==r['requested_bytes']/128
            if args.execute:
                run(['python3','tools/cache_allocations.py','--report',out,'--benchmark','bench/storage-reuse.py','--build-directory','build/storage-allocation-audit'])
                assert json.loads((out/'allocations.json').read_text())['rows']==ar
                result['instrumented_allocations_replayed']=True
            else:result['allocation_matrix']=True
        results[out.name]=result
    if args.execute:
        temporary=ROOT/'build/storage-reports-audit/producer'
        run(['python3','knowledge/tools/reversible_maintenance_proofs.py',temporary,'--compiler',current,'--kernel',original])
        for p in (ROOT/'knowledge/reversible-maintenance').rglob('*'):
            if p.is_file() and p.suffix in ('.json','.ink'):assert p.read_bytes()==(temporary/p.relative_to(ROOT/'knowledge/reversible-maintenance')).read_bytes(),p
        for result in results.values():result['unchanged_two_database_candidates_replayed']=True
    for name,result in results.items():(ROOT/'reports'/name/('audit.json' if args.execute else 'audit-static.json')).write_text(json.dumps(result,indent=2)+'\n')
    print(json.dumps(results,indent=2))
if __name__=='__main__':main()
