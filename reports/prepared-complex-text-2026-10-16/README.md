# Complex prepared binary64 geometry

The new ordinary source library `std:prepared_complex_text` ports Pretext's
complex geometry with explicit numerical profiles, all break kinds and
rich-inline facts. This is prepared geometry, not font measurement, segmentation,
shaping, automatic algorithm selection or the requested speed parity.

## Validation

- The independent upstream-only generator executes unmodified Pretext
  `0a27bbe0f109c689b0a2af2fb1d2e659ddabf5b8`. Repeated generation, including
  deterministic source enumeration, produced identical compressed bytes.
- Its 1,680 cases cover complete widths/ranges, counts, heights, summaries and
  cursor continuation: 13,001 observations. The reference evaluator agrees with
  every upstream result using complete typed values and raw F64 bits.
- The full compiled history contains those observations plus one numeric device
  control. Rust, JavaScript, Rust/Wasm and the native GPU host agree; text work
  falls back to CPU. The separate numeric control dispatches on the GPU.
- Shape, flag, budget, nonfinite input, forged prepared value and cursor checks
  reject invalid data. The later expanded state history has 53 observations,
  covering changes, resizes, failed writes, event rollback, restore and four pure
  invalid-input cases. Compiled targets agree with the reference, with exact
  checkpoints (the native GPU host also checks its final checkpoint).
- The browser replay compares all 53 observations through JavaScript, compiled
  Wasm CPU and the WebGPU host: 159 comparisons, 36 restores, one actual device
  call and four required-GPU capability rejections. Every browser checkpoint is
  checked. These numerical engine profiles are explicit test inputs, not tests
  of those browsers' font engines.
- All 343 planner unit tests passed. This broader run also corrected stale CLI
  fixtures for absent optional advice and a test that assumed callbacks were
  priced once despite the catalogue's repeated-callback model. Planner production
  behavior and the evidence-free baseline rule are unchanged.

`source.capture.json` retains every source input; `source.core.json` is the checked
complete module. Compressed geometry/lifecycle scripts, expected replies,
checkpoints and GPU-host receipts retain complete histories. The compressed
generated JavaScript module is the exact module used in the timing study.

## Performance is still unfinished

Three fresh Node processes rotate numerical-profile order. Each case warms up
2,048 calls per lane, then takes fifteen samples of 128 complete count calls.
All counts are checked against the actual upstream walker. Result materialization
is included; construction, capture, token preparation and first calls are retained
separately. Inputs contain 8, 64 or 512 prepared segments and sixteen widths.

For 512 segments, pooled median prepared Ink times are roughly 134–138 µs versus
5.7–6.2 µs for Pretext: about **21–24 times slower** on this host. Smaller cases
also lose, with tiering and profile-order sensitivity. Preparation does not close
the helper/record execution gap. These are specific synthetic repeated-count
observations, not browser accuracy, end-to-end preparation, broad performance or
automatic profitability evidence. The requested speed requirement remains open.

Profiling points to per-segment helper work and allocation. Further work must
reduce that overhead through general execution mechanisms and measure complete
lifecycles, while preserving dynamic inputs, lazy branches, errors and raw values.
Source specializations and changed representations still need their respective
ordinary proof and applicability contracts.

## Distribution and remaining scope

Independent package revisions are in `packages.json`. No core or backend
semantics changed. The user's existing `core/src/syntax/query.rs` edit (diff SHA256
750cc8098faaad5bd8278f93760af008129ce3c136a79471334c7f604aa564ab) remained present in
local builds and is excluded from publication. These tests do not prove the
checker, source translation, generated implementations or host toolchains.

The default ten-program corpus and relocated-installation evidence are retained
after the distribution pin is committed. Neither corpus entry counts nor a
successful installation establish performance parity. The complete
[three-project programme](../../docs/chenglou-optimisation-programme.md) remains
active, including preparation/shaping, incremental work, broader facts and
requirements, learned structural choices, device learning and matched performance.
