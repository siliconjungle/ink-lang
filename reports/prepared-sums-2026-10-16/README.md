# Preparation through optional and result callbacks

JavaScript package `5c027d05` enters selected `Option`/`Result` fold, map and
map_err arms while preserving lexical field provenance. A complete captured
immutable sum also fixes its selected payload; a changing sum keeps changing
payloads. Loop arguments remain dynamic. Receivers execute once, arms remain
lazy, strict defaults still execute, failures retry and owned storage retains
ordinary lifetime/loan rules. Checked sum codecs keep their existing authority.

The optional preparation lane now shares private policy predicates, leaves tiny
immutable reads literal and discovers bounded sufficient captured-input
conditions for reusable work. A factory with no such work uses its ordinary
function. Delegated calls preserve direct ordinary calls when preparation is
unavailable, out of depth or unhelpful under the captured policy. Structural
work estimates are heuristics, not proof premises or measured profitability.
No runtime experiment or application action is replayed to acquire a decision.

## Matched result-handling workloads

`workloads.ink` puts membership, grouped aggregation and coefficient preparation
behind changing optional/result arms. The direct controls have the same complete
array results. Previous `92cbcd96` and current packages emit the same checked V8
source image. The two-emitter tool's pinned standalone core emits byte-identical
baseline text code to the previous release, and its current text output is
byte-identical to the freshly built complete CLI output.

Three fresh Node 25.3.0 processes use seeds 19/71/991, 1,536 warm-up calls per lane,
eleven 96-call samples, randomized lane order and varying empty/singleton/32-item
observations. Capture and token setup are separate; complete detached output
arrays are consumed inside timing. Independent direct Map/group/F32 controls
check every complete result before and after sampling.

Pooled median complete calls at 512 fixed inputs (microseconds):

| Workload | Previous prepared | Current prepared | Direct prepared JS | Previous/current |
| --- | ---: | ---: | ---: | ---: |
| Membership | 198.09 | 1.371 | 0.748 | 144.5× |
| Grouped aggregates | 282.30 | 1.942 | 0.747 | 145.4× |
| Coefficients | 18.45 | 1.183 | 0.436 | 15.6× |

Direct controls remain faster. At 16 inputs the ratios are 6.26×/5.12×/1.34×.
Ordinary calls at 512 inputs regress about 1.0%, 1.0% and 4.9%; the emitted
preparation changes module layout/JIT behavior even though the ordinary checked
source is unchanged. The single fresh forced-GC memory observation per emitter
has 60,408 more heap bytes after calls and module growth from 177,947 to 181,839
bytes. First singleton work increases from .480 to .591 ms in that observation.
These are descriptive process measurements, not allocation counts, memory
bounds or a universal short-session benefit. Cold/setup rows remain retained.

## Actual text and neural controls

The simpler prepared text control improves about 1.8% at 512 segments (9.460 to
9.288 µs); the upstream direct loop takes about .783 µs. The larger complex
walker regresses about 3.3–4.1% in six fresh alternating-order processes across
three engine-profile rotations. At 512 segments its current complete counts
still take roughly 24–26× the pinned upstream time. Both the regression and faster
controls remain in the raw data. Callback preparation does not close this gap;
record/helper execution and deeper representation/graph specialization still
need work. No neural speed gain is claimed here.

Complete complex geometry replays 13,002 independent-reference observations in
13,002 ordinary and 52,008 prepared JavaScript calls. Neural controls retain
all eighteen reference cases through 270 prepared calls, including changing
weights/context, fresh forward/derivative values, invalid inputs, detached
outputs and one source topology check per token.

## Complete validation

All 54 standalone JavaScript tests pass. The new sum regression retains 111
complete independent-reference cases and 6,660 prepared calls across native/bit
F32 storage and ordinary/checked-flat sum layouts. Its checked physical packets,
source images, complete typed inputs/outputs and generated code are retained.
Cases exercise variant changes, stable and changing payloads, nested sums,
partial record captures, NaN payloads, signed zero, strict defaults, failure retry,
preconditions and owned-buffer results. Source Map.empty counters are separate
from the physical sum view's private bookkeeping Maps.

A new mandatory distribution fixture freshly compares those 111 cases plus a
numeric control on native Rust, JavaScript, Rust-Wasm and the native GPU host,
with exact portable snapshots on the CPU hosts. The control confirms one actual device call;
this does not make sum preparation a GPU feature. A further 672 prepared JS
calls reuse the same independent results. Four binary64 and two source-reverse
integration tests also pass with required Wasm/GPU checks; source-reverse
histories have 35 and 25 observations with an actual numeric GPU control in each.
These checks do not prove the backend, whole AD transform or driver.

The previous distribution `509441c6` completed every hosted job successfully
(run 38835921105). The new release's hosted CI is tracked separately; local
validation is not an all-green hosted run. Installation/target package locks bind
exact independent revisions. The full three-project programme remains active.

## Reproduce

```sh
cargo run --locked --manifest-path bench/prepared-sums/emitter/Cargo.toml \
  -- before reports/prepared-sums-2026-10-16/workloads.core.json before.mjs
cargo run --locked --manifest-path bench/prepared-sums/emitter/Cargo.toml \
  -- current reports/prepared-sums-2026-10-16/workloads.core.json current.mjs
INK_LOOP_WARMUP_ROUNDS=128 node bench/prepared-loops/run.mjs before.mjs current.mjs run.json 19
INK_TEST_WASM=1 INK_TEST_WGPU=1 INK_PARITY_REQUIRE_ALL=1 INK_REQUIRE_GPU=1 \
  cargo test --test language_foundations prepared_sums:: -- --nocapture
python3 reports/prepared-sums-2026-10-16/audit.py
```

Raw process samples, cold/setup/memory phases, runners, images, checked layout
packets, full cases and target receipts are bound by metadata.json. Measurements
and artifact hashes grant no rewrite or representation authority.
