# Frozen numeric structure specialization

The bounded knowledge proposer can now materialize frozen F32 coefficients,
including records/lists, signed zero, subnormals, infinities and exact NaN bits.
Finite values use ordinary literals; exceptional values use `f32_from_bits`.
Value classification is separate from equality folding: floating comparisons
remain source operations. The untrusted normalizer retains F32 operators as
ordinary terms rather than doing integer arithmetic on their bit carriers.

The core action continuation path now reuses existing fixed scalar meanings
after evaluating arguments once in order. State, events, nested failures,
rollback and observation positions remain part of the projected transition.
Primitive registration does not admit unsupported meanings: binary64 and
unimplemented conversions continue to reject. No executable-core version,
source syntax, arithmetic identity or profitable-selection exception changes.

## Configured structure, then checked specialization

[The example](../../examples/frozen-numeric-structure.ink) configures a numeric
representation with F32 coefficients, then explicitly freezes `Model` and
withdraws its writer. The configuration trace is authored data, not evidence of
fitting or convergence. A learner can produce the same typed configuration.

The serving action originally reads `Model`, dispatches on a record's kind and
calls a pure helper. The selected action uses the configured arithmetic directly:
`((x * 0.5) + 0.25) + Live.get(0).unwrap_or(0.0)`. Its F32 operation order and
rounding remain intact; live data still changes. Other entries preserve raw
coefficient bits and IEEE comparisons: a signalling NaN is not equal to itself,
and negative zero compares equal to zero. Generic helper declarations remain.

Every action carries an ordinary complete transition proof under the checked
frozen domain. The restricted application's behavior is preserved; this does not
claim different authored variants are interchangeable. Changing a coefficient
while retaining its old proof rejects. Restore still binds exact frozen rows,
including their floating-point bit patterns.

```sh
ink build-model examples/frozen-numeric-structure.ink \
  examples/frozen-numeric-structure-training.json \
  --freeze-roots Model --specialize-frozen --target javascript -o build/numeric
ink verify-model build/numeric --replay
```

See [the mechanism and remaining scope](../../docs/frozen-structural-specialization.md)
and [ordered primitive correspondence](../../docs/f32-transition-primitives.md).

## Validation

- The exact committed standalone core passes **442 tests** in a private checkout
  and private Cargo target, independent of the distribution and its backends.
- All **56 standalone JavaScript tests** pass against that published core.
- **29 focused knowledge tests** cover materialization, complete action proofs,
  changed-coefficient rejection, hygiene, bounded normalization/cache behavior,
  composable state, storage authoring and authenticated frontier controls.
- All **nine frozen-state integration tests** and **42 hardening tests** pass.
  The final numeric fixture additionally checks the new package execution path.
- The numeric history compares **55 complete observations** across Rust,
  JavaScript, Rust-Wasm and the native GPU host, with exact CPU checkpoints.
  One independent numeric control actually dispatches to the GPU; the stateful
  serving/training work remains on the host.
- The built JavaScript package executes all **55 observations**, starts from its
  typed deployment snapshot, rejects the withdrawn writer, restores exact state
  and creates independent seeded instances. Build-model verification replays the
  training/configuration trace and specialization/restriction proofs.
- Fresh release/debug builds produce byte-identical restricted/selected cores
  and JavaScript entry modules. Backend/runtime independent checks and locked
  dependency fetches pass; tracked package locks bind the new core graph.

The new standalone transition tests include ordered effectful operands, aborted
second operands, committed events/state, observations inside a bitcast, and
unsupported-domain rejection. Knowledge coverage uses finite and exceptional
coefficients alongside changing live inputs; scalar and nested float comparisons
are never reduced using Python syntax equality.

## Broader audit limitation

An extra all-knowledge audit initially used an incomplete Python module path and
was interrupted. A corrected run exposed a stale boundary-reader assertion;
that test now checks the existing size-stratified measurement contract and passes.
The corrected audit then stops at historical column-layout archive reproduction.
The same mismatch occurs with the previous authoring normalizer. Its archived
forged-bit test also rejects at a source-definition index mismatch before its
intended mathematical check. Those historical fixtures need fresh source-bound
admission; this report does **not** claim all-knowledge health. Retained logs keep
this limitation visible rather than weakening the checker or refreshing evidence
hashes as a substitute for proofs.

## Evidence and remaining work

The ledger binds checked cores, portable proof packages, typed snapshots, complete
histories, target receipts, independent-core identity/testing, compiler logs and
the complete built JavaScript artifact. The audit validates bytes and consistency;
`--ink` additionally replays the retained selection using the ordinary checker.

```sh
python3 reports/frozen-numeric-structure-2026-10-16/audit.py
python3 reports/frozen-numeric-structure-2026-10-16/audit.py --ink target/release/ink
```

This is a capability/assurance milestone, without a new speed, memory, convergence
or automatic selection claim. The proposer remains bounded and does not generally
unroll graph/tape loops. Learned physical choices, full neural specialization,
device training, complete Pretext preparation/performance and broader Freerange
integration remain open. Projection, checker, lowerings, runtime and toolchains
retain implementation trust; tests and these proofs do not close that chain.
