# Explicit binary64 execution and transport

This milestone supplies precision needed to carry JavaScript measurements into
ordinary Ink computation. It does not establish Pretext layout/shaping parity,
Handwired performance parity, general source reverse AD or completion of the
broader adaptive-model programme. No speedup is claimed by this report.

## Exact inputs and independent packages

`source.ink` is the complete authored example, `source.core.json` its checked V15
module, and `source.actions.json` its checked V4 action trees. Their source identity
is `32354f837b9f5a1e1595022b70170798397c114b22b54cca80a5f919836ab417`.
The main history includes raw NaN payloads, signed zero, subnormals, aborted updates,
events, restore, helpers, conversions and ordered sums. `script.json`,
`expected.json` and GPU receipts retain complete observations. `frozen/` separately
retains immutable rebinding and changed-row rejection with a validly re-encoded
envelope. Frozen and adaptive sources have different identities.

`packages.json` records independently published package commits. Standalone core
`1242c36783812f1b310bbd112fe47f1f7ae1317d` has exactly the core tree from distribution
source `e2d854bf3f82e2ab9c21d476a57828ff36899657`. `core-package.json`,
`private-core-validation.json` and its log bind a complete 420-test run in a private
checkout with a private target. They verify those checks against those bytes,
not compiler correctness.

## Compatibility audit

`compatibility/` contains 921 retained source fragments and a dual-package audit
using immutable core revisions `93eb41bf` and `1242c367`. All 247 previously
admitted executable modules preserve canonical bytes. All 45 admitted external
law sources preserve complete proof bundles. The other 674 executable fragments
reject in the older package and are not counted as preserved programs. The audit
also reparses this report's new example with the published package and compares
its complete checked bytes with `source.core.json`.

```sh
cargo run --locked \
  --manifest-path reports/binary64-2026-10-16/compatibility/Cargo.toml \
  --target-dir build/binary64-compat-published-target
python3 tools/check_core_package.py \
  reports/binary64-2026-10-16/core-package.json \
  --log build/private-binary64-core.log \
  --receipt build/private-binary64-core.json
```

This is a bounded corpus audit, not universal compatibility. The earlier
working-tree audit log is retained separately from the published-package audit.

## Target and boundary evidence

- ABI: 22 tests, including 268 edge/random binary64 patterns compared between
  Rust and JavaScript across framed/compact values, packed words, finite typed
  JSON and malformed/resource-limited inputs. Bit tags are bounded decimal
  strings. Wire/packed capture reads each bit field once; typed JSON bounds it
  again before conversion if host getters change between validation and writing.
- Native support: 26 tests, including separate rounding, integer conversion
  ties/ranges, canonical arithmetic NaNs and preserved stored payloads.
- Independent JavaScript package: all 48 tests against published core/ABI pins.
  Independent Rust package: all 20 library tests against published pins.
  Standalone Wasm/GPU/runtime checks also use exact Git dependencies.
- Integrated execution: 65 observations plus a three-observation frozen history
  agree across reference, Rust, JavaScript, Rust-Wasm and the native GPU host.
  CPU targets compare every checkpoint. The GPU host compares its exact final
  checkpoint and rejects changed frozen restore inputs. Each history requires
  one actual eligible F32 dispatch. F64 uses compiled CPU fallback.
- Pure JavaScript: 53 counted ordinary/sealed/prepared/binary boundary operations, detached materialization,
  malformed carriers, input isolation, wide rounding and destination output.
- Existing learning: 46 tests across seven suites exercise source differentiation,
  reverse graphs, Adam, rewards, continuous sessions, freezing, staged builds and
  structured/scalable state with full CPU/Wasm and required eligible GPU work.

The CLI regression checks that `emit-actions` and `check-actions` report their
actual checked transport version, including V4. The old CLI printed its V1
constant even for newer files; that reporting error is corrected. The feature
inventory declares CPU support and explicit F64 device gaps.

```sh
INK_PARITY_REQUIRE_ALL=1 INK_TEST_WASM=1 INK_TEST_WGPU=1 INK_REQUIRE_GPU=1 \
  cargo test --locked --test binary64 -- --nocapture
node reports/binary64-2026-10-16/javascript-boundaries.mjs \
  reports/binary64-2026-10-16/pure-program.mjs
```

## Remaining guarantees and performance work

The proof domain rejects F64 scalar/container/function terms, including nested
closed subterms. It does not borrow F32 equations, wrapping-word rules or scalar
NaN reflexivity. Source gradients, reverse graphs and Adam retain their F32
domains. Authored binary64 updates do not establish F64 AD. WGSL binary64,
numerical error certification, frozen arithmetic/graph specialization, complete
upstream text behavior and broad performance acceptance remain required work.
Translation, generated runtimes, codecs, toolchains and host engines remain
trusted. Hashes/inventories are provenance checks, not signatures, theorem
certificates or convergence guarantees.
