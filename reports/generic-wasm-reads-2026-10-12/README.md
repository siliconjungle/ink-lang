# Generic Wasm read performance

The native primitive bridge copied whole operands before read-only operations.
An in-loop `length(before)` therefore copied the entire list once per row.
The bridge now borrows operands for length, field/tag inspection and comparisons.
Projected composite fields still return owned values. Primitive fuel, errors,
scalar IEEE comparisons and aggregate float-bit comparisons are preserved.

The algorithms, knowledge library, emitted C and emitted JavaScript are unchanged.
Native support is pinned at `d925f534`, runtime at `e4648c56`, and the Rust
lowering at `7cce95b0`, integrated on distribution base `17f81145`.

## Measured changes

All 27 fixed cases returned exact final state. This nine-round serial run
validated 104 implementation/case cells and retained 936 timed samples.
Input construction, freezing, module instantiation and compilation are untimed.
Full Wasm calls include JSON transport, exact integer-to-u32 Number conversion,
and consumption of every output field. Frontier is the unchanged published
`@shapeshift-labs/frontier@0.1.9`, using `diff` plus `applyPatchImmutable`.

- 1,024 fresh sparse rows: **190.38 ms → 7.73 ms**, **24.64×** faster.
  Paired bootstrap 95% interval: 23.91–25.06×.
- 16,384 sparse scalars: **1,653.24 ms → 25.99 ms**, **63.60×** faster.
  Paired bootstrap 95% interval: 62.79–65.32×.
- 16,384 fresh sparse rows: **132.17 ms warmed**. The first complete call
  took **389.02 ms**, versus the previous artifact's 30-second timeout.
  A timeout supplies no completion time, so this row has no invented speed ratio.
- Unchanged inputs improved only slightly: most measured ratios are about 1.03–1.09×.
  They bypass the edit loop and never had its quadratic copying cost.

The fixed generic path still loses to direct JavaScript. On 16,384 fresh sparse
rows, Frontier took **3.20 ms** and Ink JS **0.95 ms** in this run, versus generic
Wasm's **132.17 ms**. This is a fix for excessive copying and scaling, not a
claim that the general JSON/value ABI now beats specialized JS. JS controls
share this process with Wasm; the earlier dedicated JS measurements remain
separate evidence and should not be replaced by these tiering histories.

## Remaining costs

A separate warmed diagnostic split the same 16,384-row call through the existing
complete-state host. Median stage times were:

| Stage | ms |
|---|---:|
| Encode the request in JS | 18.99 |
| Copy request bytes to Wasm | 0.09 |
| Wasm export: decode, construct values, execute, serialize | 79.29 |
| Decode and parse the response in JS | 25.94 |
| Convert exact integers to Numbers and consume output | 9.25 |

Stage medians come from a separate process and are not additive substitutes for
the main call median. The Wasm export timer includes Rust-side JSON and dynamic
value construction; it does **not** isolate the algorithm's compute time.
The transport and general value representation remain substantial costs.
Typed calls, compact boundary layouts and fewer constructed temporaries would
need their own measured implementation work.

## Full warmed table

Times are median **milliseconds**. Four changed 16,384-row baseline cells remain
excluded following the previous independent 30-second deadline. All fixed cells
are present. No patch output-format equality is claimed; this comparison consumes
only the exact final logical state.

