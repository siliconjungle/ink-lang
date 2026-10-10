#!/usr/bin/env python3
"""Same literal C/JSON driver, old versus current shared primitive runtime."""
import argparse, hashlib, json, pathlib, random, shutil, statistics, subprocess, sys, time
ROOT=pathlib.Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'bench'))
import methodology
p=argparse.ArgumentParser();p.add_argument('--cargo',default='cargo');p.add_argument('--rustc',default='rustc');p.add_argument('--ink',default=str(ROOT/'target/debug/ink'));p.add_argument('--repeats',type=int,default=7);p.add_argument('--calls',type=int,default=10);p.add_argument('--output',type=pathlib.Path,default=ROOT/'build/complete-values/report.json');a=p.parse_args()
assert 3<=a.repeats<=100 and 1<=a.calls<=10000
work=ROOT/'build/complete-values';work.mkdir(parents=True,exist_ok=True)
old=subprocess.check_output(['git','-C',str(ROOT/'runtime'),'show','56ea95b8224906839bbf1266949a3c07f5b06f5f:hosts/value-abi.rs']).decode()
current=(ROOT/'runtime/hosts/value-abi.rs').read_text()
report={'scope':'same emitted C and JSON driver; scalar intermediates; no broad language or hardware claim','old_runtime':'56ea95b8224906839bbf1266949a3c07f5b06f5f','environment':methodology.environment(),'cases':[],'source_sha256':hashlib.sha256((ROOT/'bench/complete-values/program.ink').read_bytes()).hexdigest(),'runtime_sha256':{name:hashlib.sha256(s.encode()).hexdigest() for name,s in [('arena',old),('inline',current)]}}
bins={}
try:
    report['environment']['rustc']=subprocess.check_output([a.rustc,'-vV'],text=True).strip()
    report['environment']['rustc_llvm_major']=methodology.llvm_major(report['environment']['rustc'])
except (OSError,subprocess.CalledProcessError):
    pass
report['driver_sha256']=hashlib.sha256((ROOT/'bench/complete-values/driver.rs').read_bytes()).hexdigest()
report['environment']['runtime_commit']=subprocess.check_output(['git','-C',str(ROOT/'runtime'),'rev-parse','HEAD'],text=True).strip()
for name,runtime in [('arena',old),('inline',current)]:
    project=work/name
    subprocess.run([a.ink,'emit-c-project',str(ROOT/'bench/complete-values/program.ink'),'-o',str(project)],check=True)
    lib=(project/'src/lib.rs').read_text();assert current in lib
    (project/'src/lib.rs').write_text(lib.replace(current,runtime,1))
    shutil.copyfile(ROOT/'bench/complete-values/driver.rs',project/'src/main.rs')
    with (project/'Cargo.toml').open('a') as f:f.write('\n[features]\nallocation-probe=[]\n')
    bins[name]={}
    for instrument in [False,True]:
        cmd=[a.cargo,'build','--offline','--release','--manifest-path',str(project/'Cargo.toml'),'--target-dir',str(project/'target')]
        if instrument:cmd+=['--features','allocation-probe']
        subprocess.run(cmd,check=True,stdout=subprocess.DEVNULL)
        binary=project/('probe' if instrument else 'timing');shutil.copy2(project/'target/release/compiled-state',binary);bins[name][instrument]=binary
assert (work/'arena/program.c').read_bytes()==(work/'inline/program.c').read_bytes()
report['emitted_c_sha256']=hashlib.sha256((work/'inline/program.c').read_bytes()).hexdigest()
for n in [100,10000,60000]:
    for mode in ['execution','lifecycle']:
        def run(name,probe=False):return json.loads(subprocess.check_output([str(bins[name][probe]),str(n),str(a.calls),mode]))
        for _ in range(2):
            for name in bins:run(name)
        rounds=[];rng=random.Random(17+n)
        for _ in range(a.repeats):
            names=list(bins);rng.shuffle(names);rounds.append({name:run(name)['elapsed_ms'] for name in names})
        measurements={name:statistics.median(r[name] for r in rounds) for name in bins}
        case={'iterations':n,'mode':mode,'calls':a.calls,'rounds_ms':rounds,'median_ms':measurements,'arena_over_inline':methodology.ratio_ci([r['arena'] for r in rounds],[r['inline'] for r in rounds]),'instrumented':{name:run(name,True) for name in bins}}
        report['cases'].append(case)
a.output.parent.mkdir(parents=True,exist_ok=True);a.output.write_text(json.dumps(report,indent=2)+'\n');print(a.output)
