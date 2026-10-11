# Fusion diagnosis: frozen ordinary controls and V8 evidence

The large composed fusion regressions remain reproducible under matched strict ESM and resident Wasm controls. The same fusion is beneficial in the simpler plain family. Loop scheduling, target integer representation and compiler transformations matter; this evidence does not isolate a universal fusion penalty or justify a source-specific policy. All performance estimates in this window are provisional because external build activity was observed.

This report analyzes existing completed runs only. It adds no compiler/backend changes, proof objects, builds, tests or timing runs. The historical batch38 prior/checked source pair is the diagnostic subject, rather than a comparison of General40 baseline/candidate compilers. No native speed measurements or new browser fusion replications were made here.

## Bound execution and controls

[Timing audit](timing-audit.json) binds manifest `81826243b3500cf5fe8650a151ce074f1e4504ba2870ff511456442fdaf1b426` and runner `f425af91d95d174e77e093c77e74374db5ea91aa21575133d4591446f5511d33`. Three fresh Node v26.1.0 / V8 14.6.202.34-node.19 processes, PIDs 28319/29879/31865, produced 6912 samples (16 fixtures ×16 variants ×9 rounds ×3 processes) and 768 complete validation records. The prior untimed audit covers 1536 validations, 48 JS modules, 32 static LLVM builds and four rejected tamper cases. Seeded order, calibration, all-word checksums and exact bound artifacts passed the audit.

JS calls capture both public input lists and return full owned outputs; resident Wasm captures inputs once and reuses a borrowed destination. Every result element is consumed within the ordinary timer. These boundaries stay separate. The recipe varies context (plain/composed), padding side (L/R), joint low/high word-and-shape regime, and size (4096/65536). These are historical joint regimes, not independent factor crossings or a representative workload population.

Unchanged clones retain strict ESM, public names and module tail while changing the import URL. The staged no-padding control removes suffix copies/allocation but retains scalar stages. Neutral-addition removal and explicit U32 quotient/remainder canonicalization are separate integer-source controls. Typed variants change the result collection to Uint32Array and are diagnostic representations, not admitted replacements for Array. Two-pass scheduling preserves one output allocation; blocking and typed two-pass controls help separate traversal scheduling from storage. Fusion versus staged no-padding still changes several factors, and clone outcomes expose compilation-context sensitivity.

Ratios below are reference/current; >1 favors the current variant. Each point is the geometric mean of nine paired round ratios per process followed by equal weighting of three process log means. Original JS pairs are a supplementary descriptive contrast computed from the audited raw samples; no new timing or significance interval is added. The frozen analysis retains all 256 predeclared contrast records and fragile nominal, uncorrected three-process cluster intervals. No host, boundary, context or regime is pooled in the table.

| Fixture | JS original prior/checked | Staged no-padding/checked clone | Checked clone/canonical | Checked clone/typed | Checked clone/two-pass | Wasm ordinary prior/checked | Wasm no-vectorizers prior/checked |
|---|---:|---:|---:|---:|---:|---:|---:|
| plain/L/low/4096 | 1.215 | 1.129 | 1.059 | 1.002 | 0.956 | 0.952 | 1.169 |
| plain/L/low/65536 | 1.257 | 1.144 | 0.973 | 0.985 | 0.888 | 1.046 | 1.117 |
| plain/L/high/4096 | 1.167 | 1.090 | 1.009 | 0.980 | 0.977 | 1.064 | 1.156 |
| plain/L/high/65536 | 1.243 | 1.166 | 0.924 | 0.960 | 0.896 | 1.118 | 1.113 |
| plain/R/low/4096 | 1.250 | 1.091 | 0.994 | 1.002 | 0.983 | 1.032 | 1.206 |
| plain/R/low/65536 | 1.212 | 1.111 | 0.997 | 1.021 | 0.930 | 1.028 | 1.156 |
| plain/R/high/4096 | 1.174 | 1.089 | 1.007 | 0.970 | 0.986 | 1.052 | 1.137 |
| plain/R/high/65536 | 1.251 | 1.161 | 1.000 | 0.979 | 0.892 | 1.039 | 1.131 |
| composed/L/low/4096 | 1.110 | 0.994 | 1.034 | 0.971 | 1.080 | 1.052 | 1.140 |
| composed/L/low/65536 | 1.037 | 0.978 | 1.057 | 1.045 | 1.139 | 0.914 | 1.152 |
| composed/L/high/4096 | 0.902 | 0.881 | 1.039 | 0.984 | 1.102 | 1.042 | 1.041 |
| composed/L/high/65536 | 0.876 | 0.889 | 1.010 | 0.989 | 1.060 | 0.937 | 1.093 |
| composed/R/low/4096 | 1.067 | 1.017 | 1.084 | 0.941 | 1.083 | 0.942 | 1.069 |
| composed/R/low/65536 | 1.043 | 0.984 | 1.029 | 1.006 | 1.102 | 0.932 | 1.171 |
| composed/R/high/4096 | 0.927 | 0.878 | 1.003 | 1.013 | 1.105 | 1.008 | 1.049 |
| composed/R/high/65536 | 0.908 | 0.906 | 1.015 | 0.986 | 1.089 | 0.922 | 1.125 |

