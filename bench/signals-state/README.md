# Svelte, Preact Signals and Ink state comparison

From a recursive distribution checkout:

```sh
cd bench/signals-state
npm ci
npm run prepare:frozen
npm run build
npm run bench
npm run report
```

`prepare:frozen` inflates the exact measured before/current modules retained in
`reports/signals-state-2026-10-12/modules`. To rebuild from source instead, use
`npm run prepare:source` (Rust, Python 3.12+, and the baseline Git object in the
JavaScript submodule are needed). The baseline compiler uses the pinned upstream
JavaScript backend with the same current checked core, source and representation
request. Compiler/setup/admission time is outside the timed loops. Rebuilding after
source changes measures those new artifacts, not the retained result.

The production Svelte module and exact npm lock are used for both replay modes.
Run under Node with the browser export condition, as the scripts specify. `npm test`
is a two-round, 256-row correctness/smoke run; it is not a performance result.
The full run has seven alternating repetitions at 256, 4096 and 16384 rows and
retains every raw sample, ranges, setup observation and source hash.

An aggregate unit means one write plus both sum/count reads, a 32-write burst plus
both reads, or two unchanged reads. Point units are one update plus one point read.
Aggregate boundaries share `await`; point calls are synchronous. Separate observed
controls include connected reactive consumers. No DOM rendering is measured.
Reactive controls do not provide Ink's complete transaction/event contract.
`resultOnly` bound lanes avoid public envelopes but retain versions and events.
The report includes manual-delta and chunked signal controls and losses; a full
scan is not treated as the only implementation signals can express.
