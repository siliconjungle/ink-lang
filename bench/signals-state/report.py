import json,gzip,hashlib,subprocess
from pathlib import Path
r=Path(__file__).resolve().parents[2];out=r/'reports/signals-state-2026-10-12';v=json.loads((r/'bench/signals-state/results.json').read_text());assert v['baselineLoweringRevision']=='e9a45c390c3a6a9ffbfe756e2423d280f7a9f430'
(out/'modules').mkdir(exist_ok=True)
(out/'results.json').write_text(json.dumps(v,indent=2)+'\n')
modules=[]
for lane in ['before','after']:
 for name in ['aggregate','point','indexed']:
  b=(r/'build/signals-state'/lane/f'{name}.mjs').read_bytes();assert hashlib.sha256(b).hexdigest()==v['hashes'][f'../../build/signals-state/{lane}/{name}.mjs']
  packed=gzip.compress(b,mtime=0);(out/'modules'/f'{lane}-{name}.mjs.gz').write_bytes(packed)
  modules.append({'lane':lane,'program':name,'bytes':len(b),'gzipBytes':len(packed),'sha256':hashlib.sha256(b).hexdigest()})
model=(r/'bench/signals-state/models.mjs').read_bytes();(out/'modules/svelte-models.mjs.gz').write_bytes(gzip.compress(model,mtime=0))
(out/'module-manifest.json').write_text(json.dumps(modules,indent=2)+'\n')
def value(label,phase,n=4096):
 return next(x['medianNs']/1000 for x in v['summary'] if x['label']==label and x['phase']==phase and x['rows']==n)
lines=['# Dependency-tracked state execution — retained comparison','',
'Exploratory state-only Node comparison on '+v['hardware']+' ('+v['node']+', '+v['platform']+'/'+v['arch']+'). Seven alternating repetitions at 256, 4096 and 16384 rows. The machine was shared with concurrent work; raw samples and ranges are retained. These results do not establish a framework-wide or rendering advantage.','',
'Before uses the independently published JavaScript backend `'+v['baselineLoweringRevision']+'`; current uses `'+v['inkLoweringRevision']+'`. Both were emitted with the same checked core, source, and aggregate proof request. Baseline/current artifacts and SHA-256 hashes are retained. The earlier initial-distribution comparison is retained under `earlier-pinned-run/`; it predates upstream recursion improvements and the final owned-result copier.','',
'## 4096-row medians','',
'Units are microseconds per complete workload unit, not per individual read. Aggregate units contain a write and both sum/count reads; burst units contain 32 writes and both reads; unchanged units contain both reads. Point units contain one update and one point read. Aggregate boundaries use a common await, while point calls are synchronous.','',
'| Implementation | Write | Update + aggregates | Burst 32 + aggregates | Unchanged aggregates | Point update + read |',
'|---|---:|---:|---:|---:|---:|']
labels=['Ink before','Ink current','Ink current bound','Ink checked tree before','Ink checked tree current','Ink checked tree bound','Svelte deep derived','SvelteMap derived','Preact computed','Preact chunk64','Svelte manual delta','Preact manual delta']
for label in labels:
 columns=[]
 for phase in ['write-only','update-and-aggregate','burst32-and-aggregate','unchanged-read','point-update-and-read']:
  found=[x for x in v['summary'] if x['label']==label and x['phase']==phase and x['rows']==4096];columns.append(f"{found[0]['medianNs']/1000:.3f}" if found else '—')
 lines.append('| '+label+' | '+' | '.join(columns)+' |')
lines+=['','Connected observers are measured separately. These controls include reactive notification/effect scheduling; Ink measurements include transaction, version and event work but no UI subscription adapter.','', '| Connected control | Update + aggregates (µs) | Unchanged aggregates (µs) |','|---|---:|---:|']
for label in ['Svelte deep observed','SvelteMap observed','Preact computed observed','Preact chunk64 observed']:
 lines.append(f"| {label} | {value(label,'observed-update-and-aggregate'):.3f} | {value(label,'observed-unchanged-read'):.3f} |")
