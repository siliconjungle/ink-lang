# Literal compiled writer framing

Balanced `openFrame` / `closeFrame` emission removes per-node callbacks while retaining source layout proofs, generic output validation, exact portable/compact bytes, resource checks and closed visitor boundaries. Core contains no new algorithm recognizer.

Three fresh processes, 15 alternating rounds, 512-field numeric JSON. Input construction is outside timing. Encoding consumes every output byte; round trips include execution, encoding, decoding, checked rendering and UTF-8 consumption.

| Operation | Candidate/control process ratios |
|---|---|
| compiled-encode-compact | 0.891, 0.889, 0.887 |
| compiled-encode-portable | 0.932, 0.936, 0.932 |
| compiled-roundtrip-compact | 0.910, 0.972, 0.912 |
| compiled-roundtrip-portable | 0.904, 0.893, 0.990 |
| compiled-value-visit | 0.831, 0.861, 0.854 |

Every measured ratio improves, but full roundtrip gains vary. Shared host and no confidence bounds. These are matched Ink implementation diagnostics, not a Frontier or all-metrics win.

Full ABI and JavaScript suites pass, including composed sum/record layouts, exact words/raw floats, malformed inputs, byte/node/depth failures, visitors, ownership, reentry and rollback. Both generated modules and source/validation logs are archived. The initial candidate compiler binary was replaced during control preparation; its binary hash was not retained. Generated artifact and literal source bytes are retained; do not infer a frozen compiler-binary receipt from this report.
