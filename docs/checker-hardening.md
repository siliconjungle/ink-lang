# Checker and reference-execution hardening

This integration brings Claude's `claude/checker-hardening` bundle into the
current executable core. It changes resource accounting and reference execution,
without adding optimisation laws or changing the proof database's authority.

## Fixed failure modes

- Collection loops copied the whole enclosing value environment per element.
  Map, filter, fold, indexed map, zip and bounded repeat now copy that environment
  once and replace their local bindings on each iteration. This removes an
  accidental quadratic copy from ordinary reference evaluation.
- Copies of lists, vectors, records and opaque state values consume execution
  fuel in proportion to their copied contents. Nested references cannot multiply
  large values for a single fuel unit. Argument validation remains a separate
  boundary: an unchosen branch does not consume execution fuel for an unused
  input. These policies are not a bound on all host allocations or wall time.
- Reference evaluation tracks weighted nesting across expressions and function
  calls. A budget of 384 units charges larger expression frames more heavily.
  Separate expression frames avoid reserving every variant's stack space at each
  level. Arithmetic uses its already checked numeric context after function-body
  checking, rather than rechecking the entire subtree at every operation.
- Proof substitution charges every node copied from a bound term against the
  existing general logic budget. Repeated substitution cannot expand a large
  argument into an unchecked amount of memory. No new equality axiom is added.
- Portable snapshot integers are limited to 4,096 magnitude bytes. Both encode
  and decode reject larger values before expensive decimal conversion. This is
  an additional fixed resource limit, not a change to exact arithmetic or to
  the canonical snapshot encoding.
- Expanding a portable snapshot schema shares a 100,000-node budget across all
  roots and event payloads. Repeated named-record references cannot cause an
  exponential expansion without hitting that limit.
- Numeric hint lookup returns immediately for Boolean-producing binary
  expressions. Normal inference still checks their operands and operators.
  Previously it repeatedly re-inferred Boolean subtrees outside the proof
  budget: one 3,492-byte mutated legacy definition took 76.9 seconds. Exact
  replay now reaches the existing resource limit in about 6.5 milliseconds.
  These are diagnostic observations, not a sampled performance benchmark.
- Source parsing iteratively checks expression-tree depth before extending
  binary and postfix chains. The existing parser-call limit did not cover
  unparenthesised chains; a 20,000-term chain could overflow while checking or
  dropping its AST. Partial trees now reject above depth 128. The executable
  core retains its stricter depth-32 admission limit and unchanged identities.

The evaluator integration uses separate stack frames and explicit weighted depth,
including on Wasm. It does not spawn a large-stack native thread per reference
call. Small-stack tests cover the reported call chains, collection frames and
float frames; this is not a claim about every possible host stack configuration.

The current fold fragment requires the element and accumulator numeric types to
match. Regression coverage retains that contract; it does not add polymorphic
folds. Existing u32/u64 and compute-v2 signed, float, vector and record semantics
remain in the same evaluator.

## Reproduction

From the distribution checkout with its pinned knowledge submodule:

```sh
python3 dev.py test --test hardening
INK_FUZZ_VERBOSE=1 INK_FUZZ_ITERS=1000 \
  python3 dev.py test --release --test hardening -- --nocapture
```

The deterministic mutation harness covers general logic objects, arithmetic
certificates, historical scalar objects, lockfiles, maintenance certificates,
row models, portable snapshots, executable modules and evaluation arguments.
Valid seeds are checked before mutations. The argument corpus includes u32/u64,
i32, f32, vectors and numeric records. Rehashed mutations can reach semantic
checking rather than stopping at an object digest.

`INK_FUZZ_SEED` chooses a decimal seed; `INK_FUZZ_ONLY=TARGET:CASE` reproduces a
case. `INK_FUZZ_FULL=1` includes the complete knowledge corpus; setting at least
1,000 iterations enables it automatically. Debug tests use 2 MiB stacks and
release tests 512 KiB stacks. The test allocator accounts for live/peak memory
and aborts the process on a memory bomb. Elapsed-time assertions run after each
case; they are not preemptive deadlines. A long run should also use an external
process timeout.

This is adversarial regression evidence, not a proof of checker soundness or
complete fuzz coverage of every current package interface. Native code and GPU
hosts have different resource policies; reference fuel is not a runtime sandbox
for generated code. There is no new compiled-program speed claim. Full source
stateful refinement, remaining aggregate/bounded/layout authority migration,
ownership, durable recovery and independent checker verification remain open.

The mutation harness does not cover every source-parser or JSON state-restore
path. Source-chain regressions cover the reported parser defect separately.
Very large exact integers entering through legacy JSON value/restore APIs and
large-module type-checking costs need separate limits and further review.
Portable snapshot limits do not by themselves protect those JSON paths.
