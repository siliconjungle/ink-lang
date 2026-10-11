"""Report archived checked proof and measured target results without pooled rankings."""
import json
from pathlib import Path
R=Path(__file__).resolve().parent
read=lambda n:json.loads((R/n).read_text())
m=read('metadata.json');p=read('publication.json');o=read('outcome-tables.json');c=o['counts']
def table(items,expert=False):
 text='| Target / boundary | Faster | Slower | Inconclusive |\n|---|---:|---:|---:|\n'
 for label,key in items:
  d=c.get(key,{})
  text+=f"| {label} | {d.get('Ink_faster' if expert else 'faster',0)} | {d.get('expert_faster' if expert else 'slower',0)} | {d.get('inconclusive',0)} |\n"
 return text
prior=[('Node JS','fresh|node||prior_over_checked_js|all'),('Browser JS','fresh|browser||prior_over_checked_js|all'),('Node Wasm','fresh|node||prior_over_checked_wasm|all'),('Browser Wasm','fresh|browser||prior_over_checked_wasm|all'),('Native C resident','fresh|native|resident|prior_over_checked|all'),('Native C snapshot','fresh|native|snapshot|prior_over_checked|all')]
expert=[('Node captured JS / expert JS','fresh|node||ink_checked_js_over_js_expert|all'),('Browser captured JS / expert JS','fresh|browser||ink_checked_js_over_js_expert|all'),('Node Wasm / expert Rust Wasm','fresh|node||ink_checked_wasm_over_rust_expert_wasm|all'),('Browser Wasm / expert Rust Wasm','fresh|browser||ink_checked_wasm_over_rust_expert_wasm|all'),('Native C resident / expert Rust','fresh|native|resident|checked_over_rust_expert|all'),('Native C snapshot / expert Rust','fresh|native|snapshot|checked_over_rust_expert|all'),('Indexed vector GPU / expert JS','fresh|browser||js_expert_over_ink_checked_gpu|all')]
raw=[read('node-results.json'),read('browser-results.json'),read('native/results.json')];total=sum(len(x['samples']) for x in raw);comparisons=sum(x['validation']['comparisons'] for x in raw[:2])+read('native/validation.json')['exact_comparisons'];reg=read('fresh-regressions.json')['rows'];w=read('root-interval-verification.json');nr=read('native-final-review.json');intervals=w['intervals_recomputed']+nr['independently_recomputed_paired_intervals'];gpu={k:v for k,v in raw[1]['gpu_validation'].items() if k!='records'}
text=f'''# Checked web-stack proof batch 21

**21 new generic optimization endpoints**, nine additional GPU-facing compositions, 12 index-transport support equalities and 18 checked source applications are admitted. Another 156 checked old-only source certificates are shared by both comparisons. The catalogue grows from **1,372 to 1,588 entries**. The 216 added proof objects are not 216 independent optimization mechanisms.

Broad superiority over optimized handwritten Rust, Wasm or JavaScript is **not established**. The tables below retain every adverse result. These general finite-list equalities are exercised on two preset workload families, one machine and exact U32 outputs; the suite is not an external application corpus or a general language ranking.

## General laws and proof sketches

| Family | Equality | Types / endpoints |
|---|---|---|
| Independent complementary partitions | `sum(filter(p,xs).map(f)) + sum(filter(!p,xs).map(g)) = foldr(xs,0,x=>a=>choose(p(x),f(x),g(x))+a)` | U32, I32, U64; 3 |
| Partition difference | Same expression with subtraction, selecting `-g(x)` on the second branch | U32, I32, U64; 3 |
| Weighted partitions | `A*k+B*d`, selecting `f(x)*k` or `g(x)*d` | U32, I32, U64; 3 |
| Map then indexed map | `xs.map(f).map_indexed(g) = xs.map_indexed(i=>x=>g(i)(f(x)))` | U32, I32, U64, F32; 4 |
| Indexed map then map | `xs.map_indexed(f).map(g) = xs.map_indexed(i=>x=>g(f(i)(x)))` | Same four types; 4 |
| Two indexed maps | `xs.map_indexed(f).map_indexed(g) = xs.map_indexed(i=>x=>g(i)(f(i)(x)))` | Same four types; 4 |

Partition proofs induct on the list and split on the head predicate. Exactly one complementary branch contributes; wrapping-ring normalization distributes addition, subtraction and constant weights over the equal tail. The two callbacks are independently arbitrary pure total functions. F32 sum reassociation is excluded.

Indexed proofs generalize the induction hypothesis to an arbitrary natural start index. The tail starts at its successor, preserving the same public wrapping U32 index for both maps. Twelve supporting beta-transport equalities connect those induction goals. Primitive F32 operation grouping is preserved; callback scheduling changes require pure total functions. A two-element internal-list witness exercises index 2^32-1 followed by zero, without claiming a physically allocated 2^32-item array.

Nine GPU-facing generic endpoints compose the new partition fold equalities with the symmetric old mapped-sum laws. CPU policy chooses the allocation-free fold; GPU policy chooses a mapped sum. These are deployments of checked mathematics, not new primitive laws. All six scalar U32 builds retain `quot_or`, forcing the packed scalar ABI and CPU fallback in the frozen backend. They provide **no actual GPU performance evidence**. Six indexed vector recipes emit direct schema2 shaders.

Sources: [partition producer](../../knowledge/producers/web_predicate21_laws.py), [indexed producer](../../knowledge/producers/web_structure21_laws.py), [GPU compositions](../../knowledge/producers/web_gpu21_laws.py), [source certificates](../../knowledge/producers/web_static21_laws.py). Exact objects and dependency closures are in [publication.json](publication.json).

## Fair prior and compile-time admission

Historical snapshot: `{m['prior_snapshot']}` (1,372). Effective prior: `{m['effective_prior_snapshot']}` (1,528). Current: `{m['new_snapshot']}` (1,588).

Both catalogues receive the same 156 admitted old-only source certificates. The old search offers 813 historical semantic candidates to the exact frozen subjects, bounded to four applications and 128 expanded intermediate bodies per task. Initial admission rejects 28 candidates; continuation rejects another 80. Twenty-four already-admitted exact source/target aliases are omitted from the retained set. Their individual checks and all rejections remain archived. Each recursive Use/dependency is historical. All six scalar prior subjects have admitted allocation-free options. Actual selection already fuses add/subtract into one fold with complementary branch contributions; only the two weighted recipes retain two folds. The new proofs compete against this stronger prior, not against a missed old optimization. The four single-fold prior bodies still evaluate complementary contribution logic separately; new endpoints select exactly one callback contribution.

Current adds 60 entries beyond that effective prior: 21 generic optimization endpoints, nine GPU compositions, 12 supports and 18 source certificates. All 48 compact selections authenticate minimal closures. Every one of the 12 current CPU bodies differs from its prior and uses fresh proof evidence. The small kernel checks ordinary list induction, normalization, Use and Trans; no trusted matcher, export whitelist or backend exemption was added.

Author tests pass: four partition, three indexed and three GPU-composition tests. Evidence records 504 complete typed frames and 1,188 actual interpreter runs, with nine false controls rejected. Initial incorrect F32 ingress rounding and scalar shader expectations are preserved with their corrected evidence. These author fixtures establish semantic behavior independently of benchmark profitability.

All proof discovery, checking and application occur at compile time. Generated programs receive no input checker wrappers and no runtime optimizer. All 102 guarded compiler/backend/runtime/planner source files remain unchanged.

## Frozen performance protocol

Twelve U32 recipes, all `(xs,seed,k)`: six scalar partition consumers and six full-output indexed vector consumers. Alternate callbacks are preset holdouts, not an external corpus. There are 180 complete fixtures and 72 timed cells: lengths 32, 4,096 and 65,536 under small/full-width distributions. Donor input arrays are unchanged. Thresholds, zero fallbacks, extrema, singleton/empty inputs, branch profiles, index period boundaries and exact parameter bytes are fixed before timing. Relevant timed scalar branches execute both directions; no blanket balanced-branch claim is made.

Literal controls preserve original eager stages. Expert JS/Rust already fuse the algorithms. Weighted experts use two accumulators and multiply the totals once, avoiding a per-item multiplication handicap. Vector experts compute each mapper once in one output loop, preserve wrapping public indices, and may reuse destinations. A shared Rust scalar implementation serves both native and Wasm. The native common adapter retains an unused second-list slot, but all recipes copy only their declared single input list.

Captured JS, borrowed JS, Wasm, native resident/snapshot and actual GPU calls are separate boundaries. Full input capture, computation, complete output consumption and cleanup are included as appropriate. Timed vectors consume length/sum/weighted checksums; complete arrays are compared before timing and at availability checks. GPU timing includes upload, dispatch, readback and result consumption; fallback is not a GPU sample. No handwritten WGSL expert was measured.

Compiler SHA: `{m['compiler_sha256']}`. CPU/GPU model bytes are the same fixed hypotheses as batch20. {len(m['artifact_hashes'])} prepared artifacts and {len(read('policy-freeze.json')['artifacts'])} policy/author/control bindings are frozen. Proofs, controls, sources, fixtures, target builds and policies are not tuned using these timings. Native, Node and three bounded browser contexts run sequentially with author/audit jobs stopped. Startup and correctness validation are outside steady-state timing; browser startup sums all three contexts.

Nine shuffled rounds use seed20261030, two warmups and a 15 ms sample target. Native calibration starts at one call, journals timer-resolution zeros, and grows by at most16; zero trials force16. Native driver calls perform a result check and three untimed algorithm prewarm calls uniformly before the clock interval. All calibration trials, measured samples and adverse comparisons are retained. Native generated C uses Clang and expert Rust uses rustc; versions and flags are archived, not an equal-LLVM or Ink-to-Rust emitter comparison. Individually paired 95% median-bootstrap intervals use 4,000 Random(0) draws and are exploratory/unadjusted; views are correlated.

Totals: **{total:,} timing samples, {comparisons:,} complete benchmark comparisons, {intervals:,} independently recomputed intervals**.

## Current versus fair prior

Each row contains72 cells. Faster/slower require its entire interval to exclude parity.

'''+table(prior)+f'''\nAll **{len(reg)} adverse prior/current comparisons** remain in [fresh-regressions.json](fresh-regressions.json). Gains and losses by operation/cohort and supported median ranges are in [outcome-tables.json](outcome-tables.json); no pooled average is asserted.

## Optimized handwritten controls

Faster/slower below refer to Ink versus the named expert. CPU rows contain72 cells; GPU covers36 actual indexed-vector cells.

'''+table(expert,True)+f'''\nGPU audit: `{json.dumps(gpu,sort_keys=True)}`. Scalar GPU compositions remain fallback. Indexed vectors gain actual GPU eligibility; prior fallback provides no matched prior/current GPU-to-GPU experiment. Missing GPU records are not slower GPU observations.

## Evidence and limits

[Catalogue audit](catalogue-review.json), [native audit](native-final-review.json), [protocol audit](protocol-final-review.json), [emitted code shapes](code-shape-review.json) and [final verification](verification.json) bind exact archived identities, artifacts and measurements. Mathematical equalities apply to arbitrary finite lists under stated semantics; measured profitability covers these preset workloads on this machine. Expert controls and regressions determine where to investigate further. No broad native superiority, automatic routing policy or production corpus generalization is claimed.

The DB reaches13,026 canonical observations, adding720 Wasm records with exact program, proof, workload, hardware and archived complete-call samples. SQLite is rebuilt as a disposable index; content-addressed objects and snapshots remain authority. No commit, push or PR was made.
'''
(R/'REPORT.md').write_text(text)
print(json.dumps(dict(report='REPORT.md',samples=total,comparisons=comparisons,intervals=intervals,regressions=len(reg))))
