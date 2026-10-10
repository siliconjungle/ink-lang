# Checked web optimisation proofs — 2026-10-10

The new database improves complete web calls on these U32 workloads, with
substantial loop-elimination gains and smaller collection gains. Profitability
depends on the target: self-zip is about 4% slower in JavaScript, and most Wasm
and GPU collection comparisons show no established improvement.

The batch adds **52 checked laws: 24 numeric, 20 collection and 8 Frontier-inspired
pure word laws**, advancing the catalogue from 648 to 700 entries. The
[publication receipt](/Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang/reports/web-stack-proofs-2026-10-10/publication.json)
records admission of all 52 and preservation of the old immutable snapshot.
These laws use the existing checker; target lowering and runtime correctness
remain trusted.

Unoptimised Ink, old-catalogue-selected Ink and new-catalogue-selected Ink builds
use the same frozen compiler,
SHA256 `f5a95c77d31376964fc619d5a6e37933d6ec2593621a3cc2865a518710c3bdff`.
The old648 pin is `3ba66adca49bc68eee035c2addecf55cea8a9533d25741dc9d48f5d24a213be1`;
the new700 pin is `691db17c0c7d916a1cf54280d7482da97011be1293e977df241517083cb02dd3`.
[Metadata](/Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang/reports/web-stack-proofs-2026-10-10/metadata.json)
records compiler/artifact hashes, each function's newly applied law and changed
selected body. Subsequent concat/compiler work is outside this frozen experiment.

## Browser results

Apple M2, macOS, actual WebGPU through Apple Metal. The table copies the archived
**full-width U32, 4096-element** results. Ratios are prior648/new700 complete-call
times: above 1 means the new proofs are faster. Brackets are paired bootstrap
95% intervals; an interval crossing 1 does not establish a difference.

| Task | JavaScript | Wasm | Actual GPU |
|---|---:|---:|---:|
| Quadratic repeat | 4879.35× [4807.97, 4896.39] | 0.99× [0.98, 1.01] | 1.82× [1.73, 1.88] |
| Cubic repeat | 1600.00× [1580.93, 1632.21] | 73.07× [72.51, 74.53] | 1.37× [1.16, 1.43] |
| Bilinear repeat | 1494.77× [1484.03, 1573.70] | 55.98× [54.92, 57.30] | 1.14× [1.09, 1.18] |
| Quadratic map | 1.29× [1.28, 1.36] | 1.00× [0.97, 1.02] | 1.01× [0.97, 1.11] |
| Cubic map | 1.36× [1.35, 1.38] | 0.99× [0.99, 1.01] | 1.01× [0.98, 1.03] |
| Cross-type map fusion | 1.54× [1.51, 1.57] | 1.02× [0.99, 1.02] | Eligibility gain only |
| Self-zip → map | **0.96× [0.96, 0.98]** | 1.00× [0.99, 1.01] | 1.00× [0.97, 1.10] |
| Remove zero scan | 1.43× [1.40, 1.47] | 1.01× [1.00, 1.03] | Eligibility gain only |
| Fuse mapped ordered fold | 2.29× [2.12, 2.47] | 1.08× [0.99, 1.12] | CPU fallback |
| Frontier guarded word write | 1.58× [1.54, 1.62] | 0.99× [0.98, 1.01] | 1.00× [0.96, 1.03] |
| Frontier repeat restore | 174.81× [172.36, 178.43] | 1.01× [0.98, 1.04] | 0.85× [0.77, 1.01] |

Large repeat gains reflect removal of intentionally repeated original
algorithms, rather than a general language ranking. Target compilers can
already remove some work: the quadratic Wasm case has no established gain.
Self-zip's JavaScript regression demonstrates that an equal, shorter program
does not guarantee faster target code.

The [browser report](/Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang/reports/web-stack-proofs-2026-10-10/browser-REPORT.md)
contains all sizes/distributions and handwritten JavaScript/Rust-Wasm controls.
The [Node report](/Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang/reports/web-stack-proofs-2026-10-10/node-REPORT.md)
provides a separate host comparison; its full-4096 cubic/bilinear Wasm gains are
64.23×/47.69×, with the same roughly 4% self-zip JS regression. Ordinary map
Wasm calls remain slower than the original Rust-Wasm controls here. The browser
direct generated-JS/original-JS ratios for quadratic/cubic maps are 0.37×/0.35×;
those separate comparisons also include matched capture and output consumption.

## Scope and evidence

Warm complete calls include one typed-input snapshot per implementation,
runtime scheduling/wrappers, Wasm copying and result conversion, and checksum
consumption. GPU samples include upload, dispatch and readback. Direct generated
JavaScript is measured separately using the same snapshot/consumption driver
as handwritten JavaScript. Startup and first-call preparation are archived
separately. Wasm memory means exported linear-memory highwater; host/GPU memory
is unmeasured.

Cross-type map fusion and zero-scan removal make previously unsupported GPU
graphs eligible. Their new GPU executions are real, but a prior CPU fallback
cannot establish a prior/new GPU speedup. Ordered fold remains CPU-only.
Fallback records are retained and excluded from GPU timing samples.

The exact [benchmark source](/Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang/reports/web-stack-proofs-2026-10-10/kernels.ink)
and [frozen harness](/Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang/reports/web-stack-proofs-2026-10-10/harness.py)
are retained alongside selections, checker receipts, original JS/Rust sources,
emitted shaders and raw results.

All **20 collection laws** were admitted and replayed, including U64/I32/F32/Bool
variants; only representative U32 applications were timed. F32 proofs preserve
operation order and do not reassociate arithmetic. The **eight Frontier laws**
model pure word no-op writes/restores/folds, and the benchmark measures two U32
forms. They do not verify or benchmark complete JSON patching, mutable alias
policy, or CRDT operations. Sources and isolated receipts are in the
[collection evidence](/Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang/knowledge/research/web-stack-proofs/collection/validation.json),
[numeric evidence](/Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang/knowledge/research/web-stack-proofs/numeric/validation-receipt.json)
and [Frontier source notes](/Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang/knowledge/research/web-stack-proofs/frontier-notes.md).

The archived [verification receipt](/Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang/reports/web-stack-proofs-2026-10-10/verification.json)
records **11,256 paired samples** (5082 Node, 6174 browser), 1284 recomputed paired
intervals, and 528 imported observations with the proof pin unchanged. Each host
has 66 task/input cells; exact backend comparisons total 1815 Node and 2013
browser. Independent Python closed forms validate complete results, with 333
literal-source corroborations. The archived knowledge test log records 21
passing tests, including hash-valid false-proof rejection. This report only
summarises existing receipts; it introduces no new measurements.
