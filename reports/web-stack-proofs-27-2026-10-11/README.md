Batch 27 has eight frozen recipes and 32 timed cells. Two independent nested-zip recipes exercise new generic fusion; six references measure bounded named-helper C/JS lowering across map, indexed output, reverse ordered checksum, list-producing filter helper, independent paired output and immutable batch26 modular mix. Source/inputs are separate from publication and target preparation.

Run source controls only (no target builds or timing):

    python3 bench/web-stack-proofs-27/generate.py
    python3 bench/web-stack-proofs-27/preflight.py

The parent owns target preparation after publication. Explicit compilers avoid stale default pins:

    python3 bench/web-stack-proofs-27.py --prepare --old-compiler ../toolchain/ink-direct-js-proofs --compiler ../toolchain/ink-inline-web-proofs --zig /absolute/path/to/zig
    node bench/web-stack-proofs-27/node.mjs reports/web-stack-proofs-27-2026-10-11 --validate
    python3 bench/web-stack-native-27.py --prepare
    python3 bench/web-stack-native-27.py --validate
    python3 reports/web-stack-proofs-27-2026-10-11/compiled-preflight27.py

Prepared targets, controls, selections and inputs must remain unchanged. Parent preparation uses one prior/current core per task and builds all four backend/proof combinations. Strong JS/Rust controls already inline, hoist legal captures and fuse valid original semantics; staged originals validate only. Native scalar Rust uses the shared direct bench_scalar helper, vectors reuse output scratch. Every declared list is captured at full boundaries; borrowed JS is synchronous and distinct. GPU representatives deduplicate exact ABI/host/device/WGSL fingerprints; actual counters and manifest eligibility determine coverage. Native C/Clang versus Rust is not toolchain-isolated language comparison.

Fixed seed20261105, nine shuffled rounds, two recorded warmups,15ms. Input sizes32/65536 timed,4096 correctness-only; small/full distributions and captures fixed across sizes. Three independent two-list ABIs use a distinct donor truncated to3N/4. Empty and unequal lengths, wrapping and zero divisors compare all outputs/nonmutation. All four modular-mix timed inputs/source/captures/goldens are exact batch26 continuity; this remains a separately timed batch.

Root alone launches sequential Node/native/browser timing. Bounded browser helper serves at8819; main8818. No other tests/builds/heavy audits during timing. After all timing stops, independent protocol/native helpers authenticate saved outputs, phase coverage and shuffled rounds and recompute paired intervals; no extra benchmark reruns.

A pre-timing preparation failed because the old C list-method operand repeated a list-returning helper for allocation length, loop length and each data load. The complete failed matrix/validation attempts are preserved under web-stack-proofs-27-single-evaluation-preparation-2026-10-11, with zero timing samples. The reference now explicitly binds `let accepted:List<u32> =helper_accept_list(xs,seed,k)` before mapping. Source-stage controls already bind the result once, and their bytes and all fixture/control mathematics are unchanged. The final matrix compares that same explicit single-evaluation source on both backends; this failure does not establish an inlining speed gain.