lines+=['','## Interpretation','',
 f"The normal checked-tree update/aggregate median changes from {value('Ink checked tree before','update-and-aggregate'):.3f} to {value('Ink checked tree current','update-and-aggregate'):.3f} µs ({value('Ink checked tree before','update-and-aggregate')/value('Ink checked tree current','update-and-aggregate'):.2f}×). Ordinary unchanged sum/count reads change from {value('Ink before','unchanged-read'):.3f} to {value('Ink current','unchanged-read'):.3f} µs ({value('Ink before','unchanged-read')/value('Ink current','unchanged-read'):.2f}×). These are workload medians on a shared host, not isolated causal estimates.", '',
'Normal before/current lanes retain the same public observation contract. Bound lanes are an explicit typed API: trusted scalar carriers and result-only replies avoid boundary work while preserving versions, rollback and committed outbox events. Signal controls do not implement the full Ink transaction/event/ownership contract. Manual deltas and connected chunk graphs are retained as strong controls rather than treating full scans as signals’ only possible algorithm.','',
'Ordinary Ink still scans after relevant row changes. Raw point signals can have lower overhead; manually maintained deltas can beat a general checked tree. This pass does not add per-key/field subscriptions, DOM scheduling, a proved automatic dynamic graph or universal superiority. Cold setup/compile/admission, complete lifecycle, durability, peak allocations and native/GPU speed are outside the timed loops.','',
'## Context reuse probe', '', 'The pre-local-context run is retained under `pre-local-context-run/`. Its ordinary changed-aggregate result prompted a separate synchronous probe: before 1508.4 µs, reused-context current 1641.2 µs, invocation-local current 1487.0 µs at 4096 rows (seven measured repetitions; shared host). This supported dropping context reuse. It is exploratory evidence, not an isolated causal proof. `context-probe.json` records original samples/hashes; `context-probe.mjs` replays archived source into an independent build directory.', '', '## All sizes and ranges','', '| Rows | Phase | Implementation | Median µs | Min µs | Max µs |','|---:|---|---|---:|---:|---:|']
for x in v['summary']:
 lines.append(f"| {x['rows']} | {x['phase']} | {x['label']} | {x['medianNs']/1000:.3f} | {x['minNs']/1000:.3f} | {x['maxNs']/1000:.3f} |")
lines+=['','## Emitted code size','', 'This pass trades additional direct-call code for steady-state execution. Parsing/startup cost is not measured. Gzip sizes use Python gzip with a fixed timestamp.','', '| Lane | Program | Bytes | Gzip bytes |','|---|---|---:|---:|']
for m in modules:lines.append(f"| {m['lane']} | {m['program']} | {m['bytes']} | {m['gzipBytes']} |")
lines+=['','## Validation and replay','',
'Raw samples, history assertions, counters, setup observations, exact npm versions and source hashes are in `results.json`. `validation.json` records focused regressions, cross-target conformance, the integration rollback regression and mathematical admission. The new law closure, six new state tests, JavaScript package suite, focused store tests and configured cross-target histories passed. Broad historical knowledge discovery had 61 errors (297 tests, 135 skips), including unavailable archive fixtures, legacy compiler paths and historical module imports; it is not claimed to pass.','',
'From the distribution checkout:','', '```sh','cd bench/signals-state','npm ci','npm run prepare:frozen','npm run build','npm run bench','```','',
'`prepare:frozen` verifies and inflates the exact retained modules. `prepare:source` instead rebuilds the pinned baseline backend and current backend with the same current core/source/request. Neither mode needs the historical research repositories or a published frozen demo. Rebuilding after code changes produces new artifacts and measurements. See `bench/signals-state/README.md` and `docs/signals-state-performance.md` for API, proof and semantic scope.','']
(out/'README.md').write_text('\n'.join(lines))
print('\n'.join(lines[18:40]))
