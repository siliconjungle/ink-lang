# Generic frozen-library dispatch

V8's machine reducers dispatch by operator before inspecting operands. Ink's
database now uses the same general distinction for frozen-law discovery: build
temporary constructor/operator buckets from the immutable subject, filter exact
sorts, then run the existing matcher. Root formal parameters retain every site
of their sort. Constants, repeated parameters and lexical capture checks remain
with the exact matcher. Site order and duplicates are preserved. Changed subjects
rebuild the index; no mutable cross-request cache or schema change is introduced.

This is untrusted discovery. A matching head grants no equality or condition.
Matched rows still authenticate/decompress their proof and use ordinary admission.
Compiler semantics, proof rules, budgets and runtime selection policy are unchanged.

## Same-input control

All ten frozen semantic subjects are queried against all three installed frozen
libraries (435 rows). Every returned label, proof identity and order equals the
exhaustive implementation from knowledge revision
`6f2d51807db92444705b5e3962838de506bbe78f`.

| Metric across 30 subject/library queries | Exhaustive | Indexed |
|---|---:|---:|
| Exact matcher calls, including recursion | 111086 | 310 |
| Median of process sums of lookup medians | 55.486 ms | 33.443 ms |

Three fresh Python processes each run eleven alternating rounds per query.
Metadata file reading/parsing, subject traversal, bucket construction and a shared
mock proof-loader boundary are included. Semantic JSON decoding, Python imports,
proof decompression and kernel replay are excluded. Other work shares the host.
The timing row is the median of three sums of the 30 individual lookup medians;
it is not an end-to-end compilation interval or a runtime speedup.
`control-*.json` retains all samples, exact input/source/index hashes and choices.

Ten focused tests preserve wildcard, constant, repeated-variable, duplicate,
renamed and callback-capture behavior, with independent exhaustive matching over
installed metadata. Existing corruption and SQL-reader boundaries pass. Seven
integration tests replay the prior 83 word and 15 F32 certificates, exercise
source-bound applications and verify renamed integer discovery. The index does
not load unmatched proofs.

## Frozen corpus

The required default quick corpus compiles all ten unchanged programs and admits
alternatives for all ten. It observes 24 laws, six reused across programs, and no
selected alternative or representation. Every final gate requests measurement
evidence, and all ten quick budgets expire. The reported median compilation
interval is 51.0765 seconds, excluding private publication preparation. No
near-miss reason is recorded.

The preceding integer corpus observed nine programs with alternatives and 20
laws. These are unpaired, time-saturated runs with different source contexts;
the counts and durations do not establish a causal compiler speedup. The exact
same-input dispatch controls above establish the narrower lookup improvement.
The complete corpus context, captured inputs, plans, terminal records and reuse
report are in `../corpus-head-discovery` and its adjacent summary.

## Reproduce

Use the full package/source revisions in `source-pins.json`. No compiler rebuild
is required for the dispatch-only control: restore the compressed semantic inputs
under `build/v8-head-discovery`, copy `subjects.json` there, and obtain
`baseline-frozen.py` with `git -C knowledge show
6f2d51807db92444705b5e3962838de506bbe78f:producers/frozen_laws.py`.
Run `compare.py --output PATH` from the distribution root with
`PYTHONPATH=knowledge:planner` and the pinned Python environment. Its expected
scratch path is `build/v8-head-discovery`; `prepare.py` can regenerate the subjects
from the retained core inputs using the selected compiler image. Set the scratch
retention manifest active before recreating retired outputs.

For the full corpus, run `python -m ink_planner.corpus` with
`--manifest bench/planning-corpus/corpus.json`, the recorded compiler,
`--knowledge-root knowledge --target javascript --planning-effort quick`, a fresh
private scratch path and output directory. Keep knowledge/planner source stable
until its terminal context check. Untimed generated builds use the local Cargo
entry point with debug and incremental output disabled. Direct toolchain builds
must receive the actual configurations from `ink-cache prepare-sources ROOT`.

The wider V8 audit remains open. The new source read of Maglev's HAMT records
asymmetric merge semantics, collision/resource bounds and unordered traversal;
it grants no source range fact. Three U64 identities remain outside production:
longer authoring and conditional decomposition trials are separate private work,
with no unconditional admission or runtime claim from those trials.

The subsequent upstream suffix-parametric fold-prefix merge is recorded in
`merge-context.json`. The combined 16-test suite passes; original measured/corpus
source contexts remain recorded separately. A seven-round control after the merge
again checks identical labels/identities/order and 111,086 to 310 matcher calls;
`merged-control.json` records it separately from the selected three-process timing.
