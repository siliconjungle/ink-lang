# Source contracts and checked implementation refinement

This change separates a specification's observable requirements from the algorithm
used to satisfy them. All new declarations elaborate to checked core obligations;
annotations, names, hashes and database membership grant no proof authority.

The language adds `spec fn`, `spec query`, `spec change`, static `requires` and
`ensures`, action `before`, committed-state `invariant`, private value/list state,
transactional value assignment, and named `implementation ... for ...` bodies.
Exact finite collection observations include `multiset`, `singleton`, bag addition,
`unique`, `unique_ids` and `unique_by`. Existing fallible runtime clauses keep their
original meaning. See [the language guide](../../docs/source-contracts.md),
[the reference](../../docs/language-specification-draft.md), and
[the state example](../../examples/state-contracts.ink).

The independent knowledge database owns proof construction, reusable laws and
candidate search. The normal planner recipe `contract-witnesses` discovers
refinements; core rechecks the complete selected module and its callers.
Canonical laws include four optimisation laws, six source-authored collection laws,
and twelve state obligations with their ordinary induction dependencies.
Pure primitive law contexts omit unrelated helpers so they transfer across modules.

## Optimisations

[The executable benchmark source](../../examples/contract-optimisations.ink)
contains four independently proved replacements:

| Specification | Initial implementation | Checked candidate |
|---|---|---|
| `zero(xs)` returns zero | multiply every element by zero, then sum | constant zero |
| `copy(xs)` returns `xs` | identity map | return the immutable input |
| `sorted(xs)` requires sorted input and returns it | sort again | return the input |
| `ids_are_unique(xs)` requires unique IDs and returns true | scan IDs again | constant true |

These proofs establish semantic admissibility. Runtime measurements, separately,
establish profitability only for the reported workload and host. Public guards
are retained: the sortedness and uniqueness examples still validate their input.
The uniqueness example eliminates a second check; it does not claim uniqueness
validation itself becomes constant time. A source caller with a proved precondition
can avoid the public-boundary check.

## Measured complete-call results

Host: Apple M4 Pro; darwin 24.6.0; Node v24.19.0.
The regression process was paused during measurement. Times are medians of nine
alternating rounds; all samples, call counts and phase timings are in
[benchmark.json](benchmark.json). These are warm resident-input microbenchmarks,
not end-to-end application or cross-backend speed claims.

| Function | Elements | Baseline (µs/call) | Selected (µs/call) | Baseline / selected |
|---|---:|---:|---:|---:|
| `zero` | 64 | 1.346 | 0.024 | 56.08× |
| `zero` | 4,096 | 19.192 | 0.026 | 738.15× |
| `zero` | 65,536 | 385.794 | 0.088 | 4384.02× |
| `copy` | 64 | 0.093 | 0.023 | 4.04× |
| `copy` | 4,096 | 2.684 | 0.024 | 111.83× |
| `copy` | 65,536 | 77.382 | 0.091 | 850.35× |
| `sorted` | 64 | 1.399 | 0.781 | 1.79× |
| `sorted` | 4,096 | 81.258 | 45.835 | 1.77× |
| `sorted` | 65,536 | 1516.567 | 770.554 | 1.97× |
| `ids_are_unique` | 16 | 4.218 | 9.145 | 0.46× |
| `ids_are_unique` | 64 | 9.760 | 4.771 | 2.05× |
| `ids_are_unique` | 256 | 119.750 | 59.677 | 2.01× |

The small 16-record uniqueness case is slower in this run. The larger cases
benefit from eliminating the duplicate scan; proof eligibility alone does not
justify selecting the candidate for every workload. No allocation or peak-memory
claim is made. Checking and emission are reported jointly as a separate phase;
they are not included in the per-call speedups.

## Validation and trust boundaries

