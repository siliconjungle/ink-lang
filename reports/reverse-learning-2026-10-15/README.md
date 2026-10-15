# Prepared reverse learning evidence

A dynamic-context ReGLU graph has 244 parameters, ten input features, two hidden
layers of six and four outputs. Every call returns all outputs, loss and gradients.
The implementation and full limitations are described in
[the benchmark protocol](../../bench/reverse-learning/README.md).

| Complete forward + reverse call | Development (µs) | Holdout (µs) |
| --- | ---: | ---: |
| Ink, prepared graph | 39.32 | 40.36 |
| Handwired, unknown ranges | 29.36 | 29.48 |
| Handwired, checked source ranges | 23.58 | 23.83 |
| Direct typed-array interpreter | 10.08 | 9.72 |

Median of three fresh-process medians per cohort; eleven interleaved samples per process. Ink takes 1.69× the ranged Handwired latency on the holdout cohort.

This is warm CPU JavaScript graph execution on Apple M4 Pro / Node 22.22.1.
Each cohort uses three fresh processes and eleven randomized samples per lane,
128 calls per sample. Both upstream Handwired circuits execute their own reference
forward/backward routines. The ranged control checks [0,1] source values and reduces
its graph from 664 to 232 operations. All complete results agree exactly before
and after every timed sample. Graph setup has separate single cold observations.
No GPU training, whole-gallery, peak-memory, compiler-time or F64-optimizer parity
claim follows. The direct interpreter is an important faster control. The target
of matching or beating Handwired remains open.

`conformance.log` combines successful blocks from the original CPU runs, the
remaining regression run, the repaired generic-library run and the final six-test
adaptive run. This covers 58 distinct integration tests. `core.log` records 397
standalone core tests. Original `initial-regression.log` retains a stale
source-contract failure; source contracts were freshly produced and replayed,
then all seven generic tests passed in `generic-final.log`. No test failure was
ignored or converted into a success. GPU receipts and logs distinguish actual
eligible dispatch from host execution. Reverse learning itself runs on the host.

The new orchestration example exercises ordinary source policy controlling two
learners: configuring rates, pausing, triggering nested updates, enforcing budgets
and atomically rolling back all state/events. Eight cases agree across Rust,
JavaScript, Wasm and the GPU host, with one separate eligible numeric dispatch.
It does not supply the entire continuous-learning service or build-stage trainer.

The complete 12-frame training checkpoint equals 6 frames plus restored 6 frames
byte for byte, including optimizer moments/control. Loss on this designed fixed
context falls from 0.000206076409 to 0.000004175003 (about 49×); this is not a
convergence or generalization guarantee. Receipts bind complete snapshots and
training source identity.

Frozen-corpus evidence uses snapshot
`14edbdd3dea8f2bea214b8badba800a004dfbeffc7c4feb02be8b9a1ad45e739`:
10 attempted programs, 8 compiled within the outer budget, 8 with alternatives,
0 alternatives selected without comparable measurements, 21 admitted laws and
5 reused in multiple programs. All eight searches hit the quick effort budget;
index-membership and compact-set hit the outer 60-second timeout. The 14 newly
published source-contract objects have zero reuse in emitted rewrite alternatives
here. This records current coverage and bottlenecks, not a broad speedup claim.

Run `python3 bench/reverse-learning/analyse.py reports/reverse-learning-2026-10-15`
to validate the flat SHA-256 ledger, raw samples and retained checkpoint/log gates.
The ledger detects changed bytes; it is not an authenticity or correctness proof.

Local validation used a working tree containing a pre-existing semi/anti-join
parser change in `core/src/syntax/query.rs`. That file is excluded from this
publication and was not changed by the learning work. These learning programs do
not use those new query forms. The retained generated benchmark module fixes the
exact measured artifact independently of that working-tree difference; published
CI remains the check of the complete clean pinned revision.
