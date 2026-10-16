# Normalized JavaScript F32 carriers

The two-emitter tool compares the published JavaScript baseline `046d57b1` with
the local JavaScript checkout, using one checked executable-core input. Its
standalone core dependency stays pinned independently. This changes literal
carrier handling, not arithmetic, algorithms or proof admission.

```sh
cargo run --locked --manifest-path bench/f32-carriers/emitter/Cargo.toml -- \
  before /ABSOLUTE/INPUT.core.json /ABSOLUTE/before.mjs
cargo run --locked --manifest-path bench/f32-carriers/emitter/Cargo.toml -- \
  current /ABSOLUTE/INPUT.core.json /ABSOLUTE/current.mjs
cargo test --manifest-path lowerings/js/Cargo.toml
INK_PARITY_REQUIRE_ALL=1 INK_TEST_WASM=1 INK_TEST_WGPU=1 \
  cargo test --test language_foundations f32_carriers -- --nocapture
```

Run neural timing only after compilation/tests finish, with Node supporting
TypeScript stripping. Alternate separate processes over seeds 72131, 99173 and
99174; retain both versions, every sample, startup/preparation/cold costs and all
upstream controls. The runner consumes and checks complete detached outputs and
gradients, including changing weights/context/targets. Input capture is outside
the warm call timing.

```sh
node --experimental-strip-types bench/prepared-helpers/run.mjs previous \
  /ABSOLUTE/before.mjs /ABSOLUTE/current.mjs \
  /ABSOLUTE/handwired/src/runtime/numeric-ui-core.ts /ABSOLUTE/previous.json 72131
node --experimental-strip-types bench/prepared-helpers/run.mjs current \
  /ABSOLUTE/before.mjs /ABSOLUTE/current.mjs \
  /ABSOLUTE/handwired/src/runtime/numeric-ui-core.ts /ABSOLUTE/current.json 72131
```

The [retained report](../../reports/normalized-f32-2026-10-16/README.md) binds exact
cores, generated images, scripts, cases, package revisions and observations.
Prediction remains mixed; derivative gains do not prove broad upstream parity,
whole-session learning speed, GPU training or profitable automatic selection.
