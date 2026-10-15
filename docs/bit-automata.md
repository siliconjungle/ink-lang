# Packed bit-state algorithms

`import "std:bit_automata" as bits;` imports ordinary knowledge-library code.
The source is `knowledge/libraries/bit_automata.ink`; no compiler primitive,
algorithm matcher or unchecked optimization permission was added.
See [the complete example](../examples/bit-automata.ink).

`bits.literal(symbols)` constructs masks for a nonempty octet literal of at most
32 symbols, returning `None` for an empty, wider or non-octet pattern. `Literal`
is plain data, not an opaque proof token: constructing or changing its fields
manually does not establish a literal-matching invariant.

The Shift-And transition is `(active << 1 | 1) & mask`. Bit j records an active
pattern prefix through position j. Completing a match increments the wrapping
u32 counter and clears active state, yielding non-overlapping fixed-literal
matches for masks produced by the constructor. This interface does not implement
regex alternatives, captures, Unicode normalization or JSON parsing.

`count_symbols` reads u32 symbols from a list. Out-of-table symbols cannot match.
`count_packed<N>` reads N symbols from little-endian octets in u32 words, using an
explicit base and word stride. `counts_columns<N>` maps that scan over row IDs in
transposed word storage. Adjacent rows then read adjacent words on a GPU.

The packed interface is explicit physical input, not a replacement selected
silently for a String function. Index arithmetic has Ink's wrapping u32 meaning;
missing words read zero. Applications needing nonwrapping shapes must establish
them. Padding must be excluded by the chosen length or unable to match the
pattern. The benchmark maps non-octet code points to zero, uses no NUL patterns,
checks a 512-code-point capacity and pads to 512. Those conditions matter.

## Evidence and limits

Eight scalar laws in `bit-circuit-laws.ink` cover disjoint union/addition, exact
bit gating, transition distribution/restart and four packed-octet projections.
Their RUP certificates are in the canonical knowledge store, with an authenticated
`store/bit-circuit-view.json`. The ordinary checker reconstructs the typed scalar
circuits and replays the proofs. Missing assumptions, corrupt hints and changed
conclusions reject. These are reusable scalar components; they do not certify a
complete string-to-packed transformation, the entire matcher or generated code.

The mandatory generic-library conformance suite checks independent direct
sequence matching, repetitive/overlapping patterns, width 31/32, zero and 255,
empty/invalid patterns, masked shift counts and missing packed storage. It checks
reference, Rust, JavaScript, Rust-Wasm and real eligible wgpu execution. Complete
browser benchmark counts are independently checked on two 100,000-document
corpora and small/medium controls.

The [matched report](../reports/handwired-packed-circuits-2026-10-15/README.md)
separates warm, paused, setup and native API boundaries. Current gains are
search-focused. Broader circuit, relational, numeric and differentiable workloads
remain in the [integration programme](handwired-integration.md).
