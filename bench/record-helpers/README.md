# Literal record/helper emission controls

The two-emitter tool uses the same checked core bytes through the previous
JavaScript package (`5c027d05`) and the current local package. Its core dependency
is pinned independently. Main measurements use the existing complete text and
neural workloads, including faster upstream controls; new record fixtures are
conformance tests, not additional claimed performance domains.

```sh
cargo run --locked --manifest-path bench/record-helpers/emitter/Cargo.toml -- \
  before reports/prepared-complex-text-2026-10-16/source.core.json before.mjs
cargo run --locked --manifest-path bench/record-helpers/emitter/Cargo.toml -- \
  current reports/prepared-complex-text-2026-10-16/source.core.json current.mjs
node bench/prepared-text/check-complex.mjs \
  current.mjs reports/prepared-complex-text-2026-10-16
INK_COMPLEX_PROFILE_ROTATION=0 node bench/prepared-text/measure-complex.mjs \
  before.mjs /PINNED/PRETEXT/line-break.js before.json
INK_COMPLEX_PROFILE_ROTATION=0 node bench/prepared-text/measure-complex.mjs \
  current.mjs /PINNED/PRETEXT/line-break.js current.json
```

The complex study uses six fresh processes, alternating before/current order
across three engine-profile rotations. Each lane warms for 2,048 complete calls;
fifteen 128-call samples vary sixteen widths. Upstream controls check every
complete result before and after timing. Setup and first calls stay separate.
This measures arithmetic layout over synthetic measured facts, not browser/font
measurement or whole application latency.

The simple counter uses `bench/prepared-text/measure.mjs` with explicit warm-up.
Repeat both regimes; do not discard short-session losses:

```sh
INK_SIMPLE_WARMUP_ROUNDS=8 node bench/prepared-text/measure.mjs \
  SIMPLE_BEFORE.mjs SIMPLE_CURRENT.mjs /PINNED/PRETEXT/line-break.js short.json
INK_SIMPLE_WARMUP_ROUNDS=128 node bench/prepared-text/measure.mjs \
  SIMPLE_BEFORE.mjs SIMPLE_CURRENT.mjs /PINNED/PRETEXT/line-break.js warm.json
```

Each round executes sixteen widths per lane. Three fresh processes use each
setting. The historical default remains eight rounds. Generated source, full
results, cold/setup phases and source identities accompany the raw samples.

Neural controls reuse `bench/prepared-helpers/run.mjs` in `previous`/`current`
modes, with three fresh process pairs and seeds 72131, 99173 and 99174. They check
four outputs or loss/four outputs/244 gradients against a direct ordered F32
executor and Handwired's own executors. Weights/features/targets vary;
materialization is timed, input capture and first calls remain separate.

The [report](../../reports/record-helpers-2026-10-16/README.md) binds exact inputs,
packages, generated files, runners and results. Hashes and observations grant no
rewrite, graph trust or physical-layout authority. Expanded code can lose on
small calls, setup and VM tiering; upstream parity remains open.
