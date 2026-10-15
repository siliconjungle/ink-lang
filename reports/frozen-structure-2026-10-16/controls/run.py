#!/usr/bin/env python3
"""Record explicit frozen structure specialization; observations are not admission."""
import hashlib
import json
from pathlib import Path
import platform
import statistics
import subprocess
import sys
import time
import shutil

ROOT = Path(__file__).resolve().parents[2]
report = Path(sys.argv[1]).resolve()
report.mkdir(parents=True, exist_ok=True)
ink = ROOT/'target/debug/ink'
source = ROOT/'examples/adaptive-structure.ink'
trace = ROOT/'examples/adaptive-structure-training.json'
builds = {}
for name in ('baseline', 'selected'):
    destination = report/name
    command = [str(ink), 'build-model', str(source), str(trace), '--freeze-roots', 'Choice',
               '--target', 'javascript', '-o', str(destination)]
    if name == 'selected':
        command += ['--specialize-frozen']
    start = time.perf_counter()
    result = subprocess.run(command, cwd=ROOT, capture_output=True, check=True)
    builds[name] = dict(elapsed_ms=(time.perf_counter()-start)*1000,
                        receipt=json.loads(result.stdout))
    (report/(name+'-build.log')).write_bytes(result.stdout+result.stderr)
    subprocess.run([ink, 'verify-model', destination, '--replay'], cwd=ROOT, capture_output=True, check=True)
(report/'builds.json').write_text(json.dumps(builds, indent=2)+'\n')
raw = []
for index in range(5):
    result = subprocess.run(['node', ROOT/'bench/frozen-structure/sample.mjs',
                             report/'baseline', report/'selected', str(index)],
                            cwd=ROOT, capture_output=True, check=True)
    raw.append(json.loads(result.stdout))
(report/'raw.json').write_text(json.dumps(raw, indent=2)+'\n')
summary = []
for rows in (0, 32, 1024):
    values = {}
    for name in ('baseline', 'selected'):
        # Median per fresh process, then median across processes.
        medians = [statistics.median(s['elapsed_ms']*1000/s['iterations'] for s in process['samples']
                                    if s['rows'] == rows and s['plan'] == name) for process in raw]
        values[name] = dict(process_medians_us=medians, median_us=statistics.median(medians))
    summary.append(dict(rows=rows, **values, ratio=values['baseline']['median_us']/values['selected']['median_us']))
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
size = {}
for name in ('baseline', 'selected'):
    manifest = json.loads((report/name/'artifact.json').read_bytes())
    size[name] = dict(generated_source_bytes=(report/name/'program.mjs.source.mjs').stat().st_size,
                      inventoried_artifact_bytes=sum(v['bytes'] for v in manifest['files'].values()))
result = dict(schema=1, host=platform.platform(), processor=platform.machine(),
              implementation_revision=subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip(),
              source_checkout_dirty=bool(subprocess.check_output(['git','status','--porcelain'],cwd=ROOT).strip()),
              compiler_sha256=sha(ink), source_sha256=sha(source), trace_sha256=sha(trace),
              scripts={str(p.relative_to(ROOT)): sha(p) for p in [Path(__file__).resolve(), ROOT/'bench/frozen-structure/sample.mjs']},
              builds=builds, sizes=size, serving=summary,
              scope='One explicit author-selected structural specialization on one host; source/proof/compiled conformance are separate from these timings. No automatic profitability admission, memory ranking or broad neural-network speed claim.')
(report/'summary.json').write_text(json.dumps(result, indent=2)+'\n')
for name, original in [('source.ink',source),('trace.json',trace)]:
    shutil.copyfile(original,report/name)
(report/'controls').mkdir(exist_ok=True)
for name in ('run.py','sample.mjs'):
    shutil.copyfile(ROOT/'bench/frozen-structure'/name,report/'controls'/name)
print(json.dumps(result))
