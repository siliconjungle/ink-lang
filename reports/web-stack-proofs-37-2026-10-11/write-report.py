"""Render batch37 from admitted proofs, audited measurements and preservation checks."""
from pathlib import Path
import json, subprocess
R=Path(__file__).resolve().parent; B=R.parents[1]; P=R/'targets'
def read(p): return json.loads(Path(p).read_text())
a=read(R/'analysis.json'); v=read(R/'verification.json'); point=read(R/'point-losses.json')
prior=[x for x in a['aggregates'] if x['reference'].startswith('prior')]
strong=[x for x in a['aggregates'] if x['reference'].startswith(('expert','rust'))]
wins=sum(x['wins'] for x in prior); losses=sum(x['losses'] for x in prior); uncertain=sum(x['inconclusive'] for x in prior)
def table(rows, family=False):
    return '\n'.join(f"| {x['host']} | {x['boundary']} | {x.get('cohort',x['reference'])} | {x['geomean']:.3f}× | {x['wins']} / {x['losses']} / {x['inconclusive']} |" for x in rows)
gpu=[x for x in read(P/'browser-results.json')['samples'] if 'gpu_requested' in x['variant']]
calls=sum(x['actual_backend_counts'].get('gpu',0) for x in gpu)
assert all(x['actual_backend_counts']=={'gpu':x['iterations']} for x in gpu)
routes=[]
for task in read(P/'spec.json')['tasks']:
    for version in ['literal','prior','checked']:
        m=read(P/'targets'/task['name']/version/'manifest.json')
        fn=next(f for f in m['functions'] if f['name']==task['name'])
        assert fn['graph_required'] is False
        routes.append((task['name'],version,'legacy flat shader'))
