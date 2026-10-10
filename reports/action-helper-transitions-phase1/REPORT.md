# Total helper correspondence in whole-action proofs

Functional source 47eff32aea3820279aedd8eaa5dd404944c01a72 extends the fixed
transition projection to existing total helpers through Ink's checked binder-safe
semantic tree. Word/Boolean operations, choose, record construction/access,
scoped lets and transitive helper calls have fixed logical meanings. Search,
alternatives and removal idempotence remain external database data. No kernel
rule, transport schema or backend API changed. Unsupported operators, numerical
intermediates and deep helper chains reject projection; unused unsupported
helpers leave old transition definitions unchanged.

35 focused distribution tests and 41 byte-identical isolated offline core tests
pass. Eight helper fixture calls preserve complete replies/events/rollback and
exact snapshots across C, Rust, JavaScript and both Wasm adapters, including
restoration. Its wgpu host executes zero GPU kernels. Eighty logical/reference
transitions also agree, including word MAX, failed changes and commit-counter
exhaustion. Changing a helper invalidates supplied source-bound evidence. The
previously published whole-action proposal replays unchanged. Counts overlap;
this is conformance evidence rather than a proof of native machine instructions.

The isolated core has no database/backend checkout; isolated-core-input.json
records every compiled source byte. The frozen source/core/model/selection/script
and expected responses reproduce the helper case. Functional files were dirty
relative to cc46134 during testing and subsequently committed byte-identically
as 47eff32. Rust projection, host codecs, native emission and toolchains remain
trusted. Nested action calls, Try, arbitrary physical representation admission
and specialised authority migration remain open. No new performance claim or
Hunchroom acceptance is made. PLAN.md remains active; editor support and schema
evolution remain excluded.
