#!/usr/bin/env python3
import gzip,hashlib,json,statistics,math,tarfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'reports/gpu-signals-2026-10-12'
v=json.loads((OUT/'results.json').read_text())
for path,digest in v['hashes'].items():
 assert hashlib.sha256((ROOT/path).read_bytes()).hexdigest()==digest, f'measured artifact changed: {path}'
assert not v['quick'] and v['rounds']==7
assert len(v['samples'])==504 and len(v['validations'])==144 and len(v['cold'])==72
assert all(s['ms']>0 for s in v['samples'])
labels=['Ink WebGPU','Ink JavaScript','Ink Wasm','Svelte derived','Preact computed','Plain JS fused'];kinds=['affine','cheap-sum','heavy512','feedback32'];summary=[]
for kind in kinds:
 for n in v['sizes']:
  for label in labels:
   ss=[s for s in v['samples'] if (s['kind'],s['n'],s['label'])==(kind,n,label)];ms=[s['ms'] for s in ss];assert len(ms)==7
   summary.append(dict(kind=kind,n=n,label=label,medianMs=statistics.median(ms),minMs=min(ms),maxMs=max(ms),repetitions=len(ms),units=ss[0]['units']))
d={(s['kind'],s['n'],s['label']):s['medianMs'] for s in summary}
lines=['# Ink WebGPU versus Svelte and Preact','',f"Measured on {v['hostCpu']}, Chrome {v['browser']}, hardware {v['adapter']['vendor']} / {v['adapter']['architecture']}. Svelte {v['versions']['svelte']}; Preact Signals Core {v['versions']['@preact/signals-core']}. This compares complete pure compute requests with changed inputs and owned CPU-visible outputs, not framework rendering or database state actions.",'','## Complete-request warm medians','', 'All times are milliseconds. Input capture, GPU upload, every dispatch, synchronization, readback and complete result materialization are inside the timed GPU calls. Control calls capture input copies and return fresh owned results. Every output word is checked outside timing. GPU execution is explicitly required and every nonempty call must report actual GPU dispatch/readback counters; fallback timings are rejected.','', '| Workload | Elements | Ink GPU | Svelte | Preact | Plain JS | GPU speedup vs Svelte | GPU speedup vs Preact |','|---|---:|---:|---:|---:|---:|---:|---:|']
for kind in kinds:
 for n in v['sizes']:
  gpu=d[kind,n,'Ink WebGPU'];sv=d[kind,n,'Svelte derived'];pr=d[kind,n,'Preact computed'];raw=d[kind,n,'Plain JS fused']
  lines.append(f'| {kind} | {n:,} | {gpu:.4f} | {sv:.4f} | {pr:.4f} | {raw:.4f} | {sv/gpu:.3f}× | {pr/gpu:.3f}× |')
lines+=['','A speedup below 1 means GPU loses. The cases are:','', '- `affine`: a cheap independent integer array transform.','- `cheap-sum`: an affine map followed by a wrapping integer reduction, with scalar readback. The current emitted graph reduction uses one sequential GPU invocation; it is not a parallel reduction benchmark.','- `heavy512`: 512 steps of data-dependent wrapping integer arithmetic per element, with full array readback. The remainder term prevents the simple affine closed form of the earlier fixture.','- `feedback32`: 32 simultaneous steps. Each row reads its neighbor from the prior array and performs 64 data-dependent arithmetic steps. GPU intermediates remain resident until final full readback. CPU controls use two reusable typed work buffers rather than per-row reactive objects or arrays allocated per pass.','', 'Svelte uses a production-compiled `$state.raw` typed input and a connected `$derived` consumer; Preact uses one typed-array signal and a connected computed consumer. Both update the captured array once per complete request. Each callback is verified to run exactly once per call. These are efficient array-backed CPU controls, not a deliberately expensive graph of a million individual signals. The plain-JS control has the same arithmetic with no reactive scheduling. Ink JavaScript and compiled Wasm execute the same source/pipeline literally.','', '## Heavy-case averages','', 'Equal-weight geometric means of CPU/GPU median ratios across the two heavy workloads and the three measured sizes; these are fixture averages, not a universal application speedup.','']
for label in ['Svelte derived','Preact computed','Plain JS fused']:
 ratios=[d[k,n,label]/d[k,n,'Ink WebGPU'] for k in ['heavy512','feedback32'] for n in v['sizes']];g=math.exp(statistics.mean(map(math.log,ratios)));lines.append(f'- GPU versus {label}: **{g:.2f}×** geometric mean speedup.')
lines+=['', 'For comparison, giving all four workloads and all three sizes equal weight, including the cheap-case losses:','']
for label in ['Svelte derived','Preact computed','Plain JS fused']:
 ratios=[d[k,n,label]/d[k,n,'Ink WebGPU'] for k in kinds for n in v['sizes']];g=math.exp(statistics.mean(map(math.log,ratios)));lines.append(f'- GPU versus {label}: **{g:.2f}×** geometric mean ratio across all cases. Values below 1 favor the CPU control.')
