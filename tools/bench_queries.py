#!/usr/bin/env python3
"""Reproduce ordered query performance; no observations authorize a selection.

Native Ink calls include input cloning required by their owning typed boundary.
Handwritten controls borrow inputs. JavaScript uses the exported trusted-value
boundary and direct handwritten functions. All lanes consume complete outputs.
"""
import argparse,hashlib,json,os,platform,random,statistics,subprocess,time
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]

def cases(seed):
    rng=random.Random(seed);out=[]
    for size in [0,8,256,4096]:
        xs=[rng.randrange(65536)for _ in range(size)]
        for threshold in [8192,57344]:
            out.append(dict(name=f'filter/{size}/{threshold}',functions=['filtered','pipeline','manual','hand_filter'],args=[xs,threshold,17],expected=[(x*3+17)&0xffffffff for x in xs if x>=threshold]))
        for mode in ['first','last','missing']:
            base=rng.randrange(100000)
            values=[base+2*i for i in range(size)]
            target=base if mode=='first'else base+2*max(0,size-1)if mode=='last'else 0xffffffff
            out.append(dict(name=f'exists/{size}/{mode}',functions=['contains','manual_contains','hand_contains'],args=[values,target],expected=target in values))
    for size in [0,8,64,256]:
        xs=[rng.randrange(257)for _ in range(size)];ys=[rng.randrange(257)for _ in range(size)]
        out.append(dict(name=f'join/{size}',functions=['joined','manual_join','hand_join'],args=[xs,ys],expected=[dict(left=x,right=y)for x in xs for y in ys if x==y]))
    return out

def run(command,cwd=ROOT):
    started=time.perf_counter_ns();p=subprocess.run(list(map(str,command)),cwd=cwd,text=True,capture_output=True,timeout=600)
    if p.returncode:raise RuntimeError(f'{command}:\n{p.stdout}\n{p.stderr}')
    return p.stdout,time.perf_counter_ns()-started

def main():
    ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('--compiler',required=True);ap.add_argument('--output',required=True);ap.add_argument('--processes',type=int,default=3);a=ap.parse_args()
    if not 1<=a.processes<=8:raise ValueError('processes must be 1..8')
    compiler=Path(a.compiler).resolve();output=Path(a.output).resolve();output.mkdir(parents=True,exist_ok=True)
    source=ROOT/'examples/query-expressions.ink';js=output/'query.mjs';native=output/'native'
    preparation={}
    for target,dest in [('javascript',js),('rust',native)]:
        _,preparation[target+'_emission_ns']=run([compiler,'build',source,'--target',target,'-o',dest])
    core=output/'core.json';run([compiler,'emit-core',source,'-o',core])
    harness=output/'native-harness';(harness/'src').mkdir(parents=True,exist_ok=True)
    (harness/'Cargo.toml').write_text('[package]\nname="query-benchmark"\nversion="0.1.0"\nedition="2021"\n[workspace]\n[dependencies]\ncompiled-state={path='+json.dumps(str(native))+'}\nserde_json="=1.0.151"\n[profile.release]\nlto="thin"\ncodegen-units=1\n')
    (harness/'src/main.rs').write_text((ROOT/'tools/bench_queries.rs.txt').read_text())
    _,preparation['native_release_build_ns']=run(['cargo','build','--release','--offline','--manifest-path',harness/'Cargo.toml'])
    results=[]
    for target in ['rust','javascript']:
        for cohort,seed in [('development',7193),('holdout',91427)]:
            workload=dict(seed=seed,cases=cases(seed),module=str(js));request=output/(cohort+'.json');request.write_text(json.dumps(workload))
            for process in range(a.processes):
                command=[harness/'target/release/query-benchmark',request]if target=='rust'else['node',ROOT/'tools/bench_queries.mjs',request]
                stdout,elapsed=run(command);r=json.loads(stdout);r.update(cohort=cohort,process=process,process_ns=elapsed)
                (output/f'{target}-{cohort}-{process}.json').write_text(json.dumps(r,indent=2)+'\n');results.append(r)
    summary=[]
    for target in ['rust','javascript']:
        for cohort in ['development','holdout']:
            lanes={}
            for r in results:
                if (r['target'],r['cohort'])!=(target,cohort):continue
                for row in r['rows']:lanes.setdefault((row['case'],row['function']),[]).append(statistics.median(row['samples_ns']))
            for (case,function),medians in sorted(lanes.items()):
                summary.append(dict(target=target,cohort=cohort,case=case,function=function,median_process_ns=statistics.median(medians),process_medians_ns=medians))
    report=dict(schema=1,status='measured',compiler_sha256=hashlib.sha256(compiler.read_bytes()).hexdigest(),source_sha256=hashlib.sha256(source.read_bytes()).hexdigest(),core_sha256=hashlib.sha256(core.read_bytes()).hexdigest(),platform=platform.platform(),preparation=preparation,processes=a.processes,rounds=11,summary=summary,scope=__doc__,selection='No automatic selection or claimed universal speedup; adverse cases retained')
    (output/'report.json').write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps({k:v for k,v in report.items()if k!='summary'}))

if __name__=='__main__':main()
