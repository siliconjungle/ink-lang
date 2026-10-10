# Combined action, numerical and durability integration

Functional distribution source `9991e9a58f7b00d881be8a91683d5d23ce7f94a4` integrates the
bounded single action continuation builder, existing numerical value boundaries
and shared native durable CLI across mixed CPU/wgpu execution. Exact dependency
pins, source manifest and retained logs are in receipt.json.

All 265 broad distribution tests passed with local Zig and actual wgpu
enabled, plus 43 byte-identical isolated offline core tests with no catalogue
or backends. The all-target locked offline check is warning-free. Runtime Node
policies/failure injection passed 12 tests; the storage suite passed six. Counts
overlap earlier reports. The storage suite initially ran from the wrong working
directory; rerunning from its independent repository fixed only Python import
resolution.

The generated fixture matched 432 observations/exact snapshots on both Wasm
paths and the mixed host (80 device calls); the numerical fixture matched 101
observations on all five CPU paths and the host (one integer device call).
The complete enabled run recorded 106 actual GPU calls across all fixtures,
including two around durable process death/recovery. Nested action, helper and
whole-action fixtures use the host. Request identity, retries, aborts,
acknowledgements, corruption rejection and baseline/selected checkpoint
interoperability passed. The output logs retain each fixture's counts.

This integration does not change kernel rules or grant numerical logical rewrite
authority. Source/primitive projection, target emission, codecs, toolchains and
device primitives remain trusted. These are finite conformance/adversarial checks,
not machine-code or universal physical representation proofs. Resource failure,
concurrency and benchmark coverage retain their documented boundaries. No new
performance headline or Hunchroom acceptance is claimed. General physical
representation/maintained-view admission and legacy authority migration remain
open. The full PLAN.md is active; editor support/schema evolution are excluded.