knowledge=subprocess.check_output(['git','rev-parse','HEAD'],cwd=B/'knowledge',text=True).strip()
report=f'''# Batch37: independent indexed-map demand erasure

Six general integer endpoints remove an indexed map when a later zip callback never observes its values. Twelve checked Nat-offset/beta supports establish the endpoints, and four source certificates deploy them through plain or composed helpers. The original discarded list remains an input to zip, preserving the shorter-list result extent:

```ink
xs.map_indexed(fn(i)=>fn(x)=>discarded(i,x)).zip(ys,
    fn(unused)=>fn(y)=>keep(y))
// checked equivalent:
xs.zip(ys, fn(unused)=>fn(y)=>keep(y))
```

The symmetric law retains xs values when the indexed map is on ys. It preserves input order, every retained callback result, and min(length(xs),length(ys)); deleting the discarded receiver entirely would be wrong. Arbitrary pure total indexed callbacks can be removed. An observed discarded value, including a capture through a nested closure, prevents this specialization. The laws are total pure equalities, not effectful callback transformations.

The two orientations cover U32/I32/U64 element domains. General proof supports quantify arbitrary Nat starting indices; the index callback receives wrapping U32 indices, including crossing 2^32. No F32 endpoint or performance claim is included. Nested independent-list induction, normalization, congruence and checked dependency Use establish the laws with the existing kernel. No new rule, primitive semantics, syntax, compiler/runtime/backend source, cost-model policy or caller checks are introduced. All 122 production source hashes and the frozen compiler remain unchanged.

## Proof and application evidence

The pinned prior has 2,512 entries. Its 1,706 semantic endpoint pairs were compared with the new endpoints in both directions using consistent alpha-renaming. No duplicates were found; this is endpoint novelty, not a claim that no combination of older laws could derive these equalities. The new closed extension contains 22 fresh objects: six public endpoints, twelve proof supports and four content-bound U32 source certificates. It adds no shared old object or mathematical dependency.

Six focused tests pass: 60 complete source/interpreter output frames, 42 typed arbitrary-offset instances, four observed-callback non-specializations, two correctly rehashed false extent/order theorem rejections and twelve direct/transitive helper mutation rejections. Original catalogue pins permit replay after publication. Existing Store/publisher checks add 19 passes, for **25 focused tests**. The [independent proof/staging audit](review/proof-staging-review.json) verifies exact object identities, dependency closure, source endpoints and helper hashes. Finite backend checks supplement admitted proofs; runtime/machine-code correspondence remains a trusted implementation boundary.

Four U32 source cases cover left/right discarded indexed maps with either plain or composed scalar helpers. The source certificates bind all exact reachable direct/transitive definitions while preserving the selected helper calls. Names containing `heldout` denote composition probes, not statistical holdouts. These source certificates bind four contexts; they do not resolve every possible generic helper substitution.

Ordinary full-prior search leaves all four source cases unchanged, with no selected roots. The checked union makes the indexed erasure available using the same structural search, cost model, compiler and ordinary kernel admission. No isolated candidate catalogue, per-recipe whitelist or forced selection is used. [Preparation](benchmark-preparation) preserves the exact prior probe, strong controls, commands and target bindings.

## Benchmark boundaries and physical GPU work

There are four recipes, three sizes (32/4,096/65,536) and two joint word/shape regimes: small values with ys=nx+7 and full-width values with ys=floor(nx/3)+1. This exercises both shorter and longer discarded streams across the two orientations. Shape and value are joint factors, not independently crossed factors. Fixtures include empty/one-empty/unequal lists, zero divisors, word boundaries and branch outcomes.

The strong handwritten JS/Rust controls directly compute the selected min-prefix projection in one loop. They never run the discarded indexed callback. Captured owned JS/full Wasm outputs, resident borrowed Wasm destinations, native resident/copied-input destinations, and complete GPU requests remain separate cohorts with matching input/output ownership within each cohort. Native Ink variants compile generated C with clang -O3; the handwritten native control uses Rust -O3. This is not an Ink Rust-lowering benchmark. All variants retain the same public inputs, including the discarded list's length and the declared capture/ingress boundary.

Web timing now consumes **every output word** using length plus a weighted U32 checksum inside the timer, identically across variants. Journals record consumed element counts per call and batch; independent audits reconstruct the expected checksum times iterations modulo 2^32. Separate complete-vector checks verify correctness, nonmutation and owned/borrowed lifetimes outside timing. Native uses its archived complete-vector U64 consumption protocol; native/web checksums and host boundaries are not pooled. The common consumption work is included in reported call costs.

All twelve named primary GPU routes use legacy flat shaders (`graph_required=false`). Inactive graph descriptors lose a map_indexed node, but those descriptors do not execute in these calls. Actual dispatches, max-input extent, upload and readback contracts remain unchanged. A GPU compiler may remove unused arithmetic from prior shaders; that is a possible explanation, not a measured profiling result. GPU speed claims therefore rely on complete requests and actual counters, not logical node counts. Device live-buffer accounting does not measure CPU or GPU-driver heap peaks; observation peak_bytes is null.

The timed cohort has {len(gpu)} GPU rows, {calls:,} actual device calls and zero fallback calls. [Independent target preflight](review/target-preflight-review.json) and [performance replay](review/final-performance-review.json) verify named routes, capacities, dispatches, upload/readback and live-buffer contracts.

## Results against prior Ink

After a [pre-timing freeze](timing-freeze.json), workers remain idle during serial native, Node and browser runs. **7,560 samples** cover 840 groups: 1,728 native, 2,592 Node and 3,240 browser. [Analysis](analysis.json) retains all 672 paired comparisons, 28 aggregates and 112 recipe strata. Nine paired log ratios per cell feed 4,000 deterministically seeded bootstrap draws. Per-cell nominal 95% percentile intervals classify faster/slower/uncertain results; geometric means are descriptive. There is no multiplicity correction or universal profitability guarantee.

Ratios are reference time / checked time; above one favors checked Ink.

| Host | Boundary | Prior reference | Prior / checked | Faster / slower / uncertain |
|---|---|---|---:|---:|
{table(prior)}

Across 216 prior/current cells, {wins} favor checked, {losses} favor prior and {uncertain} are uncertain. All {losses} classified [regressions](regressions.json) and {point['count']} [point losses](point-losses.json), including uncertain losses, remain archived. No favorable subset replaces the full matrix.

| Host | Boundary | Recipe | Prior / checked | Faster / slower / uncertain |
|---|---|---|---:|---:|
{table([x for x in a['strata'] if x['reference'].startswith('prior') and x['boundary'] in ['captured-js-owned','instrumented-full-gpu-request']],True)}

## Strong controls and scope

| Host | Boundary | Strong reference | Reference / checked | Faster / slower / uncertain |
|---|---|---|---:|---:|
{table(strong)}

GPU-versus-CPU rows compare complete captured-input vector requests sharing public inputs/results and include backend-specific ingress and output acquisition. They do not compare GPU arithmetic alone with a resident CPU kernel. All strong-control losses and uncertainty are retained in the independent review.

Native C is close to the native Rust control in these cases (reference/checked geometric means about 0.97 resident and 1.00 copied-input), while captured Rust-Wasm remains substantially faster. Full Wasm call gains are small; GPU is essentially unchanged. These observations include common ingress/consumption costs and do not identify a cause through profiling.

This is one general demand-erasure family with six typed/oriented endpoints, measured on four concrete U32 helper contexts on one Apple M2. It is not broad native superiority, arbitrary pipeline fusion, runtime adaptation or unconditional GPU improvement. Correctness, application conditions and empirical profitability remain separate. These are compile-time DB selections; no load/state-based optimizer or target-routing policy was installed.

## Reproduction and publication

The frozen compiler SHA256 is `04f42856696cbc9a4d5b0523e4a2c5d9d84ae28e0e039f0fd9c305fe2d0a5536`. Replay proofs into a fresh directory with `PYTHONPATH=knowledge:planner INK_PIPELINE37_PROOFS_DIR=/tmp/ink37-proofs python3 -m unittest knowledge.tests.test_web_pipeline37_laws -v`. Exact views and commands are archived. [Benchmark instructions](../../bench/web-stack-proofs-37/README.md) separate preparation, untimed validation and serial measurement. Use fresh directories to preserve old evidence.

The unchanged general publisher `knowledge/producers/publish_web_pipeline33.py` admits and publishes only staged bytes. [Negative publication controls](publication-negative-controls.json) reject old-name removal or modified admission evidence before pointer mutation. [Publication](publication.json) records snapshot `{v['snapshot']}` with 2,534 entries and 4,281 discovery names. All 2,512 previous entries and 4,259 names survive. [Observations](observations.json) adds 840 empirical groups, totaling 25,940 files; all 25,100 prior files retain their exact bytes. Observations do not change runtime or cost-model policy.

[Verification](verification.json) confirms preservation and unchanged compiler/production bindings. Six [post-publication tests](post-publication-tests.log) pass without overwriting initial evidence. Knowledge is committed directly to main at `{knowledge}`; distribution integrates that exact pin. [Final delivery review](review/final-delivery-review.json) audits the report and canonical state.
'''
(R/'REPORT.md').write_text(report)
css=(B/'reports/web-stack-proofs-36-2026-10-11/report.html').read_text().split('<style>',1)[1].split('</style>',1)[0]
def group(host,boundary): return next(x for x in prior if x['host']==host and x['boundary']==boundary)
items=[('Node JavaScript owned',group('node','captured-js-owned')),('Browser JavaScript owned',group('browser','captured-js-owned')),('Browser resident Wasm destination',group('browser','resident-wasm-destination')),('Native C resident destination',group('native','resident-native-destination')),('Complete WebGPU request',group('browser','instrumented-full-gpu-request'))]
rows=''.join(f"<tr><td>{label}</td><td>{x['geomean']:.3f}×</td><td>{x['wins']} / {x['losses']} / {x['inconclusive']}</td></tr>" for label,x in items)
html=f'''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Ink · indexed demand erasure</title><style>{css}</style><main><div class="eyebrow">INK KNOWLEDGE DB · BATCH 37 · 11 OCTOBER 2026</div><h1>Skip indexed work whose values are unused.</h1><p class="intro">Six integer laws remove a discarded indexed map before zip. Four helper-bound deployments preserve input order and the shorter-list extent.</p><div class="cards"><div class="card"><strong>6 + 4</strong><span>general endpoints + source certificates · 12 supports</span></div><div class="card"><strong>7,560</strong><span>samples · every output word consumed</span></div><div class="card"><strong>{wins} / {losses}</strong><span>prior wins / losses · {uncertain} uncertain</span></div><div class="card"><strong>0</strong><span>GPU fallbacks · physical dispatches unchanged</span></div></div><table><thead><tr><th>Boundary</th><th>Prior Ink time / checked time</th><th>Faster / slower / uncertain cells</th></tr></thead><tbody>{rows}</tbody></table><div class="note"><strong>Demand erasure across integer types and both orientations.</strong> One optimization family on four U32 helper contexts. Strong fused JS/Rust controls and every adverse cell are retained. Logical graph simplification does not establish reduced physical GPU work or general native superiority.</div><p>Four recipes × three sizes × two joint value/shape regimes, one Apple M2. Nine paired rounds. Compile-time DB selection; 25 focused tests; no new compiler/runtime or caller checks.</p><footer><a href="REPORT.md">Full report</a> · <a href="verification.json">Canonical verification</a> · <a href="review/final-performance-review.json">Independent review</a> · <a href="analysis.json">Every comparison</a><br>2,534 entries · 4,281 names · 840 new observations · 122 production sources unchanged</footer></main></html>'''
(R/'report.html').write_text(html)
print('Rendered report and indexed-demand summary')
