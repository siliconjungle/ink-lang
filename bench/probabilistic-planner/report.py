#!/usr/bin/env python3
"""Summarise retained raw observations and freeze measured source/emissions."""
import hashlib,json,statistics,subprocess,tarfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'reports/probabilistic-planner-2026-10-12';BUILD=ROOT/'build/probabilistic-planner'
def read(name):return json.loads((OUT/name).read_text())
def median(rows,key='ns'):return statistics.median(r[key] for r in rows)
def table(headers,rows):return '\n'.join(['| '+' | '.join(headers)+' |','| '+' | '.join(['---']*len(headers))+' |',*['| '+' | '.join(map(str,r))+' |' for r in rows]])
g=read('gpu.json');p=read('planning.json');ann=read('neighbourhood.json');large=read('neighbourhood-large.json');adaptive=read('adaptive.json');tuning=read('autotune.json')
lines=['# Probabilistic planning and exact-result accelerators — 2026-10-12','',
'Learned search ranking and its trainer have been removed. Recorded learned-model samples below, when present, describe historical revisions; current commands omit that strategy.','',
'All new machinery is opt-in. Proposals, embeddings and measurements have no proof authority. The independent compiler checks source-bound selections. No automatic runtime profile is installed and no online profitability probes are added.','',
'Apple M2, Chrome '+g['browser']+', hardware Apple/Metal WebGPU; Python 3.12.3, Node 26.1.0, Zig 0.15.2. Shared-host observations are exploratory. Raw samples, losses, setup and source/emission identities are retained.','',
'## Complete planning cost','',
'Seven alternating repetitions; a heldout 17-term word expression plus a constant, trained on a separate 13-term source. Every output package was individually checked. The 64-candidate-proof budget excludes unchanged admission and final replay. The pinned base catalogue has 42 objects; typed discovery loads 18 law objects, and ordinary producers also propose derived laws. Structural selected cost is not execution speed.','']
historical_learned=any(r['label']=='learned' for r in p['samples'])
if not historical_learned:
    lines=[line.replace(', trained on a separate 13-term source', '') for line in lines]
rows=[]
for label in ['baseline','stochastic','learned','parallel','accelerated-discovery','hnsw']:
    if not any(r['label']==label for r in p['samples']):continue
    rs=[r for r in p['samples'] if r['label']==label]
    rows.append([label,f'{median(rs)/1e6:.2f}',f'{min(r["ns"] for r in rs)/1e6:.2f}–{max(r["ns"] for r in rs)/1e6:.2f}',','.join(map(str,sorted({r['selected_cost'] for r in rs})))])
lines += [table(['Approach','Median ms','Range ms','Selected cost'],rows),'',
'Initial cost was 79; every approach selected 77. Learned ranking and two-worker search lose on this fixture. HNSW adds work at this catalogue size. Stochastic search has a lower overall median but inconsistent training timings; the adaptive holdout policy consequently retains ordinary search. Earlier acceptance-only ranking and a run overlapping validation remain under `initial-planning`, excluded from final tables.' if historical_learned else 'Current source has no learned search ranking model. Complete planning times and selected structural costs are reported above; costs are search estimates rather than runtime measurements.','',
'## Adaptive search','',
'The wrapper matches saved observations to catalogue size, source-node count, budgets, exact source/catalogue pins, target, Python and compiler/planner/producer identity. Unobserved sizes and stale contexts fall back. A candidate needs >10% training and every heldout complete-call gain, with equal or better checked structural cost. Existing child timings charge per-call index construction. Wrapper overhead is separately measured.','',
table(['Complete wrapper call','Median ms','Chosen strategy'],[[label,f'{median([r for r in adaptive["samples"] if r["label"]==label])/1e6:.2f}',','.join(sorted({r['decision']['strategy'] for r in adaptive['samples'] if r['label']==label}))] for label in ['ordinary','adaptive']]),'',
'Fourteen calls use new seeds 831..837; all packages rechecked and all budgets respected. The current saved evidence selects baseline. This demonstrates fallback, not an adaptive speed win. Unit checks also exercise different observed catalogue sizes selecting different approaches and rejecting quality loss.','',
'## Compiled Ink kernels','',
'Complete captured input and owned result timings include row-ID creation, upload, dispatch, synchronization and readback. Input generation and independent output validation are outside timing. Two warmups precede seven alternating repetitions. Plain JS is a direct imperative control. The kernels are fixed-point word scoring and a bounded 256-instruction one-register candidate evaluator; Python still coordinates search and the proof checker remains independent.','']
rows=[]
for kind in ['score','evaluate']:
    for n in g['sizes']:
        rows.append([kind,n,*[f'{median([r for r in g["samples"] if r["kind"]==kind and r["n"]==n and r["label"]==label],"ms"):.4f}' for label in ['Ink GPU','Ink Wasm','Ink JavaScript','Plain JS']]])
