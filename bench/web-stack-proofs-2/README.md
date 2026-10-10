# Web proof batch 2

Six U32 workloads measure the new 18 compute and 15 collection-fusion laws
against the immutable 732-entry catalogue. All variants use the same frozen
concat-capable compiler. The default external planner selects the candidates;
each selection is locally checked and reified before target emission.

Run from the ink-lang checkout. Use a fresh report path to preserve existing
archives, and stop compilation/test jobs before timing:

```sh
python3 bench/web-stack-proofs-2.py --prepare \
  --zig ../toolchain/zig-aarch64-macos-0.15.2/zig \
  --report /absolute/path/to/fresh-report
python3 bench/web-stack-proofs-2.py --validate --report /absolute/path/to/fresh-report
python3 bench/web-stack-proofs-2.py --node --report /absolute/path/to/fresh-report
python3 bench/web-stack-proofs-2.py --serve --port 8773 --report /absolute/path/to/fresh-report
```

Open the printed localhost URL in a headed WebGPU browser and press Run once.
After it finishes, audit Node and browser receipts separately with `--audit node`
and `--audit browser`. Preparation pins the then-current catalogue; the archived
metadata records the exact historical 732/765 snapshots used for this run.

Complete calls include one input snapshot, backend transport, public result
conversion and consumed outputs. GPU calls additionally require exactly one
reported dispatch, the expected input/scalar/metadata upload and result readback
for every timed call. Scalar reductions retain explicit CPU fallback records.
Startup/first calls are separate; calibration and warmup are excluded from the
seven shuffled paired timing rounds but retain their own checked receipts.

Python arbitrary-integer closed forms validate every result. Literal source
evaluation corroborates complete scalar fixtures, all boundary vector elements
and the first four elements of every other vector fixture. JS and Rust controls
retain original loops and materialised stages, with ordinary engine/release
optimisation. Their polynomial helpers reuse the shifted operand; Rust output
storage is preallocated and reused. These control choices affect cross-language
comparisons, while the prior/new Ink comparison uses the same source, compiler,
driver and target contract on both sides.

Only exported Wasm linear-memory highwater is measured for memory observations.
Host/GPU memory is unmeasured. Raw JS/GPU timings remain in the archive without
invented memory observations. Ratios above one in prior/new columns mean new
proofs are faster; confidence intervals crossing one do not establish a gain.
All 33 type instances are checked, while performance coverage is six U32 tasks.
