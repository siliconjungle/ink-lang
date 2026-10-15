# Pure helper preparation: measured gains and remaining costs

The JavaScript lowerer now carries stable sealed inputs through lazily created
private helpers and retains successful stable Boolean checks. Ordinary source
wrappers can prepare a graph without flattening the entire helper closure into
one generated function. A token validates topology once, while every change of
weights/context still computes fresh forward and backward values. Inputs/outputs
remain isolated, malformed graphs retain validation, and thrown failures retry.

The same checked source/core is emitted by prior JavaScript package `0f483a8` and
new package `125ab24`. Complete results agree with an independent graph interpreter;
predictions also agree with an independent dense-forward kernel. Handwired controls
use its own `Circuit.evaluateReference`/`backpropagateReference`, pinned to
`09f23d27`, with unknown ranges (664 operations) and checked `[0,1]` source ranges
(232 operations). Ink's source graph has 232 operations. All timed weights/features
satisfy the stronger control's bounds. Targets are signed. These range facts do
not narrow Ink's arithmetic or authorize replacement.

| Complete warm call, holdout | Four outputs (µs) | Loss, outputs, 244 gradients (µs) |
| --- | ---: | ---: |
| Previous module, ordinary | 10.25 | 23.94 |
| Previous module, prepared | 10.23 | 24.08 |
| Current module, ordinary | 10.74 | 25.34 |
| Current module, prepared | 9.20 | 23.51 |
| Handwired, unknown ranges, current process | 9.41 | 29.17 |
| Handwired, checked ranges, current process | 4.12 | 22.29 |
| Independent graph interpreter, current process | 6.02 | 18.36 |
| Independent dense forward, current process | 0.34 | — |

New prepared prediction improves **1.11×** over previous prepared prediction,
and complete gradients improve **1.025×**. Ordinary calls are about **4.8% / 5.9%
slower** in this study despite byte-identical ordinary source-function bodies.
Additional prepared code and module layout differ; identical source bodies do not
prove identical VM performance. Module bytes increase from 855,312 to 870,459.
The range-specialized Handwired control remains faster: about **2.23×** for
prediction and **1.05×** for complete gradients. The dense forward control is about
27× faster. The matched-speed requirement remains open.

These are M4 Pro / Node 25.3.0 results with complete detached binary32 result trees.
Every output/gradient is consumed during timing and independently compared before
and after each sample. Two artifacts × two cohorts × three fresh processes give
12 runs; each loads one Ink module, with 4096 warmup calls/lane and eleven
interleaved samples. Full input/result digests agree across artifacts/repetitions.
Median-of-process-medians is reported; see `summary.json` for every control,
development results and all individual process medians. This boundary differs from
older trusted-number API studies, so their numerical timings are not interchangeable.

## Setup and memory

Three separate fresh processes/artifact retain one captured model, weights/context
and one prediction token. Median first prepared prediction is 0.922 ms for the
previous artifact and 0.939 ms for the current artifact. Import observations are
11.33 / 11.89 ms; setup is 5.21 / 5.42 ms. Token construction itself is about
0.069 / 0.071 ms. The observed retained process-heap deltas are 3,026,120 /
3,041,760 bytes after 100 predictions and GC. These include Node, source metadata,
JIT and caches; they are descriptive observations, not allocation counts, peak
live storage bounds or statistically established startup rankings. Capture/import,
short lifetime and memory costs cannot be inferred from the warm speedup.

## Validation and scope

All **48 standalone JavaScript tests** and **23 integration tests** passed locally.
The four integration suites require Rust/JavaScript/Wasm and GPU-host conformance,
with separate actual eligible numeric GPU calls. The new neural diagnostic compares
18 reference cases and 270 prepared calls, including changing parameters, wrong
shapes, forged graph inputs/roots/edges, NaNs and signed zero. Ordinary helper cases
cover readonly/consuming owners, aliases, separate call sites, lazy errors, retried
throws, capture isolation and bounded fallback. Instrumentation confirms one source
topology check per graph-bound token; timings use untouched emitted modules.

Pure helper preparation is currently a JavaScript host capability. It is not
silently installed in stateful learning actions. No GPU neural training, native
prepared-call performance, optimizer/full-session timing, arbitrary source reverse
AD, frozen arithmetic specialization, F64 layout fidelity or automatic profitable
selection is established. The implementation remains trusted, with differential
conformance rather than a general backend proof.

`development/` retains earlier code/protocol pilots, including losses. They are not
part of the heldout matrix; some prototype emitters are not retained as independently
rebuildable packages. The final report's two emitted modules are retained in full.
The baseline came from a reversible local build of the prior JavaScript emission
source over this exact checked core; current source/compiler were restored before
final validation. The pre-existing unrelated query parser diff is excluded from
publication and recorded only by hash in metadata. These programs do not use it.

Reproduction and commands are in [the benchmark guide](../../bench/prepared-helpers/README.md).
The checksum audit is a byte/provenance check, not measurement authentication,
optimization authority, a mathematical AD proof or a proof of compiler correctness.


The source packet retains the runner/oracle/validator and relevant example/tests/
documentation with their own byte hashes. The audit verifies that packet, rather
than requiring mutable files in future repository revisions to keep old bytes.
The emitter/source integration revision is `3855acdb`; the source packet's audit
also includes this provenance correction. No timing or implementation changed.
