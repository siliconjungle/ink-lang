# Normalized F32 carriers and neural execution

The JavaScript emitter now distinguishes already normalized F32 carriers from
arbitrary Numbers, while keeping rounded Numbers and exact NaN tags distinct.
Used scalar parameters normalize at entry; expression results, const aliases and
scalar loop slots whose every store preserves the representation avoid repeated
normalization. Borrowed composite fields retain each typed read and its error
position. Mutable slots still require snapshots. Stateful bit carriers are
unchanged. See [the execution contract](../../docs/normalized-f32-carriers.md).

This is trusted literal execution support, without new syntax, arithmetic
identities, source precision changes, model algorithms or automatic selection.

## Matched neural workload

The published baseline JavaScript package `046d57b1` and current `d07d719e`
receive identical checked executable-core bytes. The network contains 232 nodes,
244 changing parameters, ten changing features and four outputs. Six fresh Node
25.3.0 / Apple M4 Pro processes alternate previous/current order over seeds
72131, 99173 and 99174. Each task/lane warms for 4,096 calls, followed by eleven
randomized samples of 1,024 prediction or 128 derivative calls.

Every lane materializes and consumes complete detached binary32 outputs. Each
derivative result includes loss, four outputs and all 244 gradients. All sixteen
inputs per process compare against an independent ordered F32 graph executor;
the prediction oracle also checks a dense executor. Full outputs are rechecked
after each timed sample. Weights/features satisfy Handwired's declared [0,1]
ranges. Capturing inputs, module import, graph construction, token creation and
first calls remain separate retained costs.

Median process medians, microseconds:

| Task | Lane | Previous | Current | Paired speed ratios |
| --- | --- | ---: | ---: | --- |
| Prediction | Ordinary | 10.679 | 10.188 | 0.994–1.086× |
| Prediction | Prepared | 9.181 | 8.732 | 0.971–1.063× |
| Complete derivatives | Ordinary | 26.241 | 22.502 | 1.166–1.228× |
| Complete derivatives | Prepared | 24.399 | 20.611 | 1.100–1.208× |

Derivative gains hold in all process pairs; prediction includes a slower pair.
The ratio of displayed medians need not equal any individual process ratio.
The pilot runs are excluded. This is one CPU workload, not a universal gain.

The same current processes retain upstream/direct controls:

| Task | Handwired | Handwired with source ranges | Direct graph | Dense prediction |
| --- | ---: | ---: | ---: | ---: |
| Prediction | 10.757 | 4.578 | 6.314 | 0.363 |
| Complete derivatives | 33.125 | 24.499 | 19.154 | — |

The prepared derivative lane beats both tested Handwired CPU executors on these
process medians, while the direct graph executor remains faster. Handwired's
ranged prediction and the dense prediction control still lead substantially.
These executors use this network's operation order; they do not represent every
Handwired algorithm, trained model, hardware target or learning session.

The module shrinks from 839,419 to 837,601 bytes; occurrences of the normalization
call spelling fall from 216 to 141. Those static counts do not count executed
calls or allocations. Import medians are 12.825 / 12.206 ms and graph construction
3.941 / 3.818 ms. Raw startup, capture, token and individual cold calls remain in
every process record; their order and VM state limit startup conclusions.
No retained-heap bound or automatic profitable-selection claim follows.

## Exactness and unchanged-code controls

All 56 standalone JavaScript tests pass. The dedicated fixture checks 2,982
independent-reference cases in each carrier configuration through 29,820 total
compiled/prepared calls. Each carrier additionally compares 600 raw-host inputs
against the checked interface. Boundary cases include subnormals, infinities,
raw/signalling NaNs, signed zero, arithmetic overflow, recursive swaps, aliases,
early-stop loops, collections and owned buffers. Repeated/throwing getters and
contract-only scalar consumers test preservation of the first typed read.

The mandatory distribution fixture compares 294 source cases and a numeric
control across native Rust, JavaScript, Rust-Wasm and the native GPU host, with
exact CPU snapshots. Its receipts record 169 actual GPU calls: 42 each for
aliases, record helpers, raw bit results and array operations, plus the numeric
control. Loops, recursion and owned-buffer cases retain CPU host execution.
This does not establish device neural training.

Fresh neural preparation validation matches all 18 reference cases through 270
prepared calls, including changing primals/derivatives, one topology check per
token, forged-input rejection and detached outputs. Four binary64 and two source
reverse-differentiation integration tests pass with required Wasm/GPU controls.

Simple and complex text modules are byte-identical across this change: 597,640
and 1,964,480 bytes respectively. Both use binary64 and have zero F32 normalizer
references. These are unchanged-code controls; this report claims no new text
speed gain. The existing substantial Pretext gap and broader Freerange work
remain. Full CLI emission is checked against the independently emitted neural
image in the retained receipt.

## Reproduction and limits

`metadata.json` binds exact package identities, checked cores, generated images,
raw samples, runner/oracle snapshots, fixture cases and validation receipts.
Compressed JavaScript and runner files preserve exact measured bytes. The
[two-emitter tool](../../bench/f32-carriers/README.md) and locked manifest permit
re-emission; use the current package revision recorded here. The Handwired source
identity and file digest are retained; its own project retains its license.

```sh
python3 reports/normalized-f32-2026-10-16/audit.py
```

The audit checks artifact integrity and consistency, not measurement authenticity
or compiler correctness. Lowerings, reference evaluation, codecs, runtime, V8 and
toolchains retain implementation trust. This does not finish learned structural
or representation selection, device training, complete text preparation, broader
Freerange inference/consumers or the full adaptive-model programme.
