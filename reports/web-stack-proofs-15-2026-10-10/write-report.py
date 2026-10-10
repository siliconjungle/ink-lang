"""Write measured round15 scope and all outcomes from authenticated receipts."""
import collections,json,hashlib
from pathlib import Path
P=Path(__file__).resolve().parent;ROOT=P.parents[1];C=P.with_name('web-stack-proofs-15-gpu-confirmation-2026-10-10')
read=lambda p:json.loads(p.read_text())
pub=read(P/'publication.json');m=read(P/'metadata.json');profit=read(P/'profitability.json');strong=read(P/'strong-controls.json');native=read(P/'native/summary.json');confirm=read(C/'confirmation-verification.json');rootconfirm=read(P/'root-confirmation-verification.json')
assert rootconfirm['status']=='passed'
fresh=lambda r:not r['case'].startswith('abi_')
verdict=lambda ci: 'faster' if ci[1]>1 else 'slower' if ci[2]<1 else 'inconclusive'
g=collections.defaultdict(collections.Counter)
for r in profit['decisions']:
 if fresh(r):g[(r['host'],r['backend'])][r['verdict']]+=1
rows=['| Host / target | Faster | Slower | Inconclusive |','|---|---:|---:|---:|']
for (host,b),n in g.items():rows.append(f'| {host} / {b} | {n["faster"]} | {n["slower"]} | {n["inconclusive"]} |')
for mode in ['resident','snapshot']:
 n=collections.Counter(verdict(r['paired_ratios_95pct']['prior_over_checked']) for r in native['measurements'] if fresh(r) and r['mode']==mode)
 rows.append(f'| native / {mode} | {n["faster"]} | {n["slower"]} | {n["inconclusive"]} |')
controls=collections.defaultdict(collections.Counter)
for r in strong['comparisons']:
 if fresh(r):controls[(r['host'],r['comparison'])][r['verdict']]+=1
cr=['| Target versus expert | Ink faster | Expert faster | Inconclusive |','|---|---:|---:|---:|']
for (host,b),n in controls.items():
 if 'expert' in b:
  cr.append(f'| {host} / {b} | {n["Ink_faster"]} | {n["control_faster"]} | {n["inconclusive"]} |')
for mode in ['resident','snapshot']:
 n=collections.Counter('Ink_faster' if r['paired_ratios_95pct']['checked_over_rust_expert'][2]<1 else 'control_faster' if r['paired_ratios_95pct']['checked_over_rust_expert'][1]>1 else 'inconclusive' for r in native['measurements'] if fresh(r) and r['mode']==mode)
 cr.append(f'| native {mode} / expert Rust | {n["Ink_faster"]} | {n["control_faster"]} | {n["inconclusive"]} |')
qr=['| Repeat input | Prior / current median | 95% interval | Outcome |','|---|---:|---|---|']
for r in confirm['measurements']:
 x=r['paired']['prior_over_checked_gpu'];ci=x['ratio_95pct'];qr.append(f'| {r["input"]} | {ci[0]:.3f}× | [{ci[1]:.3f}, {ci[2]:.3f}] | {x["classification"]} |')
# Static file bytes, not runtime memory or complete per-application downloads.
footprints={}
for kind in ['prior','checked']:
 footprints[kind]={name:sum((P/kind/t['name']/name).stat().st_size for t in read(P/'spec.json')['tasks'] if t['fresh_proof_required']) for name in ['program.mjs','cpu.c','cpu.wasm']}
(P/'output-footprint.json').write_text(json.dumps(dict(status='measured',fresh_modules=12,bytes=footprints,scope='Sum of 12 per-function raw generated files. Excludes shared runtime, plans/proof traces, WGSL and compression. Wasm container metadata may differ; not live memory or a complete app download.'),indent=2)+'\n')
ft=['| File across 12 fresh modules | Prior bytes | Current bytes |','|---|---:|---:|']
for name in footprints['prior']:ft.append(f'| {name} | {footprints["prior"][name]} | {footprints["checked"][name]} |')
proofrows=['| Checked general law | Content address |','|---|---|']
for lane in ['predicated','reduction']:
 e=read(ROOT/f'knowledge/research/web-stack-proofs-15/{lane}/evidence.json');names=e['manifest']['names'] if lane=='predicated' else e['generic_manifest']['names']
 for name,ident in names.items():proofrows.append(f'| {name} | `{ident}` |')
