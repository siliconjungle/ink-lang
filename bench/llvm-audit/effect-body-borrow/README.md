# Borrowing checked action bodies during effect derivation

The effect checker previously cloned every checked action/keep Body before traversing it. CheckedActions privately owns immutable typed IR, and its accessors return shared references. The checker now borrows a body while mutating only its separate work budget, recursion set and owned summaries. Source admission, effect algebra, summary serialization and failure policy are unchanged.

The probe links the actual distribution library, parses/admit/elaborates outside the timed section, warms effect derivation once, and derives from the same checked IR three times per process. Its allocator counts allocation/reallocation calls and cumulative requested bytes. These are not live/peak memory or RSS. The old root is 195daa667e2c22c73f1e5c57c8a7cc3d37379c33; measurement.json binds before/after artifacts and source hashes.

| Constructed case | Allocation calls before → after | Requested bytes before → after | After/before median analysis time |
|---|---:|---:|---:|
| 1 query × 8 statements | 287 → 268 | 21,992 → 18,452 | 0.983 |
| 32 queries × 64 statements | 69,698 → 65,506 | 4,485,987 → 3,577,123 | 0.980 |
| 32 queries × 128 statements | 139,331 → 131,043 | 8,943,331 → 7,124,259 | 0.988 |

Each case has nine alternating fresh-process before/after pairs and 27 timed derivations per variant. Every before/after effect byte sequence agrees. The core library is debug/unoptimized, the identical probe client uses opt-level=1, and the aarch64 macOS machine was shared with other work. Allocation reductions are deterministic; these modest time differences are observations under contention and include allocator-accounting overhead. This is compiler-component evidence, not browser/application performance or a release-build speed guarantee.

To reproduce, build each root in an isolated checkout with `cargo build --bin ink --message-format=json`, retain the `verified_language` .rlib from its compiler-artifact record, and compile probe.rs against that exact file:

```sh
rustc --edition=2021 -C opt-level=1 probe.rs --extern verified_language=PATH_TO_RLIB -L dependency=PATH_TO_DEPS -o probe
./probe 32 64 3 effects.json
```

Use distinct static client executables before rebuilding the candidate library. Alternate process order and compare the complete effects.json files for each case. Parsing and source admission intentionally stay outside the component measurement.

The existing effect/effect-model tests, independent core package and full hardening suite pass. The first full hardening attempt failed because the non-cone sparse checkout omitted pinned research fixtures; restoring those files and rerunning all 42 tests passes. validation.json preserves both results. The first distribution --lib budget filter ran zero tests; the subsequent independent core invocation ran and passed the actual one budget test. Neither incomplete invocation is treated as validation.
