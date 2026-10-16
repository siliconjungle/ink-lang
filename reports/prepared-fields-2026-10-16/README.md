# Mixed immutable records: reusable preparation and remaining performance gaps

JavaScript package `92cbcd96` carries field provenance through record construction,
projection and bounded helper returns. Captured keys, rows or coefficients can
remain fixed alongside a changing query, iteration index or numerical input.
Evaluation dependencies stay separate from returned-value dependencies: unused
arguments/fields, guards, failure retry and lazy source order remain observable.
No source syntax, rewrite law, physical representation permission or automatic
profitability rule changes. Expanded alias summaries and shared private masks
respect the existing preparation/source limits.

## Matched record workloads

The same checked V8 source image is emitted by previous package `ac990bbf` and
current `92cbcd96`; `bench/prepared-fields/previous-emitter` retains exact package
pins/lock. These are ordinary source examples of membership, grouped aggregation
and F32 coefficient preparation, using the loop study's complete-output runner
and stronger directly prepared JavaScript controls. Each record deliberately
combines fixed data with changing fields. They exercise a representation boundary;
they do not represent a whole database, text engine or trained neural network.

Three fresh Node 25.3.0 processes use seeds 19/71/991. Each lane receives 1,536
warm-up calls (128 rounds × 12 observations); eleven samples each measure 96
complete calls. Empty, singleton and 32-item query/input arrays vary. Source
capture and token setup are separate; result materialization is included. Lane
order is shuffled per sample. All timed complete arrays match independent direct
Map/group/F32 controls before and after measurement.

Pooled median complete calls at 512 fixed inputs (microseconds):

| Workload | Previous prepared | Current prepared | Direct prepared JS | Previous/current |
| --- | ---: | ---: | ---: | ---: |
| Membership | 190.27 | 1.040 | 0.801 | 183.0× |
| Grouped aggregate | 282.02 | 1.247 | 0.759 | 226.1× |
| Numeric coefficients | 18.85 | 0.865 | 0.454 | 21.8× |

These gains remove rebuilding inside repeated queries. Direct controls remain
faster. At 16 fixed inputs the ratios are 6.59×, 8.02× and 1.42×; setup/lifetimes
can change the tradeoff. Ordinary call medians at 512 inputs are about 0.1–1.2% slower than the prior
emitter. The same checked source does not guarantee identical VM performance.

The initial 144-call warm-up study is retained in `short-warmup/`. It showed an
approximately 4.2× small numeric regression, including a similarly slow ordinary
lane. The longer warm-up changes that result; this tier/order sensitivity is a
real limit on a steady-state claim, not a reason to erase the initial data.
`cold` and setup rows retain the first observations separately. One fresh forced-GC
memory process per emitter records import/capture/token/empty/one/many phases.
Module bytes increase from 179,271 to 180,717; heap after calls increases by
25,360 bytes in that observation. RSS, JIT and heap samples are descriptive,
not per-cache allocation counts or universal memory bounds.

## Actual text and neural controls

Six fresh complex-text processes alternate the prior/current module order across
three numerical-profile rotations, using the complete count benchmark and pinned
upstream Pretext code. At 512 segments, current/prior prepared medians are close
(about 0.1–1.2% lower); no meaningful text speed gain is established. Current Ink
still takes roughly **22.2–23.7×** the upstream time. The ordinary sum-callback and
record/helper execution paths remain important follow-up work. At smaller sizes,
constants, first-profile tiering and setup remain material. This change does not
close the Pretext gap or establish upstream parity.

The newly emitted complex module matches all 13,002 retained independently
reference-checked observations: 13,002 ordinary calls and 52,008 prepared calls
with empty/first-parameter bindings and repeated reuse. This replays exact typed
bytes over the same source core. It is fresh JavaScript execution, not a new
reference/native/Wasm/GPU acquisition. The original complete cross-target history
remains in `../prepared-complex-text-2026-10-16`.

The new neural module also passes eighteen complete reference cases through 270
prepared calls. Source topology checks run once per token while weights/context
change; forward outputs and derivatives remain fresh, malformed inputs reject and
public values stay detached. This is a conformance/control result, not a neural
speed or source-wide differentiation claim.

## Checks and reproduction

All 53 standalone JavaScript tests pass. New field tests compare fifty independent
reference cases through 750 prepared calls; allocation instrumentation checks
one-time index retention, changing record selections, nested helpers/loops,
shadowing, raw binary64 payloads, preconditions and discarded throwing work.
A separate small-source/doubling-record regression exercises bounded expanded
summaries with ordinary fallback. Existing callback/ownership/early-stop suites
remain mandatory. All 343 planner unit tests pass locally (five environment skips);
the RSS regression now runs its observer fresh so a heavy test parent does not
invalidate the per-child high-water comparison. Peak RSS remains a conservative
whole-launch observation, including possible pre-exec residency.

```sh
cargo run --locked --manifest-path bench/prepared-fields/previous-emitter/Cargo.toml \
  -- reports/prepared-fields-2026-10-16/workloads.core.json before.mjs
ink build reports/prepared-fields-2026-10-16/workloads.core.json --core \
  --target javascript -o current.mjs
INK_LOOP_WARMUP_ROUNDS=128 node bench/prepared-loops/run.mjs before.mjs current.mjs run.json 19
node --expose-gc bench/prepared-loops/memory.mjs current.mjs memory.json
node bench/prepared-text/check-complex.mjs complex-current.mjs reports/prepared-complex-text-2026-10-16
python3 reports/prepared-fields-2026-10-16/audit.py
```

Retained runners, raw process rows, emitted modules, source core, package identities
and complete-result receipts are bound by `metadata.json`. Auditing observations
does not prove the checker/backend or admit an optimization. Full distribution CI
is reported separately; local checks are not an all-green hosted run.
