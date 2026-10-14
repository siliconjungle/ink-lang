# Direct typed construction diagnostics

These are three fresh processes with rotated lane order and nine timing rounds. Controls and candidates use the same source and physical plans. The candidate fuses scalar constructor paths; the control uses a frame for each completed path. All cases check complete output values and exact portable/compact bytes.

Medians below are medians of the three process medians, in microseconds. Shared host measurements are diagnostic; they do not grant planner selection authority.

| Fields | Parse + capture, candidate | Direct construction, candidate | Direct construction, control | Candidate direct → edit → text | Control direct → edit → text | Frontier text → edit → text |
|---:|---:|---:|---:|---:|---:|---:|
| 4 | 5.001 | 6.900 | 7.253 | 14.373 | 15.401 | 0.629 |
| 64 | 36.004 | 48.577 | 61.200 | 82.053 | 99.216 | 3.107 |
| 512 | 261.432 | 367.676 | 422.396 | 582.495 | 689.206 | 94.187 |

Direct construction improves over its earlier interface for the medium and large cases, but still loses to the candidate’s parse-plus-capture path. Complete text conversion still trails Frontier. This API remains opt-in; no default chooses it as a speedup. The subsequent combined resource charges and composed constructor functions are **not included** in this cohort.

Frontier runs on the shared finite integer/Unicode input domain through native JSON parsing and rendering. Ink additionally retains exact numeric tokens/member order and rejects duplicate keys. This comparison does not show equality of validation contracts. Import/setup figures depend on module order and are diagnostics. Retained heap and cold standalone startup still need separate measurements.

Exact modules, plans, runner and conformance script are retained in `artifacts/constructed-json-280-282`; raw reports are `constructed-json-280.json`, `constructed-json-281.json` and `constructed-json-282.json`. Losing results are retained.
