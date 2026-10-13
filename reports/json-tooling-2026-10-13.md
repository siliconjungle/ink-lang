# JSON and portable value conformance — 2026-10-13

This adds ordinary recursive JSON source in knowledge, six locally checked
object-list laws, exact JSON/typed codecs and general portable binary values.
Core changes are generic stable payload naming and shared recursive-record facts.
C generated support fixes bounded recursive checkpoint schema construction.

Observed validation:

- Complete independent core suite and ABI suites pass.
- Six ordinary database laws replay; a same-sort false lookup law rejects after
  rehashing its entry. The active publication authenticates all members/trees.
- 43 JSON values, errors, state outcomes, events and exact checkpoints agree
  across reference, C, Rust, JavaScript, C-Wasm and Rust-Wasm.
- JavaScript, native C/Rust and both raw binary Wasm extensions return identical
  bytes for an update preserving unknown fields and a `1e10000` numeric token.
- Cross-language codecs agree on exact word/Int carriers, fractional/exponent
  integer conversions, binary32 bits, Unicode and malformed/truncated input.
- Generic library/voxel/codec/ECS, source language foundation and both-Wasm
  regression suites pass. The separate full-width regression records 53 actual
  wgpu dispatches; it establishes no GPU JSON capability.
- Browser JSON flow preserves a 30-digit integer and `1e10000`, and rejects
  duplicate names. The site has a runnable precompiled linked example.

JSON lexical number spelling and object-member order are source observations.
Conversion back to JSON is fallible. Schema identity is a transport agreement,
not mathematical proof or automatic schema migration. Byte validators/emitters
are operationally trusted. This baseline materializes target values for calls,
uses temporary generic carriers in native adapters, and copies at Wasm boundaries.
No zero-copy execution, compression benefit or measured speedup is claimed.
