#!/usr/bin/env python3
"""Measure full current checker admission of a pinned law bundle."""
import argparse,json,statistics,subprocess,time
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('compiler',type=Path);p.add_argument('core',type=Path);p.add_argument('bundle',type=Path);a=p.parse_args()
times=[]
for _ in range(9):
 start=time.perf_counter_ns();r=subprocess.run([str(a.compiler.resolve()),'knowledge-check',str(a.core),str(a.bundle)],capture_output=True,text=True);elapsed=time.perf_counter_ns()-start
 if r.returncode:raise RuntimeError(r.stderr)
 times.append(elapsed)
print(json.dumps(dict(samples=9,median_ns=statistics.median(times),min_ns=min(times),max_ns=max(times),scope='Full checker process startup, typed semantic admission and proof checking; no search or code generation',checked_entries=len(json.loads(r.stdout)['entries']))))
