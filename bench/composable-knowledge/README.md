# Composable knowledge experiment

The experiment tests three distinct changes: structural discovery, packed proof
transport and data-authored composition. None of their measurements grants proof
authority or installs a profitability policy.

```sh
python3 bench/composable-knowledge/run.py \
  --real-inputs build/proof-growth-epoch3/data/nodes.json
python3 bench/composable-knowledge/physical.py
python3 bench/composable-knowledge/report.py \
  --input build/composable-knowledge \
  --output docs/evidence/composable-knowledge
```

The real inputs are the Acorn/Lodash AST projection acquired by
`bench/proof-growth/prepare-data.py`; its original provenance is retained in
`docs/evidence/proof-growth/sources.json`. Omit `--real-inputs` to run only the
designed-input cohort. Source programs were chosen for these capabilities, not
independently held out. This is a partial sequence kernel, not a parser benchmark.

`run.py` copies and freezes the compiler binary. Its first comparison forces an
older single proposal, the older complete chain, and the new imported composition.
The full older chain is the strong control: a smaller proof packet does not imply
faster emitted code. Public trusted calls charge input conversion and scalar
consumption. Cases include empty/large lists and different splits and thresholds.

Discovery growth uses 18 existing generic families and additional identity-map
variants. Those variants are labelled stress fixtures, not new optimisation
families. All 2,030 concrete Bool instances replay through the kernel in bounded
batches. Exhaustive and indexed discovery must produce exactly the same law IDs.
Seven interleaved samples include law generation and authenticated object reads.
Initial index construction is recorded separately.

Packed storage fixtures measure full authenticated dependency export and final
serialization, not a raw database lookup. Seven interleaved samples must produce
byte-identical exports. Packing is outside the export timer and its byte costs
are recorded. No canonical source files are removed.

`physical.py` compiles independent shared/packed/memo/both choices for a checked
representation. Nine interleaved native samples charge complete JSON queries and
reply consumption. Construction/insertion costs are recorded separately. Wasm
runs the same generated calls with resident state. Values, events, snapshots,
rollback, host rollback, full-word values and restore are compared across native
variants; Wasm additionally compares the complete validation trace digest.
Forged sites and incompatible exclusive tags must fail admission. These are
capability comparisons, not automatic policy selection.

The report retains raw samples, regressions and paired-sample bootstrap intervals.
Intervals describe timing variation on the fixed cells, not uncertainty about
performance on arbitrary software. No peak-memory claim is made.
