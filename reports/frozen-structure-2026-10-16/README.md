# Frozen learned structure: checked specialization and measured scope

Implementation: `9713ae96643fc2f76163afe06d1a7dd4a36350e7`.
Independent core: `25796866ae506721cfb834cdfc091093c52e8dc3`.
Exact other package pins are in `packages.json`.

The example learns a choice between an expanded eight-bit circuit and a packed
word operation using authored, versioned objective weights. The training trace's
latency/energy/memory observations are illustrative, not measured hardware prices.
An explicit frozen build removes its choice writer. The knowledge producer then
proposes helper/branch specialization and the compiler checks every complete
action transition. No learned score supplies a correctness premise.

## Complete warm JavaScript calls

On macOS arm64, Node 25.3.0, five fresh processes each use seven paired samples
of 10,000 complete `state.invoke` serving calls, after 10,000 warmup calls per plan.
Plan order alternates. Inputs change; every reply field contributes to the consumed
checksum. Exact reply and checkpoint controls run outside timing. The table uses
the median of each process's medians, in microseconds per call.

| Live rows | Frozen baseline | Checked specialization | Ratio |
| --- | ---: | ---: | ---: |
| 0 | 0.0944 | 0.0897 | 1.053× |
| 32 | 0.1192 | 0.1090 | 1.094× |
| 1024 | 0.1120 | 0.1051 | 1.066× |

These are modest gains on one small serving example. They do not establish a
broad neural-network speedup, device speedup, physical-layout improvement or
profitable automatic selection. The baseline already executes the packed branch;
this comparison removes its lookup/dispatch, not eight executed circuit branches.
No compiler or browser build ran alongside the final timing pass. Raw samples,
checksums, factory-startup observations and complete artifact inventories remain.

## Lifecycle and size costs

The generated source shrinks from 246,040 to 245,904 bytes. The inventoried artifact grows from 342,529 to 2,705,662 bytes because portable selected source, proofs and compilation metadata are retained.

Single build-stage observations were 1587 ms and 2604 ms. These include authored training, restriction, proof work where requested, emission and verification. They are single setup observations, not an amortization model or repeated lifecycle benchmark. Memory use was not ranked.

The whole program retains unused helper declarations and logical state roots.
Physical representation elimination, migration and general live structural
selection remain unfinished. Keep these setup/storage costs when deciding whether
an explicit specialization is useful for a deployment.

## Validation and reproduction

- All 439 private standalone core tests passed on the exact committed package tree,
  with a private checkout and target directory. The receipt binds its complete log.
- Eight frozen-state tests passed with mandatory JavaScript/Rust/Wasm comparison
  and actual eligible wgpu calls. Five trained-build continuation/durability tests
  also passed. The final example checks changed objectives, stale feedback,
  restored invalid score domains and rehashed proof tampering.
- Browser replay matched 93 observations across JavaScript, CPU-Wasm and WebGPU
  hosts, six restores and one actual eligible device call. Stateful work executes
  on hosts. This is conformance, not a GPU timing comparison.
- Four knowledge-producer tests cover once-only effectful arguments, rollback/events,
  eager defaults, hygienic names and mutable near misses. Five standalone package
  checks and locked dependency fetches use one exact new core revision.

`source.ink`, `trace.json` and `controls/` archive the exact measured inputs and
scripts. `baseline/` and `selected/` retain complete verifiable build artifacts.
Run `python3 reports/frozen-structure-2026-10-16/audit.py` to audit their hashes and
timing arithmetic. Re-run the benchmark into a new directory using
`python3 bench/frozen-structure/run.py NEW_DIRECTORY`.

The summary binds the actual compiler binary. Its working checkout retained an
unrelated unpublished `core/src/syntax/query.rs` change; both plans used that same
binary. The independent package tests use the exact committed clean core tree.
Proof admission, reference/compiled conformance and timing observations are separate.
The source projection, checker, codecs, backends, runtimes and toolchains remain
trusted implementation code; this report is not a compiler-correctness proof.
