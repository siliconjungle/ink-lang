# Checked literal wire decoding

The ABI now offers a trusted-emitter reader that validates and constructs in one traversal. It retains exact headers, source frame/node/depth limits, Boolean/sum tags, fixed scalar widths, UTF-8, canonical Int/Id/enum text, vector lengths and canonical compact counts. The independent generic decoder remains the oracle; this is a backend correctness obligation, not mathematical rewrite authority or JSON format-invariant validation.

The ABI fixture compares 1,200 outcomes, including corruptions, truncations, limits and detached outputs. Actual generated modules add 2,556 cases across ordinary and flattened sum layouts. The full JavaScript suite passes. Final explicit fused APIs also undergo selected-layout malformed-input tests.

Three fresh paired processes measured the prototype against the same source and layout, checking complete outputs and exact portable/compact document and reply bytes. Cleanup archive workers were paused for the cohort; other host workers remained active. At 512 fields, compact decode improves from 264.192/345.267/207.442 to 103.505/122.053/86.109 microseconds: 2.41–2.83× per-process gains. Complete compact edit/encode improves there by 1.07–1.40×.

The result is mixed elsewhere. At 64 fields, complete compact edit/encode regresses in all three processes by about 8–16%. Small-input results and portable decoding also vary. Consequently baseline decoding remains the default, with explicit fused alternatives available for lifecycle-based selection. This cohort does not establish a universal gain, retained-memory benefit or a matched Frontier result.

Exact emitted modules, plans, runner and conformance evidence are archived in artifacts/fused-wire-reader-295-297. The measured prototype selected the fused reader by default. The final baseline/fused API split and later enum-metadata hoist were not timed in this cohort; do not attribute these timings to them.
