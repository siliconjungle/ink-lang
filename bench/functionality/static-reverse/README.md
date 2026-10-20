# Complete compiled reverse learning

The explicit compiled reverse requests evaluate the same 64-coordinate objective
and update as the original reverse requests. Only the request names differ between
`source.ink` and `baseline-source.ink`; `reproduce.py` checks this before running.
The preceding published compiler produced `baseline.mjs`. The candidate compiles
one complete bounded graph into scalar continuations, with shared primals,
ordered adjoints and liveness between blocks. Gradient and linearized interfaces
share a generated kernel.

These are opt-in authored requests. Original reverse calls keep their published
checked source images and checkpoints. Successful static elaboration changes the checked source image; existing
proof/checkpoint bindings must not be relabelled to bypass that boundary.
Unsupported shapes/control and optional resource exhaustion retain dynamic tapes.
See [the exact domain and API](../../../docs/static-reverse-tapes.md).

## Workload and controls

The model has eight eight-coordinate records. Its loss is the squared error of
an ordered sum of coordinate squares. Each update computes the full primal,
reverse gradient and new 64-coordinate weights, including public result ownership.
The logical tape has 193 nodes. Capacity 192 fails and 193 succeeds. A separate conformance case checks that
duplicate primal operations still consume distinct logical nodes. This is an independently
authored synthetic training workload, not a measurement of an external application.

The adapter checks 128 changing-weight updates against independent ordered F32
arithmetic, complete gradients and primals, exact capacity boundaries, and a tight
handwritten loop. Every timed batch consumes and compares its complete output.
The handwritten loop is a separate control; it does not stand in for a strong
neural library or establish upstream performance parity.

The engine policy keeps its numerical regression/noise budgets and uses three
fresh process groups per engine, at least
65,536 warmup calls, common calibrated batches, 15 alternating samples and an
independent byte-identical A/A control. Node 22.22.1, Node 26.1.0 and installed
Google Chrome are assessed separately. Setup, imports and verification remain
outside steady-state timing. Raw import costs and emitted bytes must be read
alongside throughput; they have no promotion budget. Each Node role uses its
own ordinary default-realm process; Chrome uses independent same-thread iframe
realms. Calibration gives all roles equal call counts, and all transfer/setup is
outside timing. The receipt binds this exact method. No frame-rate, production
server capacity, GPU training or universal speedup claim follows.

The retained adapter's `tapeDescriptors` diagnostic checks buffer descriptors,
so it is false for both artifacts and is not an admission test. Static admission
is checked by the `static_reverse` IR tests. The original emitted metadata has
Flow/Node/Tape/Wire records; the compiled artifact omits those tape records. No
measurement decision depends on that diagnostic field.

## Selected measurements

Complete 64-coordinate updates took **17–39% less time** on this host. Each
complete-update row passed its own per-process regression and byte-identical
control budgets. These are steady-state times in microseconds per complete call:

| Engine | Original tape | Compiled graph | Median paired time reduction |
| --- | ---: | ---: | ---: |
| Node 22.22.1 | 35.21 | 21.32 | 39% |
| Node 26.1.0 | 16.81 | 13.45 | 20% |
| Chrome 155.0.8059.85 | 14.36 | 11.87 | 17% |

Times are medians of the three process medians; reductions use the median of
paired per-process ratios, so dividing the displayed times need not reproduce
that column exactly. No results from different engines are averaged together.
See [all raw samples and decisions](measurements/comparison-final/receipt.json).

The **overall original/compiled comparison is blocked**, because the separate
Node 22 gradient-only case has an inconclusive A/A control: one identical-module
pair differs by roughly 62%. That case supplies no accepted Node 22 gradient
speedup estimate. The complete-update rows above pass independently. Node 26
and Chrome gradient-only cases also pass, with about 24% and 21% less time.
This comparison is evidence for these explicit requests, not permission to
replace original reverse requests or relabel their source/checkpoint identities.
The separate new-API floor and existing compiler regression floors retain their
own decisions; an inconclusive observation is never rewritten as a pass.

The tradeoff is substantial: JavaScript grows from **602,582 to 1,246,596 bytes**
(2.07×). Median import time rises from 13.9 to 31.8 ms on Node 22, 11.5 to 24.0 ms
on Node 26, and 12.0 to 21.7 ms in Chrome. Imports are unbudgeted observations,
not steady-state work. The independent handwritten update remains around
2.0–2.4 µs, leaving a large gap; this does not establish neural-library parity.

The [rejected measurements](measurements/rejected/README.md) retain earlier
completed shared-realm observations with their exact methods. None is promotion
evidence. The incomplete VM-context prototype was discarded as an insight-only
experiment; it supplies no measurement or speedup estimate. The selected method uses ordinary Node
processes and real browser realms, without changing engine JIT flags.

The [selected proof inputs and logs](proofs/README.md) include 539 standalone
core tests, leaf package checks, 51 F32 and 51 F64 cross-target observations,
and 306 browser comparisons with restores and actual-device controls. The
[validation summary](validation.json) records their scope and all gate decisions.

## Regression check status

| Corpus | Timing decision | Unchanged-output evidence |
| --- | --- | --- |
| New compiled-reverse floor | Node 22 inconclusive; Node 26/Chrome pass | Exact frozen module identity verified |
| Existing forecasts/twelve-weight updates | Pass on all three engines | Changed module; timing gate passed |
| Older eight-case call comparison | Node 22/26 inconclusive; Chrome pass | Historical comparison remains blocked |
| Published fourteen-case prepared-call floor | Node 22/26 inconclusive; Chrome pass | Exact frozen module identity verified |

All raw decisions are retained in `measurements/`. The older call comparison is
**not accepted for rollout**: one Node 22 identical control differs by 21%, and
one Node 26 control by 24%. The current module is nevertheless byte-identical to
the already published prepared-call artifact, whose fourteen cases cover all
eight older cases; [that separate factual identity](published-call-artifact-identity.json)
does not turn the historical timing comparison into a pass. CI continues to
require the older comparison and reports every corpus even after a failure.
The whole compiler/CI run is not claimed verified by these local observations.

## Reproduction

Build the pinned distribution using its local Cargo entry point. On the owner
host this is the configured Cargo wrapper, which prepares exact pinned sources
without unpacking repository reports or knowledge. Keep untimed validation debug
and incremental output disabled. Use the absolute compiler artifact returned by
Cargo; do not assume the shared reuse target is `target/debug`.

Run `python3 bench/functionality/static-reverse/reproduce.py --compiler ...
--node22 ... --node26 ... --chrome ... --playwright ... --out ...`. The runner
compiles the candidate before measurement, binds all inputs/engines/producer bytes,
and fails on missing engines, regressions or inconclusive controls. Recheck its
receipt with `tools/engine-gate/gate.mjs --verify` before any timing-based
promotion. The default comparison can correctly exit nonzero for inconclusive
controls. Add `--floor` to run the separate frozen new-API rollout floor through
`rollout.mjs`; its unchanged-module proof never relabels a noisy timing verdict. The required
CI engine job includes this corpus alongside the existing three regression floors.

The standalone `static_reverse` suite compares exact exceptional F32/F64 values
and logical capacity against dynamic tapes. A frozen prior-compiler identity
protects original F32/F64 reverse source images. A 2 MB-stack regression checks
60 helpers with 24 lexical bindings each and preserves the existing 64-call cutoff.
The `source_reverse` integration histories check complete results, events, failed
updates, restore and exact portable snapshots across native/JavaScript/Wasm and
both GPU hosts. Reverse execution remains on the CPU; eligible device dispatch is
measured separately. Normal checking and these tests do not prove the compiler.
