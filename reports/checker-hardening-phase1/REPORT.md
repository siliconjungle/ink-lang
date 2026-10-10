# Checker hardening integration

This milestone integrates Claude's current `a97324c` branch, based on distribution
`377e4c1`, with the current numeric/array evaluator. The core retains general
checking rules. No optimisation law, solver authority or backend recogniser is
added. Knowledge remains pinned to `f5c8e59875cca57093d552ca4b708bb0645a2419`.

## Changes

The general logic kernel charges every substituted node against its existing
proof budget. Portable snapshot schema expansion shares a 100,000-node budget;
Int encode/decode rejects magnitudes above 4,096 bytes before decimal conversion.
Accepted snapshot encoding and program identities are unchanged. Larger portable
snapshot integers are newly rejected; exact program arithmetic remains unchanged.

Reference collection operators copy their scope once per invocation. Collection,
record, vector and opaque-value copies consume fuel according to their contents.
Separate expression frames and a weighted nesting limit cover recursive
evaluation without creating a native thread per call. Arithmetic uses checked
numeric context rather than repeatedly checking entire subtrees. Entry typing
and argument validation remain in place, including lazy branch behavior and the
existing same-element/accumulator fold contract.

Two additional findings arose during integration. Numeric hint inference
repeatedly walked Boolean subtrees, making a small legacy definition take
76.9 seconds. Boolean-producing binary expressions now return no numeric hint;
ordinary operand/operator checking still applies. Source parser call depth did
not bound left-associated or postfix AST depth. An iterative check of partial
trees now rejects depth above 128 before unsafe construction or destruction.
The executable core retains its existing depth-32 bound.

## Evidence

The hardening harness contains ten focused regressions and nine deterministic
mutation targets. Both expanded release seeds pass all 19 tests, each with
1,000 mutations per target: 18,000 mutated inputs overall. Valid seeds from the
pinned corpus are accepted before mutation. Release cases use 512 KiB stacks;
debug cases use 2 MiB stacks. The harness tracks live/peak allocations and checks
elapsed time after each case. Release commands also ran under an external
600-second process timeout.

- [Default release seed](release-seed1.log): 19 passed, 22.04 seconds.
- [Second release seed](release-seed2.log): 19 passed, 21.19 seconds.
- [Independent offline core](core-tests.log): seven passed.
- [Boolean expansion regression](boolean-regression.log) and
  [source-chain regression](parser-regression.log): focused debug passes.
- [Before-fix second-seed finding](finding-seed2-before.log) and
  [exact successful replay](equality-replay.log) preserve the diagnosis.
  The same 3,492-byte [input](equality-99.json) now reaches the existing proof
  resource limit in 6.47 milliseconds. These elapsed observations are diagnostic,
  not a sampled performance benchmark or a generated-code speed claim.

[Metadata](metadata.json) identifies seeds, dependencies and evidence hashes.
The [full distribution suite](cargo-tests.log) passed 150 tests. Published
package revisions are recorded in metadata. Archived reports from earlier milestones are unchanged.

## Scope and remaining work

The published core is `3757051010d3a4040ec83f0eaff7b3ea000f923c`. C, Rust and
GPU packages pin that same core; GPU also pins the matching C revision. Their
[C](standalone-c.log), [Rust](standalone-rust.log) and [GPU](standalone-gpu.log)
standalone checks use the published Git dependencies. The final
[locked offline distribution check](distribution-check.log) passes. These pin
changes alter no emitter code. The Wasm adapter has no core dependency and keeps
its existing revision. Formatting checks pass for both independent core and
distribution sources. Raw command logs are preserved verbatim.

Reproduce with the distribution's committed submodules:

```sh
python3 dev.py test
python3 dev.py test --manifest-path core/Cargo.toml --locked --offline
INK_FUZZ_ITERS=1000 python3 dev.py test --release --test hardening
INK_FUZZ_ITERS=1000 INK_FUZZ_SEED=1592597068 \
  python3 dev.py test --release --test hardening
```

Passing mutation tests does not prove checker soundness, cover every package
interface or establish global host memory/time limits. Very large exact integers
on legacy JSON value/restore paths and large-module type-checking costs remain
open findings. Portable snapshot bounds do not protect those JSON paths.
Small-stack regressions cover reported chains, not every host configuration.

Stateful source/native correspondence, full row/column replacement, remaining
aggregate/bounded/layout authority migration, ownership, usable language release,
runtime adaptation, independent checking, durability and concurrency remain
production gates. This milestone does not complete the full goal. See the
[hardening contract](../../docs/checker-hardening.md) and [roadmap](../../PLAN.md).
