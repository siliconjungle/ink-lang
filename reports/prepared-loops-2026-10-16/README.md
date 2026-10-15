# Sequential callback preparation: retained comparison

JavaScript preparation now carries stable lexical captures through sequential
loops and strict expressions. Fixed membership indexes, grouped aggregates and
numeric coefficient tables can be constructed once per reached helper site;
iteration elements, indices, accumulated state and unbound arguments stay dynamic.
This applies the prepare/observe idea to ordinary source without a workload matcher.

This study compares the same checked core bytes through the old JS emitter
`993af7820bb87a8fc27cef5b68993d6841b4e316` and new emitter
`f44cf1d61bcf2eebb80651c9e895353980dca0ed`. Both use standalone core
`1242c36783812f1b310bbd112fe47f1f7ae1317d`. Package pins, artifact/core hashes and
all raw observations are in `metadata.json`. The root integration also updates
GPU/runtime pins and the runtime lock. These are literal-execution changes, not
new equality proofs or an automatic staging cost policy.

## Repeated fixed work

Node 25.3.0, Apple M4 Pro; three fresh processes per seed, 11 randomized lane-order
samples per process and 96 complete calls per sample. The 12 varying requests
include empty, singleton and 32-item outputs. Ingress/capture and token creation
are separate; output materialization and consumption are timed. All complete
outputs are checked against the direct control before and after each timed batch.
Development seed is 73129; held-out seed is 99277. The baseline itself predates
this callback optimization. This is intentionally a reuse workload; it is not a
representative application corpus or a whole-application speedup.

Held-out results, nanoseconds per call (median of per-process medians):

| Workload / fixed items | Previous prepared | Current prepared | Direct prepared | Paired gain |
| --- | ---: | ---: | ---: | ---: |
| Membership / 16 | 7,536 | 1,237 | 877 | 6.09× |
| Membership / 128 | 50,352 | 995 | 759 | 50.82× |
| Membership / 512 | 197,068 | 1,188 | 757 | 164.69× |
| Grouped aggregates / 16 | 9,424 | 1,655 | 1,101 | 5.70× |
| Grouped aggregates / 128 | 68,871 | 1,333 | 1,020 | 51.65× |
| Grouped aggregates / 512 | 264,228 | 1,141 | 730 | 231.65× |
| Coefficients / 16 | 2,162 | 2,080 | 870 | 1.03× |
| Coefficients / 128 | 4,763 | 840 | 433 | 5.66× |
| Coefficients / 512 | 18,924 | 842 | 455 | 22.90× |

Paired gain is the median of each process pair's ratio, so it need not equal the
ratio of the displayed medians. Development's 16-item coefficient case regresses
(0.876×); the strong direct controls are faster at every displayed size. Ordinary
call timings are retained in `summary.json` and the raw observations and show no
corresponding broad speedup. The algorithmic win removes repeated preparation;
it does not make each lookup or floating-point operation intrinsically faster.

Every loop run retains `setup` (capture/token and direct table construction),
`cold` (the first zero/one/many observation sequence per lane), corpus hashes and
all 495 samples. These first-use observations share a process with the other
lanes/sizes and are not an isolated cold-start experiment. Small requests, short
lifetimes or rarely reused inputs can lose. Choosing a token here is explicit;
none of these timings authorizes automatic selection.

## Neural and layout controls

Three independent process pairs per development/holdout cohort reuse the complete
neural benchmark: all predictions, loss and 244 gradients are compared with the
direct graph, dense prediction and pinned Handwired controls. Held-out prediction
has paired gain **0.969×** (9,216 ns previous; 9,620 ns current). Gradients have
paired gain **1.002×** (24,857 ns previous; 24,416 ns current). These observations
do not establish a neural speedup. Handwired's range-specialized control takes
4,392 ns for prediction and 23,740 ns for gradients; direct graph execution is
also faster. The explicit dense prediction control takes 333 ns. Those gaps
remain required work. The controls' operations, source hashes and corpus/oracle
hashes are retained in each raw file; see
[the earlier neural study](../prepared-helpers-2026-10-16/README.md) for their scope.

The three paired layout runs compare the same simple binary64 prepared counter
against actual pinned Pretext code. At 512 segments, previous/current/Pretext
medians are **14,382 / 15,314 / 776 ns**. At 8 segments they are
4,064 / 4,198 / 87 ns, and at 64 segments 6,600 / 6,589 / 270 ns. Callback
preparation does not close this execution gap; the current large case is slower.
This remains a simple counter comparison, not full Pretext or complex shaping.
Pretext's license is retained alongside the emitted source artifacts.

## Memory and validation

Three separate forced-GC processes per artifact retain three 512-item inputs and
tokens. Relative to each process's after-token heap, median retained heap after
zero / one / 100 requests is 42,552 / 58,256 / 181,296 bytes before, and
43,160 / 83,784 / 195,152 bytes currently. This exposes additional retained helper
state; it is not a memory improvement claim. Raw phases also retain import,
capture, token, first-call, heap, RSS and maximum RSS observations. Node, generated
metadata and JIT contribute; these are not allocation counts or memory bounds.

The standalone JavaScript suite passes 49 tests. The callback regression compares
147 reference cases and 1,510 prepared calls under each of the native-number and
stored-bit F32 carriers. It covers changing keys/state, shadowing/nested loops,
short-circuit laziness, early-stop order, failed-work retry, signed zero/NaNs and
result detachment. Final root runs pass reverse learning (11), binary64 (4) and
prepared text (3), including the 182-observation text history and one actual F32
GPU dispatch. Binary64 GPU work still uses the CPU fallback.

`initial-learning-diagnostic.log` intentionally retains an initial failed
instrumentation assertion: it counted only the ordinary topology validator body,
while residual preparation could execute its invocation body. The fixture now
instruments both invocation bodies (not factory construction); the unchanged
once-per-token assertion passes in `neural-sealed-final.log` (18 reference cases,
270 prepared calls) and the full final reverse suite. The initial invocation is
not represented as all green.

Reproduce with [the benchmark instructions](../../bench/prepared-loops/README.md).
Run `python3 bench/prepared-loops/analyse.py reports/prepared-loops-2026-10-16 --check`
to check retained file bindings, exact record coverage and summaries. This bounded
observation audit does not prove source translation, backend implementation or
universal profitability. Source reverse AD, mutable-session staging, other-target
preparation, complex text/shaping and the broader three-project performance
requirements remain open.
