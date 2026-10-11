# Validation

The exact independent revisions and final results are in `validation.json`.

- Full scalable-state histories pass against the independent reference across C, Rust, JavaScript and both Wasm lanes, with ordered and indexed-slot Rust storage. They include UTF-8/nominal/signed keys, duplicate batches, mismatch errors, nested aborts, events, exact snapshots, restore and commit-sequence exhaustion.
- The 400,000-row emitted C scan returns 80,000,200,000, retains fewer than 16 transient handles before host cleanup and stays below 30 MiB of primitive arena accounting.
- Closed mathematical histories match the independent source evaluator. Both frozen maintenance candidates reproduce byte for byte and pass local admission; authenticated, re-signed false laws are rejected.
- Existing exact binary32 and full-width integer fixtures dispatch on native wgpu and browser WebGPU. Table actions remain host work.
- Independent lowering/runtime packages pass with exact Git dependencies. Tracked locks and the final root build pass offline with `--locked`; the GPU package's ignored local lock was refreshed after its JavaScript pin changed. Core, ABI, native support and lifecycle planner checks also pass.
- The coverage contract inventory passes with zero gaps. An unrestricted GPU inventory still reports the existing unsupported domains, including device tables.
- CLI checks cover all Rust emission paths, selected storage metadata and rejected invalid options.

The separately recorded 39 state/effect/numeric regression tests and nine lifecycle planner tests passed. Local logs remain under `build/`; frozen source, proof requests, samples and receipts are retained in tracked files.
