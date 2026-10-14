# Literal typed reduction: JSON rendering

Processes 287–289 compare the same source layouts and check complete text outputs, input ownership, and exact portable/compact bytes. The generic reducer supplies literal traversal; JSON grammar, duplicate rejection, Unicode and output limits stay in the ABI adapter. It exposes no private composites and grants no rewrite authority.

| Fields | Prepared ordinary output (µs) | Prepared direct output (µs) | Ordinary full text/edit/text (µs) | Direct full text/edit/text (µs) | Frontier full text/edit/text (µs) |
|---:|---:|---:|---:|---:|---:|
| 4 | 6.050 | 2.859 | 16.557 | 13.269 | 0.839 |
| 64 | 34.533 | 19.058 | 99.183 | 70.361 | 4.241 |
| 512 | 220.497 | 122.717 | 556.053 | 451.177 | 99.612 |

Table cells are medians of three process medians, not pooled calls. At 512 fields, prepared rendering improves 1.58–1.80× within each process; direct full text/edit/text takes 440.845–528.583 µs versus Frontier 96.236–109.495 µs. Medium and large direct pipelines improve in all processes, but the four-field direct pipeline loses to ordinary capture/edit/text in process 289. No default or planner choice assumes a universal speedup.

Frontier uses native JSON on the shared finite-integer/Unicode domain. Ink additionally preserves exact number tokens and member order, rejects duplicates, and enforces source-wire budgets. Validation contracts differ. This shared host had other agents compiling; rotated paired lanes and three fresh processes support the scoped comparison, not a controlled laboratory claim. Import/setup diagnostics are order-dependent. These runs do not establish retained memory, cold startup, or an all-metrics win.

Exact modules, source plans, runner, adapter implementation and conformance checks are retained in `artifacts/typed-reduction-287-289`; raw reports and per-process summaries retain every lane. The snapshot records the Frontier repository revision; a future cohort should additionally bind its installed JavaScript dependency bytes.
