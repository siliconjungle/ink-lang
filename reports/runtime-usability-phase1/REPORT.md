# Runtime durability, conformance and module acceptance

The distribution integrates the direct typed core at ad8e64d. The core parser
adds only a bounded constructor-name frontend hook. New source imports are
resolved and linked in the distribution; checked IR types and proof rules stay
unchanged. Runtime publication is a7ee91b548bd2882e27edd91d74d04154a3869c1.

## Acceptance

- The fixed suite still matches 78 replies/exact snapshots on native C/Rust,
  JavaScript and C/Rust Wasm; 21 mixed-module calls execute on wgpu. Resident
  empty/shrinking feedback passes.
- Generated four-seed conformance adds 432 replies/exact snapshots on all five
  CPU paths, with 80 actual wgpu calls. Seeds/source/script remain reproducible
  in `tests/generated_parity.rs`; the permanent GitHub workflow adds a
  commit-derived seed and retains failure inputs.
- Module imports link functions, types, record constructors, state roots,
  queries/changes and events. Six example requests match all CPU paths, exact
  snapshots and one actual GPU call. Scope tests cover local/field names,
  alias-invariant identities, original-source diagnostics, missing declarations,
  namespace shadowing, cycles and duplicate module identities.
- Node failure injection and storage tests pass (seven durability cases plus
  five backend-selection cases). Generated JS/C-Wasm/Rust-Wasm processes exit
  after synced publication and before reply; reopening and retrying applies
  the action once and preserves events/aborts.
- The real browser IndexedDB fixture reports: page reload, request deduplication,
  JavaScript ↔ C/Rust Wasm continuation, stale-writer rejection and durable outbox
  acknowledgements. Browser acceptance is the explicit fixture in
  `tests/durable-browser.html`, not a claim that the GitHub job runs a browser.
- 25 isolated core tests pass. The broad distribution log records 216 passing tests in the full
  integration run; historical receipts remain untouched.

## Complete C scalar measurement

`bench/complete-values/run.py` compares identical C emission and a common JSON
host driver against the previous runtime 56ea95b. Seven shuffled paired rounds,
two warmup rounds and ten calls per round measure 100/10,000/60,000 literal
iterations, with correctness checked on every call. Separate instrumented
binaries report allocation requests and peak/retained live requested bytes.
Raw rounds, hashes, toolchains and checkout warnings are in `complete-values.json`.

On this shared Apple ARM64 host, execution medians improve by roughly 3.9–4.2×;
lifecycle medians by 2.2–4.9×. At 60,000 iterations, ten reused-state calls fall
from 1,800,110 allocation/reallocation requests to 100, and requested peak live
memory from about 8.4 MB to 7.4 KB. These are the same scalar workload and JSON
interface, not a comparison against handwritten C/C++/Rust, a GPU algorithm
measurement or evidence for arbitrary database-driven representation selection.
The inlined handle representation and stack scratch are trusted fixed runtime
implementation details. Heap collection growth now counts against the arena
budget. Types, scalar bits, exact integers and portable snapshots remain unchanged.

## Boundaries and remaining gates

The file adapter has one writer process per path; it does not provide interprocess
locking. IndexedDB uses transactional compare-and-replace and requests strict
durability, under browser storage guarantees. Outbox delivery is at least once;
the receiver deduplicates application/commit/position. Retry receipts are bounded,
not permanent exactly-once history. The host copies/restores/replaces complete
snapshots, including queries with new request IDs. Incremental logs, native
executable embedding, broader performance comparisons and resource exhaustion
hardening remain open.

Modules provide a small embedded library and inspection commands; a source debugger,
package manager and private exports remain open. i32/f32/vector state/action
boundaries retain the existing core restriction. No new stateful replacement
admission or backend proof is claimed. Actual source-to-logical/physical binding,
future-update proofs and common admission migration remain active acceptance gates.
Editor support and schema evolution are excluded from the current scope.
