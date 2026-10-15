# Handwired integration programme

Freerange and Pretext are also part of this work. The companion
[contracts and preparation programme](chenglou-optimisation-programme.md)
records their pinned sources, compiler mechanisms, numeric constraints and
cross-domain acceptance criteria. Their use in the documentation website is
separate from implementing these mechanisms in Ink.

James's target is to absorb the useful mechanisms in Handwired and meet or beat
its performance on equivalent workloads, while preserving Ink's checked meanings.
This is a performance requirement and an open programme, not a claim that every
workload already meets the target.

The investigation is pinned to Handwired
[`09f23d276d3b9284cea4eec61ffd934950cc979e`](https://github.com/chenglou/handwired/tree/09f23d276d3b9284cea4eec61ffd934950cc979e),
an MIT-licensed library. Current Ink bit-state code is independently authored;
it follows the published Shift-And algorithm and Handwired's useful principle of
packing exact bits. Any direct source transfer must retain upstream attribution
and license notices.

## Mechanisms to carry into Ink

| Mechanism and upstream evidence | Ink integration and acceptance condition | State |
| --- | --- | --- |
| [Whole values and exact bits](https://github.com/chenglou/handwired/blob/09f23d276d3b9284cea4eec61ffd934950cc979e/src/json-search/bit-emit.ts) | Transport checked range/grid/bit facts; admit integer execution only with exact source correspondence, including all partial sums | Scalar word proofs exist; wider fact transport open |
| Packed state and shared-base gated reads | Bit-state algorithms, packed lane laws, packed table representations; compare different state widths and density | Literal bit-state library, eight scalar laws and matched search benchmark implemented; general representation selection open |
| One-hot and at-most-one selection to gathers | Checked exclusivity and inactive behavior; preserve finite/range premises for floating masked sums | General proof and representation consumer open |
| [Bounded staged loop programs](https://github.com/chenglou/handwired/blob/09f23d276d3b9284cea4eec61ffd934950cc979e/src/json-search/loop-program.ts) | Keep reusable loop bodies rather than full unrolling; compose per-item work and carried state; preserve simultaneous assignment | Existing finite loops available; compositional schedule work open |
| [Prefix networks](https://github.com/chenglou/handwired/blob/09f23d276d3b9284cea4eec61ffd934950cc979e/src/runtime/prefix-networks.ts) | Checked associative scans, transition-function composition and linear-step powers; preserve operand order for noncommutative composition | Existing integer GPU scans available; general algebra consumer open |
| [Circuit liveness, common terms and sparse layers](https://github.com/chenglou/handwired/blob/09f23d276d3b9284cea4eec61ffd934950cc979e/src/runtime/numeric-ui-core.ts) | Select roots, share pure terms, plan lifetimes, compare sparse execution with direct statements; retain arithmetic rounding points | Partial foundations; circuit representation and complete comparison open |
| [Patterns as data](https://github.com/chenglou/handwired/blob/09f23d276d3b9284cea4eec61ffd934950cc979e/src/json-search/search-step.ts) | Reuse compiled kernels while uploading small parameter tables; account for setup amortization and retained storage | Explicit packed literal parameters measured; general specialization selection open |
| [Resident stores and output windows](https://github.com/chenglou/handwired/blob/09f23d276d3b9284cea4eec61ffd934950cc979e/src/json-search/gpu/host.ts) | Keep pipelines on device; upload changed regions and read only observed outputs, with clear ownership and mutation semantics | Existing resident sessions; automatic placement and broader scoped transfer work open |
| Layout and statement-order sensitivity | Search row/column/blocked layouts, packed inputs, workgroup size, unrolling and statement ordering; measure adverse workloads and multiple devices | Explicit transposed packed-input benchmark measured; general search open |
| [Searching, choosing and bounded compaction](https://github.com/chenglou/handwired/blob/09f23d276d3b9284cea4eec61ffd934950cc979e/docs/patterns.md) | First/any/tie contracts; monotone count vs binary search; stable filter/top-k; no generic permission to change the chosen answer | Collection foundations available; measured reusable alternatives open |
| Precomputed layouts and rare-change tables | Compile a static configuration once, maintain its derived data and reuse it across dynamic inputs | Existing staging/keep foundations; whole lifecycle measurements open |
| [Explicit behavior choices](https://github.com/chenglou/handwired/blob/09f23d276d3b9284cea4eec61ffd934950cc979e/docs/behavior-choices.md) | Staleness, finality, bounded capacity and named fallback are source contracts; never silently change visible timing, hit-testing or limits | Temporal and permitted-observation contracts open |
| [Derivatives and learned geometry](https://github.com/chenglou/handwired/blob/09f23d276d3b9284cea4eec61ffd934950cc979e/src/learned-gallery/README.md) | Exact frozen modules plus separately specified derivatives/estimators and trainable parameters; validate forward and backward computations independently | Authored reverse graphs, explicit hard-operation policies, 244-parameter ReGLU construction and complete Adam/backtracking state and cooperative queued training implemented; general source reverse AD and frozen specialization remain open |
| Learned replacement and search | Rank proof proposals and physical plans; accept changed outputs only under a checked allowed-answer/error relation | General search infrastructure exists; learned integration and statistical certification open |

This inventory extends the [full optimisation programme](optimisation-language-programme.md)
and [circuit design](contract-guided-circuits.md). It does not replace their open
requirements with a search-only milestone.

## Performance acceptance

A result must identify the same task, input corpus, arithmetic, output boundary,
hardware, target revision and execution conditions. Keep Handwired's own circuit
CPU executor, native JavaScript algorithms, native Rust, Wasm and WebGPU controls
separate. A literal-only specialization is not a general regex engine, and a
highlighter is not equivalent to JSON.parse.

Retain complete independent output checks and raw samples. Report encoding,
compilation, upload, execution, readback, memory and total request cost separately.
Measure fresh page loads, held-out inputs, small inputs, warm batches and paused
interactive requests. A persistent GPU comparison does not establish a first-call
win. A benchmark receipt cannot authorize an equality rewrite or automatic plan.

For each workload where Ink loses, classify the gap: algorithm, representation,
code generation, host overhead, transfers or scheduling. Implement the mechanism
at its owning layer and rerun the original benchmark, including losing controls.
Do not hard-code a task name or a measured output into the compiler.

The first experiment compares complete non-overlapping ASCII literal counts on
Handwired's generated documents. It includes both the earlier explicit DFA and a
new packed-state alternative, so gains from temperature/protocol changes are
visible independently of representation changes. Broader regex, JSON processing,
UI/layout, sparse numeric and differentiation workloads remain required work.
