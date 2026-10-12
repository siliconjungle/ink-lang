# Generic Wasm borrowed reads

`workload.ink` and `snapshots.ink` are byte-identical copies of the preceding
Frontier recheck. They use the ordinary generic snapshot algorithm, including
its in-loop `length(before)`. No algorithm or knowledge law is changed.

The compiler emits the same C and JavaScript. The fixed C/Wasm artifact embeds
native support with borrowed read-only primitive operands. `before` is the
previous frozen complete-state Wasm artifact, and Frontier is the same published
`@shapeshift-labs/frontier@0.1.9` package. This harness does not modify Frontier.

The driver checks all 27 immutable numeric snapshot fixtures. It times complete
final-state calls and consumes every scalar or row field. Wasm timing includes
JSON transport and conversion from exact integer results to u32 Numbers. Input
creation, freezing, module instantiation and compilation are excluded. It keeps
all nine rounds and every loss. Four changed 16,384-row baseline cells remain
excluded after the previous independent 30-second deadline; they receive no
invented completion time. All fixed cases execute and must return exact output.

JavaScript controls share this run with Wasm and can have different V8 tiering
histories from the earlier dedicated JS benchmark. Treat these shared-host
measurements as exploratory. Bootstrap intervals resample paired round indexes;
they do not establish performance on other machines or arbitrary schemas.

Build and finish conformance before timing. Unpack the report's measured artifact
archive at an isolated repository root to replay its exact inputs:

```sh
node bench/generic-wasm-reads/run.mjs --probe
node bench/generic-wasm-reads/run.mjs /tmp/new-samples.json
python3 bench/generic-wasm-reads/summarise.py reports/generic-wasm-reads-2026-10-12
node bench/generic-wasm-reads/stages.mjs /tmp/new-stages.json
```

The sample and stage JSON output paths refuse overwrites. Stage timers run in
a separate process and break down the existing host without changing its ABI.
The Wasm export stage includes Rust-side JSON decoding, value construction,
execution and response serialization; it is not an isolated compute timer.
The root `borrowed_native_reads` test
builds an actual generated C/native project and checks allocations, field-result
ownership, invalid handles, execution fuel and scalar/aggregate float equality.
The same allocation guard fails against the old emitted bridge; that expected
failure is recorded separately from passing conformance.
