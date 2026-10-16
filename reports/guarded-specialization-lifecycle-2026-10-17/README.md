# Generated guard and projection lifecycle measurements

The generic JavaScript evaluator wins against the generated guard on this
32-node owned F32 graph. Removing an unobserved accumulator field through an
ordinary database projection is more useful. Combining projection with guarded
specialization improves the guarded image but still loses on matching graphs.

Eight groups of four fresh processes compare the same source and runtime histories
under four checked plans. Median baseline-time / variant-time ratios follow;
values above one favor the variant.

| Bound state workload | Guard | Projection | Projection + guard |
| --- | ---: | ---: | ---: |
| Matching graph, 1 input | 0.657 | 1.106 | 0.745 |
| Matching graph, 64 inputs | 0.858 | 1.064 | 0.938 |
| Matching graph, 1024 inputs | 0.989 | 1.010 | 0.992 |
| Late mismatch, 64 inputs | 0.934 | 1.069 | 0.995 |
| Empty graph, 1 input | 0.687 | 0.998 | 0.692 |
| Short lifetime, 1 read | 0.940 | 1.022 | 0.960 |
| Graph/weight learning, 8 matching reads | 0.872 | 1.072 | 0.941 |
| Graph/weight learning, 8 mixed reads | 0.908 | 1.063 | 0.970 |

The source has trainable `Code` and `Weights`. Short lifetimes include state
creation, binding and initial learning writes. Learning cases alternate weights
and may alternate matching/mismatching graphs. These writes do not implement or
measure a full gradient/search update algorithm. Timed calls consume complete
list results. Fixed within-process case order and pre-timing correctness controls
warm the module; first-call records describe a fresh state, not cold compiled code.

On this Apple M4 Pro (48 GiB, 14 logical CPUs), Node 22.22.1 imports the baseline
image in a median 3.87 ms and the guarded image in 5.06 ms. Their source sizes are
233,589 and 290,067 bytes. Whole-process peak RSS is about 221–222 MiB and includes
all correctness checks/cases; it is not a per-case retained-memory measurement.
The shared host was not CPU-isolated, and small proof-authoring/regression commands
overlapped some measurements. Pair ranges, raw timings, setup/import/recovery
records and exact images are retained. These observations are not planner
admission evidence or a broad performance claim.

The earlier five-pair guard/baseline cohort is also retained. Across both cohorts,
42 fresh processes each check the same 96 finite reference input combinations and
the same independent 335-outcome history, with events, rollback, raw float bits,
six restores and exact snapshots. These are repeated controls, not 14,070 distinct
test scenarios. Every candidate reproduces complete timed checksums, first results
and final snapshots. The [compiler source inventory](../guarded-function-specialization-2026-10-17/compiler-sources.json)
binds the genuinely built compiler used for all images. The external producer
revision in `summary.json` separately identifies the later prefix authoring code.

`guarded_specialization.py --prefix-plan` reproduces the measured six-step
projection/guard plan exactly. Legacy scalar programs exposed stale feature
versions and an empty proof type-map serialization issue; both now pass complete
checked replay. A missing prefix proof leaves existing output untouched. All 26
related knowledge regressions pass; failed development attempts and a mistyped
test-module command are retained separately from the final passing log.

```sh
python3 reports/guarded-specialization-lifecycle-2026-10-17/audit.py \
  --ink target/debug/ink --run
```

The auditor checks all retained hashes and paired statistics, replays all four
plans, regenerates their JavaScript images, re-evaluates the 96 reference cases
and reruns the four images' finite controls. It does not repeat performance
measurements. See [benchmark protocol](BENCHMARK.md) and the captured `run.py`
for reproduction. Automatic opportunity discovery/admission, amortized guard
preparation, native/GPU comparisons and the full Handwired/Pretext/Freerange
performance programme remain open. No new speed parity or whole-compiler
correctness claim follows from these measurements.
