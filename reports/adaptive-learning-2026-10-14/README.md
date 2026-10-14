# Adaptive execution: opportunity, usage and locality — 14 October 2026

This study adds no AI or trained model. It separates implementation opportunity,
controller choices, host costs, and the granularity of an adaptation. Results are
bounded experiments on compiled Ink state and an explicit JSON boundary API, not
an unseen-app generalisation estimate.

## What changed

- The planner has a bounded offline dynamic-programming diagnostic for the best
  fixed variant and the best migration-charged switching schedule with hindsight.
  Each candidate window is replayed from the same logical snapshot; setup and
  directional migration are separately measured. Missing prices/edges fail closed.
  Optional measured memory/pause constraints can exclude candidates and transitions.
- Runtime access diagnostics sample operation kind, opaque key/path/shape IDs,
  sizes, scans, mutations and invalidations. Native and browser hosts run the same
  Rust feature calculation. Histories, samples and identities are capped. These
  are diagnostic observations, not schema/proof premises or automatically admitted
  profitability features.
- Explicitly independent compiled collections can adapt separately. A local
  migration does not checkpoint or rebuild cold collections. No source partition
  inference or cross-collection transaction is introduced.
- Optional owned JSON lookup views build member-offset indexes incrementally and
  invalidate only affected subtrees on a successful write. Exact number tokens,
  member order, missing/null, owned results and failed-write atomicity are retained.
  A lookup builds at most its entry budget. Writes currently clone and validate the
  full logical document. This API does not transparently replace `std:json` actions.
- A fixed host can now disable all runtime recording, rather than only switching.

## Method and limits

Five fresh processes rotate the five complete-session modes. Each process acquires
three same-prefix replay timings per window/candidate and transition, and three
complete executions per mode. Four fresh processes rotate the four JSON modes and
four collection modes. Tables show medians of process medians where applicable;
`summary.json` includes the process ranges. All samples, not selected best runs,
are retained. Shared Apple ARM host, Node 22; other work, JIT and GC can affect
measurements. Some compilation overlapped this acquisition, so small differences
are not evidence of a stable gain. No confidence intervals or tail-latency claim.

Development cost acquisition is separate from the replay/evaluation histories.
The 64-call window is a non-learning comparison prompted by the exploratory
512-call results, not a held-out policy optimisation or a changed default. All
policies retain the declared 32768-call forecast; no future evaluation calls enter
runtime decisions. The oracle *does* see future windows: it is an optimistic cost
model diagnostic over two supplied variants and 512-call boundaries, not a runnable
policy. Median replay prices can contain noise and cannot establish achievable
end-to-end speed. This report's oracle is resource-unconstrained; production host
budgets still apply. Compiler/proof search is outside execution timings.

Every replay window and complete state session checks the final exact portable
snapshot. The preparation/reference conformance also checks replies, errors and
events. JSON modes compare values/checksums and final logical documents, with
separate native/JS/reference conformance for exact tokens, updates and failures.

## Whole-state execution

Milliseconds, including host construction, calls and in-session migrations.
`Raw direct` bypasses the host; `Fixed host` has recording disabled. `Profile only`
adds bounded access diagnostics plus the ordinary latency recorder without switches.
Final snapshot verification is outside timings.

| Trace | Raw direct | Fixed host | Profile only | Adaptive, 512-call window | Adaptive, 64-call window |
|---|---:|---:|---:|---:|---:|
| Steady reads | 21.66 | 29.28 | 33.29 | 17.35 | 18.06 |
| Steady writes | 3.75 | 13.93 | 16.98 | 15.59 | 18.01 |
| Writes → reads | 24.84 | 34.49 | 36.86 | 26.59 | 25.33 |
| Reads → writes | 16.93 | 28.04 | 31.75 | 80.11 | 32.85 |
| Alternating short phases | 15.93 | 27.18 | 31.24 | 29.93 | 132.50 |
| Sparse update phases | 22.54 | 33.46 | 37.86 | 75.80 | 66.07 |

The smaller window reduces read-to-write detection delay, cutting that session's
adaptive time by 59%, but still loses to raw direct execution. It also reacts to
short phases that cannot repay their migrations, making alternating execution
4.4 times slower than the 512-call controller. Faster detection is not automatically
better prediction. Defaults remain unchanged.

The profiling-only cost must be compared to the fixed host, not raw direct: the
latter also excludes capture and queue costs. Even the fixed host is expensive for
cheap writes. Instrumentation and scheduling overhead are real limits on the
benefit from adaptive representation selection.

| Trace | Best fixed replay cost | Hindsight switching cost | 512-call controller choice gap |
|---|---:|---:|---:|
| Steady reads | 1.48 | 1.48 | 6.39 |
| Steady writes | 2.83 | 2.83 | 0.00 |
| Writes → reads | 21.21 | 7.63 | 4.71 |
| Reads → writes | 14.48 | 2.12 | 61.50 |
| Alternating short phases | 15.44 | 15.44 | 0.00 |
| Sparse update phases | 20.87 | 17.26 | 44.43 |