lines+=['','## GPU transfer/dispatch receipts','', '| Workload | Elements | Upload bytes | Readback bytes | Dispatches | Peak live device bytes |','|---|---:|---:|---:|---:|---:|']
for kind in kinds:
 for n in v['sizes']:
  c=next(x['counters'] for x in v['receipts'] if (x['kind'],x['n'],x['label'])==(kind,n,'Ink WebGPU'));lines.append(f"| {kind} | {n:,} | {c.get('upload_bytes',0):,} | {c.get('readback_bytes',0):,} | {c.get('dispatches',0)} | {c.get('live_buffer_bytes',0):,} |")
lines+=['','## First use in fresh pages','', 'Three fresh pages per implementation/workload at 65,536 elements. Timings include application-module import, engine/model setup and the first complete request. Page creation/navigation and common input generation are outside timing. The same browser process and OS/driver caches remain shared: this is page/engine first use, not a clean-machine or uncached-driver measurement. Cold controls have separately bundled dependencies.','', '| Workload | Implementation | Median ms | Min ms | Max ms |','|---|---|---:|---:|---:|']
for kind in kinds:
 for label in labels:
  ms=[x['ms'] for x in v['cold'] if x['kind']==kind and x['label']==label];assert len(ms)==3;lines.append(f'| {kind} | {label} | {statistics.median(ms):.4f} | {min(ms):.4f} | {max(ms):.4f} |')
lines+=['','## All warm samples and ranges','', 'Seven alternating repetitions after two warmups. Cheap small cases are timed in batches of different preconstructed inputs (64 calls at 4,096 elements; 8 at 65,536) to avoid browser timer quantization. Small heavy cases use four calls per sample; large cases use one. Reported times are per complete call. Values and every measured result are consumed and checked outside the timer. No sample or loss is dropped.','', '| Workload | Elements | Implementation | Median ms | Min ms | Max ms | Calls per sample |','|---|---:|---|---:|---:|---:|---:|']
for s in summary:lines.append(f"| {s['kind']} | {s['n']:,} | {s['label']} | {s['medianMs']:.4f} | {s['minMs']:.4f} | {s['maxMs']:.4f} | {s['units']} |")
lines+=['','## Validation, provenance and limits','', 'The Python oracle validates 24 corner fixtures, including empty inputs, unsigned wrapping extremes, neighbor wraparound and lengths around workgroup boundaries, on all six implementations. The full source Wasm output is also compared with controls at every size; every timed output word is checked. Additional checks cover input nonmutation, old-output lifetime, detached later results, one derived evaluation per update and hardware GPU receipts. These are conformance tests, not a proof of drivers or generated code.','', 'This is one shared development machine. Concurrent work and process/driver caches can affect timings; raw distributions are retained. No DOM rendering, transaction/event publication, manual aggregate deltas, GPU-only timestamp timings, arbitrary floating-point programs or cross-device claims are included. GPU routing is explicitly requested; no adaptive profile or default policy is promoted. Large data with sparse edits can still favor incremental CPU algorithms.','', 'The initial affine-loop run is retained under `initial-affine-loop/`, including measured artifacts and raw samples. It predates batching and the data-dependent/coupled fixtures; tiny zero readings there are timer-resolution artifacts. It is not silently substituted for the final comparison.','', 'Exact source/emission/package hashes, code revisions, hardware/browser identity, GPU receipts, cold samples and warm samples are in `results.json`. `measured-artifacts.tar.gz` freezes the benchmark source and actual browser bundle (excluding dependencies and unused native build projects). Rebuild with the pinned npm lock and source checkout, or replay the archive.','', '```sh','cd bench/gpu-signals','npm ci','python3 prepare.py --zig /absolute/path/to/zig','npm run build','npm run smoke','npm run bench','npm run report','```','']
lines+=['The archive and every frozen source/emitted file, including WGSL, are bound by SHA-256 in `artifact-hashes.json`.','']
(OUT/'summary.json').write_text(json.dumps(summary,indent=2)+'\n');(OUT/'README.md').write_text('\n'.join(lines))
frozen={}
with tarfile.open(OUT/'measured-artifacts.tar.gz','w:gz') as t:
 for folder in ['bench/gpu-signals','build/gpu-signals']:
  for p in sorted((ROOT/folder).rglob('*')):
   if p.is_file() and not any(x in {'node_modules','native','__pycache__'} for x in p.relative_to(ROOT).parts):
    path=str(p.relative_to(ROOT));frozen[path]=hashlib.sha256(p.read_bytes()).hexdigest();t.add(p,arcname=path)
(OUT/'artifact-hashes.json').write_text(json.dumps({'files':frozen,'archiveSha256':hashlib.sha256((OUT/'measured-artifacts.tar.gz').read_bytes()).hexdigest()},indent=2)+'\n')
print('\n'.join(lines[:30]))