All eight plain original JS point estimates favor checked fusion in every fresh process (1.167–1.257). The four composed high-regime JS losses retain a loss direction in each process (0.876–0.927). The staged no-padding/checked-clone comparison has seven faster and one inconclusive plain cell, versus four slower and four inconclusive composed cells. Unchanged clones are not uniformly equivalent in elapsed time: the composed checked clone has one faster, two slower and five inconclusive cells. Exact source bytes alone do not control JIT context.

Two-pass changes are context-sensitive: all eight composed cells are classified faster in this diagnostic, whereas six plain cells are slower and two inconclusive. Explicit U32 canonicalization has four faster/four inconclusive composed cells; typed storage has one faster/one slower/six inconclusive composed cells. Removing neutral +0 operations does not resolve the broader result. The canonical-U32 rewrite is a source diagnostic validated on these declared U32 fixtures, changed-input probes and zero-divisor cases; it is not a kernel-admitted target-representation equivalence or evidence about other numeric domains. For example, the composed left/high/65536 clone/canonical ratio is only 1.010, while its original prior/checked ratio remains 0.876; a small canonicalization gain does not close that original loss, and the clone difference prevents treating these ratios as one causal subtraction. None supplies a general default or a complete explanation of the original high-regime losses.

At 65536 words, ordinary composed resident-Wasm prior/checked ratios are 0.914/0.937 left low/high and 0.932/0.922 right low/high. All four retain a loss direction in all three processes. The corresponding no-vectorizer ratios become 1.152/1.093 and 1.171/1.125. This intervention disables both loop and SLP vectorization across the module; it establishes transformation sensitivity, not which vector instruction, scheduling decision or machine resource causes the difference. Plain and small composed results differ, so global disabling is unsupported.

## V8 profiles: separate instrumented evidence

[Processed receipt](profile-tools/receipt-processed.json) binds four profile results, PIDs, exact argv/execArgv, exit 0, source hashes, raw logs, processing commands/PIDs and ordinary audit/analysis hashes. The same installed Node26.1.0 executable processed each log offline. Profile captures identify Node/V8 versions; no contemporaneous executable hash or separate profile host snapshot was recorded at launch, so current processor hash is not a retroactive binary-isolation proof. Templates and raw logs remain unchanged.

Each profile used one left/high/65536 fixture, one original variant, 64 warmups and 256 calls. Full original/changed k=0 outputs, nonmutation and retained owned-result lifetime passed before profiling. Warmups check full outputs; profile calls consume every word and produce the declared checksum, rather than performing a new full equality assertion on each call. Profile mode has no ordinary speed samples or calibration.

| Instrumented run | Total ticks | Primary self ticks | Consumer self ticks | libsystem_m ticks | GC ticks | Unaccounted | Primary bailouts |
|---|---:|---:|---:|---:|---:|---:|---:|
| plain-prior_original | 409 | 208 | 15 | 0 | 12 | 0 | 19 |
| plain-checked_original | 288 | 158 | 11 | 0 | 11 | 0 | 1 |
| composed-prior_original | 1237 | 260 | 15 | 804 | 21 | 9 | 13 |
| composed-checked_original | 1277 | 241 | 6 | 925 | 9 | 3 | 1 |

