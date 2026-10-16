# Frozen program structure with live trainable weights

This milestone compiles a configured operation list into straight-line serving
code while retaining mutable trainable weights and ordinary application data.
On this one application the final JavaScript serving path is faster in all six
paired processes. It does not establish general neural, GPU or upstream library
performance parity. Measured on 2026-10-16; exact distribution source is
`e624bb2b28b7d90fb2a2de46a3cd23fdbfdf8f34`. Independent package revisions are in `metadata.json`.

## What changes

The eight operations are Scale, Bias, Relu, Scale, Bias, Scale, Relu, Bias.
`build-model --freeze-roots Structure --specialize-frozen` withdraws the
configuration writer, binds exact immutable rows, and checks complete action
proofs proposed by knowledge. The serving action loses its frozen lookup,
traversal, helper call and opcode dispatch. It still reads current weights and
live data; `retune` remains callable and failed updates roll back atomically.
ReLU branches and F32 arithmetic retain source order and exceptional-value
behavior. The supplied trace explicitly configures this sequence; it is not a
fitting, convergence or reinforcement-learning result.

The knowledge proposer expands closed literal foldl/foldr traversals with fresh
once-bound accumulators. A bounded general core conversion compares shared
structure and known control; it grants no program-specific equality. Compact
proof construction is checked normally and retries the old normalization tactic
if rejected. JavaScript places eligible leading bindings in the enclosing action
instead of nested function wrappers. No new surface syntax is needed.

## Paired serving measurements

Apple M4 Pro, darwin arm64, Node v25.3.0.
Six fresh paired processes alternate import/execution order. Each phase uses
2,500 warmup reads and five samples of 25,000 requests, with changing inputs.
These are typed in-memory bound state calls with `resultOnly`; update phases
include `retune` and event acknowledgement. Complete checksums and final portable
checkpoints must match. Setup, checking and checkpoint capture are outside warm
serving timing. No query result cache is enabled.

Numbers are geometric means of each process's median; the range retains every
paired ratio. Final raw samples are in `measurements/final`.

| Weight update frequency | Baseline ns/request | Selected ns/request | Speedup | Paired range |
| --- | ---: | ---: | ---: | ---: |
| No weight updates | 162.86 | 103.58 | 1.572× | 1.364–1.711× |
| Every request | 482.11 | 426.86 | 1.129× | 1.061–1.228× |
| Every 16 requests | 165.86 | 116.87 | 1.419× | 1.380–1.508× |
| Every 256 requests | 142.03 | 95.96 | 1.480× | 1.415–1.604× |

The absolute timings vary across processes; one final process was noticeably
slower in both variants. Earlier measurements of the same final executable image
showed about 1.45× for serving and 1.10× with updates every request. No samples
were removed from this retained final acquisition.

### Retained regression and packaging cost

Unrolling alone initially made serving slower: baseline 136.83 versus selected
155.80 ns/request, 0.878×, with all six pairs losing. `measurements/initial` and
`previous-selected-artifact.tar.gz` retain that result. The exact selected core
is unchanged; literal binding placement changes the emitted JavaScript. This is
why structural simplification alone cannot establish profitability.

The baseline executable source is byte-identical across the initial and final
experiments. Final source bytes are 226,258 baseline and 226,596 selected; helper
declarations can remain even after their serving call disappears. Inventoried
package bytes are 295,553 baseline and 1,330,441 selected. The earlier selected
package was 2,102,244 bytes. Compact proofs reduce that payload, but the complete
selected package is still substantially larger than baseline. Archives retain
source, proof, startup state and manifests, not merely the hot function.

Single release build observations were 362.4 ms baseline and 288.1 ms selected.
They are affected by startup/cache/scheduling order and do not establish lower
compilation cost. Commands, verifier output and timings are in `checks`.
Automatic planning still requires comparable lifecycle evidence; the explicit
specialization request is not automatic profitable selection.

### Cold startup and memory diagnostics

The same six processes record module import, state creation, and binding plus
first call, in microseconds (medians):

| Variant | Import µs | Create µs | First bound call µs |
| --- | ---: | ---: | ---: |
| baseline | 4,886.1 | 4,175.7 | 271.0 |
| selected | 4,675.6 | 4,044.8 | 243.5 |

