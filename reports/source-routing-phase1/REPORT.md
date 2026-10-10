# Checked literal source execution across CPU and GPU

Ink's deterministic v1 source call graph now crosses into the separate GPU
backend through an immutable checked witness. External production owns call
partitioning, sharing and placements. The core checks exact typed reconstruction
of the original entry (or its unchanged whole-entry call), not an optimisation
law or target-name whitelist. `check-source-route` checks packages before emission.

The example computes a wrapping u32 mapped/filtered aggregate in GPU and finishes
on CPU. Browser execution uses WebGPU plus compiled Wasm; native execution uses
wgpu plus compiled C. Actual stages, fallback reasons and complete execution
costs are reported. Native lists are captured once and shared immutably between
stages; browser original arguments are captured synchronously before async work.
Cross-function results in this interface are scalar host values.

## Validation

- 131 distribution tests and seven independent core tests pass after integrating
  the concurrently published compute v2 work. Full logs are archived.
- 88 reference-evaluator oracle checks; 264 native oracle/compiled-CPU/fallback
  comparisons; 176 browser oracle/compiled-CPU comparisons. Each host actually
  executes 88 GPU aggregate stages followed by CPU finishing stages.
- Browser no-GPU and invalid-shader cases each retain CPU results on 88 inputs.
  Captured-input mutation, concurrent calls, closed runtime and four malformed
  original argument cases are checked. Native rejects the same malformed inputs.
- A second source repeats one pure aggregate twice. External production shares it
  as one stage; both hosts pass eight comparisons with only one GPU aggregate.
- Admission tests cover full pins, actual expressions/types, forward/missing/
  duplicate/unused nodes, canonical full-width literals and pre-clone expansion
  bounds. A rehashed/repinned changed entry is rejected; opaque labels alone have
  no availability or performance authority.
- External selector tests supply a zero-cost forged candidate: compiler checking
  still rejects it. Zero candidate budget retains baseline. Invalid measured costs
  leave output untouched. Producer output reproduces byte-identically.
- Standalone C/Rust/GPU packages compile against compatible published core pins.
  The integrated compiler retains the v1 identity and identical generated C;
  stale route assets disappear on an unrouted rebuild. The v2 particle bundle
  also emits via the integrated distribution.

## Complete costs

Exploratory browser profiles use three alternating trials per size. Short CPU
calls are calibrated with bounded complete-call repetition (at most 256 calls),
including argument capture. GPU graph time includes capture, queueing, upload,
dispatch, computation, readback, scalar bridges and CPU finish. These are a small
local experiment, not a statistically broad benchmark or Rust performance claim.

| Elements | CPU median ms | Mixed median ms | External selection |
| --- | ---: | ---: | --- |
| 32 | 0.00117 | 0.500 | Whole-entry CPU |
| 4,096 | 0.00746 | 0.600 | Whole-entry CPU |
| 1,048,576 | 1.000 | 3.200 | Whole-entry CPU |

The simple GPU route loses even for the largest sampled input. That is evidence
for retaining its CPU baseline. Residency and avoiding intermediate transfers
need different candidates; a GPU label alone is not an optimisation. Measurements
are separate from proof objects and never discharge semantic assumptions.

## Scope and next work

Literal call sharing/routing preserves deterministic total result values. Host
allocation failure, stack exhaustion, traps, latency and driver behaviour are not
proved equivalent. Code generation, runtime ABI, copying/ownership/transport,
C/LLVM and shader toolchains remain trusted. Assets are compiler output, not
arbitrary runtime proposal JSON accepted as a correctness certificate.

The integrated v2 backend supports explicit typed resident pipelines. Portable
f32 permits CPU/GPU differences, including branches: its observation contract
must not inherit v1 exact equality. A new rejection test keeps v2 outside this
literal routing package. Existing v2 execution reports remain unchanged in
reports/gpu-phase2; this milestone does not relabel them as source-proof admission.

Next connect efficient resident buffers and explicit physical/async bridge
contracts to checked source/definition graphs, and complete stateful
read/write/error/abort/event/commit/snapshot/migration refinement. Aggregate,
bounded-cache and layout authority migration, ownership/arenas, compact storage,
release tooling, runtime adaptation, durability and concurrency remain open.

## Reproduce

See docs/source-routing.md and bench/routing/{fixtures.py,native.py,validate.mjs}.
Use `validation.json`'s distribution_code_revision for the CLI source, its core
field for the checked core library, and its explicit backend/knowledge pins. The
archived core/route/placements and compiler commands are:

```sh
ink check-source-route core.json route.json
ink build core.json --core --route route.json --target webgpu --zig /path/to/zig -o bundle
cargo build --release --locked --manifest-path bundle/native/Cargo.toml
python3 bench/routing/fixtures.py /tmp/fixtures.json
python3 bench/routing/native.py /path/to/ink-gpu-program /tmp/fixture-directory
```

For browser reproduction, serve the generated bundle with fixtures.json,
validate.mjs and a page containing `<pre id="result"></pre>` plus the module
script. This evidence was observed through the actual browser UI. Set the page
hash to `#correctness-only` to omit exploratory timing profiles. No binaries or
private credentials are committed.