All four primary methods reach TURBOFAN_JS; checked originals also show MAGLEV OSR compilation. Each checked original has one primary bailout, explicitly “prepare for on stack replacement (OSR).” Plain prior has 19 and composed prior 13, including insufficient feedback for access/compare; composed prior also has two “length is greater than the maximum for fast elements array” events. These traces cover validation, changed-input probes and warmup as well as the profile calls. They contradict a “more checked deoptimizations” explanation, and neither total counts nor a bailout establishes steady-state cost.

The composed profiles locate substantial sampled work in `/usr/lib/system/libsystem_m.dylib`: prior804/1237 (65.0%) and checked925/1277 (72.4%). Checked bottom-up stacks attribute 918 of those 925 ticks to the pinned primary `__fn0`. This supports investigating math-library paths in the quotient/remainder/Number computation, but the library-level symbol does not establish which operation, how often it executes, or a cost difference attributable to fusion. Sampling fractions and total ticks cannot substitute for paired ordinary timing. Direct primary self ticks exclude its shared-library callees.

Plain profiles have 36.5–42.5% C++ summary ticks and include startup/loader/output-related activity; composed profiles have 6.9–11.0% C++ plus large math-library fractions. GC ticks overlap summary categories and must not be added as an independent total. Capture/copy and all-word consumer are part of the public boundary; their small directly attributed JS tick counts cannot show their native work is negligible. Import/setup, tiering, profiler perturbation and unresolved symbols prevent a clean phase-exclusive hotspot/cycle account.

## Native/Wasm compiler evidence

[Compiler evidence](compiler-evidence.json) and [untimed audit](untimed-audit.json) bind source C, LLVM IR, function source ranges, remarks, compiler argv and ordinary/no-vectorizer Wasm builds. The counts below are static udiv/urem instruction sites in the primary functions; owned/Into summaries are separately retained and agree for these patterns. Both ordinary versions have vectorization remarks. No native timing or native hardware profile was executed by this fusion lane.

| Context | Target | Prior udiv/urem sites | Checked udiv/urem sites |
|---|---|---:|---:|
| Plain | native LLVM | 0/2 | 0/2 |
| Plain | Wasm LLVM | 0/4 | 0/2 |
| Composed | native LLVM | 4/4 | 2/2 |
| Composed | Wasm LLVM | 6/6 | 10/10 |

Both orientations have these same static patterns. Native and Wasm transformation results differ; the composed Wasm code duplicates more instruction sites in its optimized body while native has fewer. Sites may belong to cloned paths, scalar tails or vectorized bodies and are not dynamic operation counts. Without path frequencies, machine-cycle attribution or a narrower controlled intervention, this is compatible evidence rather than a proven div/rem or SIMD root cause.

## Crosswalk to all twenty original regressions

The immutable Engine39 inventory records eleven Node and nine actual-browser archived loss cells. This new fusion window matches eight Node fixture/boundary cells; resident-Wasm uses fresh LLVM builds of the same emitted C rather than the archived binary. The 32-word cell, full-call Wasm cells and all browser cells are outside the new timing scope. Their prior diagnosis remains available, including reversals and inconsistent reproduction. A Node result is not a new Chrome result. [Machine-readable crosswalk](RESULTS-evidence.json) preserves every original record, host, exact full frame, archive ratio, reproduction status and matched current contrast.

