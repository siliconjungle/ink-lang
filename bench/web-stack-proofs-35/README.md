# Observed mapped-zip fusion benchmarks

Four U32 recipes retain both paired input values: left mapped, right mapped,
both mapped, and a nested left mapper plus mapped right producer. Pair callbacks
are noncommutative and preserve wrapping arithmetic and nested mapper order.
The nine new direct endpoints derive from existing batch17 postmap fusion and
map identity. They give ordinary bounded search an additional useful DB shape;
no compiler/backend change, new semantic rule or forced selection is used.

The exact full prior has 2,495 objects, at snapshot
`7cf9b7ec48a8edd25b05951b8e424ea26444467fc176257aa34ac5a8e40aa644`.
Its ordinary cost search leaves all four recipes unchanged. Current has 2,508
objects. Both use the same planner, batch32 cost model and frozen compiler
SHA256 `04f42856696cbc9a4d5b0523e4a2c5d9d84ae28e0e039f0fd9c305fe2d0a5536`.
Every proposed and final application undergoes ordinary kernel checking.

There are 96 correctness frames and 24 timed cells: four recipes, sizes
32/4,096/65,536, and two joint shape/value regimes. Small words use
`ys = nx + 7`, seed 512; full-width words use `ys = nx // 3 + 1`, seed
`0x9e3779b9`; both use k=7. Shape and value factors are not independently
crossed. Both/nested are composition probes, not statistical holdouts.

Strong handwritten JS/Rust controls already fuse all mappings over the common
prefix. Owned and resident destination cohorts preserve equivalent lifetimes.
JS uses `Math.imul` for exact word multiplication. Independent staged and
indexed Python oracles agree on every complete output. Empty/unequal inputs,
zero divisors, wrapping arithmetic, nonmutation and output lifetime checks
occur outside measured intervals.

Captured JS, captured full Wasm, resident borrowed Wasm, instrumented full GPU
requests, and native resident/copied-input destinations are separate cohorts.
Web consumes length/first/last; native consumes complete vectors. Real backend
and physical counters distinguish GPU execution from fallback. Every primary
GPU route in this batch is flat, with `graph_required=false`; reduced logical
node counts do not reduce physical dispatch or transfer contracts. GPU output
capacity remains the maximum input extent, with legacy upload/result headers.
Live device-buffer bytes do not measure CPU or driver heap peaks.

Web uses two journaled warmups, doubling 8 ms / 65,536-call calibration, and
nine seeded interleaved rounds. Native uses the archived continuous integer
timer, three driver prewarm calls and full-vector consumption. Workers are
idle during serial native, Node and browser timing. Hosts/boundaries remain
separate. Nominal per-cell paired bootstrap intervals and descriptive geometric
means retain adverse cells and strong controls; no broad language ranking is
implied. See the full report for measured regressions.

## Reproduce

Use fresh output directories. Materialize the recorded prior snapshot in a
private store, copying only discovery names whose objects belong to that
snapshot. `ink_knowledge.Store(root, root / 'store/snapshots' / (pin + '.json'))`
reads that immutable catalogue after later publication; `Store.publish` can
materialize its objects and filtered names in the private store. Verify its
2,495 members and 4,242 names before staging.

Stage `reports/web-stack-proofs-35-2026-10-11/candidate-rows.json` from that
private root with the existing `knowledge/producers/publish_web_pipeline33.py`
utility, supplying the frozen compiler and a fresh stage directory. It builds
exact fair-prior/current views and checks ordinary admission. Do not use the
later canonical head as the benchmark prior.

```sh
python3 bench/web-stack-proofs-35.py prepare --prior PRIOR --knowledge CURRENT --model MODEL --report REPORT
python3 bench/web-stack-proofs-35.py node --validate-only --report REPORT
python3 bench/web-stack-proofs-35.py audit --validate-only --host node --report REPORT
python3 bench/web-stack-proofs-35.py native-prepare --report REPORT
python3 bench/web-stack-proofs-35.py serve --report REPORT --port 8864
```

Open `http://127.0.0.1:8864/browser.html` and select **Validate full outputs**.
Audit browser validation with `audit --validate-only --host browser`. Freeze
bindings only after all output checks and independent preflight pass.

```sh
python3 bench/web-stack-proofs-35.py native --report REPORT
python3 bench/web-stack-proofs-35.py native-audit --report REPORT
python3 bench/web-stack-proofs-35.py node --report REPORT
python3 bench/web-stack-proofs-35.py audit --host node --report REPORT
python3 bench/web-stack-proofs-35.py summarize --host node --report REPORT
```

With other workers idle, select **Measure nine rounds** in the browser. After
completion, run `audit --host browser` and `summarize --host browser`. The
archived `analyze.py` reproduces all 672 comparisons and 112 four-family strata
from raw results; use a copied report tree to preserve original evidence.
