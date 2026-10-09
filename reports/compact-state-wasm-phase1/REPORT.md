# Compact storage in WebAssembly

Six real compiled programs cover exact and bounded totals under tree, contiguous-row and separate-key/row layouts. Both Node and an actual Chromium browser pass 29,395 checks, including codec checks, and 27,351 invocations. A separate native/reference comparison checks 3,030 outcomes. Checkpoints pass between physical layouts and native/Wasm implementations and continue against independent reference outcomes.

The checks cover rollback, exact integers, event order, high commit versions, exhausted counters, ABI input/output bounds and failed-call behavior. Storage policy promotion remains a trusted implementation, not a physical refinement theorem. Logical snapshots rebuild storage and caches; these are not zero-copy physical snapshots or durable recovery.

[Node results](validation.json), [actual browser results](browser-validation.json), [source/receipt hashes](verification.json) and [artifact hashes/toolchains](metadata.json) are archived. This is functional validation, with no Wasm speed ranking.

Reproduce with `python3 bench/compact-state-wasm.py`, serve the repository with a local HTTP server, and open `bench/compact-state-wasm.html`. This rebuilds validation artifacts; it does not replay or retime the preserved native benchmark binaries.
