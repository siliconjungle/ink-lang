# Local record/helper execution

JavaScript package `046d57b1` can keep readonly record fields local through value
loops, bounded pure helper expansion and conditional record merges. Owned values,
recursive helpers, unsupported shapes and exhausted budgets retain ordinary
handling. Every argument/field still executes in source order; aliases, lazy
branches, failures and raw floating-point values preserve their source meanings.
This is literal execution machinery, with no new syntax, ABI or rewrite authority.

## Complete complex text

The previous `5c027d05` and current emitters receive identical checked core bytes.
Six fresh Node 25.3.0 / Apple M4 Pro processes alternate artifact order over three
engine-profile rotations. Each lane warms for 2,048 complete calls and executes
fifteen 128-call samples, varying sixteen widths. Result materialization and
consumption are timed; capture, token setup and first calls remain separate.
The unmodified pinned Pretext walker checks every complete result.

Median process medians at 512 segments, in microseconds:

| Numerical profile | Previous prepared | Current prepared | Pretext direct |
| --- | ---: | ---: | ---: |
| Blink | 155.00 | 133.23 | 5.89 |
| Gecko | 153.78 | 128.45 | 6.07 |
| WebKit | 157.17 | 134.38 | 5.85 |

Prepared process-pair gains range from 1.14–1.21×; ordinary gains range from
1.18–1.24×. Ratios of displayed medians need not equal individual pair ratios.
The current walker still takes roughly 21–23× the upstream time. These are pure
arithmetic layout observations over synthetic measured facts, not browser/font
accuracy, complete text preparation or upstream speed parity.

## Simple text: retain both warm-up regimes

Three fresh paired-artifact processes use each warm-up setting. Eight rounds
retain the historical 128-call warm-up per lane; 128 rounds use 2,048 calls.
Both use complete varying count results, with construction/capture/token/first
calls separate. Longer warm-up does not establish universal steady-state behavior.

Prepared call medians, in microseconds:

| Warm-up rounds | Segments | Previous | Current | Pretext direct |
| --- | ---: | ---: | ---: | ---: |
| 8 | 8 | 3.823 | 1.932 | 0.115 |
| 8 | 64 | 6.040 | 7.773 | 0.264 |
| 8 | 512 | 10.371 | 6.762 | 0.823 |
| 128 | 8 | 1.212 | 1.615 | 0.059 |
| 128 | 64 | 1.730 | 1.211 | 0.138 |
| 128 | 512 | 9.129 | 7.142 | 0.796 |

The 512-segment prepared case gains in every process pair, but small calls have
substantial losses. Ordinary calls with longer warm-up also regress: 8 segments
increase from 2.138 to 3.072 µs and 64 segments from 3.831 to 5.725 µs. The short
64-segment prepared case takes about 29% more time in the displayed medians. These costs
must not be hidden by selecting only large inputs or one warm-up regime.
Pretext still leads substantially.

## Neural negative control

The previous and current neural modules are **byte-identical** (839,419 bytes;
SHA-256 `5afd503d530352699b855ac155690647ec6b6309f0f74290cf0873f0c9b53d38`).
Three fresh process pairs vary weights, context and targets with seeds
72131/99173/99174. They consume four complete outputs, or loss/four outputs/244
gradients, and check against a direct ordered F32 graph executor plus Handwired's
own executors. Each lane warms for 4,096 calls.

Prepared prediction medians are 9.210 / 9.270 µs; complete derivatives are
24.405 / 24.424 µs. Ordinary measurements also vary. These unchanged-code runs
establish no neural code-generation or speed gain. Their fluctuations cannot be
attributed to this emitter change. Faster ranged and dense controls remain in
the raw data. Owned graph/tape representations and deeper specialization still
need work; local record storage does not complete that requirement.

## Costs, validation and limits

Complex emitted source grows from 1,857,392 to 1,964,480 bytes; the simple counter
grows from 583,935 to 597,640 bytes. Cold/setup rows remain retained. No allocation
count, retained-heap bound, automatic profitable-selection or GPU speed claim
follows from these measurements.

All 55 standalone JavaScript tests pass. The expanded new fixture independently
checks 1,080 reference cases through 7,560 compiled/prepared calls, including
nested/composite records, list aliases, owned buffers, conditional merges, raw
binary64 values, fallible checks and bounded helper/body fallback. Its complete
source, core, generated images, cases and runner are retained for both carrier
configurations.

A mandatory distribution fixture freshly compares 252 source observations plus
one numeric control across native Rust, JavaScript, Rust-Wasm and the native GPU
host, with exact CPU snapshots. The numeric control confirms one actual device
call; record execution remains host computation. A complete text lifecycle also
matches 53 observations, events and snapshots across edits, resizes, rollback and
restore, with a separate numeric GPU control and normal compiler test stacks.

Complete complex geometry additionally replays 13,002 independent-reference
observations through 13,002 ordinary and 52,008 prepared JS calls. Fresh neural
controls retain all 18 reference cases through 270 prepared calls, with one
topology check per token, changing primals/derivatives, forged-input rejection
and detached outputs. Four binary64 and two source-reverse integration tests
also pass with required Wasm and GPU checks. The freshly built complete CLI emits
byte-identical complex code to the standalone two-emitter tool.

Initial unrestricted expansion regressed performance; bounded record arguments
and direct field merges reduce that overhead. A default-stack overflow exposed
insufficient analysis headroom; combined nesting below 28 now retains ordinary
calls before entering deep type/loan visitors. Existing source limits are not
raised. Tests cover these admitted paths, not the complete compiler, translation,
ABI, toolchain, AD transform or driver. Hosted CI remains separate from local
validation. The full three-project/adaptive-model programme remains active.

## Reproduce and audit

See [the procedure](../../bench/record-helpers/README.md), retained runners and
`summary.json` for all sizes, lanes and process-pair ratios. `metadata.json` binds
exact packages, cores, images, raw samples and checks. Run:

```sh
python3 reports/record-helpers-2026-10-16/audit.py
```

The audit checks integrity and consistency; hashes and timing observations grant
no semantic or representation authority.
