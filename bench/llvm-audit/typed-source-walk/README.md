# Avoiding repeated receiver inference in the shared typed-source walker

A duplicate Option/Result callback match arm was unreachable: the earlier arm already handles the same names and receiver predicate. On List.map the duplicate guard still repeated receiver inference before falling through to sequence handling. Deleting the duplicate arm removes28lines; it does not add a cache, change source meanings or widen analysis budgets. The shared walker serves physical, abstraction, sum-codec and Rust-lowering structural analyses.

| Constructed case | Requested bytes before → after | Median time after/before |
|---|---:|---:|
| small (1 × 1) | 2,779 → 2,755 | 1.000 |
| nested (8 × 8) | 671,576 → 536,760 | 0.774 |
| larger (16 × 16) | 5,116,968 → 3,968,424 | 0.777 |
| access_control (16 × 5) | 1,180,589 → 1,180,589 | 0.993 |

Walk size counts chained List.map stages per function. Access control size is balanced pure-key-expression depth, and entries are queries. Nine alternating fresh-process pairs give27timed derivations per variant/case. Full source/visitor/lexical-env/expected-type traces are serialized outside timing and agree for every walker pair; timed callbacks only count visits. Access-control bytes/allocations agree exactly.

The actual core library is debug/unoptimized; the identical client uses opt-level=1 and allocator accounting. Timings include accounting overhead and shared-machine contention. Requested allocation volume includes full realloc requests and is not retained/peak memory or RSS. These are compiler-component observations, not browser runtime or release-build speed claims.

Build each pinned root with `cargo build --bin ink --message-format=json`; retain its verified_language .rlib and compile this identical client with `rustc --edition=2021 -C opt-level=1 probe.rs --extern verified_language=PATH_TO_RLIB -L dependency=PATH_TO_DEPS -o probe`. Keep separate static before/after executables before rebuilding the candidate library. Run `./probe walk 8 8 3 result.data` and compare both result.data and result.data.contexts. Run `./probe access 16 5 3 access.json` for the unchanged control. Parsing/admission/elaboration and trace formatting stay outside timing.

The independent core package passes all368tests, including contextual callback types and bound analysis. The full hardening suite passes42tests66.23s. No mirror test was added for a dead-arm deletion; the retained actual-library comparison and existing semantic/budget/proof suites validate it. Exact revisions, source/client/compiler hashes and raw samples are in measurement.json and validation.json.

Integration rebased onto incoming root1b5a8f3d and knowledge243f1bfb, preserving independently published word-circuit/rotate work. The rebuilt integration passes370core tests, all42hardening tests81.28s and both CPU refinement-parity tests13.05s. One private frozen corpus run compiles10/10programs, admits45laws with7cross-program reused and4selected alternatives;6programs retain baseline at the measurement gate. This is compatibility/generalisation evidence, not a planner/runtime speed attribution. The component measurements above retain the original isolated core epoch. See integration-validation.json for exact compiler/root/source identities and all test hashes.
