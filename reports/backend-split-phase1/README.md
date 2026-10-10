# Independent lowering packages and pure routing

Four public personal backend repositories are pinned by the Ink distribution.
The independent core builds offline without any submodules. Separate C/Rust
command-line backends consume rechecked versioned input and reproduce facade
source exactly. WebGPU/wgpu and Wasm adapters retain their existing execution
paths; existing Rust/C toolchains supply native machine code.

Validation: 125 distinct tests; 34 mathematical libraries under current and
preserved preceding kernels; two counter representations each execute 768 future
steps in native and Wasm, including abort/exhaustion, ordered events, malformed
requests and migration; 1,181 definition comparisons per target; five native/Wasm
state implementations pass 2,526 native outcomes and the archived Node ABI checks.
A fresh GPU bundle emits its C/Wasm fallback and shaders, and the standalone GPU
crate builds. New GPU timing or all-platform execution is not claimed.

The general pure-routing checker validates actual typed DAG composition with a
whole-function proof. Actual heterogeneous source partitioning, transfer/ownership
protocols and DB cost selection are unfinished. Placement labels alone certify
neither backend availability nor physical transport. The new sequential machine
proofs cover total values, not native memory layouts or actual Ink source actions.
Backend code, codecs, protocols and target toolchains remain trusted.

Logs preserve the initial workspace full-suite run (125 tests including core
unit tests); the final distribution keeps core as an independent workspace so
its seven unit tests run separately. The malformed replay attempt was preserved
in build; the successful state replay uses the repaired fresh-output runner.
Raw sources, logical snapshots and exact identities are archived. Compiled Wasm
and native binaries remain local and can be rebuilt; no performance ranking.
