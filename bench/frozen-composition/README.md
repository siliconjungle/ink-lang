# Complete serving after checked helper composition

The `frozen_state` helper-composition test emits both 32- and 128-operation
fixtures under `build/frozen-composition-{count}-parity`, with every reference
reply/checkpoint and a two-step checked plan. The corresponding authoring folder
contains its restricted input core and initial snapshot.

Build the compiler and run the exact test first. Then, for each count:

```sh
ink build build/frozen-composition-authoring-128/frozen.core.json --core \
    --target javascript -o build/frozen-composition-128-parity/baseline.mjs
cp build/frozen-composition-authoring-128/initial.snapshot \
    build/frozen-composition-128-parity/initial.snapshot
node bench/frozen-composition/benchmark.mjs \
    build/frozen-composition-128-parity baseline,selected
```

Use six fresh processes, alternating `baseline,selected` and
`selected,baseline`. Each phase warms 2,500 requests, then records five samples
of 25,000 complete bound query calls. Strides 1, 16 and 256 also update weights
and acknowledge events inside the measured loop. Both variants restore the same
complete state and consume every scalar result. Checksums and ending checkpoint
hashes must agree; separate conformance compares every reply and checkpoint.

Compare paired process medians, using the geometric mean of their ratios.
Import, create/restore and first binding/call are separate one-shot observations,
not part of the warm samples. Keep their costs and emitted source sizes visible.
This measures one scalar operation-sequence workload on one host. It does not
establish a cold-start, memory, neural-network, GPU or upstream-library advantage.

The [retained acquisition](../../reports/frozen-composition-2026-10-16/README.md)
binds the modules, starting snapshots, complete plans and raw process samples.


To compare code layouts, preserve the expanded module as `baseline.mjs` and the
shared module as `program.mjs`, then run the same six-pair protocol. Record their
hashes and label this comparison separately from the unspecialized baseline.
`frozen_composition.py --helper-layout expanded` retains the other checked
proposal; the default is `shared`. Code sharing does not cache returned values.

`prepare-prefix-history.py --ink INK --artifact MODEL --history HISTORY
--prefix-operations 64 -o NEW_DIRECTORY` extends the concrete frozen-program
history with eleven actual GPU calls. It independently evaluates the original
64-operation prefix and the declared eligible helper before writing the fixture.
Replay it with `replay-source-history-browser.mjs ... --initialized MODEL`.
This is backend conformance for a pure prefix, not device training or a GPU
speed measurement. The full 128-operation pure root currently exceeds the graph
stage budget.
