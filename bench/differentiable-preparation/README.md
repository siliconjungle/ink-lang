# Preparing immutable context for automatic derivatives

`source.ink` compares one complete `gradient` request with four explicit JVP
requests and an authored closed-form derivative. The complete request prepares
zero-tangent immutable context once and shares it across four directional passes.
It retains no context between calls. The repeated control uses the same generated
arithmetic helpers, re-preparing context per direction. The handwritten control
exposes substantial remaining AD overhead.

Build JavaScript, then run `node run.mjs /ABSOLUTE/PATH/program.mjs SEED` in three
fresh processes per cohort (development 72131, holdout 99173). Eleven interleaved,
random-order samples per size include preparation and consumption of all output
fields. An independent polynomial derivative checks outputs before and after each
sample. Sizes are 0, 16, 4096 and 32768 values; weights are fixed dyadic numbers.
Timings are warm complete calls, not cold compilation or first calls.

On the retained M4 Pro/Node 22.22.1 receipts, held-out process-median medians at
32768 values are 19.967 ms prepared, 22.568 ms repeated, and 0.969 ms handwritten.
At 16 values, preparation regresses: 10.420 versus 7.938 microseconds repeated.
This establishes a context-reuse mechanism and a significant performance gap.
It does not establish general AD speed, Handwired training parity, reverse-mode
performance, GPU training speed or an automatic profitability decision.

Raw receipts and emitted module: `reports/differentiable-preparation-2026-10-15`.
`analyse.py` checks hashes, independent input coverage, samples and derived medians.
