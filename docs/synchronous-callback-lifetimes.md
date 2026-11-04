# Synchronous callback lifetimes

Core final-use analysis recognizes the fixed synchronous callback slots of
`map`, `map_indexed`, `filter`, variant `map_err`, `zip` and `map_parallel`, as
well as the existing fixed loop calls. Checked executable values are first-order;
these direct callbacks finish before the operation returns. A later use, or a
use in an alternative branch, may therefore move an immutable value that an
earlier callback only borrowed.

Receiver and argument evaluation stay in their original order. A receiver or
argument also captured by the callback remains shared during the entire call.
Repeated callback captures never become final moves inside that callback.
Earlier unknown closure loans remain live; indirect/unsupported callbacks keep
conservative handling. Shadowed bindings retain separate lexical identities.
Whole values and record-field paths use the same lifetime rule. Variant `fold`
retains its distinct branch analysis because exactly one arm runs at most once.
The source depth/node limits still fail closed.

This analysis grants no equality, numeric range, unique capture ownership or
profitability authority. Rust lowering separately checks borrowed bindings and
active loans. No source primitive or serialization format changes, and the
knowledge catalogue and planner's profitability guards remain unchanged.

The external ink-static-embeddings experiment compares identical frozen source
and already checked plans using old/new compilers and the same Rust toolchain.
Three fresh process groups rotate executable order; input clones and complete
detached output consumption remain timed. The guarded matrix-column variant
improves from 3.429 to 2.562 microseconds on average across nonempty frozen cases,
or 1.34x. Its row iterator can now consume the vector instead of borrowing it
because a capture in the alternative branch no longer extends the loan globally.
Literal and unconditional matrix variants and both held-out filter/channel
workloads remain essentially unchanged. This is not an additional 1.34x gain for
all programs, nor an automatically selected source-algorithm improvement.

Validation covers receiver aliasing, lazy alternatives, final moves after map,
filter, indexed map, zip and error mapping, repeated returned captures and exact
clone counts. Reference, native Rust, Rust/Wasm, JavaScript and native GPU-host
results/checkpoints agree; the existing eligible particle kernel dispatches on
the actual GPU. The frozen numerical comparison also checks edge-case F32 bits.
All 546 standalone core tests pass on this Mac with a 16 MiB Rust test-thread
stack. An unchanged-package comparison reproduces the existing default-stack
overflow in the large staged-neural projection fixture; the final-use depth-limit
test itself passes on the default stack. Private package validation uses the same
larger test-thread stack. These tests are implementation evidence, not a proof
of compiler or backend correctness.