| # | Host / fixture | Boundary | Original archived ratio | Engine39 reproduction | New Engine40 ratio / coverage |
|---:|---|---|---:|---|---|
| 1 | node / composed/L/high/4096 | captured-js-owned | 0.864 | loss point direction all three processes | 0.902 |
| 2 | node / composed/L/high/65536 | captured-js-owned | 0.909 | loss point direction all three processes | 0.876 |
| 3 | node / composed/L/high/65536 | resident-wasm-destination | 0.846 | loss point direction all three processes | 0.937 |
| 4 | node / composed/L/low/32 | resident-wasm-destination | 0.729 | not consistent across three processes | Not measured here |
| 5 | node / composed/L/low/65536 | resident-wasm-destination | 0.829 | loss point direction all three processes | 0.914 |
| 6 | node / composed/R/high/4096 | captured-js-owned | 0.880 | loss point direction all three processes | 0.927 |
| 7 | node / composed/R/high/65536 | captured-js-owned | 0.899 | loss point direction all three processes | 0.908 |
| 8 | node / composed/R/high/65536 | captured-wasm-owned | 0.957 | not consistent across three processes | Not measured here |
| 9 | node / composed/R/high/65536 | resident-wasm-destination | 0.857 | loss point direction all three processes | 0.922 |
| 10 | node / composed/R/low/65536 | captured-wasm-owned | 0.971 | not consistent across three processes | Not measured here |
| 11 | node / composed/R/low/65536 | resident-wasm-destination | 0.892 | loss point direction all three processes | 0.932 |
| 12 | browser / composed/L/high/4096 | captured-js-owned | 0.978 | single actual browser run direction reversal | Not measured here |
| 13 | browser / composed/L/high/65536 | resident-wasm-destination | 0.810 | single actual browser run loss | Not measured here |
| 14 | browser / composed/L/low/65536 | captured-wasm-owned | 0.970 | single actual browser run loss | Not measured here |
| 15 | browser / composed/L/low/65536 | resident-wasm-destination | 0.887 | single actual browser run loss | Not measured here |
| 16 | browser / composed/R/high/4096 | captured-js-owned | 0.986 | single actual browser run direction reversal | Not measured here |
| 17 | browser / composed/R/high/65536 | captured-wasm-owned | 0.976 | single actual browser run loss | Not measured here |
| 18 | browser / composed/R/high/65536 | resident-wasm-destination | 0.787 | single actual browser run loss | Not measured here |
| 19 | browser / composed/R/low/65536 | captured-wasm-owned | 0.969 | single actual browser run direction reversal | Not measured here |
| 20 | browser / composed/R/low/65536 | resident-wasm-destination | 0.896 | single actual browser run loss | Not measured here |

For the four matched Node high-regime JS cells, the original loss direction survives. For the four matched large resident-Wasm cells, the ordinary recompiled pair also loses and the no-vectorizer pair reverses direction. The earlier inventory reported eight of eleven Node losses in the loss direction across three fresh processes; its low32 and two full-call cases crossed direction. Its nine browser cases have only one fresh browser process and include direction reversals. Those earlier scopes, uncertainty and actual-host limitations are retained rather than relabeled as new replication.

## Limits and retained evidence

Process snapshots before/after every ordinary run show external Cargo/rustc build activity, and the audit explicitly records observed contention. Three sequential fresh processes with randomized within-round order do not prove scheduler isolation; no run or cell has been silently discarded. All speed conclusions remain provisional. Exactly three process clusters and numerous exploratory contrasts make nominal intervals fragile and uncorrected for multiplicity.

The remaining causal gaps are specific: no phase-exclusive steady-state V8 machine profile; no identified math-library call/path count; no finer attribution of vectorizer-induced Wasm machine changes; no native runtime reproduction; no new full-call/small/browser fusion replication; and no proof that typed or staged diagnostics preserve all production observable representation contracts. Nothing here grants new mathematical authority, universal superiority, a target-independent cost formula or a case-hash whitelist. General40 policy/feature evaluation is separate.

[Results evidence](RESULTS-evidence.json) SHA `399f65436ced7b503c8919f38825bc308e75f3cb6894e2c0f27c07e381c8b6f8` binds all upstream audits, raw-sample receipts, profiler receipt, original inventory, source tools and host snapshots. Profiler receipt SHA `58ff5f98e620726d032bcda8c4b9c73e8e8e255a724b96dc976bd641527f39a6`. Frozen historical evidence and recipes were preserved; only new report-local processing outputs, receipt, analysis evidence and this report were written.
