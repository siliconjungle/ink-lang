# Value-invariant interface calls

This measures one `Unique<u32>` observation from
`examples/invariant-values.ink`. The baseline and selected modules preserve the
same input invariant. A handwritten JavaScript `Set` validates uniqueness and
returns the same Boolean result. Invalid duplicate inputs reject in every lane.
The control is valid for typed u32 values; it asserts nothing about floating-point
or general structural keys.

Two boundaries are recorded separately:

- Trusted typed JavaScript values, including the public invariant validation.
- Complete checked value-wire calls, including decode, predicate validation,
  execution and result encoding. The handwritten lane uses the identical
  argument/result codecs. This is binary transport, not a JSON benchmark.

Input construction and argument encoding occur outside call timing; encoding is
recorded separately. Every returned Boolean or every output byte is consumed
inside timing. Full output comparisons and unchanged-input checks occur outside
timing. Eleven rounds interleave the three lanes and include empty inputs.
Warm-up, batch counts, raw samples, compiler identity, module hashes and the
planner's structural estimates are retained in the report. These are samples on
a shared developer machine, without population-level confidence claims.

The recorded frozen selection has three checked applications. At 512 inputs,
the selected/literal ratios are 0.497 for typed values and 0.507 for checked wire
calls. The selected wire call is still 19.376 times the handwritten control.
Small wire inputs show much less benefit; the empty case is 0.998. This exposes
the remaining validation/transport cost. It does not establish automatic
profitability or competitive execution across workloads or targets.

To reproduce after generating a checked selection in `build/general-machinery`:

```sh
ink build examples/invariant-values.ink --target javascript \
  -o build/general-machinery/value-baseline.mjs
ink build examples/invariant-values.ink --target javascript \
  --selection build/general-machinery/fact-selection-frozen.json \
  -o build/general-machinery/value-selected.mjs
node bench/value-invariants/run.mjs build/general-machinery \
  > docs/evidence/general-machinery/value-performance.json
```

The report is separate from canonical mathematical objects. Further work needs
proved faster predicate algorithms, additional interfaces, complete native/Wasm
and lifecycle measurements, and comparable selection evidence.
