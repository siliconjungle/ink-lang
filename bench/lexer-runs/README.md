# ASCII token-run experiment

This is an explicit Ink implementation of the same micro-language as
`workload_kernels.lex`: ASCII identifiers (letters/underscore followed by
letters/underscore/digits), unsigned decimal runs, four whitespace code units,
and single-code-unit punctuation. Inputs remain `List<u32>`; non-byte values
are punctuation. Outputs include every token's start, exclusive end, and kind.
There is no JavaScript grammar, Unicode identifier handling, parser, or AST here.

The baseline classifies every input position while carrying an active-token
state. The alternative dispatches at a token's first position, then scans the
remaining identifier or number in a dedicated loop. The organization was
informed by Oxc's ASCII identifier fast path in
`crates/oxc_parser/src/lexer/identifier.rs` at the pinned checkout recorded in
`../cross-domain/upstreams.json`. Oxc itself is not timed by this harness. The
third implementation is an independent Rust scanner with matching semantics.

The alternative is ordinary source, not an automatically selected algorithm
rewrite. Equivalence is tested against an independent oracle; those tests are
not universal equality authority. Existing checked definition-unfolding laws
expand callback helpers, and the explicit physical plan chooses direct buffers.
No new syntax, unchecked reads, relaxed numeric semantics, or trusted token
matcher is introduced.

## Validation and measurement

`tests/support/lexer_runs.rs`, included in the mandatory physical-capabilities
suite, checks 564 full observations before and after checked unfolding. Cases
include class boundaries and transitions, empty inputs, long runs, random
inputs, non-byte values, and maximum words. Reference values, native targets,
JavaScript, both Wasm backends, and exact snapshots must agree. GPU-host fallback
does not imply a GPU lexer implementation.

The timing driver checks every full output before and after measurement, then
rotates baseline Ink, token-run Ink, and Rust through all timing positions.
Inputs are hidden equally with `black_box`; cloning the input, allocating the
output, and destroying both are inside each timed call. All implementations
consume the same u32 representation, rather than comparing an Ink u32 array
against a native byte string. Six patterns cover code-like text, identifiers,
numbers, punctuation, whitespace, and random ASCII at four sizes. Eight fresh
processes, not inner repetitions, provide the bootstrap replication units.

With the pinned toolchain dependencies available:

```sh
cargo build --locked
python3 bench/lexer-runs/run.py --compiler target/debug/ink --build-only
python3 bench/lexer-runs/run.py --measure-only --rounds 8
cargo test --test physical_capabilities lexer_runs
```

Run timing with build and planning processes idle. Metadata records source,
compiler, generated code, executable, plan, dependency-lock, and toolchain
identities. Results are written to `build/lexer-runs/results.json`. This is a
kernel experiment; it makes no whole-compiler or upstream Oxc ranking claim.
