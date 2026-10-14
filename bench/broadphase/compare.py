#!/usr/bin/env python3
"""Paired fresh-process comparison of two compiled broadphase implementations."""
import argparse, hashlib, json, os, pathlib, statistics, subprocess, sys, time
ROOT=pathlib.Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'bench'))
import methodology
NAMES=['ink_scan','ink_sweep','ink_bvh','rust_sweep','rust_bvh','box2d']

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def inspect(directory):
    meta=json.loads((directory/'build.json').read_text())
    for field,path in [('binary_sha256','compiled/target/release/compiled-state'),('generated_sha256','compiled/src/lib.rs'),('driver_sha256','compiled/src/main.rs'),('library_sha256','libbox2d-broadphase.'+methodology.shared_suffix()),('plan_sha256','plan/plan.json')]:
        assert digest(directory/path)==meta[field],(directory,field)
    return meta

def execute(directory):
    # Each frozen executable resolves its own recorded native library.
    variable='DYLD_LIBRARY_PATH' if sys.platform=='darwin' else 'LD_LIBRARY_PATH'
    env={**os.environ,variable:str(directory)}
    output=subprocess.check_output([directory/'compiled/target/release/compiled-state'],env=env,text=True)
    rows=[json.loads(line) for line in output.splitlines()]
    assert len(rows)==36 and all(r['validated'] for r in rows)
    assert len({(r['mode'],r['n']) for r in rows})==36
    return rows

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('before',type=pathlib.Path)
    p.add_argument('after',type=pathlib.Path)
    p.add_argument('--rounds',type=int,default=8)
    p.add_argument('--output',type=pathlib.Path,required=True)
    a=p.parse_args();assert a.rounds>=4 and a.rounds%2==0
    directories=[a.before.resolve(),a.after.resolve()]
    metadata=[inspect(d) for d in directories]
    for field in ['source_hashes','upstream_revision','upstream_hashes','rust_flags','dependency_lock','driver_sha256','plan_sha256']:
        assert metadata[0][field]==metadata[1][field],('unmatched comparison inputs',field)
    a.output.parent.mkdir(parents=True,exist_ok=True)
    processes=[[],[]]
    for round in range(a.rounds):
        for which in ([0,1] if round%2==0 else [1,0]):
            processes[which].append(execute(directories[which]))
            partial=a.output.with_suffix('.partial.json')
            temporary=partial.with_suffix('.tmp')
            temporary.write_text(json.dumps({'complete':False,'requested_rounds':a.rounds,'builds':dict(zip(['before','after'],metadata)),'processes':dict(zip(['before','after'],processes))},indent=2)+'\n')
            temporary.replace(partial)
            print(f'Completed pair {round+1}: '+['before','after'][which],flush=True)
    rows=[]
    for cell in processes[0][0]:
        samples=[]
        for side in processes:
            selected=[next(r for r in process if (r['mode'],r['n'])==(cell['mode'],cell['n'])) for process in side]
            assert all(r['pair_count']==cell['pair_count'] for r in selected)
            samples.append({name:[statistics.median(r['samples_ns'][i]) for r in selected] for i,name in enumerate(NAMES)})
        summary={'mode':cell['mode'],'n':cell['n'],'pair_count':cell['pair_count'],'before_median_ns':{k:statistics.median(v) for k,v in samples[0].items()},'after_median_ns':{k:statistics.median(v) for k,v in samples[1].items()},'process_medians_ns':dict(zip(['before','after'],samples))}
        summary['after_over_before']={name:dict(zip(['ratio','ci_low','ci_high'],methodology.ratio_ci(samples[1][name],samples[0][name]))) for name in NAMES}
        summary['after_ratios']={label:dict(zip(['ratio','ci_low','ci_high'],methodology.ratio_ci(samples[1][left],samples[1][right]))) for label,left,right in [('sweep_over_rust','ink_sweep','rust_sweep'),('bvh_over_rust','ink_bvh','rust_bvh'),('sweep_over_box2d','ink_sweep','box2d'),('bvh_over_box2d','ink_bvh','box2d')]}
        rows.append(summary)
    assert [inspect(d) for d in directories]==metadata
    result={'schema':1,'scope':__doc__,'environment':methodology.environment(),'comparison_script_sha256':digest(pathlib.Path(__file__)),'rounds':a.rounds,'order':'before/after alternated each paired round; six variants rotate inside each process','builds':dict(zip(['before','after'],metadata)),'results':rows,'processes':dict(zip(['before','after'],processes)),'finished_unix':time.time()}
    a.output.parent.mkdir(parents=True,exist_ok=True)
    a.output.write_text(json.dumps(result,indent=2)+'\n')

if __name__=='__main__':main()
