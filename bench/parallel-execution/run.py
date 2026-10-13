#!/usr/bin/env python3
"""Paired native benchmark, including typed input copies and result destruction."""
import hashlib,json,os,subprocess,statistics,random
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];HERE=Path(__file__).resolve().parent
OUT=ROOT/'build/parallel-execution-benchmark';OUT.mkdir(parents=True,exist_ok=True)
compiler=ROOT/'target/debug/ink';source=ROOT/'examples/parallel-execution.ink';project=OUT/'program'
subprocess.run([compiler,'build',source,'--target','rust','-o',project],check=True)
cargo=project/'Cargo.toml';cargo.write_text(cargo.read_text().replace('["rlib","cdylib","staticlib"]','["rlib"]'))
driver=OUT/'driver';(driver/'src').mkdir(parents=True,exist_ok=True)
(driver/'Cargo.toml').write_text('[package]\nname="parallel-execution-bench"\nversion="0.1.0"\nedition="2021"\n[dependencies]\ncompiled-state={path="../program"}\nserde_json="=1.0.151"\n[workspace]\n')
(driver/'src/main.rs').write_text((HERE/'driver.rs').read_text())
subprocess.run(['cargo','build','--release','--manifest-path',driver/'Cargo.toml'],check=True)
env=os.environ.copy();env['INK_THREADS']='4'
results=json.loads(subprocess.check_output([driver/'target/release/parallel-execution-bench'],env=env,text=True))
rng=random.Random(1)
for r in results:
 a,b=r['samples_ns'];ratios=[]
 for _ in range(4000):
  ids=[rng.randrange(len(a)) for _ in a];ratios.append(statistics.median([a[i] for i in ids])/statistics.median([b[i] for i in ids]))
 ratios.sort();r['sequential_over_parallel_ci95']=[ratios[100],ratios[3899]]
report={'schema':1,'compiler_sha256':hashlib.sha256(compiler.read_bytes()).hexdigest(),'source_sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'rustc':subprocess.check_output(['rustc','-Vv'],text=True).strip(),'revision':subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip(),'working_tree':subprocess.check_output(['git','status','--short'],cwd=ROOT,text=True).strip(),'threads':4,'method':'Nine alternating paired rounds. Calibration targets 30 ms per sample, capped at 200 repetitions. Both paths include the same input copy, output allocation and destruction. Runtime only; compilation is excluded. Four requested CPU workers, with sequential fallback for small or nested workloads. 4000 paired bootstrap median-ratio resamples. Work is the same wrapping recurrence in both programs.','results':results,'platform':subprocess.check_output(['uname','-a'],text=True).strip()}
(HERE/'results.json').write_text(json.dumps(report,indent=2)+'\n')
for r in results:print(r['n'],r['sequential_over_parallel'],r['sequential_over_parallel_ci95'])
