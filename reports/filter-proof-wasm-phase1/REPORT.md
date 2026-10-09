# Checked filtered implementations: Wasm validation

The same shared checker passed **4,476 checks over 261 fixtures** in Node 22.22.1/V8 12.4.254.21-node.35 and an actual Chromium 155 browser. Node execution alone was not used to infer browser success. validation.json and browser-validation.json record the separate observations; browser.jpg shows the browser result.

Three freestanding modules were compiled through Zig 0.17's Clang/linker path. Each module has no host imports. The checked module applies the same 36-object filtered library used in the native experiment. The third module exercises conditional execution and nested temporary collections without selected replacements.

| Module | Bytes | Initial pages | Final observed pages |
| --- | ---: | ---: | ---: |
| Staged | 19,874 | 17 | 90 |
| Checked | 7,363 | 16 | 41 |
| Semantics examples | 8,294 | 17 | 17 |

Pages are 64 KiB. Final sizes are observations from this fixture sequence, including a 200,000-element input, not peak allocation measurements or language-wide bounds. This phase records correctness, binary size and memory growth; it does not benchmark Wasm execution speed.

The suite checks modular arithmetic, random scalar captures and thresholds, empty/full-width inputs, constant maps, lazy numeric/Boolean choices, a conditional order-sensitive right fold, nested collections within a conditional, repeated calls and borrowed-input preservation after growth. The total combines function-result and input-preservation checks. It does not imply 4,476 distinct test inputs or a formal backend correctness proof.

## Reproduction

From the repository root, with Rust, Zig, Python and Node available:

```sh
# Rebuild the three modules and validate them in Node.
python3 bench/filter-wasm.py

# Serve the same shared JavaScript suite to a browser.
python3 bench/filtered/serve.py
```

Open http://127.0.0.1:8768/bench/filtered/wasm.html. The page runs all three modules, displays the result and sends it to the local server. The server saves a fresh receipt at build/filter-proof-wasm-browser-validation.json; the archived browser receipt remains unchanged. Stop the server with Ctrl-C. An optional --receipt PATH selects a different receipt destination.

metadata.json preserves build commands, Zig version and SHA-256 values of the binaries. Generated C and checked plans accompany each module. The shared JavaScript, example source, browser page, server and build harness are copied into this archive. archive.json identifies the archived files after the server/reproduction additions; the measured module bytes were retained unchanged. The server is a local reproduction helper, not an independent proof authority.

The ABI and allocator constraints remain as documented in ../../docs/wasm-abi.md. The Wasm backend and memory runtime are trusted. Mathematical value proofs exclude resource-failure traces. See ../filter-proof-phase1/REPORT.md for native performance and the unchanged-compiler database-extension experiment.