lines += [table(['Kernel','Rows','GPU ms','Wasm ms','Ink JS ms','Plain JS ms'],rows),'',
'At one million rows, GPU candidate evaluation is about 5.7× faster than Plain JS and 7.1× faster than Wasm; cheap scoring loses to CPU. These are kernel results, not complete planning or transactional-update gains. The loopback bridge has three separately retained whole-planner probes in `bridge.json` (about 864–1177 ms), with no paired speed claim.','',
'First-use measurements create fresh engines in one page with shared module/browser/driver caches. At 65536 rows, median GPU score/evaluate first use is 13.0/10.8 ms, but the first GPU score call took 804.8 ms. All 24 first-use samples are retained; these are not cold-machine measurements.','',
'## Does synthesis improve deployed software?','',
'A stochastic/affine proposal replaced thirteen additions with multiplication by thirteen, after a universal ordinary word-ring proof. Small calls are batched 64/8/1 times at the three sizes to avoid zero timer samples. Both versions run through the same generated host boundary.','']
rows=[]
for n in g['sizes']:
    for backend in ['javascript','cpu']:
        before=median([r for r in g['deployed'] if r['n']==n and r['backend']==backend and r['version']=='before'],'ms')
        after=median([r for r in g['deployed'] if r['n']==n and r['backend']==backend and r['version']=='after'],'ms')
        rows.append([n,backend,f'{before:.6f}',f'{after:.6f}',f'{before/after:.3f}×'])
lines += [table(['Rows','Backend','Before ms','After ms','Before/after'],rows),'',
'The JavaScript fixture improves; the Wasm fixture does not. This narrow word example does not demonstrate general synthesis benefits. The first unbatched deployment run had insufficient timer resolution and remains under `initial-unbatched`.','',
'## Exact discovery and learned positions','',
'Mixed typed, impossible-operation and paged queries are compared against canonical SQLite results, with 192 queries per repetition. Canonical publication/SQLite construction is a common prerequisite; accelerator setup is additional and is never reduced by subtracting that common cost.','']
rows=[]
for n in [2048,8192]:
    rs=[r for r in p['database'] if r['n']==n];base=median([r for r in rs if r['label']=='sqlite']);fast=median([r for r in rs if r['label']=='accelerated'])
    setup=next(r['setup_ns'] for r in rs if r['label']=='accelerated');common=next(r['setup_ns'] for r in rs if r['label']=='sqlite')
    rows.append([n,f'{base/1000:.2f}',f'{fast/1000:.2f}',f'{base/fast:.2f}×',f'{setup/1e6:.2f}',f'{common/1e6:.2f}',f'{setup/(base-fast):.0f}'])
lines += [table(['Entries','SQLite µs/query','Accelerated µs/query','Warm gain','Extra setup ms','Common publish/SQL ms','Setup break-even queries'],rows),'',
'Warm discovery is about 10× faster, with substantial canonical authentication/setup costs. The Bloom/exact bucket index supplies most benefit here. The isolated learned integer lower bound loses to C bisect: about 0.89–0.95 µs versus 0.15–0.20 µs, despite exact results and guarded fallback. It remains optional.','',
'## HNSW scaling and recall','',
'These are synthetic independent normalized 64-number vectors, not learned semantic law embeddings. Exact scans include top-k partition. HNSW uses M=16, construction effort=100, seed=173 and one CPU thread. Each row summarizes seven passes of 128 queries. The actual Ink hint path uses a deterministic 64-dimensional structural sketch of typed operation counts, node count and depth; full exact candidate enumeration and proof checking remain.','']
rows=[]
for dataset in [ann,large]:
    for n in sorted({r['n'] for r in dataset['samples']}):
        rs=[r for r in dataset['samples'] if r['n']==n];base=median([r for r in rs if r['label']=='exact'])
        for label in sorted({r['label'] for r in rs if r['label']!='exact'}):
            subset=[r for r in rs if r['label']==label];first=subset[0]
            rows.append([n,label,f'{median(subset)/1000:.2f}',f'{base/median(subset):.2f}×',f'{first["recall_at_16"]*100:.2f}%',f'{first["setup_ns"]/1e3/1000:.2f}',f'{first["index_bytes"]/1e6:.2f}'])