These replay costs are not complete host-session timings. Their difference from
real execution includes host overhead, replay/session differences and timing
noise. Migration is priced at each actual prefix, including growing event history;
a row-count-only development profile does not capture every such lifecycle effect.
The diagnostic identifies substantial candidate opportunity for long phase
changes, little/none for short alternating phases, and a large decision-delay cost
on reversal. More optimisation recipes would not by themselves remove those costs.

## Independent collection adaptation

Sixteen independently owned compiled collections have 128 rows each. One is hot
and read-only, one receives periodic writes, and fourteen remain cold. Every mode
performs the same logical calls and produces the same snapshots. The whole-group
control switches all collections uniformly; local execution has a richer candidate
space and can mix representations. Separate whole-group costs are measured; a
linear migration-cost multiplier is not assumed.

| Mode | Median ms | Range across processes | Restored collections during calls |
|---|---:|---:|---|
| Whole group, fixed | 45.09 | 40.55–63.06 | 0 |
| Whole group, adaptive | 50.86 | 44.30–62.58 | 0, 0, 0, 16 |
| Independent collections, fixed | 44.67 | 40.37–50.10 | 0 |
| Independent collections, adaptive | 28.36 | 24.13–37.31 | 1 in every run |

Local adaptation reduces time by **36.5% versus its matching fixed control**.
Only the hot collection migrates: 2,188 snapshot bytes. The one whole-group switch
restores 36,800 bytes across all sixteen collections. The speed difference is not
solely copying savings: local adaptation also avoids selecting expensive cached
writes for the write-active collection. Variation in whole-group choices shows
that empirical cost ranges matter.

## Arbitrary JSON lookup

All modes use the same exact-token logical JSON representation and own their
results. `Raw linear` has no indexing/profiling machinery. Incremental indexing
starts after four object reads and builds at most sixteen entries per lookup.
`Eager` builds on first touch, within the same entry/memory caps. Timing includes
parse, lookups, owned result copies and updates. This is not a comparison against
native JavaScript object property access, which uses a different representation.

| Scenario | Raw linear ms | Incremental ms | Eager ms |
|---|---:|---:|---:|
| Repeated reads, 1,024-member object | 40.78 | 22.16 | 20.11 |
| Changing paths, 1,024-member object | 32.74 | 21.07 | 21.86 |
| Eight reads only | 0.64 | 0.62 | 0.58 |
| Eight-member object | 15.54 | 16.23 | 16.46 |
| Frequent writes | 137.37 | 136.79 | 137.50 |
| Nested object with local updates | 13.83 | 13.40 | 13.20 |
| Replacing document shapes | 6.13 | 5.79 | 6.15 |
| Repeated missing-key lookup | 33.92 | 2.25 | 1.71 |

Incremental lookup saves **45.7%** on repeated wide-object reads and **35.6%** on
changing paths; completed indexes eliminate repeated full scans for absent keys.
Small objects and write-heavy cases do not show a worthwhile gain. Eager indexing
can be faster for a long stable session. Incremental construction primarily bounds
upfront work: the eight-read case builds 80 entries versus 1,025 eagerly. Neither
entry budgeting nor these timings prove a wall-clock pause bound or heap bound.

## Conclusions supported by this study

1. There is useful performance opportunity without AI, especially from choosing
   smaller independent units and supplying efficient JSON lookup machinery.
2. More observation alone does not solve phase prediction. Short windows can
   respond sooner and still make worse lifecycle decisions.
3. Cheap operations need cheap execution paths. Preserve the ordinary unprofiled
   path and measure the full host cost rather than hiding it in every baseline.
4. Usage needs more dimensions than read/write ratio: locality, scan work,
   invalidation and the size of the state being migrated all matter. The new
   diagnostics expose these signals; they do not yet automatically turn them into
   new admissible cost cells or infer a schema.
5. These two compiled alternatives and JSON scenarios establish mechanisms and
   bounded gains, not universal state-app performance. No trained model or new
   proof authority was introduced.

## Reproduce

```sh
python3 bench/adaptive-state/prepare.py --compiler target/release/ink \
  --target-key DEVICE_AND_TOOLCHAIN_KEY -o build/learning-aggregate
BENCH_SOURCE="$PWD/bench/adaptive-state/aggregate.ink" \
  node bench/adaptive-state/run.mjs build/learning-aggregate/bundle \
  target/release/ink "$PWD" build/learning-acquisition.json
python3 bench/adaptive-learning/run.py --bundle build/learning-aggregate/bundle \
  --profile build/learning-acquisition.json.fitted.json -o build/learning-report
python3 bench/adaptive-learning/summarize.py build/learning-report
```

`provenance.json` binds the acquired compiler/artifacts/profile and measured host
scripts. Acquisition predates the final distribution commit; exact identities are
retained instead of relabelling old binaries as a new revision. `acquisition` files
retain the separate development observations and fitted profile. Re-running on
another machine must use its own target identity and new acquisition.
