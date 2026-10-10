# GPU phase 2: typed compute and resident pipelines

Validated on Apple M4 Pro, arm64 macOS 15.7.4, native wgpu 30.0.1 and real
Chrome 154.0.8037.98 WebGPU (headless with `--enable-unsafe-webgpu`). This is
one device/toolchain receipt, not evidence of universal availability or speed.

## Implemented scope

Pure compute v2 adds i32/f32, numeric vectors/records, local bindings, multiple
arrays and array outputs, safe indexed reads and literal bounded loops. Integer
scan/sort and ordered reductions execute on compiled CPU. Eligible array kernels
use literal WGSL; explicit host pipelines retain intermediate arrays through
feedback iterations. C and GPU emitters and hosts live in independently pinned
backend repositories; the semantic core has no target dependency.

The packed little-endian ABI copies borrowed inputs into aligned C call storage.
Hosts own result copies, reset the call arena, validate typed plans and sizes,
and replay pure invocations on compiled CPU after GPU failure. No interpreter
is linked by either host. No persistent GPU handles across host calls, durability,
source-level simulation scheduler, GPU scan/sort/scatter or mixed-target routing
proofs are claimed.

## Validation

- The full distribution test command passed 124 tests;
  the subsequently integrated source-routing module passed its four tests.
  The standalone semantic core passed seven tests. See
  [full log](cargo-tests.log), [source-routing log](source-routing-tests.log)
  and [core log](core-tests.log).
- Six compute tests cover checked-core version identity and false tags, typing
  and layout rejection, i32 limits/wrapping, lazy fallback, loops, vectors and
  records, ordered float arithmetic, CPU ABI resets, internal values and bounded
  GPU helper expansion. Generated C executes under address/undefined-behaviour
  sanitizers with Clang warnings treated as errors.
- [Native](native.json) and [browser](browser.json) each passed 298 comparisons
  across 149 fixtures, with 126 actual GPU executions each. Fixtures cover empty
  and workgroup-boundary lengths, unequal zip lengths, signed edge values,
  Boolean arrays, helper calls, safe gather, bounded iteration, a small matrix
  product and resident particle feedback. Independent Python integer/binary32
  oracles provide expected values. Integers compare exactly; float diagnostics
  use relative/absolute tolerance 2e-5, which is not a general error theorem.
- Native validation rejected seven malformed calls/plans and checked 149
  GPU-disabled fallback results. Browser validation rejected six malformed
  calls/plans, checked eight concurrent CPU calls, submission snapshots,
  disposed/unavailable devices and injected invalid-shader fallback. These
  checks do not exhaust device-loss, allocation-failure or driver behaviour.
- The distribution built offline without knowledge; the semantic core built
  offline without knowledge or any lowering submodule. See
  [independent build log](compiler-only.log). Rust formatting and JavaScript
  syntax checks passed. Native-object and freestanding Wasm emission passed.
- Splitting lowering into C/GPU packages preserved byte-identical particle
  checked core, generated C, shaders and function metadata.

## Residency and selection

For 257 particles over 120 iterations, both GPU hosts reported **240 dispatches,
6,220 bytes uploaded, 6,168 bytes read back and 24,724 live buffer bytes**.
Intermediate arrays remained on device; only requested final arrays were read.
For 65,536 particles the corresponding counts were 1,572,916 uploaded bytes,
1,572,864 readback bytes and 6,291,508 live buffer bytes, still 240 dispatches.

Three alternating full-pipeline timings include host allocation, transfers,
synchronization and result construction. The selector amortizes setup over 32
uses, requires a 10% saving, and refreshes profiles after 32 uses. Small calls
selected CPU in both hosts; large particle pipelines selected GPU on this run.
See [native selection](native-selection.json) and
[browser selection](browser-selection.json), including refresh-cadence receipts.

| Host | CPU median ms | GPU median ms | Initial setup ms | Selected |
|---|---:|---:|---:|---|
| Native wgpu | 45.443 | 39.885 | 0.659 | GPU |
| Browser WebGPU | 65.200 | 37.000 | 6.700 | GPU |

These measurements are profitability observations. Portable f32 uses WGSL's
permitted evaluation behaviour; CPU/GPU bit identity and arbitrary-program float
error bounds are not promised. Finite inputs do not establish finite
intermediates. Select CPU for programs requiring stricter IEEE behaviour.

## Reproduction and provenance

[The compute guide](../../docs/gpu-compute.md) contains build, pipeline and
validation commands. [Metadata](metadata.json) records backend/knowledge pins,
toolchains, fixture identity and generated/source hashes. The emitted
[manifest](manifest.json) records capability/fallback decisions and the explicit
trust boundary. [Checks](checks.json) summarizes the run. Existing phase 1 and
backend-split archives are unchanged. Hashes, profiles and passing tests are not
proofs of the checker, backend, physical bridge or driver correctness.
