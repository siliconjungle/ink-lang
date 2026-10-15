# Scoped final-use environments

Both final-use walkers previously cloned the entire lexical binding map when
entering each let, lambda or direct variant-fold arm. They now borrow immutable
names and install/restore just the scoped binding. Fresh lexical identities,
initializer-before-binder evaluation, branch joins, capture restrictions and
bounded fail-closed behaviour are unchanged. This is general compiler analysis
machinery; it grants no rewrite authority and changes no knowledge laws.

The baseline distribution is e5b6a96959f8e1edb1a15466736530f97ffc0ea0.
The only production change is core/src/last_use.rs. `measurement.json` binds
source, actual linked clients and probe hashes. `validation.json` binds the
before/after core archives, candidate compiler and local validation logs.

`probe.rs` calls the real ink_core::last_use::analyse. Before timing, it parses
and checks five programs with nested lets, shadowing, callbacks and branches.
The sixth subject is a syntactic over-depth control, explicitly unadmitted and
excluded from the performance range. The original draft used more than the
executable core's depth32 budget; those failed admissions are not measurements.
The final-use API itself has depth256/node1000000 fail-closed limits.

Build each source revision's standalone core library with identical flags:
CARGO_PROFILE_DEV_DEBUG=0 CARGO_INCREMENTAL=0 cargo build --manifest-path
core/Cargo.toml --lib --target-dir TARGET. Preserve each resulting ink_core rlib
and its dependency directory. Compile this identical client against each archive:
`rustc --edition=2021 -O probe.rs --extern ink_core=ARCHIVE -L dependency=DEPS
-o CLIENTS/last-use-scopes-before` (and the analogous after executable).
The archive used here is a debug core with an optimized instrumented client,
not an optimized release compiler. Both clients warm once before measurements.

Run `python3 measure.py --clients CLIENTS --output NEW_OUTPUT_DIRECTORY
--baseline BASELINE_JSON --candidate-source LAST_USE_RS`. The baseline JSON is
retained in measurement.json and needs only provenance data, not authority.
The script alternates before/after order across nine fresh-process pairs for
all six subjects and times three actual analysis calls in each process. Allocation
counters include alloc, alloc_zeroed and full requested realloc sizes during
analyse; they exclude input construction, checking, tracing and output writing.
These bytes measure cumulative allocation requests, not live or peak memory.
Every result is compared to its warm result. All 108 preorder whole-value/field
fact traces also match exactly across revisions, including the empty over-depth
facts. Raw data were independently reaggregated from all 324 samples.

| Admitted subject | Allocation calls before → after | Requested bytes before → after | Median time after/before |
| --- | ---: | ---: | ---: |
| Small scope | 485 → 237 | 38,186 → 24,500 | 0.776 |
| Wide scope | 2,797 → 631 | 174,156 → 77,372 | 0.594 |
| Shadowed scopes | 2,811 → 723 | 181,406 → 81,980 | 0.619 |
| Nested callbacks | 2,995 → 1,653 | 209,051 → 137,967 | 0.732 |
| Branches | 4,145 → 1,317 | 295,299 → 151,733 | 0.704 |

Under shared-machine contention, these admitted phase measurements show 22–41%
less time and 45–77% fewer allocation calls. They do not establish release
compiler, planner, browser or generated-program runtime gains. The separate
unadmitted depth control returned identical empty facts, requested
4,428,458 → 90,936 bytes and made 81,753 → 1,619 allocation calls.

All 377 independent core tests passed. A new adversarial regression verifies
that outer whole/field identities are restored before eager siblings after let,
repeated callback and variant-arm shadowing. The state-field and variant-fold
ownership suites passed with required Rust/JavaScript/Wasm execution, checking
values, events and exact rollback snapshots. Selected-plan conformance and native
clone counters also passed. No LLVM tests or GPU execution were performed here.
Remote publication and CI status are reported separately; local checks do not
imply that every CI job has passed.
