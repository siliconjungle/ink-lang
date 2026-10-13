# Native ordered parallel work evidence

Run `cargo build --bin ink`, then `python3 bench/parallel-execution/run.py`.
The driver checks complete sequential, parallel and split/rejoined outputs
against an independently written wrapping recurrence before timing.

The final raw paired run is `results.json`; the first development measurement
is preserved in `results-initial.json` with its original source. Both request
four CPU workers. Large inputs reported 3.07–3.87x gains across these two runs.
The 64-element case uses the sequential scheduling path; its intervals include
parity. These are observations on one host and one substantial recurrence,
not a guarantee for memory-bound or lightweight callbacks.

Every timed iteration includes the same input copy and complete output
allocation/destruction. Compilation and state construction are excluded.
Nine rounds alternate execution order, with separate calibrated repetition
counts and 4,000 paired bootstrap samples. Confidence intervals measure sample
variation in each run, not variation across machines or system load. Pointer/
capacity preservation and bounded nested worker execution are checked by the
native backend unit test, not inferred from speed.
