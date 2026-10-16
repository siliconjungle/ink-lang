# Checked half-word count alternatives

V8's 32-bit Wasm `Int64LoweringReducer` splits a 64-bit word into low/high
32-bit halves. Its popcount adds the half counts; leading/trailing zeros select
the appropriate half and offset. Ink now offers those algorithms as ordinary
knowledge equations using existing narrow/shift/count primitives. Count decomposition needs no new compiler, backend or ABI primitive, and the
selection policy is unchanged. This is not a transfer of V8's
whole pair representation, atomic operations, call descriptors or frame states.
The upstream source is pinned at `c4e049d3cbda775e2c3af9410f6e18b18388d68b`;
its Wasm count result representation differs from Ink's U32 results.

Seven equations include plain decompositions and optional zero, one-bit popcount
and odd trailing-zero guards. Every equation carries a fixed-counts-v5,
shared-select-v3 RUP certificate and replays through the ordinary checker.
Strict hygienic input bindings preserve the original argument's evaluation once;
nested half bindings keep lazy branch execution. No operation catalogue, pattern,
profile or hash supplies equality authority. Algorithms and discovery live in
`ink-knowledge/producers/v8_count_lanes.py`, with an indexed frozen proof bank.

Public `ink compile` discovers eight admitted candidates through the generic
semantic recipe, covering all seven new roots. Without comparable observations
it selects the baseline. No theorem-specific compiler/planner machinery was added.

The actual compiled JavaScript complete-call experiment compares eight checked
plans on one source: literal, plain/guarded all-count combinations, three popcount
alternatives, and plain/guarded leading/trailing-zero combinations. It uses the
installed compact adapter, exact tagged U64 transfer, independent reference
results, full output consumption, three fresh Node processes and eleven rounds
per phase. Each sample targets at least eight milliseconds, bounded at 1,024
calls. Encoding/setup is excluded; input decoding, execution, owned-result
encoding and consumption are included. Each of 18 equally weighted phases has
two changing-cohort calls: three count folds over six word shapes. Training has
512 words and holdout 769, with independent seeds and disjoint normalized inputs.

| Compiler cohort | Training ratio | Held-out ratio |
|---|---:|---:|
| Development image, eight candidates | 3.6110x | 3.6082x |
| Combined main image, two frozen candidates | 3.5591x | 3.6931x |

Both studies choose the plain all-count plan. Concurrent main changes fix shared
binary32 tag capture and change twelve emitted JavaScript modules. A fresh study
therefore measures the combined compiler with two frozen candidates, new seeds,
and lengths 640/997. On its holdout the selected plan's largest observed weighted
sample bound is 1,341,010 ns versus the baseline's smallest 3,949,351 ns,
passing the existing 10% empirical extrema guard. This is a bound over observed
weighted samples, not statistical confidence. All eight development plans were timed on that study's holdout; the fresh study
times the frozen pair only. Each acceptance decision is restricted to its training
incumbent and baseline. Per-phase winner reports are exploratory and do not retune it.

The combined gain is not uniform. Plain splitting slows sparse popcounts and
zero-only calls; guarded versions reduce some regressions at a cost on dense
inputs. All 1,080 exact positive and negative observations (864 development and 216
fresh integration observations) are published under their original execution
contexts. No observation is relabelled to a
later compiler/knowledge context, and no placement rule or fitted model changes.
This does not establish a general Ink, native, GPU, application or Frontier
speedup. The host readback is Apple M2 / Mac14,2 / eight physical and logical
cores; concurrent load and power state were not captured.

Validation covers all seven exact statements, ordinary discovery, strict input
work under evaluation-budget failure, and false right-hand sides with recomputed
CNF identities. The source controls include all single bits, their complements,
random words, zero, both half boundaries, all ones and unaffected U32/I32 entries.
Four source plans pass 56 native calls, 168 JavaScript calls across trusted,
portable and compact boundaries, and 56 actual Rust-Wasm JSON calls. The latter
use four separately emitted/compiled Wasm packages with exact integer transfer.
These are finite implementation checks, separate from the universal equations.
All 52 Rust/Rust-Wasm emitted files stay byte-identical across the main merge.
The changed JavaScript modules pass the same three-boundary controls on the
combined image. The concurrent mutable/guarded graph integration tests and all
nine guarded-specialization producer tests also pass. Previous count, merged-core
and conditional-proof archive audits pass.

The unchanged ten-program planning corpus runs against private publications
for the original count bank and both successive concurrent integration contexts.
Each run must finish with terminal zero and an unchanged source-bound context.
The final actual checkout must match the last context; the final observation
append changes neither its proof snapshot nor producer/library/policy sources. Its terminal receipt, funnel and exact inputs
are retained. It is a generalization control, not a count workload or a causal
compiler timing experiment. The final run compiles all ten programs, admits 59 laws, reuses seven across
programs and selects no alternative by default. None of the new count roots is
attributed. The earlier two contexts each admit 58 laws with seven reused.
Shared-host, time-bounded runs do not establish causal planner acceleration.

`selected-inputs.tar.gz` contains deduplicated, content-addressed proof, source,
plan, measurement, conformance and corpus inputs. Private stores, dependencies,
targets, whole repository copies and the rejected private helper prototypes are
excluded. Git pins preserve the implementation history and the selected compiler
image remains a separately declared baseline. `audit.py` authenticates the
capsule, canonical database observations, guarded selection arithmetic, discovery
and corpus receipts; `--compiler PATH --scratch FRESH` also replays the seven
proofs and retained source plans. `--materialize FRESH` restores selected inputs
only. Source and build runners, exact Cargo locks, compiler/core/package pins and
raw timing receipts are retained for reproduction.
