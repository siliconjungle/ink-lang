# Dictionary storage composition

The database proposed String-key dictionary storage with six proved record elisions, four proved sum layouts and preflight. The control uses the same proved layouts and preflight with Map storage. A mixed-history smoke passed, then three fresh processes each ran nine rotated replacement rounds over 4,096 rows with complete replies, checksums, versions and exact initial/final Ink portable checkpoint validation.

| Lane | Median of process medians (µs/call) |
|---|---:|
| frontier-state-main-patch | 1.343 |
| frontier-state-main-prepared-patch | 1.078 |
| ink-js | 3.107 |
| ink-js-control | 2.693 |
| ink-js-control-prepared | 0.797 |
| ink-js-prepared | 0.951 |

Results do not establish a consistent dictionary win. Ordinary paired ratios are 0.689, 0.921, 1.154; prepared paired ratios are 0.669, 0.973, 1.194. Shared-host process medians vary sharply. Retain dictionary storage as an independently checked alternative; these observations do not justify making it the global default or establish an all-metrics Frontier win.

No exclusive reservation, confidence bound, equivalent startup, memory, query or full JSON text ranking. Do not combine absolute timings with other implementation/control cohorts. Exact plans, receipts, modules and harness source are archived in artifacts/dictionary-state-307-309.
