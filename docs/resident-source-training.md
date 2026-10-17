# Resident source training

[The authored example](../examples/resident-source-training.ink) trains a
10-input, two-hidden-layer ReGLU network with widths [6,6], four outputs and
244 parameters. It uses ordinary piecewise forward differentiation of one
coordinate at a time, an ordered batch fold, and authored Adam updates. A flat
parameter record carries the weight, both moments, both decay powers and step
counter. All coordinates are updated together or the complete prior state is
retained. This supplies a working source-gradient/device-training consumer;
it makes no throughput claim about this coordinate-wise construction.

The resident plan runs four source functions: shape validation, batched gradients,
parameter/optimizer update, and losses. Its feedback carries the updated records
to the next iteration. Inputs upload at session open or explicit writes. Iteration
steps submit device work with no upload or readback; explicit reads return complete
parameter/optimizer values, gradients, losses and validity. Ordinary code remains
in source. The compiler contains no network, differentiation-helper or Adam matcher.

Two general lowering capabilities enable this path. Strict local immutable list
constructors materialize into private WGSL arrays, including numeric records and
vectors. Elements evaluate in order before reuse. The cumulative local-array bound
is 4,096 words per shader, accounting for WGSL alignment and record/vector padding;
type inspection and helper traversal retain bounded work/depth. Unsupported or
oversized construction keeps compiled CPU execution. Supported lazy list choices
also have a single literal graph stage, keeping arm evaluation inside shader
control flow. Its capacity is the maximum of the possible input-derived extents;
the selected logical length stays in the resident header. This lets scalar graph
stages compose with these collection functions in one resident pipeline.

The retained validation checks ten complete reads across native CPU, native wgpu,
browser Wasm CPU and browser WebGPU: normal training, empty and shortened batches,
invalid configuration, nonfinite gradients/state, exhausted counters, malformed
batch shape and restart after input replacement. NaN payload pass-through and
negative zero remain observable. Both GPU hosts require real device execution;
the browser additionally instruments buffer uploads and mappings around every
step. There are 44 device dispatches per complete GPU history. JavaScript's initial
244-coordinate source gradient also matches exactly. A separately authored
real-valued reverse calculation checks every initial coordinate with tolerance
`1e-6 + 3e-5 * abs(expected)`; this numerical oracle is separate from exact
cross-target correspondence.

The required `source_reverse` test validates all four active WGSL stages on every
run. With `INK_TEST_WGPU=1`, it also builds the generated native host, executes both
complete histories, and checks the independent gradient oracle. `INK_TEST_WASM=1`
also builds the browser CPU image. The existing source-history browser command
then requires the complete resident training history alongside its source-reverse
history. Both native and browser CI gates use their existing commands. The `gpu` suite covers local
helpers, captures, record elements, empty lists, padding/storage exhaustion,
precondition rejection and lazy graph construction.

For a full browser reproduction, build the example with `ink build ... --target
webgpu -o BUNDLE`, then run:

```sh
python3 bench/gpu/source-training.py prepare OUTPUT
# Run BUNDLE/native's compiled ink-gpu-program for each backend:
ink-gpu-program --script OUTPUT/native-cpu-script.json > OUTPUT/native-cpu-history.jsonl
ink-gpu-program --script OUTPUT/native-gpu-script.json > OUTPUT/native-gpu-history.jsonl
# Serve BUNDLE over loopback HTTP; use the pinned bench/gpu Playwright dependency.
node bench/gpu/source-training-browser.mjs BASE_URL OUTPUT OUTPUT/browser-history.json CHROME
python3 bench/gpu/source-training.py verify OUTPUT --browser OUTPUT/browser-history.json
```

This consumer uses an independently authored network with the same architecture
as the prepared-network admission milestone. It does not establish a checked
replacement of that prepared graph. Existing prepared-graph and reverse-tape
learners retain CPU execution. GPU reverse tapes, binary64 device arithmetic,
broader graph/control/contract domains, automatic profitable placement and the
full functionality programme remain open. See the
[retained evidence](../bench/functionality/resident-source-training/README.md).