These small, variable observations do not establish a cold-start improvement.
Twelve separate single-module VMs use explicit GC and retain the module import.
Heap columns are median byte deltas from before import; process peak RSS is
KiB. The checkpoint byte array also remains retained after state disposal.

| Variant | Setup heap delta B | Steady heap delta B | After disposal delta B | Peak RSS KiB |
| --- | ---: | ---: | ---: | ---: |
| baseline | 896,680 | 1,126,308 | 1,129,320 | 60,360 |
| selected | 896,984 | 1,122,736 | 1,115,556 | 60,216 |

This is diagnostic evidence, not a heap bound, allocation count, or demonstrated
memory win. Steady-state throughput does not amortize proof/package storage.

## Correctness and source checks

- 446 tests pass against the exact committed standalone core tree in a private
  checkout and fresh Cargo target (`checks/private-core.*`).
- 57 independent JavaScript tests, 42 hardening tests, and 11 frozen-authoring,
  9 basic knowledge and 13 dependent knowledge tests pass.
- The frozen-state batch passed nine tests and exhausted disk while compiling
  Wasm in one startup test. That sole affected test passed after clearing owned
  compiler caches. Both original failure and successful retry remain retained;
  the original batch is not presented as all green.
- The final operation-sequence history checks 144 observations across reference,
  Rust, JavaScript, Rust-Wasm, browser WebGPU and native wgpu paths, including raw
  floating values, updates, errors, events, restore and exact checkpoints. One
  eligible pure control actually executes on GPU; stateful serving/training stays
  on the host. Conformance does not measure device speed.
- The final release-built JavaScript package independently replays all 144
  observations, checks fresh instances and startup data, rejects the withdrawn
  writer and incompatible unrestricted checkpoint, and restores its checkpoint.
- A fresh private compiler checkout and Cargo target, using committed root and
  exact package pins, reproduces executed code, source cores, portable proofs and
  startup data byte for byte. `checks/clean-compiler.json` records exact hashes
  and `sources/Cargo.lock.gz` preserves the dependency resolution. Tool-only
  knowledge/planner source subsets omit historical catalogues and experiments.
  This is finite fixture reproducibility, not compiler/toolchain correctness,
  supply-chain authenticity or a proof of the complete implementation.

The broader historical knowledge catalogue has known column-layout fixture
failures recorded by the preceding numeric-structure report. The focused green
suites here do not claim an all-green complete catalogue or external CI run.

## Reproduce and audit

From distribution source `e624bb2b28b7d90fb2a2de46a3cd23fdbfdf8f34` with its exact submodules:

```sh
cargo build --release --bin ink
 target/release/ink build-model examples/frozen-program.ink \
    examples/frozen-program-training.json --freeze-roots Structure \
    --target javascript -o build/frozen-program-baseline
 target/release/ink build-model examples/frozen-program.ink \
    examples/frozen-program-training.json --freeze-roots Structure \
    --specialize-frozen --target javascript -o build/frozen-program-selected
 target/release/ink verify-model build/frozen-program-selected --replay
python3 bench/frozen-program/run.py build/frozen-program-baseline \
    build/frozen-program-selected --output build/frozen-program-measurements
python3 reports/frozen-program-2026-10-16/audit.py --ink target/release/ink
```

Use fresh output destinations. `tools/check_compiler_image.py` reproduces the
private-source check; pass `--source`, baseline/selected artifact directories,
`--log` and `--receipt`. Without `--ink`, this report's audit checks retained
integrity and consistency; with it, ordinary action proofs are replayed again.
Hashes bind observations to bytes but do not prove those observations or the
checker correct.

## Remaining work

Closed traversals are bounded. A 32-coefficient straight-line expansion still
hits continuation depth; 64/128/232-element frozen lists hit canonical value
depth. Increasing caps is not the solution: checked sharing, chunked constants
and factored proofs are needed. Arbitrary neural graphs/tapes, large frozen
models, learned physical/device choices and broad Handwired/Pretext/Freerange
parity remain open. The example also adds no durable database or device-training
throughput result. See the distribution's programme checklist and PLAN.md.