| Case | Wasm before | Wasm fixed | Frontier JS | Ink JS | Before/fixed |
|---|---:|---:|---:|---:|---:|
| scalar-64-unchanged | 0.025 | 0.024 | 0.004 | 0.001 | 1.03× |
| scalar-64-sparse | 0.163 | 0.106 | 0.006 | 0.002 | 1.54× |
| scalar-64-dense | 0.167 | 0.111 | 0.005 | 0.002 | 1.50× |
| scalar-1024-unchanged | 0.319 | 0.306 | 0.051 | 0.021 | 1.04× |
| scalar-1024-sparse | 8.143 | 1.601 | 0.075 | 0.024 | 5.09× |
| scalar-1024-dense | 8.669 | 1.768 | 0.066 | 0.026 | 4.90× |
| scalar-16384-unchanged | 5.615 | 5.404 | 0.392 | 0.363 | 1.04× |
| scalar-16384-sparse | 1653.238 | 25.994 | 0.948 | 0.396 | 63.60× |
| scalar-16384-dense | 1681.895 | 28.511 | 1.124 | 0.521 | 58.99× |
| rows-64-unchanged | 0.361 | 0.345 | 0.028 | 0.002 | 1.05× |
| rows-64-sparse | 1.283 | 0.493 | 0.030 | 0.003 | 2.60× |
| rows-64-dense | 1.317 | 0.514 | 0.034 | 0.003 | 2.56× |
| rows-1024-unchanged | 5.686 | 5.394 | 0.207 | 0.049 | 1.05× |
| rows-1024-sparse | 190.380 | 7.726 | 0.230 | 0.051 | 24.64× |
| rows-1024-dense | 191.859 | 8.139 | 0.242 | 0.052 | 23.57× |
| rows-16384-unchanged | 97.778 | 93.384 | 2.415 | 0.907 | 1.05× |
| rows-16384-sparse | budget exclusion | 132.166 | 3.204 | 0.946 | — |
| rows-16384-dense | budget exclusion | 139.346 | 3.781 | 0.982 | — |
| rows-shared-64-unchanged | 0.359 | 0.340 | 0.007 | 0.002 | 1.06× |
| rows-shared-64-sparse | 1.325 | 0.503 | 0.009 | 0.003 | 2.63× |
| rows-shared-64-dense | 1.353 | 0.537 | 0.024 | 0.003 | 2.52× |
| rows-shared-1024-unchanged | 5.909 | 5.426 | 0.089 | 0.048 | 1.09× |
| rows-shared-1024-sparse | 192.180 | 7.974 | 0.119 | 0.052 | 24.10× |
| rows-shared-1024-dense | 212.495 | 9.127 | 0.185 | 0.055 | 23.28× |
| rows-shared-16384-unchanged | 98.431 | 91.897 | 0.929 | 0.866 | 1.07× |
| rows-shared-16384-sparse | budget exclusion | 146.614 | 1.463 | 0.995 | — |
| rows-shared-16384-dense | budget exclusion | 171.459 | 3.019 | 1.113 | — |

## Validation and reproducibility

- The generated C/native allocation guard passed. Its old-bridge control failed
  as expected with **40,962 allocations for one length read**; the fixed read
  allocates zero. Large record/tag inspection and aggregate comparisons also
  allocate zero. Tests cover projection ownership, invalid handles and fuel.
- Fourteen distribution tests passed, covering generic snapshots, compact private
  field edits, numerical storage, transactions, generated programs and owned buffers.
  Both Wasm targets matched **648 replies and exact snapshots** against the
  reference; native GPU checks included **210 actual GPU calls**. The packed C
  owned-buffer test also passed AddressSanitizer and UndefinedBehaviorSanitizer.
- Independent package tests passed: native support 13, runtime 7, Rust lowering 11.
- `provenance.json` binds source/package pins, compiler and measured artifact hashes.
  `measured-artifacts.tar.gz` contains replay inputs, hosts, generated sources,
  both Wasm artifacts, JS and Frontier. Every archived file was read back and
  checked against `artifact-manifest.json`.
- `samples.json` retains every main timing sample. `summary.json` includes paired
  bootstrap intervals; `stages.json` records the separate diagnostic. Logs and
  prior timeout/hoisting controls remain alongside them.

These are exploratory measurements on the same shared Apple M2 host. They do not
establish performance for arbitrary schemas, different hosts, GPU execution,
durability, compilation or admission. See
[the harness](../../bench/generic-wasm-reads/README.md) for replay commands.
