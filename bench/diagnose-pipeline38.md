Use this diagnosis tool with immutable batch38 artifacts. It defaults to untimed full-output validation; profiling and reproduction require the explicit `--timing-authorized` flag and the parent agent's exclusive timing window. It writes only fresh files in `reports/web-stack-engine-39-2026-10-11/regressions`; existing receipts are never overwritten.

Prepare static evidence with `python3 bench/diagnose-pipeline38.py --compile-static` in a fresh diagnostic lane. This authenticates the archived bytes, records every regression/source hash, compiles target-specific LLVM IR and vectorizer remarks, and prepares both prior/checked Wasm with `-fno-vectorize -fno-slp-vectorize` as a paired diagnostic control. Use the command without `--compile-static` to refresh inventory while preserving static outputs. `regressions/summarize-static.py` extracts function-scoped IR evidence and original Wasm export indexes. Xcode llvm-objdump cannot disassemble this wasm32 target; its failures are retained.

Untimed validation:

```sh
node bench/diagnose-pipeline38.mjs --mode=validate --variant=prior_js_owned,checked_js_owned,expert_js_owned,control_no_padding_js_owned,control_no_pluszero_js_owned,prior_wasm_prepared,checked_wasm_prepared,prior_novec_wasm_prepared,checked_novec_wasm_prepared,prior_wasm_full,checked_wasm_full --output=reports/web-stack-engine-39-2026-10-11/regressions/validate-controls.json
```

This validates all 48 composed-source fixtures, 528 variant/fixture rows, complete output/checksum, nonmutation and repeated-output lifetime. JS controls also check changed-input owned lifetime. The no-padding control modifies exactly the archived prior concat allocation/two copy loops, keeping its staged mapper/pair loops. The no-pluszero control modifies exactly four `+0` operations after U32 division/remainder in archived checked JS. Control source bytes/hashes are saved in each receipt. These are diagnostic interventions, not admitted DB laws. The expert is a broader source-shape comparison and cannot isolate one cause.

After an exclusive profiling window is granted, collect traces in fresh processes and keep instrumented profiles separate from uninstrumented timings:

```sh
node --trace-opt --trace-deopt --trace-gc-nvp --trace-file-names --trace-turbo-inlining bench/diagnose-pipeline38.mjs --mode=profile --timing-authorized --frame=pipeline38_left_padded_zip_heldout_u32-high-65536 --variant=prior_js_owned --calls=256 --warmups=64 --output=reports/web-stack-engine-39-2026-10-11/regressions/profile-prior-js.json
node --trace-opt --trace-deopt --trace-gc-nvp --trace-file-names --trace-turbo-inlining bench/diagnose-pipeline38.mjs --mode=profile --timing-authorized --frame=pipeline38_left_padded_zip_heldout_u32-high-65536 --variant=checked_js_owned --calls=256 --warmups=64 --output=reports/web-stack-engine-39-2026-10-11/regressions/profile-checked-js.json
node --print-wasm-code --print-wasm-code-function-index=6 bench/diagnose-pipeline38.mjs --mode=profile --timing-authorized --frame=pipeline38_left_padded_zip_heldout_u32-high-65536 --variant=prior_wasm_prepared --calls=128 --warmups=64 --output=reports/web-stack-engine-39-2026-10-11/regressions/profile-prior-wasm.json
node --print-wasm-code --print-wasm-code-function-index=4 bench/diagnose-pipeline38.mjs --mode=profile --timing-authorized --frame=pipeline38_left_padded_zip_heldout_u32-high-65536 --variant=checked_wasm_prepared --calls=128 --warmups=64 --output=reports/web-stack-engine-39-2026-10-11/regressions/profile-checked-wasm.json
```

Capture stdout/stderr outside the tool to new named logs. CPU profiles may be collected separately with Node's `--cpu-prof --cpu-prof-dir=<diagnosis lane>`. Logging/profiling changes execution and those runs do not establish ordinary speed ratios. The original scalar helpers are already inlined in emitted source; V8 inlining traces concern subsequent engine decisions, not missing Ink helper expansion.

Uninstrumented fresh-process reproduction:

```sh
node bench/diagnose-pipeline38.mjs --mode=reproduce --timing-authorized --frame=regressions --variant=prior_js_owned,checked_js_owned,expert_js_owned,control_no_padding_js_owned,control_no_pluszero_js_owned,prior_wasm_prepared,checked_wasm_prepared,prior_novec_wasm_prepared,checked_novec_wasm_prepared,prior_wasm_full,checked_wasm_full --warmups=64 --rounds=9 --seed=2026113901 --output=reports/web-stack-engine-39-2026-10-11/regressions/reproduce-process-1.json
```

`--frame=regressions` chooses the seven unique archived regression frames. Repeat with fresh output names and seeds in separate processes to examine process/JIT variability. Nine within-process paired rounds are not nine independent process cohorts. Preserve cases that no longer reproduce; do not reinterpret the original intervals as process-level confidence. The original 216 prior cells contain 20 classified losses and 35 point losses, including 15 uncertain point losses; nominal per-cell intervals have no multiplicity correction and cells share inputs. These facts neither prove all 20 stable nor justify dismissing them as noise.

Captured JS copies both public lists and returns an owned Array. Resident Wasm excludes setup and borrows caller destination; full Wasm uses the original CPU runtime's packing/capture/owned unpack. Every output word is consumed in the timing loop with the original weighted U32 checksum. Native batch38 targets are C/clang and have no classified prior regressions. Node traces/reproductions cannot independently reproduce browser-specific engines or their noise; the nine browser losses remain explicitly unreproduced until actual browser runs occur. No cost-model, compiler, runtime or archived byte is changed by these tools.

Actual browser reproduction uses `diagnose-pipeline38.html` and `diagnose-pipeline38.browser.mjs`, with a separate driver:

```sh
python3 bench/diagnose-pipeline38.py --serve-browser --port=8881
```

Open `http://127.0.0.1:8881/bench/diagnose-pipeline38.html` in the actual browser. The untimed validation button checks the six distinct original browser frames and their exact nine pair boundaries, plus paired no-vectorizer resident controls. After the parent grants a CPU-exclusive window, check the timing gate and run uninstrumented reproduction. The server writes fresh `browser-reproduce-process-1.json` (or another fresh name) in the diagnosis lane. It refuses to overwrite receipts. Change the result name before a fresh browser-process run. The browser receipt records its actual user agent and archived source/fixture hashes; it never treats a Node run as browser evidence. There are exactly 11 original Node and nine original browser classified regressions.