losses=[r for r in profit['decisions'] if fresh(r) and r['verdict']=='slower']
(P/'fresh-regressions.json').write_text(json.dumps(dict(status='measured',count=len(losses),decisions=losses,scope='All 42 fresh main web regressions, no filtering or pooling.'),indent=2)+'\n')
text='''# Checked web-stack proofs, batch 15

58 checked database entries expand the local catalogue from 1,031 to **1,089**: **18 general laws and 40 static callback certificates**. Of the certificates, 26 support only existing laws and are supplied symmetrically to prior/current searches; 14 compose this batch's laws with checked callback normalization. These are compile-time transformations. No caller checks, checker wrappers, trusted optimization rules or new runtime optimizer were introduced.

The batch establishes reusable improvements for integer filtered totals and combined reductions, with actual JavaScript, Wasm, WebGPU and native measurements. **It does not establish broad superiority over expert JavaScript or native Rust.** Every fresh native resident/snapshot comparison improves on prior Ink, but expert native Rust wins 60/72 resident comparisons; expert JavaScript wins all 72 fresh comparisons on both hosts. All regressions and inconclusive results remain recorded.

## Proofs and what they eliminate

For arbitrary pure, total callbacks `f`, `g`, predicate `p`, list `xs` and scalar weights `k`, `d`, each of these six laws is checked separately for wrapping **U32, I32 and U64**:

| Family | Equal expression selected for optimization | Intended reusable effect |
|---|---|---|
| Filtered sum | `sum(xs.filter(p)) = sum(xs.map(x => choose(p(x), x, 0)))` | Remove filtered-list compaction |
| Mapped then filtered sum | `sum(xs.map(f).filter(p)) = sum(xs.map(x => let y=f(x); choose(p(y), y, 0)))` | Combine mapping and acceptance contribution |
| Filtered then mapped sum | `sum(xs.filter(p).map(f)) = sum(xs.map(x => choose(p(x), f(x), 0)))` | Remove a compacted intermediate |
| Two sums added | `sum(xs.map(f)) + sum(xs.map(g)) = sum(xs.map(x => f(x)+g(x)))` | Combine mapped reduction pipelines |
| Two sums subtracted | `sum(xs.map(f)) - sum(xs.map(g)) = sum(xs.map(x => f(x)-g(x)))` | Combine mapped reduction pipelines |
| Weighted two sums | `k*sum(xs.map(f)) + d*sum(xs.map(g)) = sum(xs.map(x => k*f(x)+d*g(x)))` | Combine pipelines where reducing stages outweighs extra arithmetic |

The notation above explains the equalities; the actual objects contain typed semantic terms and machine-checked proofs. Predicated proofs use structural list induction and cases on the head predicate: the empty list contributes zero; a rejected head contributes zero and an accepted head contributes its value, then the inductive tail equality applies. Combined reductions use list induction, symmetric induction-hypothesis rewrites and the existing wrapping ring normalizer. Associativity/distributivity here concern fixed-width modular arithmetic. **F32 reassociation and effectful/partial callbacks are excluded.**

General proof files: [predicated producer](../../knowledge/producers/web_predicated15_laws.py), [combined-reduction producer](../../knowledge/producers/web_reduction15_laws.py). [Checked publication](publication.json) authenticates all 58 roots plus their **61-entry dependency closure** with the frozen compiler. [General proof content addresses](#general-law-content-addresses) are listed below; [static witness data](../../knowledge/research/web-stack-proofs-15/specialization/witnesses.json) contains all 40 certificate bodies, scopes and dependencies.

The [untrusted beta certificate producer](../../knowledge/producers/beta_specialization15.py) handles capture-safe de Bruijn substitution and composes `Normalize`/`Use`/congruence/transitivity witnesses. It leaves unknown callbacks as applications, does not match generic laws inside lambda bodies, and bounds output size. Free runtime list/scalar parameters remain universally quantified. The 40 certificates specialize known callback syntax; **this is an offline certificate generator, not an automatic compiler pass for arbitrary future programs**. Generic laws remain applicable to arbitrary callbacks, while these lean static outputs depend on generated certificates.

The mapped-predicate expression can be duplicated by beta inlining. Value equivalence under purity does not guarantee one physical evaluation; wording such as “shared once” in the archived precursor manifest describes its semantic lambda, not emitted execution. Weighted fusion introduces `2N−2` extra multiplies relative to an expert two-accumulator loop with two scalar weights at the end. Neither law promises profitability for every workload.

## Fair prior/current preparation

Historical catalogue: `0510381225f45dc33922b2ead3794abd79c190bc3b3cbc34ce41d50e959ed8b1` (1,031 entries).

Effective prior catalogue, including the 26 shared old-only normalization certificates: `5310dfced5ad91e93eaabba81e6807b7f12ae45bfced0e063b801c76c1cae183` (1,057 entries).

Current catalogue: `57bbee1835725fd3af939cf11e3dda25ac51e12001fde0f006aeb64bb9ab2378` (1,089 entries).

The same derivation procedure was applied to all old semantic laws and original subjects, and available old normalization certificates were offered to both searches. The current search adds the 18 new generic laws and 14 new compositions. All 12 fresh recipes naturally select new checked witnesses and change their prior body. No forced choice or task-name whitelist is used. [Input preparation](input-preparation/preparation.json), [metadata](metadata.json) and per-task selection/replay receipts bind this provenance.

The external planner now accepts optional general operation prices, with a hashed cost-model receipt; its default policy is unchanged. The **same frozen untrusted model** is used for prior/current on all targets: map12, filter60, sum10, foldr80, apply20. These are search estimates, not measured costs. No post-timing tuning occurred. One common shape is consequently retained across targets even when a CPU-specific single-loop representation might be preferable. [Planner diff](planner-change.diff), [cost model](aggregate-cost-model.json).

The source guard covers 102 existing compiler/backend/runtime/planner files: 101 are unchanged and the external planner is the sole changed guarded file. The separate knowledge publisher was repaired to check the exact dependency closure rather than incorrectly equating closure size with new-root count; its initial rejection occurred before canonical mutation and is preserved. New proof producers, tests and harnesses are outside that guard. This batch makes no core, checker, backend or runtime edits.

## Workloads and measurements

Six families have one discovery and one preset alternate callback instantiation: **12 fresh recipes**. Six `abi_*` anchors preserve exact round14 checked bodies, arrays, scalars and expected results. Each recipe has small/full-word distributions at32,4,096 and65,536 elements: 108 main input cells, 72 fresh and36 anchors. The callbacks labelled held-out test a second fixed syntax; they are not an external application corpus. Performance is measured for U32 only; typed correctness covers all three word types.

A separate Python aggregate oracle matches the literal algorithm across **234 complete fixtures** and2,508,234 input values, including empty/singleton, overflow, word-boundary and predicate/weight edge cases. That value count is not a count of independent assertions. Literal and expert control outputs are checked before timings.

Node records11,664 trials and4,104 complete comparisons; browser records12,960 trials and4,428 complete comparisons. Native records9,720 trials and1,170 complete comparisons. **34,344 main timing samples and9,702 complete comparisons** pass. Main browser GPU accounting is1,296 actual samples,144 actual variant cells and180 CPU fallback variant cells; fallbacks are excluded from GPU timing. The main full-fixture prevalidation loop covers CPU variants; the separate702-call GPU edge run below closes that coverage gap.

Runs use9 shuffled paired rounds, one warmup and calibrated iterations targeting15ms. Node/browser/native and the later confirmation run are sequential after all compiler/proof/test jobs stop. The frozen environment is Apple M2, macOS26.5.2, Node26.1.0, browser Chrome154, Zig0.15.2 and Rust1.96.0. Native C uses Apple Clang14 while Rust uses LLVM22: matched compiler versions are not established. The checkouts are dirty; frozen executable, source and artifact hashes identify what was measured.

Web timings cover complete awaited scalar calls: one input snapshot, Wasm copy/result conversion, output consumption and existing host overhead. The separate borrowed-JS pair excludes snapshots equally. Native emitted C and handwritten Rust use a common separately compiled C timing driver with a shared-library boundary and no cross-library LTO. Rust's wrapper/kernel are compiled together. Resident input and input-snapshot modes remain separate; Ink arena cleanup is timed. Integer-difference Mach clock ticks and1,000-call native calibration are audited. GPU timings include upload, dispatch, result readback and host synchronization with pipelines already initialized; startup/first-call observations are separate, and this is not a GPU-resident-only comparison.

Every saved interval is independently recomputed from raw paired rounds using4,000 bootstrap draws, seed0, median ratios and percentile positions100/3,899. Intervals are individual exploratory95% estimates without multiplicity adjustment. Correlated cases/host views do not constitute hundreds of independent algorithms.

## Fresh gains against prior Ink

A gain requires the full prior/current interval above1; a regression requires it below1. Counts below exclude unchanged-law anchors.

'''+ '\n'.join(rows)+'''

[All profitability rows](profitability.json) retain the220 gains,42 regressions and62 inconclusive **main web** views. Native resident/snapshot counts are separate correlated views. Anchors show6 gains,6 regressions and132 inconclusive outcomes even though prior/current selected bodies and generated JS are identical; these are instance/runtime noise and support no new-law claim. [All42 fresh web regressions](fresh-regressions.json) remain explicit. A shared cost model cannot guarantee that a checked rewrite wins on each backend or input size.

Representative complete browser calls, `small-65536` (lower is faster):

| Recipe | Prior/current JS | Prior/current Wasm | Prior/current GPU |
|---|---|---|---|
| accepted_total | 950/740µs | 209.4/41.0µs | 941/733µs |
| calibrated_accepted_total | 659/1,047µs | 187.7/41.0µs | 993/743µs |
| dual_sum_add | 1,238/795µs | 52.6/39.1µs | prior unavailable /755µs |

The mapped accepted-total JS regression is substantial and retained. Small dual reductions also regress in Wasm despite large-input benefits. Medians are descriptive; [raw trials](browser-results.json) and interval tables govern supported claims.

## Strong language controls

Expert controls fuse traversals and use independent accumulators where appropriate; literal controls preserve original eager stages. They share source algorithms, exact word semantics and equivalent input/result boundaries. No manufactured weaker Rust/JS control is presented as native performance.

'''+ '\n'.join(cr)+'''

Against literal JavaScript, current Ink wins69/72 Node and68/72 browser fresh cases, with2/3 losses respectively. Against literal Rust/Wasm it wins33/72 Node and34/72 browser; native versus literal Rust wins60/72 in each mode and loses12. These eager-source gains differ from the expert results above.

The generated fresh C kernels still materialize a mapped array and then traverse it again for the sum. Callback normalization removes typed-Let/schema2 constraints but does not finish CPU loop fusion. Expert JavaScript/Rust avoid this work, and weighted expert loops also keep weights outside the loop. This is a concrete remaining lowering/search target; broad expert superiority is **not achieved** by the current batch.

## Actual WebGPU confirmation and routing

A separate immutable repeat copies1,237 parent artifacts byte-for-byte and freezes1,244 artifacts. It retains all234 fixtures, original arrays/scalars/oracles, parameters and CPU prevalidation. Only the timed cell subset and one eligibility line change: six predicated recipes ×two65,536-element distributions, three actual GPU variants. No recompilation, pooling or canonical imports occur.

The independent repeat passes **324 actual GPU trials,2,988 complete comparisons,36 calibration and36 warmup cells**. All phase upload/dispatch/readback counters and24 intervals are audited twice. The prior/current repeat supports **10 gains and2 inconclusive outcomes**; no regressions. Eight mapped-predicated cells all retain supported gains. Supported median ratios range1.10–1.42×, while both inconclusive results remain visible:

'''+ '\n'.join(qr)+'''

[Separate raw repeat](../web-stack-proofs-15-gpu-confirmation-2026-10-10/browser-results.json), [agent audit](../web-stack-proofs-15-gpu-confirmation-2026-10-10/confirmation-verification.json), [root audit](root-confirmation-verification.json).

The untimed edge validator checks **702 complete calls** across every fixture and baseline/prior/current, including input nonmutation. All312 manifest-eligible calls execute on GPU (288 positive and24 empty);390 unsupported calls use recorded CPU fallback. Positive inputs precede empty ones and engines close afterward. [GPU edge results](../web-stack-proofs-15-gpu-confirmation-2026-10-10/GPU-edge-validation.json), [edge audit](../web-stack-proofs-15-gpu-confirmation-2026-10-10/GPU-edge-verification.json).

At65,536 words, filtered totals reduce dispatches5→3, and mapped/filter totals6→3, with identical upload/readback bytes per call. New dual-reduction GPU eligibility is not a prior-GPU speedup because that prior form has no GPU implementation.

Even with these GPU improvements, the main descriptive fastest current backend is **Wasm in68 cells and JS in40**; GPU wins none of the108 full-transfer cells. [Routing table](backend-routing.json) preserves all CPU/GPU comparisons. These benchmarks force backends. Existing host selection is separate JavaScript code; this batch does not add load-aware optimization, state migration, an Ink-written selector or a new universal routing policy.

## Output size, memory and verification

'''+ '\n'.join(ft)+'''

[Footprint scope](output-footprint.json): raw emitted files summed over12 fresh per-function modules, excluding shared runtime, shaders, compression and compile-time proof/plan traces. The output is not uniformly smaller. CPU single-loop lowering remains incomplete. Do not treat large compile-time plan JSON as executed code or these file totals as a whole-app download.

1,080 authenticated complete-call Wasm observations (five exported linear-memory views per main cell/host) increase the canonical observation count **6,786→7,866**, while the proof snapshot stays fixed. Exported linear-memory byte length is neither live allocation nor total process/GPU memory. JS, GPU and native peak memory is unmeasured; their evidence remains linked report records instead of fabricated zero-byte observations. [Canonical import receipt](canonical-observation-import.json).

**31 current scoped tests pass**: planner5, beta generator3, store7, publisher3, performance-store3, predicated4, independent beta3 and combined reductions3. The author/helper suites exercise144+126+144 typed frames and288+252+288 original/selected interpreter executions, with hash-valid false-proof rejection controls. These correctness tests are distinct from timing and do not replace machine-checked universal proofs. The historical full suite was not rerun. [Predicated evidence](../../knowledge/research/web-stack-proofs-15/predicated/evidence.json), [reduction evidence](../../knowledge/research/web-stack-proofs-15/reduction/evidence.json), [independent helper evidence](../../knowledge/research/web-stack-proofs-15/predicated/beta-helper-review-evidence.json), [source review](independent-source-review.md), [reduction/native review](independent-reduction-review.md), [performance review](performance-review.md).

The initial invalid admission CLI, typed-Let GPU fallback, unfavorable default-policy candidates, failed forward reduction proof and publication closure-count rejection remain archived. Preparation then exhausted disk **before timing**. The partial preparation is preserved; exact-byte-verified hardlinks consolidate131,923 duplicate immutable object paths (1,089,154,195 logical duplicate bytes), preserving paths and contents. Fresh preparation succeeded afterward. [Disk recovery receipt](disk-recovery.json), [initial failed preparation](initial-disk-preparation/status.json), [publication repair](publication-closure-repair.json).

Main audits authenticate2,511 frozen web artifacts,248 native artifacts and all author maps (639 predicated,4,658 reduction,363 helper), recomputing2,376 web and864 native intervals. Confirmation adds24 separately recomputed intervals and the edge audit. **34,668 total timing samples and13,392 complete comparisons** are retained across main/native/repeat/edge stages without pooling estimates. Only1,620 of the trials are actual GPU timing samples;312 edge GPU calls are untimed correctness checks.

[Final main integrity receipt](verification.json), [final supplementary binding](final-binding.json), [browser proof of work](browser-completed.png), [confirmation screenshot](../web-stack-proofs-15-gpu-confirmation-2026-10-10/browser-completed.png). Everything is local in the shared research checkout; no commit, push or PR was made. Earlier batches remain preserved.

## General-law content addresses

'''+ '\n'.join(proofrows)+'\n'
(P/'REPORT.md').write_text(text)
print({'status':'written','report_bytes':len(text.encode()),'new_general_laws':18,'all_fresh_regressions':len(losses),'output_bytes':footprints})
