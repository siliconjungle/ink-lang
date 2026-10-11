# General40 web-stack benchmark protocol

This is a fresh suite declaration. All Engine39 observations remain archived; the eight reused workloads/controls are exploratory because their performance was already seen. Four added workloads exercise map→filter→map, helper map→scan, zip products→order-sensitive foldr and indexed reverse gather. No measured superiority, new proof authority or final candidate is claimed by preparation.

The frozen declaration has 12 tasks, 492 correctness frames and 288 timed cells. Sizes are 0/1/64/512/8192, crossed independently with short/equal/long ys, uniform/clustered words, and the applicable filter selectivity or overwrite cadence. Every input uses U32 wrapping and total quot/rem sentinels, including k=0 edges. Train only affine/filter-compaction/scan at64/8192. Size512 and every other family are held out for a fresh fit. Reused family evaluation remains exploratory even under that split. Reverse gather sets seed to declared ys length; that scalar is its explicit indexing contract rather than an independently crossed value. Timed tasks and splits are fixed before Engine40 candidate measurements.

The overwrite operation applies a fixed unique-index cadence batch to a fresh xs snapshot each time; ys is a dense public payload. It does not represent maintained incremental state. Update/recompute share exact inputs and semantics. The JS update expert now uses the already-known one-pass recomputation control from Engine39, avoiding the weaker Array.from copy headline. Native expert preserves predeclared memcpy/cadence and direct-loop controls as separate tasks.

Strong JS/Rust controls compute complete operations in fused loops. Dot reduction goes right to left over the paired prefix and uses x+acc*k; it is order-sensitive and cannot be silently regrouped. Compaction predicate sees the wrapped mapped word. Gather reads reversed ys with original xs fallback beyond its extent. Independent Python oracles validate full outputs before target execution, and full-word weighted checksums are consumed inside timers.

## Boundaries and literal emitted Rust

C/native Rust destination cohorts reuse caller output; resident Wasm excludes prepared input setup and returns borrowed destination views. Full C-Wasm includes runtime capture/packing/scheduling/unpack. JS captures both public lists and returns an owned Array. Real GPU full requests include upload, actual dispatches and full owned readback. Resident GPU excludes its captured input upload/setup but still reads the complete owned result. Unsupported routes remain explicit; graph descriptors alone do not establish actual device performance.

Emitted Ink Rust is separate from C data. The adapter archives the complete generated Rust module, extracts exact public pure method bytes and includes all source helpers unchanged. Numeric/list methods compile in a standalone empty receiver with the same calls and bodies, excluding serialization/state-host code from kernel measurements. This wrapper/module extraction and toolchain remain trusted; byte hashes are provenance, not proofs of target refinement.

Emitted methods accept Vec inputs, so the Rust adapter constructs two input Vecs per call from the public words; the generated body may additionally clone. The strong owned Rust control reads the borrowed public words directly and constructs one output Vec, giving the compiler a fair opportunity to remove avoidable machinery. Resident Rust-Wasm retains public inputs on the device but still includes emitted Vec ingress, owned Vec result creation, complete Array readback and Vec release. Full Rust-Wasm additionally captures/uploads both inputs. Native owned Rust consumes the fresh Vec then drops it inside the continuous timer. No Rust destination ABI or reused output claim is invented, and owned vectors are not pooled with C/Rust destination cohorts. Wrapper copies are included, not hidden as compilation work.

## Preparation, validation and later timing

```sh
python3 bench/web-stack-general40.py declare
python3 bench/web-stack-general40/preflight.py
python3 bench/web-stack-general40.py prepare --baseline-only --report reports/web-stack-engine-40-2026-10-11/general/prepared-baseline
python3 bench/web-stack-general40.py node --validate-only --report reports/web-stack-engine-40-2026-10-11/general/prepared-baseline
python3 bench/web-stack-general40.py audit --validate-only --host node --report reports/web-stack-engine-40-2026-10-11/general/prepared-baseline
python3 bench/web-stack-general40.py native-prepare --report reports/web-stack-engine-40-2026-10-11/general/prepared-baseline
```

Baseline is exact `reports/web-stack-engine-40-2026-10-11/ink-baseline-frozen`. Final candidate preparation later takes an explicitly frozen --candidate-compiler and a fresh --report; no compiler is frozen by this lane. Optional --snapshot binds the exact semantic catalogue. Ordinary planner selection uses the unchanged model and full pinned store; no candidate forcing, dynamic price training or backend whitelist.

All preparation checks are untimed. Full target Node/native/browser checks must pass before measurements. Current source preflight is literal baseline Rust feasibility plus experts, not full selected five-CPU/GPU parity. Browser must run actual eligible GPU paths; parent drives it in the headed browser.

Timers require a metadata-bound authorized serial gate, five randomized interleaved rounds, two web warmups, 2ms calibration and a16384 iteration cap. Native driver has three prewarm calls before each timer and append-only flushed NDJSON invocation journals; final JSON is written once. Serial gates keep agents/compilers idle. Within-process percentile intervals are exploratory, nominal and uncorrected; cold process startup is not timed. Source allocation/copy descriptions are not measured native peak heap bytes. Hash/coverage/counter/checksum audits precede any family summary; all losses and raw journals are retained.
