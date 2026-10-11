"""Render batch38 from checked publication and independently audited measurements."""
from pathlib import Path
import json, subprocess
R=Path(__file__).resolve().parent; B=R.parents[1]; P=R/'targets'
def read(p): return json.loads(Path(p).read_text())
a=read(R/'analysis.json'); v=read(R/'verification.json'); point=read(R/'point-losses.json')
prior=[x for x in a['aggregates'] if x['reference'].startswith('prior')]
strong=[x for x in a['aggregates'] if x['reference'].startswith(('expert','rust'))]
wins=sum(x['wins'] for x in prior); losses=sum(x['losses'] for x in prior); uncertain=sum(x['inconclusive'] for x in prior)
def table(rows):
    return '\n'.join(f"| {x['host']} | {x['boundary']} | {x.get('cohort',x['reference'])} | {x['geomean']:.3f}× | {x['wins']} / {x['losses']} / {x['inconclusive']} |" for x in rows)
gpu=[x for x in read(P/'browser-results.json')['samples'] if 'gpu_requested' in x['variant']]
calls=sum(x['actual_backend_counts'].get('gpu',0) for x in gpu)
assert all(x['actual_backend_counts']=={'gpu':x['iterations']} for x in gpu)
for task in read(P/'spec.json')['tasks']:
    for version in ['literal','prior','checked']:
        m=read(P/'targets'/task['name']/version/'manifest.json')
        fn=next(f for f in m['functions'] if f['name']==task['name'])
        if version=='checked': assert not fn['graph_required'] and fn['shader']
        else: assert fn['graph_required'] and len(fn['graph']['nodes'])==4
for x in gpu:
    assert x['contract']['dispatches']==(1 if x['variant'].startswith('checked') else 4)