All 31 mandatory contract-scope suites passed: 161 tests, with one intentionally
ignored manual benchmark. Validation completed across the primary run, its
continuation, and the repaired indexed-fixture rerun. [The combined receipt](conformance.json)
retains that history. The final browser run passed 649 comparisons and 145 GPU
calls. Coverage includes C, Rust, JavaScript, C-Wasm and
Rust-Wasm, actual eligible native wgpu and browser WebGPU dispatch, transactions,
events, exact snapshots and representation migration. New tests include rejected
preconditions, duplicate IDs, invalid but correctly checksummed snapshots,
rollback, nested non-Result changes, private imports, bag multiplicity and float
bit identity, malformed/stale proof evidence, and rehashed false candidate bodies. A separate action-refinement check replaces
a query with another permitted result, verifies calls and public guards on all
CPU targets, and rejects a freshly rebound out-of-contract replacement.
Independent package tests use their committed Git dependency pins.

The browser environment's public Compiler API accepts raw proof JSON and checks
all twelve external state obligations in its Wasm compiler. Raw JSON avoids
JavaScript Number rounding of full-width proof literals. The browser fixture
executes the compiled module and checks atomic rejection of invalid restore.
Four pure optimisation contract laws also pass the independent Lean kernel.

Scalar proof caches now bind the exact compiler bytes as well as the goal.
The stronger symbolic equality normalisation changed two bundled indexed-aggregate
SAT proof views; both were regenerated and fully checked, including their nineteen
representation obligations. Their old immutable entries remain historical data.
Certificates must always replay against the selected checker; an old cache hit
is never admission authority.

Conformance is not a proof of compiler, generated code or GPU driver correctness.
State contracts and guarded compute pipelines execute on GPU hosts' CPU fallback;
eligible unguarded pure work still dispatches on the device. `gpu-required` rejects
unsupported guarded pipelines. Low-level typed/packed ABIs remain caller-trusted;
public checked value/JSON and snapshot boundaries enforce their contracts.

Postconditions restrict only the observations they state. `emits` limits event
channels, not complete event history; exact event preservation uses the existing
whole-action equality proof domain. Collection identity is structural and preserves
raw float bits; scalar floating-point equality remains IEEE numeric equality.
No numerical approximation was introduced. Automatic candidate discovery currently searches pure result-equality witnesses;
explicit action refinements use the same package protocol and state proof checker.
State projection and automatic proof search remain bounded, explicit domains; unsupported obligations fail closed.
The Lean translator checks pure supported evidence and explicitly reports state
proofs and unsupported structural floating-point equality as unsupported.

The broad historical knowledge test discovery is not all green in this checkout:
327 tests ran, with 65 errors and 136 skips caused by missing archived report/tool
fixtures. The focused contract, store, recipe, incremental and implementation tests
pass. The validation manifest records this separately from current integration
conformance rather than treating skipped historical tests as successful checks.

## Evidence files

- [Conformance and repair history](conformance.json)
- [Canonical proof and package identities](proof-identities.json)
- [Independent package checks](package-validation.json)
- [Browser backend comparisons](browser-parity.json) and [browser Compiler API](browser-compiler.json)
- [Independent Lean result](lean.json)
- [Toolchain versions](toolchains.json) and [all timing samples](benchmark.json)

## Reproduction

Run from the distribution with its pinned submodules and Rust, Node, Python, Zig,
Lean, Chrome and the knowledge dependency `python-sat==1.9.dev5` available. `INK_TEST_ZIG`, `INK_TEST_LEAN` and `INK_TEST_CHROME`
must identify the actual executables.

```sh
python3 tools/check_feature_parity.py --scope contract --run \
  --receipt build/source-contracts-full-parity.json
PYTHONPATH=knowledge python3 -m producers.contract_candidates \
  examples/contract-optimisations.ink build/contract-candidates-final \
  --compiler target/debug/ink
python3 tools/bench_contracts.py --compiler target/debug/ink \
  --candidates build/contract-candidates-final -o build/contract-benchmark-final
node bench/gpu/browser-contract-compiler.mjs "$INK_TEST_CHROME" ../ink-environment
```

Build the browser environment's compiler and package first. The full parity run
produces the state proof and forged snapshot fixtures consumed by the browser
Compiler API check. Benchmark steady state separately from concurrent build/test
work. Measurement setup, proof checking/emission, input construction and exact
output comparisons are outside call timing; public guards and representation
conversion remain inside. Every result is retained until comparison. Nine rounds
alternate baseline/selected order on captured immutable inputs. The JSON report
includes all samples, host/toolchain identity and separate checking/emission times.
