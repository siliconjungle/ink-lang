"""Render measured results and checked proof scope without selecting winners."""
from pathlib import Path
import json,hashlib,collections
R=Path(__file__).resolve().parent;B=R.parents[1]
read=lambda n:json.loads((R/n).read_text())
m=read('metadata.json');p=read('publication.json');o=read('outcome-tables.json');w=read('root-interval-verification.json');n=read('native-final-review.json');c=read('code-shape-review.json')
counts=o['counts'];ranges=o['supported_gain_median_ranges']
def row(label,key,expert=False):
 d=counts.get(key,{})
 return f"| {label} | {d.get('Ink_faster' if expert else 'faster',0)} | {d.get('expert_faster' if expert else 'slower',0)} | {d.get('inconclusive',0)} |"
prior=[('Node JS','fresh|node||prior_over_checked_js|all'),('Browser JS','fresh|browser||prior_over_checked_js|all'),('Node Wasm','fresh|node||prior_over_checked_wasm|all'),('Browser Wasm','fresh|browser||prior_over_checked_wasm|all'),('Native C resident','fresh|native|resident|prior_over_checked|all'),('Native C snapshot','fresh|native|snapshot|prior_over_checked|all')]
expert=[('Node captured JS / expert JS','fresh|node||ink_checked_js_over_js_expert|all'),('Browser captured JS / expert JS','fresh|browser||ink_checked_js_over_js_expert|all'),('Node Ink Wasm / expert Rust Wasm','fresh|node||ink_checked_wasm_over_rust_expert_wasm|all'),('Browser Ink Wasm / expert Rust Wasm','fresh|browser||ink_checked_wasm_over_rust_expert_wasm|all'),('Native C resident / expert Rust','fresh|native|resident|checked_over_rust_expert|all'),('Native C snapshot / expert Rust','fresh|native|snapshot|checked_over_rust_expert|all'),('Browser actual GPU / expert JS','fresh|browser||js_expert_over_ink_checked_gpu|all')]
raws=[read('node-results.json'),read('browser-results.json'),read('native/results.json')];total=sum(len(x['samples']) for x in raws);comparisons=sum(x['validation']['comparisons'] for x in raws[:2])+read('native/validation.json')['exact_comparisons'];reg=read('fresh-regressions.json')['rows'];cal=raws[2]['calibration_trials'];zeros=sum(x['seconds']==0 for x in cal)
text=f'''# Checked web-stack proof batch 19

This batch adds **13 generic laws across four reusable optimization families**, with eight checked U32 callback certificates for measured recipes. The catalogue grows from 1,298 to **1,343 entries**: 13 generic roots, eight new static instances, and 24 old-only static instances shared by both comparison catalogues. Those 45 entries are not 45 independent optimization mechanisms.

Measured prior/current gains are strongest for complementary partition reductions and browser JS. **Broad superiority over expert Rust, Wasm or JavaScript is not established.** Native Ink beats expert Rust in four of 48 cells per mode, all from one alternate mapped-zip recipe, and loses in 44. All six scalar recipes lose to native expert Rust. Actual GPU loses to expert JS in all 48 timed cells. Correctness does not establish profitability: all **{len(reg)} adverse prior/current comparisons** are retained.

## General laws and proof sketches

Let `A = sum(xs.filter(p).map(f))` and `D = sum(xs.filter(x => !p(x)).map(f))`. `f` and `p` are arbitrary pure total callbacks, and weights `k,d` are arbitrary words.

| Family | Checked equality | Types / generic entries |
|---|---|---|
| Complementary recombination | `A + D = sum(xs.map(f))` | U32, I32, U64 / 3 |
| Complementary contrast | `A - D = sum(xs.map(x => choose(p(x),f(x),0-f(x))))` | U32, I32, U64 / 3 |
| Complementary weights | `A*k + D*d = sum(xs.map(x => choose(p(x),f(x)*k,f(x)*d)))` | U32, I32, U64 / 3 |
| Same-source mapped zip | `xs.map(f).zip(xs.map(r),h) = xs.map(x => h(f(x),r(x)))` | U32, I32, U64, F32 / 4 |

The partition proofs use induction on the list and a case split on `p(head)`. The empty list contributes zero. In either nonempty branch, the head contributes to exactly one partition, and the induction hypothesis accounts for the tail. The existing checker normalizes the necessary wrapping-word ring equalities; no new trusted theorem rule is introduced. The proofs use a symmetric induction orientation, preserved in the actual proof objects.

Mapped-zip uses list induction. Both maps have exactly the source length, so self-source zip cannot truncate. The empty output is empty; each head is `h(f(head),r(head))`, followed by the equal tails. Per-element primitive grouping is preserved, including F32. Global callback scheduling changes, which is justified only by the pure total semantic contract. Partition reassociation excludes F32.

These are universal runtime-value laws, not lookup tables for benchmark inputs. These measured inline-callback applications use **ordinary checked static certificates**: normalization, application of a generic law, then capture-safe shared beta normalization. The complementary-source extractor has no export-name whitelist; the checker verifies the complete positive/negative callback correlation. Mapped-zip uses the existing sharing helper. These certificates remain external DB data; neither compiler matching nor runtime input checks changed. Unsupported callback operations may still prevent a target lowering.

Sources: [partition producer](../../knowledge/producers/web_predicate19_laws.py), [mapped-zip producer](../../knowledge/producers/web_algebra19_laws.py), [static bridges](../../knowledge/producers/web_static19_laws.py). Formal objects are content-addressed by [publication.json](publication.json).

## Checked application and fairness

Historical snapshot: `{m['prior_snapshot']}` (1,298 entries). Effective prior: `{m['effective_prior_snapshot']}` (1,322 entries). Current: `{m['new_snapshot']}` (1,343 entries).

The same frozen eight source subjects were offered to all 739 typed semantic candidates in the prior catalogue through the existing callback-sharing derivation. It proposed 28 old-only certificates; the kernel admitted 24 and rejected four candidates whose conditional premises were not discharged. Every admitted old-only certificate is included in **both** prior and current. Freshness is measured against the effective prior, leaving 21 current-only entries: 13 generic and eight static. This is a bounded derivation and search, not exhaustive proof search over everything derivable from the historical catalogue.

All **32 compact selection packages** replay and authenticate their minimal dependency closures. Each of the eight current CPU bodies differs from its fair prior and applies a new static certificate; the prior partition recipes themselves already apply old proofs. Old callbacks and proof bytes are given equal compile-time normalization opportunities. No new whole-module trusted certificate, compiler whitelist or planner exception is used.

Focused proof suites pass seven tests. Partition author validation covers 18 typed source applications, 144 exact frames and 288 actual original/selected interpreter runs. Mapped-zip covers eight typed source applications, 46 full-array frames and 92 runs, including F32 NaN payloads, infinity, signed zero and rounding cases. Six deliberate rehashed semantic false controls reject: three wrong partition endpoints, a false complementary callback correlation, and two false mapped-zip endpoints. Typed test callback instances beyond the eight timed U32 instances are retained as research evidence, not padded into the catalogue.

## Frozen benchmark protocol

Eight U32 recipes: three partition forms with primary/alternate predicates and mappers, plus two mapped-zip sensor-combination forms. All use natural `(xs,seed,k)` signatures; common Rust/native adapters contain an unused second-list slot, but every implementation captures/copies only the declared `xs` input. Scalar and full-vector output boundaries remain distinct.

104 complete fixtures, including empty/singleton/extrema/zero-factor/equal-parameter/all-below/all-above threshold edges; 48 timed cells from lengths 32, 4,096 and 65,536 under preset small/full word distributions. Arrays are unchanged immutable donors, with hashes bound. Alternate callbacks are preset holdouts, not an external corpus. Partition thresholds are fixed before timing. The alternate mapper's `x<k` gate is mostly/all true in full-width profiles; partition splits and both mapped-zip raw/mapped gates have separate recorded coverage. Do not infer balanced coverage for every callback branch.

Literal JS and Rust preserve the original eager filter/map/sum or map/map/zip stages. Experts directly implement fused semantics. Recombination experts skip the predicate; contrast uses one pass; weighted experts use two accumulators in one pass and multiply scalar weights once. JS experts can reuse typed output scratch, and Rust experts can reuse caller output destinations. Generated output allocation/cleanup and complete result consumption are timed. Captured JS, borrowed JS, Wasm transport, native resident/snapshot and actual GPU calls stay separate.

Compiler SHA: `{m['compiler_sha256']}`. CPU/GPU cost models match batch18 exactly; 39 policy/authoring assets are frozen. All 998 prepared artifacts authenticate. All 102 guarded compiler, backend, runtime and planner source files are unchanged. No timing informed source, law, fixture, expert or cost-policy changes.

Native generated C uses Apple Clang 14 `-O3`/native CPU; native expert/literal Rust uses Rust 1.96 / LLVM 22.1.2 `-O3`/native CPU, as captured in environment metadata. This does **not** measure an Ink-to-Rust emitter and is not an equal-LLVM-version experiment. Rust Wasm and generated Wasm use their recorded Rust/Zig toolchains. One shared native C timing driver, shared-library call boundary, output observation and active-arena reset are matched; no cross-library LTO. JS/Wasm modules and GPU pipelines are warm for timing; startup/prevalidation costs are recorded separately.

Native, Node and both four-task browser contexts ran sequentially with other author/audit jobs stopped. Each host uses nine shuffled measured rounds and two warmups, targeting 15 ms per calibrated sample. Native starts calibration at one call, uniformly grows through clock-resolution zeros, and journals every trial, warmup and measurement. There are {len(cal):,} calibration trials, {zeros} zeros confined to calibration, and {n['recovery_journal_rows'] if 'recovery_journal_rows' in n else n.get('journal_rows',7405):,} journal rows; measured/warmup durations are positive. No timing attempt was pooled, dropped or restarted.

Totals: **{total:,} samples**, **{comparisons:,} complete benchmark output comparisons** (including per-cell availability checks), and **{w['intervals_recomputed']+n['independently_recomputed_paired_intervals']:,} independently recomputed saved confidence intervals**. Paired median bootstrap uses 4,000 resamples with Random(0). Individual 95% intervals are exploratory and unadjusted; related views are correlated. There is no suite-wide average or language ranking.

## Prior/current measurements

A cell wins when its paired prior/current interval lies wholly above 1, regresses when wholly below 1, and otherwise is inconclusive.

| Target / host | Current faster | Current slower | Inconclusive |
|---|---:|---:|---:|
'''+'\n'.join(row(label,key) for label,key in prior)+'''

Among confirmed winning cells, median prior/current ranges are:

'''+ '\n'.join(f'- {label}: {ranges[key][0]:.3f}–{ranges[key][1]:.3f}×.' for label,key in prior)+f'''

These are winning-cell ranges, not averages across the suite. There are **{len(reg)} adverse comparison rows**: four Node JS cells, twelve Node Wasm cells, twelve browser Wasm cells, and four native cells in each mode. Both Wasm hosts regress on all twelve 32-element partition cells; the larger partition cells improve. The medium/large primary mapped-zip native cells regress despite allocation reduction. All per-cell medians, intervals and raw samples remain saved in [fresh-regressions.json](fresh-regressions.json) and [outcome-tables.json](outcome-tables.json).

Measured profitability decisions in [profitability.json](profitability.json) recommend retaining prior output for losing/inconclusive cells; this is evidence for future external selection policy, not a newly installed runtime optimizer or a tuned default cost model.

## Expert comparisons

| Current Ink boundary / expert control | Ink faster | Expert faster | Inconclusive |
|---|---:|---:|---:|
'''+ '\n'.join(row(label,key,True) for label,key in expert)+'''

The four native wins per mode are the alternate mapped-zip recipe at 4,096 and 65,536 elements in both distributions, approximately 1.02–1.06× median gains over expert Rust. They are not a broad Rust win. Borrowed JS controls separately show Node 1/46/1 and browser 4/39/5 Ink-win/expert-win/inconclusive counts; these are correlated views of the same recipes and must not be pooled with captured results.

## Actual GPU evidence and generated code

All eight current recipes are GPU eligible; baseline and prior are CPU fallbacks. Thus there are **zero same-backend prior/current GPU comparison cells**. Eligibility transitions are not GPU speedups over a prior GPU program.

312 GPU fixture requests produced 104 current GPU paths and 208 baseline/prior CPU fallbacks; empty vector paths can report GPU without dispatch. All 48 positive timed current GPU cells have actual dispatch evidence, for 432 GPU timing samples. Ninety-six per-cell baseline/prior fallbacks are excluded from GPU timing. Schema1 aggregate counters have exact dispatch/upload/readback fields; schema2 vector counters additionally include live-buffer bytes. Uploads, readback and full output consumption are charged. GPU loses to expert JS in all 48 cells. There is no independent handwritten WGSL expert in this experiment. Forced CPU-versus-GPU complete-call comparisons are saved in [backend-routing.json](backend-routing.json); median routing descriptions are not a new routing policy.

CPU emitted allocation sites drop from prior JS18/C24 to current JS8/C8 across the eight bodies. Scalar current outputs still allocate a mapped array and then sum it in a second loop. Mapped-zip outputs use one map/output loop instead of two maps and zip, with one necessary output allocation. Fewer arrays do not guarantee better target code or lower fixed call overhead, as the retained regressions demonstrate. GPU policy roots are separately selected and compiled under the unchanged GPU model.

## Evidence, database and limits

480 new canonical complete-call Wasm observations (240 per host) bring the observation ledger and disposable SQLite cache to **11,586**. JS/native/GPU raw results remain in this report; only observations with exported Wasm memory scope are imported. Peak exported linear-memory bytes are not total process memory.

Untimed preparation issues are archived: an initial staging script omitted reconstructed law wrapper metadata, then a whole candidate-batch admission included four invalid old conditional instances. Per-root kernel checking fixed the preparation and excluded exactly those false candidates before publication or target builds. No measured data was altered. The copied runner's `validation.oracle` description still mentions batch18 fixed-point projections; it is a stale label only. Actual frozen golden generators, source bodies, literal controls and complete checks are batch19 partition/mapped-zip semantics. The original frozen final-verifier draft assumes a full snapshot entry list; a separate reviewed audit helper checks compact Merkle membership keys instead. These audit/label issues add no runtime semantics or performance changes.

Independent receipts: [catalogue](catalogue-review.json), [native intervals and journal](native-final-review.json), [code shape](code-shape-review.json), [protocol and final prose](protocol-final-review.json), [final verification](verification.json). Author proof/admission/interpreter evidence remains under `knowledge/research/web-stack-proofs-19/`; all prior batch18 archives are preserved.

The mathematical laws generalize across arbitrary pure callbacks and all finite list lengths under the stated type semantics. Empirical coverage is one machine/browser, eight U32 recipes and preset distributions; it does not establish arbitrary workload, cross-device or broad native superiority. The remaining scalar mapped-array stage, target lowering/vectorization behavior and full-call transport are concrete limits exposed by this batch. All rewrites/certificates are compile-time work; no new caller validation wrappers, runtime checks or load/state-dependent optimizer were added. No commit, push or PR was performed.
'''
(R/'REPORT.md').write_text(text)
print(json.dumps(dict(report=str(R/'REPORT.md'),sha256=hashlib.sha256(text.encode()).hexdigest(),samples=total,comparisons=comparisons,adverse_rows=len(reg))))
