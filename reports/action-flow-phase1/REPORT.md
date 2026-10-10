# Nested transaction and expression correspondence

Functional source 6e327e00cfec12512300c8d1cde045667340f3b0 extends fixed
source-bound action semantics to nested queries/changes, Try, Option/Result
callbacks, eager ok_or, lazy Booleans and mutation return values. A single
continuation builder replaces the old statement interpreter. Total expressions
reuse existing source correspondence; values already constructed by those
semantics select their known constructor case. Unknown cases remain logical
matches. This reduces impossible-continuation construction without introducing
an optimisation theorem or changing kernel rules/caps.

45 focused distribution tests and 43 byte-identical isolated offline core tests
pass. An eighty-call logical/reference history and nineteen additional calls
compare complete transitions. Twenty compiled calls agree on replies, rollback,
ordered events, versions and exact snapshots on C, Rust, JavaScript and both
Wasm adapters, including restoration. The mixed host executes zero GPU kernels
in this fixture; a separate selected-checkpoint case performs one actual call.
One unchanged abstract-row database theorem applies inside a child and its
caller. Earlier frozen evidence remains valid. Authenticated wrong definitions
cannot hide a dropped caller event or suppress a sticky child error. Unknown
Result parameters, local query exits, domain-error priority at MAX and bounded
nested expansion are checked without a catalogue/backend checkout. Counts overlap.

The raw source/core/models/selection/script/expected responses reproduce the
compiled case. Files were dirty relative to 8c85 during testing, then committed
byte-identically as 6e327e0. The Rust semantic projection, fixed reference, host
codecs, target emission and toolchains remain trusted. Numeric/collection/keep
projection and arbitrary physical representation/maintenance/migration admission
remain open. No performance claim or Hunchroom acceptance. PLAN.md stays active;
editor support and schema evolution are excluded.
