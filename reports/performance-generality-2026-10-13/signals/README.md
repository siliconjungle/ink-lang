# Current JavaScript backend vs Svelte and Preact Signals

Apple M2, Node v26.1.0; exact Svelte 5.57.2 and @preact/signals-core 1.14.4.
One shared-host process per run, no forced GC, alternating lane order. This is
an exploratory 4096-row state comparison with complete history assertions and
full-width wrapping controls. No DOM rendering is measured. Ink includes
transaction/version/event work; signal controls have different contracts.

The first run reused the old indexed request with the current literal backend.
It took **7154 µs** for one update plus sum/count reads, versus **514 µs** for
ordinary Ink. That request constructs a full logical-state observation, which
the old backend had skipped. The original 5.544 µs report used backend
`696d203565fe6392378a0fd665dcbfb797d79378`. Intervening commit
`ab8fead` removed backend-authored query and transition transformations, moving
this work into explicitly admitted programs. Its exact diff is retained in
`backend-change.diff`. This occurred before the new equality/capture changes. The loss is retained in `uncompacted-results.json`
and `uncompacted-indexed.mjs.gz`; three repetitions were measured. An earlier
full-size run was interrupted after substantial forced-GC overhead; it produced
no complete result and is not counted as passing evidence.

The existing knowledge compact-observation producer supplied explicit equalities
for the same physical tree and source. `compact-checked.json` replays **19
obligations**, including compact outputs, complete observations and future state.
The execute carrier already contains physical state, so the paired residual
producer declined and was unnecessary. Its diagnostic is retained. No backend
algorithm recognizer or envelope shortcut was added. Source preparation now
authors this explicit compact request; canonical publication adds 52 objects.

The second run used this proved compact request and five repetitions:

| Implementation | Update + sum/count, median µs | Min–max µs |
|---|---:|---:|
| Ink proved compact tree | **8.387** | 7.453–11.737 |
| Ink proved compact tree, bound | 8.140 | 6.953–9.992 |
| Ordinary Ink | 745.695 | 647.147–969.608 |
| Svelte deep derived | 1903.601 | 657.869–2270.973 |
| SvelteMap derived | 319.648 | 301.698–535.193 |
| Preact computed | 387.198 | 333.133–666.694 |
| Preact chunk64 | 99.427 | 93.057–133.481 |
| Svelte manual delta | **3.757** | 3.339–5.034 |
| Preact manual delta | **2.993** | 2.627–21.898 |

The proof-selected tree beats straightforward derived computations on this
workload. The best manual incremental controls beat Ink. Unchanged reads are
approximately 1.3–1.8 µs; raw Preact point update/read is 0.093 µs versus Ink
1.318 µs (bound 1.184 µs). Connected observed controls, write-only and burst
phases are retained too. There is no claim of a framework-wide advantage.

The earlier 5.544 µs and fresh 8.387 µs measurements use different compiler
artifacts and host conditions, so they do not establish a causal regression.
Runs have visibly different host conditions: ordinary Ink is 514 µs in the first
run and 746 µs in the second. The observation-construction loss/fix is substantial,
but comparing ratios across those runs is not an isolated causal estimate.
Default timing windows omit compilation/admission, cold setup and restore; the
raw files retain setup observations. Lifecycle selection must include these costs
for its actual objective. These results do not compare latest Frontier heads.

Artifacts, inputs, exact executed script, production Svelte module, locks and
hashes are retained here. The original date label in raw files is historical;
`executionDate` and `provenance.json` record the actual 2026-10-13 recheck.
To replay, inflate the current modules into `build/signals-state/after`, install
the exact benchmark lock, build the Svelte module, then use the focused command
in `bench/signals-state/README.md`. Recheck `compact.json` against
`examples/filtered-aggregate.ink` before emission. Existing mandatory indexed
aggregate conformance authors the same compact projection and checks native,
JavaScript, both Wasm hosts, aborts, wraparound, events and exact snapshots.
