# Complete-call transport attribution

The fixed browser run passed 252 instrumented calls and 84 separate warmup calls across both host versions, with 112 actual GPU calls (84 measured, 28 warmup). An earlier gate-free run passed 84 complete-value, input-capture, owned-lifetime and physical-counter checks, including 28 actual GPU calls. The timed audit authenticates 134 bindings. Every output word was consumed, and retained results survived subsequent calls and runtime close.

This run establishes executed transport paths and preserved values. It does **not** establish a speedup: 1,309 of 1,368 phase intervals and 114 of 252 complete-call intervals were recorded as zero. The observed clock increments are approximately 0.1 ms. A zero is below resolution, not free execution. Only three instrumented rounds were recorded; no significance, backend price or default selection decision is inferred.

The protocol has 14 contexts: the existing checked U32 padded-indexed recipe at 0, 1, 32 and 2,048 elements with low/high values, plus six previously validated signed-integer, Boolean and vector carrier cases. Each uses CPU, saved-profile automatic JavaScript, and actual GPU. Both versions use identical compiled Wasm, generated JavaScript, manifest and shader bytes. The U32 pair additionally compares archived/current GPU device bridges; the other carrier pairs share the current device bridge. The synthetic profile forces the **actual captured automatic JavaScript path**, without online clock probes. It is not measured profitability. Explicit/static JavaScript's borrowed-input contract is not priced as automatic capture.

## Reading the spans

`pack` records caller capture and packed argument construction. `arena-upload` records argument writes to the CPU arena. CPU `execution` records the compiled ABI call; direct JavaScript's `execution` includes its output adapter. `unpack` records decoding/materialization. The external complete-word consumer has a separate interval. These are inclusive spans: `cpu-total` contains arena upload and execution, and the candidate also decodes its terminal result before that span returns.

The original has 42 CPU `unpack` spans **outside** `cpu-total`; all 42 candidate CPU `unpack` spans are **inside** it. Comparing raw `cpu-total` would compare different boundaries. The summary subtracts the **union of each span's direct children**, then verifies that exclusive phase totals equal the union of all recorded intervals. It does not add nested inclusive times. Return time minus that union remains unattributed host/await work.

GPU return time includes allocation, submission, asynchronous execution, readback and host scheduling. No hardware timestamp query isolates shader time. Original/candidate physical GPU upload, readback, dispatch and live-memory counters match for every measured paired call. Removing a host copy does not remove a device transfer.

## Concrete work removed

For automatic JavaScript, measured `unpack` invocation count fell from 114 to 66. The difference is exactly two list decodes across 24 U32 automatic calls: the candidate consumes captured private U32 views, while scalar decodes remain. Capture still owns its input words, and public results retain the existing owned-result contract.

The separate mock copy audit records eight original terminal CPU arena slices, totalling 4,162 copied words, and zero corresponding candidate slices across sizes 0/1/32/2,048 and CPU/automatic-CPU routes. This is an intercepted fixture, not a count of all allocations in compiled applications. The owned GPU readback already contains copied mapped bytes; its subsequent subview avoids an additional slice. Neither change promises zero-copy public results.

The broader untimed compiled parity gate records 612 complete browser pure-result checks, 12 action outcomes and 150 actual GPU calls, plus exact snapshots and retained-result checks. The final reviewed e9 release separately passed the parent’s full action-history and native/CPU destination gates. These are conformance evidence, not a universal proof of target lowering.

## Logged timing limits

Across the heterogeneous 42 calls per host/route, CPU and automatic-JavaScript complete-call medians are unresolved at 0.0 ms for both hosts; GPU medians are 0.6 ms for both. Every per-context value and adverse delta remains in `attribution-summary.json`: 9 candidate medians are lower, 7 higher and 26 within floating rounding tolerance. Those are descriptive signs, **not wins/losses**. No adverse cell or warmup was discarded. The raw three-round arrays are retained.

Instrumented wrappers change execution, and clock quantization dominates most CPU phases. These observations cannot isolate allocation latency or establish profitability. Uninstrumented, process-controlled benchmark evidence belongs to the separately reported benchmark cohorts and their recorded contention limits. The source release uses common core e9 with the published generic datatype-closure fix; newer V6/df73 features preserved on package main branches are outside these measurements.

Reproduce this analysis without executing any target calls:

```sh
python3 reports/web-stack-engine-40-2026-10-11/transport/summarize-attribution.py
```

The bound inputs are `attribution-results.json`, the fixed protocol/controls, the timed audit, copy audit, parity receipt and final source receipt. `attribution-summary.json` binds them by SHA-256. Original hosts, candidate clones, failures, raw results and earlier protocols remain preserved.