knowledge=subprocess.check_output(['git','rev-parse','HEAD'],cwd=B/'knowledge',text=True).strip()
report=f'''# Batch38: padded observed indexed-zip fusion

Six general integer endpoints fuse two observed indexed maps and a zip when both maps read exactly the same original list and an arbitrary suffix is appended to one side. Six Nat-beta supports establish the endpoints; four source certificates deploy them through plain or composed helpers:

```ink
xs.map_indexed(f).zip(xs.map_indexed(g).concat(ys), h)
// checked equivalent:
xs.map_indexed(fn(i)=>fn(x)=>h(f(i,x),g(i,x)))
```

The symmetric law puts the suffix on the left. Both mapper values remain observed, and h receives f's result on the left and g's result on the right. The result always has length(xs), preserving its order. The suffix's elements and length cannot affect that prefix. The law requires the exact same original xs, synchronized indices and appended padding; a different origin or a prepended suffix would be wrong. These are compile-time structural application conditions, with no caller validation machinery.

Arbitrary pure total f/g/h preserve their exact scalar grouping. This does not reassociate arithmetic or authorize effectful callback interleaving. Generic endpoints cover U32/I32/U64. Their induction generalizes over arbitrary Nat starting indices; callbacks receive wrapping U32 indices, including crossings of 2^32. No F32 or Bool endpoint is published. The existing induction/normalization/congruence/Use kernel checks the closure. Compiler, runtime, lowering and cost-policy sources remain unchanged: all 122 production hashes match the baseline and the same frozen compiler checks both catalogues.

## Proof and application evidence

The pinned prior has 2,534 entries and 1,728 semantic endpoint pairs. A full forward/reverse consistent-alpha comparison finds no duplicate for the twelve new generic objects. This establishes endpoint novelty, not nonderivability from older laws. Earlier padded laws have specific paired arithmetic/postmap shapes; earlier indexed-zip laws have no arbitrary appended suffix. Scout plain-map alternatives are outside the published scope.

The dependency-closed extension has sixteen fresh objects: six public endpoints, six Nat-beta supports and four exact-helper-bound U32 certificates. There are no shared-old objects or dependencies on older mathematical laws. The [independent proof/staging audit](review/proof-staging-review.json) verifies identities, dependency closure, endpoints and exact reachable direct/transitive helper definitions.

Six focused tests pass: 60 complete source/interpreter frames, 42 typed arbitrary-offset checks, four same-origin/appended-suffix non-specializations, three correctly rehashed false extent/offset/operand-order theorem rejections and eighteen helper mutation rejections. The existing Store/publisher suite adds nineteen passes, for **25 unique focused tests**. Finite backend checks complement admitted proofs; machine-code/runtime correspondence remains a trusted implementation boundary.

Four U32 source contexts cover left/right padding and plain/composed scalar helpers. Both mapped results and their combining helper are retained. Names containing `heldout` denote composition probes, not independent statistical holdouts. Exact helper definitions are bound by content hash; these certificates deploy four contexts rather than solving every generic helper substitution.

Ordinary search over the full prior leaves all four source bodies unchanged. The checked full union selects fresh certificates under the same automatic structural search, cost model and kernel admission. No isolated candidate catalogue, source whitelist, forced rewrite or modified profitability policy is used. The [preparation evidence](benchmark-preparation) preserves commands and target bindings.

## Benchmark boundaries and actual GPU work

Four recipes, three sizes (32/4,096/65,536) and two joint word/shape regimes give 24 timed cells. Small-word inputs use ys=nx+7; full-width inputs use ys=floor(nx/3)+1. Shape/value factors are not independently crossed. All 96 correctness frames retain full vectors, nonmutation and ownership checks, including empty/one-empty lists, arbitrary suffix values, zero divisors and word boundaries.

Strong handwritten JS/Rust controls compute f(i,x), g(i,x) and h(f,g) once per xs element in one loop. They do not construct the unused suffix. Every variant retains the declared public inputs, including ys ingress in captured-input boundaries. Captured owned JS/full Wasm outputs, resident borrowed Wasm destinations and native resident/copied-input destinations are distinct cohorts with matching ownership within each cohort. Native Ink is generated C built with clang -O3 against handwritten Rust -O3, not an Ink Rust-lowering benchmark.

Every web timed call reads every returned word using length plus a weighted U32 checksum; this common consumption cost is included equally. Independent audits reconstruct checksums times iterations modulo 2^32 and consumed element counts in calibration and samples. Native retains its separate complete-vector U64 checksum protocol. Host/ownership boundaries and checksum protocols are not pooled into a language ranking.

All eight literal/prior named primary GPU routes execute four-stage graphs: two indexed maps, concat and zip. All four checked primaries execute a single legacy indexed-map shader. In nonempty timed cells, physical dispatches drop **4→1**. Upload changes from 4*(nx+ny+4) to 4*(nx+ny+9), an increase of twenty bytes; readback stays 4*(nx+1). Logical node counts are not substituted for physical counters. Empty and one-empty contracts are checked separately. Device live-buffer bytes are separate from unmeasured CPU/GPU-driver heap peaks; observation peak_bytes is null.

The timed cohort contains {len(gpu)} GPU rows, {calls:,} actual device calls and zero fallback calls. [Independent target preflight](review/target-preflight-review.json) and [performance replay](review/final-performance-review.json) authenticate active named routes, capacities, dispatch/upload/readback and live-buffer contracts.

## Results against prior Ink

After the [pre-timing freeze](timing-freeze.json), workers remain idle during serial native, Node and browser runs. **7,560 samples** cover 840 groups: 1,728 native, 2,592 Node and 3,240 browser. [Analysis](analysis.json) retains all 672 paired comparisons, 28 aggregates and 112 recipe strata. Nine paired log ratios per cell feed 4,000 seeded bootstrap draws. Nominal per-cell 95% percentile intervals classify faster/slower/uncertain results; geometric means are descriptive, without multiplicity correction or universal profitability guarantees.

Ratios are reference time / checked time; above one favors checked Ink.

| Host | Boundary | Prior reference | Prior / checked | Faster / slower / uncertain |
|---|---|---|---:|---:|
{table(prior)}

Across 216 prior/current cells, {wins} favor checked, {losses} favor prior and {uncertain} are uncertain. All {losses} classified [regressions](regressions.json) and {point['count']} [point losses](point-losses.json), including uncertain losses, remain archived. The complete matrix is retained.

All twenty classified prior losses occur in composed-helper CPU cases. Composed resident-Wasm subgroups have descriptive geometric means below one on both hosts, while plain resident-Wasm subgroups improve. Full Wasm call gains are essentially unchanged overall. These observations do not identify a compiler or allocation cause through profiling; a smaller structural expression is not a universal speed guarantee.

| Host | Boundary | Recipe | Prior / checked | Faster / slower / uncertain |
|---|---|---|---:|---:|
{table([x for x in a['strata'] if x['reference'].startswith('prior') and x['boundary'] in ['captured-js-owned','resident-wasm-destination','resident-native-destination','instrumented-full-gpu-request']])}

## Strong controls and scope

| Host | Boundary | Strong reference | Reference / checked | Faster / slower / uncertain |
|---|---|---|---:|---:|
{table(strong)}

GPU-versus-CPU rows compare complete captured-input vector requests with the same public inputs/results and include backend-specific ingress/output acquisition. They do not compare isolated GPU arithmetic against a resident CPU kernel. All strong-control losses and uncertainty remain recorded.

In this matrix, checked Node JS beats its handwritten JS control in fifteen cells, loses one and is uncertain in eight (descriptive geometric mean about 1.07). Browser JS and native Rust controls generally remain faster; captured Rust-Wasm wins every cell. Despite the 4→1 dispatch saving, complete GPU requests lose to both captured CPU controls in every cell. These results establish improvements over prior Ink for this pattern, rather than broad superiority over native implementations.

This is one reusable same-origin padded indexed-zip family with six typed/oriented endpoints, measured on four U32 helper contexts on one Apple M2. It does not establish broad native superiority or arbitrary pipeline fusion. Correctness, structural application conditions and measured profitability remain distinct. The compiler selects DB proofs at compile time; no load/state-based optimizer or new target routing policy is installed.

## Reproduction and publication

Frozen compiler SHA256: `04f42856696cbc9a4d5b0523e4a2c5d9d84ae28e0e039f0fd9c305fe2d0a5536`. Replay to fresh evidence with `PYTHONPATH=knowledge:planner INK_PIPELINE38_PROOFS_DIR=/tmp/ink38-proofs python3 -m unittest knowledge.tests.test_web_pipeline38_laws -v`. Original catalogue pins permit replay after publication. [Benchmark instructions](../../bench/web-stack-proofs-38/README.md) distinguish preparation, untimed validation and serial measurement; old evidence is preserved.

The unchanged general publisher admits and publishes staged bytes. [Negative controls](publication-negative-controls.json) reject removal of old names or modified admission evidence before pointer mutation. [Publication](publication.json) records snapshot `{v['snapshot']}` with 2,550 entries and 4,297 discovery names. All previous 2,534 entries and 4,281 names survive. [Observations](observations.json) adds 840 groups for 26,780 files; all previous 25,940 files retain their exact bytes. Observations install no runtime or cost-model policy.

[Verification](verification.json) confirms preservation and unchanged production/compiler bindings. Six [post-publication tests](post-publication-tests.log) pass in fresh evidence, without overwriting the first run. Knowledge is committed directly to main at `{knowledge}`; distribution integrates that exact pin. [Final delivery review](review/final-delivery-review.json) checks the report and canonical state.
'''
(R/'REPORT.md').write_text(report)
css=(B/'reports/web-stack-proofs-37-2026-10-11/report.html').read_text().split('<style>',1)[1].split('</style>',1)[0]
def group(host,boundary): return next(x for x in prior if x['host']==host and x['boundary']==boundary)
items=[('Node JavaScript owned',group('node','captured-js-owned')),('Browser JavaScript owned',group('browser','captured-js-owned')),('Browser resident Wasm destination',group('browser','resident-wasm-destination')),('Native C resident destination',group('native','resident-native-destination')),('Complete WebGPU request',group('browser','instrumented-full-gpu-request'))]
rows=''.join(f"<tr><td>{label}</td><td>{x['geomean']:.3f}×</td><td>{x['wins']} / {x['losses']} / {x['inconclusive']}</td></tr>" for label,x in items)
html=f'''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Ink · padded indexed fusion</title><style>{css}</style><main><div class="eyebrow">INK KNOWLEDGE DB · BATCH 38 · 11 OCTOBER 2026</div><h1>Fuse paired indexed work. Skip the suffix.</h1><p class="intro">Six integer laws combine two observed maps and zip over the same input. Arbitrary appended padding disappears while both callback values, index and order remain.</p><div class="cards"><div class="card"><strong>6 + 4</strong><span>general endpoints + source certificates · 6 supports</span></div><div class="card"><strong>7,560</strong><span>samples · every output word consumed</span></div><div class="card"><strong>{wins} / {losses}</strong><span>prior wins / losses · {uncertain} uncertain</span></div><div class="card"><strong>4 → 1</strong><span>actual GPU dispatches per nonempty request · zero fallback</span></div></div><table><thead><tr><th>Boundary</th><th>Prior Ink time / checked time</th><th>Faster / slower / uncertain cells</th></tr></thead><tbody>{rows}</tbody></table><div class="note"><strong>One general law family, both padding orientations.</strong> Four U32 helper contexts on one Apple M2. Strong fused JS/Rust controls and every adverse cell are retained. Physical dispatches decrease; upload grows by 20 bytes and readback is unchanged.</div><p>Four recipes × three sizes × two joint value/shape regimes. Nine paired rounds. Compile-time DB selection; 25 focused tests; 122 production sources unchanged. These results do not establish broad native superiority.</p><footer><a href="REPORT.md">Full report</a> · <a href="verification.json">Canonical verification</a> · <a href="review/final-performance-review.json">Independent review</a> · <a href="analysis.json">Every comparison</a><br>2,550 entries · 4,297 names · 840 new observations</footer></main></html>'''
(R/'report.html').write_text(html)
print('Rendered report and padded indexed-fusion summary')
