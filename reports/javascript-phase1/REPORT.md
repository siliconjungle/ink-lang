# JavaScript lowering and browser selection

The standalone `ink-lowering-js` package emits literal JavaScript from an
immutable checked Ink module. The distribution exposes `build --target
javascript`, and runtime browser bundles carry JavaScript alongside Wasm/WGSL.
No semantic-core type or primitive rule changed for this target.

## Checked execution evidence

| Check | Result |
| --- | --- |
| Standalone lowerer / pinned reference interpreter / Node 22 | 946 comparisons plus input, hygiene, lazy evaluation, non-mutation and resource regressions |
| Node browser-host compute bundle / independent fixtures | 298 comparisons across explicit Wasm CPU and JavaScript |
| Node browser-host scalar bundle / independent fixtures | 1,332 comparisons across explicit Wasm CPU and JavaScript |
| Actual Chromium 155 / WebGPU available | 2,445 comparisons across explicit Wasm CPU, JavaScript and GPU/fallback; 613 actual GPU calls |
| Packed full-width words | Three CPU/JS/auto comparisons and seven coercion/precision rejection cases |
| Shared selection policy | Five deterministic tests: JS/Wasm/GPU winners, complete setup costs, failure, availability changes, caching and one-time startup charging |
| Distribution CLI | Importable module, checked optimisation, plan identity and no native compiler dependency; GPU bundles include JS and shared runtime policy |

`node-compute.json`, `node-scalar.json` and `browser.json` bind emitted JS hashes,
typed interfaces where applicable and measured sample receipts. Browser compute
coverage includes two-stage feedback particle pipelines, typed array outputs,
input capture at submission and actual GPU dispatch. JS/Wasm values match exact
fixture values; GPU floats use the existing portable tolerance contract.
Timing samples are observations from this machine, not a portable speed ranking.

## Reproduction

```sh
cargo test --manifest-path lowerings/js/Cargo.toml --locked
node --test runtime/tests/backend-selection.mjs
cargo test --test javascript --test compute --test gpu --test semantic_optimisation
ink build examples/particles.ink --target webgpu --zig /path/to/zig -o build/javascript-particles
ink build examples/gpu.ink --target webgpu --zig /path/to/zig -o build/javascript-scalar
python3 bench/gpu/compute-fixtures.py build/javascript-particles/fixtures.json
python3 bench/gpu/fixtures.py build/javascript-scalar/fixtures.json
node bench/javascript/node.mjs build/javascript-particles build/javascript-particles/fixtures.json compute.json
node bench/javascript/node.mjs build/javascript-scalar build/javascript-scalar/fixtures.json scalar.json
mkdir -p build/javascript-web-check
cp bench/javascript/browser.html build/javascript-web-check/index.html
python3 -m http.server 8769 --bind 127.0.0.1 --directory build
```

Open `http://127.0.0.1:8769/javascript-web-check/` in a browser with WebGPU and
press Run validation. The page displays complete receipts and requires GPU-eligible
fixtures to execute on the actual GPU. Without exposed WebGPU it exercises CPU
fallback. Fixture producers and browser drivers remain external to the lowerer.

## Boundary

The implementation covers pure numeric, Bool, vectors, records and nested lists.
State/actions/events and opaque stateful values reject. JS uses BigInt for u64,
explicit 32-bit wrapping, binary32 bits and separately rounded float operations.
Arithmetic-produced NaN payloads remain engine-dependent. Host budgets are
explicit; JS execution does not promise interpreter-identical fuel accounting.

The current adaptive selector chooses a whole scalar call or packed pipeline.
Packed JS stages traverse the shared host codec; per-stage adaptive placement,
stateful JS and a source-editing browser compiler remain unfinished. Native wgpu
continues using C CPU fallback. Checked transformation evidence does not formally
verify emitted JavaScript, the engine, target machine code or physical adapters.
