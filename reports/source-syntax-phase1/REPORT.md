# Complete code-data binding and view-proof integration

The semantic core can bind the whole checked module and resolved typed action
trees to an authenticated database definition. It independently reconstructs
the image and compares the five generic datatypes and literal definition. The
external Python producer lives in ink-knowledge and publishes individual entries
in a local per-program snapshot. No optimisation rule or proof-kernel rule was
added. Shared catalogue objects and snapshot membership are unchanged.

The image includes helper bodies, declarations, type information, slot references,
ordered instructions and float bit patterns. A flat postorder node table with
balanced reference trees preserves wide source structures without relaxing
existing depth or term limits. Complete-code binding does not establish the
meaning of a logical interpreter or authorise a stateful replacement.

Claude's view-decomposition v3 and Lean bundles were reviewed and merged.
`--prove-views` automatically proves each supported maintained pipeline equal to
the sum of its row contributions. If any proof cannot be checked, generated
execution falls back explicitly to recomputation without maintenance/bounded
caches; the plan records the reason. `--require-views` instead fails. Existing
builds without either option retain their disclosed trusted path.

## Validation

- The broad distribution run passes 218 tests, including the expensive native
  row/column continued-history case. This run spans integration of the refreshed
  CLI, so final focused validation is recorded separately rather than claiming
  a single pristine final-commit run.
- Final focused validation passes 23 tests: source syntax (2), row models (5),
  native state (11), and view decomposition (5). Native transaction/scoping,
  abort, event order, restoration and maintained/baseline checks remain green.
- Final independent core and a byte-identical isolated copy each pass 28 tests
  offline without knowledge, planner, runtime or backend directories. Round trips
  include records/tables, numeric compute, captured loops, float bit patterns and
  recursive nominal types. Separate codec tests cover Unicode/NUL, maximum words,
  empty data, order, balancing boundaries and budget/depth rejection.
- Authentic, generally well-typed database controls containing the wrong image
  root or a renamed grammar constructor are rejected. Changed helper bodies,
  event values or record evaluation order cannot substitute for the source.
  Version/role/root mismatches reject, and CLI rejection preserves existing output.
- The five view tests check nine pipeline shapes, 54 concrete tables, 12 unsigned
  cast values, wrong/stale proofs, changed or missing definitions, false projection
  laws, and explicit build fallback versus required-proof rejection.
- The 20 new Lean theorems compile locally without errors or warnings under
  Lean 4.35.0-rc4. Printed axiom dependencies are limited to `propext` and
  `Quot.sound`; sources contain no `sorry`/`admit`, added axioms or option overrides.
  This is not acceptance under Hunchroom's different pinned toolchain, Nanoda
  replay, or a checked translation from Lean into Ink. No submission was made.

The proof kernel, registry admission, bit-proof checker and legacy library
checker are byte-identical to ad8e64d. The C/Rust/JS/Wasm/GPU/runtime pins are
unchanged. No fresh GPU, browser, performance or durability claim follows from
this run. Previously published enabled conformance evidence remains separately
documented in typed-execution-phase1.

## Reproduction and remaining gate

See [source syntax](../../docs/source-syntax.md) and
[view decomposition](../../docs/view-decomposition.md) for CLI commands. Run
`python3 dev.py test --locked --offline` and the independent core manifest.
Focused tests are `source_syntax`, `row_model`, `state_native` and
`view_decomposition`. Raw logs, toolchains, source/evidence hashes and reviewed
pins are recorded alongside this report.

Source checking, elaboration, encoding, source-to-logic lambda/cast translation,
table enumeration, native contributions/cache protocol, generated lowerings,
LLVM and the Rust kernel remain trusted. Full action interpretation, primitive
correspondence and universal candidate/physical-state preservation are still
required. The extra laws strengthen the existing bridge; they do not close
generic stateful replacement admission or remove all specialised authority.
The full production goal remains active, excluding editor support and schema
evolution as requested.
