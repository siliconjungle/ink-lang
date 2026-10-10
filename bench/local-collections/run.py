#!/usr/bin/env python3
"""Native typed calls: Ink heap vs Ink linear queue vs Rust's BinaryHeap.
Includes input copy, construction, extraction, output and destruction; excludes
JSON/compilation. Both heaps insert one item at a time with (priority,index) ties.
"""
import json, os, subprocess, sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import methodology
ROOT=Path(__file__).resolve().parents[2]
HERE=Path(__file__).resolve().parent
OUT=ROOT/'build/local-collections-bench'
OUT.mkdir(parents=True,exist_ok=True)
source=(ROOT/'examples/local-pathfinding.ink').read_text()+'\n'+(HERE/'baseline.ink').read_text()
(OUT/'source.ink').write_text(source)
env=os.environ.copy();env.update(CARGO_PROFILE_DEV_DEBUG='0',CARGO_PROFILE_TEST_DEBUG='0',CARGO_INCREMENTAL='0')
subprocess.run(['cargo','build','--bin','ink'],cwd=ROOT,env=env,check=True)
subprocess.run([str(ROOT/'target/debug/ink'),'build',str(OUT/'source.ink'),'--target','rust','-o',str(OUT/'rust')],cwd=ROOT,check=True)
project=OUT/'rust';(project/'src/bin').mkdir(exist_ok=True)
(project/'src/bin/benchmark.rs').write_text((HERE/'driver.rs').read_text())
# Only the rlib is needed for this benchmark.
p=project/'Cargo.toml';p.write_text(p.read_text().replace('["rlib","cdylib","staticlib"]','["rlib"]'))
subprocess.run(['cargo','build','--release','--bin','benchmark'],cwd=project,env=env,check=True,stdout=subprocess.DEVNULL)
samples=json.loads(subprocess.check_output([str(project/'target/release/benchmark')],text=True))
report={'schema':1,'source':source,'method':'9 interleaved rounds, median; 100ms calibration per method/size, two calibration warmups; typed native call including inputs/outputs, no JSON','order':['ink_heap','ink_linear','rust_binary_heap'],'environment':methodology.environment(env),'results':samples}
(HERE/'results.json').write_text(json.dumps(report,indent=2)+'\n')
for r in samples:print(r['n'], 'linear/heap',round(r['linear_over_heap'],2), 'Ink/std heap',round(r['ink_over_std_heap'],2))
