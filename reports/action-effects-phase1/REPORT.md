# Source-bound effects and local error boundaries

The core derives conservative access and prefix-effect judgments from actual
checked ordered actions. Private replay witnesses bind complete source/action
identities. Reference construction uses the judgment; observed journal/outbox
prefixes are exposed for diagnostics before commit/rollback. There is no
optimisation recogniser, journal shortcut or new proof-kernel rule.

## Execution defect found and fixed

An internal `?` in a query previously escaped the reference query frame and
aborted a caller that discarded its Result. A Result-valued keep had the same
problem. It could even return an error from a different nominal type than the
caller's declared error. Generated Rust already kept these errors local.

The reference now exits query/keep frames with ordinary Err values. Explicit
caller `?` propagates them; nested change errors still poison the transaction.
Host failures continue to propagate. `query-errors-before.json` records the
previous aborting behaviour of ignored query/keep errors; the after fixture
commits both, with the expected event. The native/Wasm regression covers direct
query errors, ignored/captured calls, different error types, Result-valued keeps,
read-only collection callbacks and explicit propagation with exact rollback.

## Evidence

- Five effect tests cover source/IR identity, access/keep permissions, abrupt
  suffix suppression, query/change distinctions, literal lazy branches, eager
  fallback evaluation, conditional callback reads and malformed artifacts.
  A deterministic 1,000-call reference sequence checks each actual prefix against
  its judgment and exact snapshots after failed calls.
- Two binding tests check all 11 new canonical entries and compare every pair
  in the finite 112-path domain: **12,544 evaluations** match actual Rust follow.
  Three freshly authenticated, mathematically valid alternative models fail
  fixed-definition binding. A fresh authenticated false theorem fails proof
  admission. Ordinary paths cannot be forged by editing an exported artifact.
- The native action fixtures compare **42 outcomes and exact snapshots** with
  reference execution: 16 scanning, 16 maintained and 10 query/keep regressions.
  Both old control fixtures retain byte-identical generated source/expected
  results. The newly compiled query/keep fixture checks the corrected boundaries.
- Three compiled Wasm modules compare the same **42 outcomes and exact snapshots**
  in Node/V8. Existing control modules are reused unchanged; the query/keep module
  is newly built in release mode. This is neither timing nor browser evidence.
- All **612 canonical entries** replay across **38 bounded views** through the
  preserved f688079 checker, whose copied core files match Git byte for byte.
  The original 601 entries and 42 executable rewrites are unchanged. New entries
  are composition definitions and six ordinary equality theorems. A helper lemma
  makes associativity fit existing proof budgets; acceptance rules/caps are unchanged.
- Store tests, catalogue checking and byte-identical fresh Store import pass.
  All 204 final distribution tests and 23 independent core tests pass. A fresh
  isolated core copy also passes 23 tests offline without external repositories.

## Reproduction

```sh
python3 dev.py test --locked --offline --no-fail-fast
python3 dev.py test --locked --offline --manifest-path core/Cargo.toml
python3 dev.py test --locked --offline --test effects --test effect_model
python3 dev.py test --locked --offline --test state_native \
  result_query_and_keep_errors_are_local_until_the_caller_propagates
node reports/action-effects-phase1/wasm-replay.mjs
python3 knowledge/producers/effect_composition_proofs.py /tmp/effect-laws
ink verify-library /tmp/effect-laws/lock.json
```

The artifact, source programs, compiled Wasm, generated native/Wasm bodies,
requests, expected results, Cargo locks/manifests, original harness and logs are
archived here. Metadata records exact repository identities and source/evidence
hashes. Canonical entries live in the independently pinned knowledge repository.

## Limits

This is conservative abstract typing and validation, not a source-analysis
soundness proof. Keys, local/parameter value correlations, nested payloads and
full ordered observations are forgotten. The typed tree retains source order;
the summary does not prove event/value preservation. Prefix mutation bits are
not committed state, and successful bodies may still fail at commit exhaustion.

The analysis, model binding, execution adapters/primitives, snapshot codecs,
physical rollback and Rust/LLVM remain trusted. Bound composition definitions
do not connect a whole action to an arbitrary database state transition or admit
a representation replacement. No stateful replacement, durability/concurrency,
journal omission or execution-speedup claim follows. Complete action/primitive
correspondence and all-future state/representation refinement remain open.
