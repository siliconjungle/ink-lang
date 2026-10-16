# Owned graph specialization and state projection

Two executable source transformations now have ordinary checked evidence:

* Complete action proofs specialize a frozen 32-node graph while numeric weights
  and transaction state remain mutable. Typed source helpers thread the owner
  through balanced chunks; the selected program is emitted literally.
* The `fold-state-projection` recipe removes an unobserved accumulator field
  through a universal step simulation and the existing general fold law. A
  source-bound equality rewrites the shared pure function once, covering its
  ordinary and stateful callers. No trace-derived assumption is introduced.

The [guide](../../docs/fold-state-projection.md) gives the source shape, proof
contract and remaining scope. The U32 [example](../../examples/adaptive/fold-state-projection.ink)
has 111 reference/native Rust/JavaScript/Wasm action comparisons, including live
weights, events, rollback, wrapping inputs and exact portable snapshots. The
separate F32 graph has 175 independent reference histories and exact JavaScript
outcome/checkpoint comparisons, including signed zero and exceptional values.

## Measurements, including the loss

All graph measurements use Node v22.22.1, 32 frozen instructions, changing inputs
and live weights. The caller consumes all 33 returned values. The retained
`measure.mjs` accounts for import and initialization separately and checkpoints
the final state. The checksum and final snapshot agree in every paired sample.

| Implementation | Workload | Observation |
| --- | --- | --- |
| Unrolled owned record | Reads / update every 8 reads / update every read | Two-process pilot throughput ratios 0.772× / 0.754× / 0.771×; about 30–33% more elapsed time |
| Projected state, ordinary fold | Same three workloads | Six alternating fresh-process pairs; median ratios 1.141× / 1.145× / 1.201× |

The projected measurements run 250,000 requests after 10,000 warmup requests per
workload. Pair seeds vary the input values. Pair 4 is substantially noisy: its
ratios are 0.727×, 0.373× and 3.728×. Every sample, the complete summary and the
negative pilot remain here; no samples were discarded. These are local Node
observations, not universal speedups or direct Handwired comparisons. They do not
establish a held-out lifecycle model or enable automatic selection. Import,
initialization, emitted bytes and final snapshots are retained, but peak memory,
training throughput and end-to-end compilation profitability are not measured.

Combining projection and frozen unrolling still exhausts ordinary proof resources
at tested owned chunk widths 1, 2 and 4. The failure logs are retained. Explicit
owned leaf widths offer bounded alternative proposals; they grant no proof or
profitability authority. The successful projected-fold plan does not unroll, and
the successful complete frozen plan retains the record.

## Checker and producer work

The [frozen corpus diagnostic](corpus/report.md) completed all ten unchanged
programs with explicit `quick` planning effort: all compiled, all admitted rewrite
alternatives, 25 laws were admitted and six were reused across programs. No
alternative was selected: all ten retained the baseline at the measurement-
evidence gate. Every search reached its configured time bound; the near-miss
report contains no checker rejection. This is bounded planning coverage, not
exhaustive search or execution-speed evidence. The captured Python 3.14
environment lacks optional NumPy, python-sat and hnswlib modules; its complete
environment and source identities are retained.

Ordinary scheduling visited the new recipe once and deferred it 19 times across
admitted states. A separate [explicit recipe pass](corpus/corpus-explicit-projection.json)
checked all ten captured cores and proposed no replacements. The new carrier
projection therefore has no demonstrated benefit on this held-out corpus; its
positive U32/F32 examples remain development cases. Earlier context-change and
disk-full attempts are retained as incomplete infrastructure attempts. Only the
final fixed-input run supplies the complete funnel.

The conversion checker can try one bounded reduction of either side and compare
it directly with the retained target. This avoids reducing an expensive target
continuation while exposing an identity wrapper. It reuses the existing reducer,
alpha normalization and limits. Ordinary constructor Cases still justify opening
a structurally gated source helper. No new primitive, numerical axiom, work-limit
increase, theorem whitelist or cached conversion verdict is introduced.

`private-core-validation.json` binds all 227 source files to the published exact
standalone core tree. Its 14 phases cover the library, all 81 integration targets,
example builds and doctests: **486 tests pass**. The source tree was compared
file by file with the committed package. The unrelated query-syntax working edit
was excluded. Six new tests cover full owned continuations, transparent gates,
opaque abstract functions and rejection of unrelated free-input substitutions.

Untrusted proof construction now shares bounded hygienic binding facts, keeps
owned computations behind pure source boundaries, factors exact conversion
leaves, proves each chunk step under a symbolic accumulator, and opens gated
helpers with checked case lemmas. These changes reduce repeated construction and
normalization work; they do not cache a proof verdict. Thirty focused regression
tests plus the owned-graph integration pass. False output conclusions and a
well-typed alternative step with a false universal simulation reject.

`reference-selected.json.gz` is an independent run of the raw selected source.
Its raw program namespace differs from the original source, as expected; decoded
logical state and outcomes were compared. Compiled selected plans must preserve
the original namespace, and their exact portable bytes were compared to the
original reference at every step. Assertions preserve signed zero; the projected
JavaScript journal tags negative zero explicitly. Some older JavaScript journals
serialized ordinary JSON after comparison and are not evidence of retained
negative-zero spellings.

## Reproduction and trust

From the distribution root, with a built current CLI:

```sh
ink emit-core examples/adaptive/fold-state-projection.ink -o build/project.core.json
PYTHONPATH=knowledge:planner python3 reports/owned-graph-projection-2026-10-17/propose.py \
  build/project.core.json --compiler target/debug/ink \
  --function evaluate --field values -o build/project.plan.json
ink compile build/project.core.json --core --plan build/project.plan.json \
  --target javascript -o build/project.mjs
INK_TEST_WASM=1 INK_PARITY_REQUIRE_ALL=1 cargo test --test adaptive_fold_projection
```

Compressed source/plan files can be decompressed to replay the retained F32 case.
`source-pins.json` distinguishes the experimental compiler's archived packages
from the later publication pins. `publication-rebuild.json` records a fresh
private build of committed source `1a81993a` with the publication pins: all three
measured JavaScript images and the regenerated projection plan match byte for
byte. Every materialized source file was checked against its committed Git blob;
private APFS copies share storage through copy-on-write, while Cargo creates a
fresh target directory normally. `publication-Cargo.lock` retains the exact
resolution data. This closes that finite image-reproduction check; distribution
CI is a separate gate.
The mathematical laws do not prove the source translator, checker implementation,
literal emitters, ABI, runtime or toolchain. Stateful owned work remains on the
host; this is not device-training evidence. General graph/tape compilation,
learned representation selection, arbitrary goal-controlled adaptation and the
full Handwired/Pretext/Freerange workload and performance requirements remain open.
