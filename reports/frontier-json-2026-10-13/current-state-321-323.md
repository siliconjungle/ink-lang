# Current state graph comparison

Current observer/publication and literal framing machinery with the same six record and four sum layout proofs plus both preflight actions. Paired prior emitted implementation, frozen Frontier main ordinary/prepared controls, 4,096-row replacements, nine rotated rounds per process. Complete replies/events, checksums, versions and exact initial/final Ink checkpoints pass.

| Process | Ink ordinary | Frontier ordinary | Ink prepared | Frontier prepared |
|---|---:|---:|---:|---:|
| 321 | 5.040 | 2.980 | 1.854 | 1.326 |
| 322 | 18.440 | 6.967 | 3.258 | 5.303 |
| 323 | 7.276 | 3.279 | 3.398 | 3.003 |

Times are microseconds. Ordinary calls still lose by about 1.7–2.6×. Prepared results are mixed. The current implementation improves prepared calls against the prior Ink module in these runs, but does not establish an all-process Frontier win. Ordinary/control results include a regression in process 322.

There is substantial shared-host variation; absolute values are not comparable with old cohorts. A root Git push/automatic packing was launched at the beginning of process 323, so this process is not a clean acquisition for attributing performance. Data are retained rather than discarded. No startup/heap/diff ranking or overall victory. Numeric typed-ingress gains measure different operations and must not be presented as fixing this capture gap.
