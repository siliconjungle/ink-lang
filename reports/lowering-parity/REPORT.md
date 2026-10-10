# Complete lowering parity

C, Rust, JavaScript and both Wasm paths were compared against the reference
semantics. GPU-eligible closures were executed through native wgpu and browser
WebGPU; stateful operations and unsupported physical layouts used the complete
CPU host. This is conformance evidence, not a proof of emitted code or a speedup.

## Observed results

- 68 mixed-program requests and 10 query/Result-keep boundary requests matched
  across native C, native Rust, JavaScript, C/Wasm and Rust/Wasm. Every comparison
  also checked the exact portable snapshot bytes after the result.
- The compiled native C host exercised pure/action invocation, exact u64 JSON,
  buffers, checkpoint/restore, disposal and invalid handle reuse.
- Native wgpu matched all 68 mixed-program results; 21 calls selected GPU kernels,
  including map/filter/scan/sort composition, list repeat, unequal lazy choices,
  empty lists, filtered-to-empty arrays, particles and truncated zip.
- A native resident filter → scan → sort pipeline ran three feedback iterations
  without intermediate readback, preserving shrinking and empty actual lengths.
  It returned `[3,11]`, `[]` and `[]` for the three fixtures.
- The browser displayed: `PASS: 78 Wasm/GPU results and exact snapshots; 78
  JavaScript results and exact snapshots; 21 WebGPU calls; navigator.gpu=true`.
  Browser JavaScript snapshots used WebCrypto.
- Native C and Rust CLI projects produced all 68 results and the same final portable snapshot. The complete Wasm CLI produced the 10 query-boundary outcomes and exact snapshots.
- Standalone core: 23 tests passed. Distribution: 205 tests passed in the final
  broad run; the expensive row/column migration test passed in the earlier run
  and was excluded from that repeated run. The new resident GPU test passed
  separately. Standalone packages built/tested against published compatible pins;
  the runtime backend selector's five Node tests passed.

An initial distribution run found a stale disposable SQLite cache after the
knowledge pin changed. Rebuilding it from the pinned canonical snapshot fixed
the effect-model tests; no proof objects or authority rules were changed.

## Reproduce

From the recursive source checkout:

```sh
(cd knowledge && python3 -m ink_knowledge --root . rebuild)
cargo test
cargo test --manifest-path core/Cargo.toml
INK_TEST_WGPU=1 INK_TEST_ZIG=/path/to/zig \
  cargo test --test lowering_parity -- --nocapture
node --test runtime/tests/backend-selection.mjs
ink build build/lowering-parity/source.ink --target webgpu \
  --zig /path/to/zig -o build/full-web-parity
cp tests/lowering-parity-browser.html build/parity-browser.html
python3 -m http.server 8768 --directory build
```

Open `http://127.0.0.1:8768/parity-browser.html` in a browser with WebGPU.
Rust needs the `wasm32-unknown-unknown` target; generated C/Wasm primitives use Zig.
Node with WebCrypto is required for JS snapshots. `INK_CARGO` or the CLI's
`--cargo` option selects a custom Cargo executable.

Fixtures live in `tests/lowering_parity.rs`, `examples/query-errors.ink` and the
browser/C host test files. `validation.json` records per-request outcomes and
snapshot hashes for the observed fixture bytes, along with package revisions.

See [the parity contract](../../docs/lowering-parity.md) for CPU wire semantics,
resource policies, WGSL float limits, GPU work caps and shared C primitive runtime.
