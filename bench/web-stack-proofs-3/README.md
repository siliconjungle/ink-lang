# Web proof batch 3

Six U32 workloads compare an unselected original program, the immutable 765-entry
catalogue, and the new catalogue using the same frozen compiler. Three mapped
self-zip functions retain their original map/zip stages in handwritten JS and
Rust controls. Three numeric controls retain 256 original iterative updates per
input word. Ordinary JIT/release optimisations are allowed.

Run from ink-lang, using a fresh report path to preserve archives:

```sh
python3 bench/web-stack-proofs-3.py --prepare \
  --zig ../toolchain/zig-aarch64-macos-0.15.2/zig \
  --report /absolute/path/to/fresh-report
python3 bench/web-stack-proofs-3.py --validate --report /absolute/path/to/fresh-report
python3 bench/web-stack-proofs-3.py --node --report /absolute/path/to/fresh-report
python3 bench/web-stack-proofs-3.py --serve --port 8774 --report /absolute/path/to/fresh-report
```

Open the printed localhost URL in a headed WebGPU browser and press Run once.
Stop all compilation and test jobs before timing. Audit each completed host with
`--audit node` and `--audit browser`. Preparation archives exact proof snapshots,
compiler and source hashes, locally checked selections and emitted modules.
Every benchmark must apply a fresh new law and differ from the old catalogue.

Complete calls include one typed input snapshot, applicable Wasm input/output
copies, output conversion, awaited call boundaries and consumed checksums. GPU
calls also pay upload, dispatch and readback. GPU counters are checked for every
call and aggregated over calibration, warmups and timed samples. A fallback
never becomes a GPU sample. If a rewrite newly enables a shader, that is an
eligibility change; prior/new GPU speedup is unavailable when the prior variant
fell back. Separate prior-CPU/new-GPU ratios measure complete route costs.

All result elements are validated before timing using arbitrary-integer Python
closed forms. Independent literal stages corroborate every boundary word and
the first four elements of each other vector fixture. Validation also checks
source input nonmutation. Empty/singleton, overflow, odd lengths, both condition
branches, zero multipliers and no/all threshold branches are covered.

Seven shuffled paired rounds follow discarded warmup and calibrated batches.
Sizes are 32, 4096 and 65536; distributions are small and full-width U32.
Individual paired bootstrap 95% intervals are exploratory and are not adjusted
for all comparisons. Preserve inconclusive intervals and regressions.

Rust output storage is preallocated and reused; source intermediate Vec stages
use ordinary library/release optimisation. No expert handwritten already-fused
or closed-form control is included. Cross-language gaps include wrapper and
transport differences; these measurements do not establish a language ranking.
Only exported Wasm linear-memory highwater is measured for memory observations;
JS/GPU latency evidence is archived without invented memory measurements.
Mathematical checking, source applicability and target profitability are separate.
All generated calls trust callers; no validator wrappers are introduced.
