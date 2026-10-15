# Batched derivative directions and literal JavaScript storage

A complete `gradient` now carries all basis directions through one primal
execution. Every tangent lane retains its scalar JVP operation order. The AD
elaborator uses lexical arithmetic for wide duals. JavaScript lowering can hold
local scalar records in locals, materializes ordinary records for whole-value
uses and worker captures, and tracks immutable F32 locals already represented by
rounded native Numbers. It still decodes tagged exceptional values when needed.
No zero-tangent annihilation, reassociation or approximation is used.

This experiment compares the same four-parameter polynomial objective against a
frozen emitted module from the previous delivery. It includes current repeated
scalar JVPs and an authored closed-form derivative. The previous module is copied
byte-for-byte from `reports/differentiable-preparation-2026-10-15/program.mjs`.
Both modules execute in each fresh process on identical inputs. Build and run:

```sh
ink build bench/batched-differentiation/source.ink --target javascript -o program.mjs
node bench/batched-differentiation/run.mjs /ABSOLUTE/PATH/previous.mjs /ABSOLUTE/PATH/program.mjs 72131
```

Use three fresh processes per cohort, development seed 72131 and held-out seed
99173. Eleven samples per size interleave all four implementations in randomized
order. Each complete warm trusted API call includes context preparation and full
result consumption. An independent dyadic polynomial derivative checks every
result before and after each sample. Context is never cached between calls.
Compilation and other test workloads finished before measurement.

Held-out medians of the three process medians on Apple M4 Pro/Node 22.22.1:

| Context values | Previous gradient | Batched gradient | Repeated scalar JVPs | Handwritten |
| ---: | ---: | ---: | ---: | ---: |
| 0 | 5.218 µs | 2.784 µs | 1.815 µs | 0.579 µs |
| 16 | 7.246 µs | 4.542 µs | 8.330 µs | 0.663 µs |
| 4096 | 1.356 ms | 0.780 ms | 1.556 ms | 0.109 ms |
| 32768 | 18.779 ms | 8.985 ms | 22.297 ms | 1.000 ms |

The batched gradient improves 1.60–2.09× over the previous full gradient in this
cohort. Separate scalar JVPs still win for empty input. The handwritten derivative
remains about 9× faster at the largest size. Wider batching alone regressed in
initial smoke experiments; scalar record storage and native-carrier bookkeeping
were necessary to obtain this improvement in JavaScript.

This is one designed workload on one host. It does not establish general neural
training performance, Handwired parity, first-call latency, peak memory, reverse
mode or GPU speed. Correctness fixtures independently exercise nested records,
nonlinear arithmetic, branches, lists, bounded rollouts, up to 32 coordinates,
exceptional floats and multiple gradient widths. Conformance is not a performance
measurement. The AD transform and backends remain trusted implementation code.

Raw samples, both modules, source, hashes and acceptance logs:
`reports/batched-differentiation-2026-10-15`. Audit with:

```sh
python3 bench/batched-differentiation/analyse.py reports/batched-differentiation-2026-10-15
```
