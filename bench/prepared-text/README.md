# Prepared text geometry

`generate-oracle.mjs` requires the exact upstream Pretext checkout and a local
TypeScript compiler module. It verifies the Git revision and clean source, hashes
the source files, transpiles without editing upstream, and runs its actual line
walkers. Output includes 232 synthetic measured-data cases and complete count,
height, summary and cursor-range outputs. These do not establish browser accuracy.

```
node bench/prepared-text/generate-oracle.mjs PRETEXT_CHECKOUT TYPESCRIPT_MODULE build/prepared-text-oracle
```

`tests/fixtures/prepared-text/oracle.json` retains this oracle for offline CI.
`tests/support/prepared_text.rs`, included in the mandatory `generic_libraries`
suite, compares typed values including raw F64 bits. Its integration history checks
all CPU targets and native GPU-host fallback, snapshots, invalid input, edits,
rollback and restoration, with a separate actual F32 device dispatch.

```
INK_PARITY_REQUIRE_ALL=1 INK_TEST_WASM=1 INK_TEST_WGPU=1 INK_REQUIRE_GPU=1 \
  cargo test --locked --test generic_libraries prepared_text:: -- --nocapture
```

`measure.mjs BEFORE.mjs CURRENT.mjs UPSTREAM_LINE_BREAK.js OUTPUT.json` is a
diagnostic repeated-count experiment for 8/64/512 prepared segments. It checks
complete count results against upstream and retains raw timings, source hashes,
construction/capture/token costs and first calls. Ordinary and sealed prepared
Ink lanes include Result materialization. The former entry may be called `forged`
or `count_prepared`. This diagnostic does not authorize a profitable selection or
establish full lifecycle, engine or broad performance parity. The current gap to
the direct upstream loop remains an implementation target.

The complex port has a separate upstream-only oracle. It captures numerical
Blink/Gecko/WebKit profiles explicitly; it does not run a browser or measure fonts:

```
node bench/prepared-text/generate-complex-oracle.mjs PRETEXT_CHECKOUT TYPESCRIPT_MODULE build/complex-text-oracle
INK_PARITY_REQUIRE_ALL=1 INK_TEST_WASM=1 INK_TEST_WGPU=1 INK_REQUIRE_GPU=1 \
  cargo test --locked --test generic_libraries prepared_complex_text:: -- --nocapture
```

`tests/fixtures/prepared-text/complex-oracle.json.gz` is reproducible gzip data.
The tests use Python's standard gzip reader, qualify source enum suffixes against
the checked module and compare complete typed F64 values, including their bits.
The full corpus covers 1,680 cases and 13,001 observations. A separate state
history checks committed events, resizes, replacements, failed writes and restore.
An eligible F32 control runs on the device; complex text stays on CPU hosts.

```
ink build examples/prepared-complex-text.ink --target javascript -o build/complex-text.mjs
node bench/prepared-text/measure-complex.mjs build/complex-text.mjs build/complex-text-oracle/upstream/line-break.js build/complex-text-timing.json
```

The complex diagnostic checks complete count results at varying widths for
8/64/512 segments, across the three explicit profiles. It retains construction,
capture, prepared-token and first-call costs separately, plus rotated raw timing
samples. It includes result materialization and compares ordinary and prepared
Ink calls. These are repeated observations of synthetic measured data, not
end-to-end font preparation, browser accuracy or automatic profitability evidence.