lines += [table(['Vectors','Query effort','µs/query','Gain vs exact','Recall@16','Graph build ms','Saved index MB'],rows),'',
'Scaling can help retrieval, but fast low-recall settings miss promising options. Graph construction and memory must be amortized; nearest structural shapes do not establish applicability or equivalence. No million-vector or complete-large-catalogue planner speed claim is made. [HNSW paper](https://arxiv.org/abs/1603.09320), [library parameters](https://github.com/nmslib/hnswlib/blob/master/ALGO_PARAMS.md).','',
'## Offline tuning and verification','',
'The tuner replays measured alternatives using rounds 0..3 for training and 4..6 for holdout. It charges an explicitly derived first-use estimate from the 65536-row shared-page runs to all sizes, at 256 expected calls. Three evaluator cohorts pass the offline GPU gate; all scoring cohorts retain JavaScript. Receipts remain untrusted profitability evidence and install no target profile. This small three-alternative experiment exercises admission gates; it does not demonstrate Bayesian search efficiency in a large configuration space.','',
'Validation: 70 planner unit tests; 19 store tests plus 4 exact-accelerator/artifact tests; actual compiler synthesis and source-bound proof replay; authenticated false theorem rejected; independent worker total budget and final replay; unavailable loopback scorer retains a checked result. GPU has 168 warm samples, 48 corner comparisons, 24 first-use samples and 84 before/after deployment samples. Every timed word is checked, and nonempty GPU work requires actual hardware dispatch/readback without fallback. Existing historical knowledge failures from the earlier state work remain documented; no full historical-suite pass is claimed.','',
'`artifact-hashes.json` authenticates frozen source, models, canonical stores, packages and emitted browser/Wasm/WGSL modules. `measured-artifacts.tar.gz` excludes dependencies, caches and unused native projects. `validation.json` records verification, compiler identity and exact child revisions. Conformance is not a backend proof.','',
'Reproduction: [commands](../../bench/probabilistic-planner/README.md), [architecture and trust](../../docs/probabilistic-planning.md). Raw data: `planning.json`, `adaptive.json`, `gpu.json`, `autotune.json`, `neighbourhood.json`, `neighbourhood-large.json`, `bridge.json`. The separate Svelte/Preact GPU comparison remains in the sibling GPU report.','']
(OUT/'README.md').write_text('\n'.join(lines))
files=[]
for folder in [ROOT/'bench/probabilistic-planner',ROOT/'planner/ink_planner',ROOT/'knowledge/ink_knowledge',ROOT/'knowledge/producers',BUILD]:
    for path in folder.rglob('*'):
        if not path.is_file() or any(part in {'node_modules','__pycache__','native','ann-env','install'} for part in path.parts):continue
        if path.suffix not in {'.py','.ink','.mjs','.json','.wasm','.wgsl','.c','.gz','.md','.log'}:continue
        files.append(path)
files += [ROOT/'planner/pyproject.toml',ROOT/'knowledge/pyproject.toml',ROOT/'tests/probabilistic_planner_integration.py',ROOT/'docs/probabilistic-planning.md']
files=sorted(set(files));hashes={str(f.relative_to(ROOT)):hashlib.sha256(f.read_bytes()).hexdigest() for f in files}
archive=OUT/'measured-artifacts.tar.gz'
with tarfile.open(archive,'w:gz') as out:
    for path in files:out.add(path,arcname=str(path.relative_to(ROOT)),recursive=False)
with tarfile.open(archive) as frozen:
    members=[m for m in frozen if m.isfile()]
    assert len(members)==len(hashes)
    for member in members:assert hashlib.sha256(frozen.extractfile(member).read()).hexdigest()==hashes[member.name],member.name
for name,sha in g['hashes'].items():assert hashes[name]==sha,name
manifest=dict(schema=1,archive=archive.name,archive_sha256=hashlib.sha256(archive.read_bytes()).hexdigest(),files=hashes)
(OUT/'artifact-hashes.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps(dict(status='verified',files=len(hashes),archive_bytes=archive.stat().st_size,archive_sha256=manifest['archive_sha256'])))
