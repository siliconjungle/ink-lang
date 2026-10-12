# Broad pipeline and boundary ablations

Use a verified published `lodash@4.17.21` package. Its npm SHA-512 integrity is
recorded in `docs/evidence/broad-performance/protocol.json`. The benchmark takes
the package's `lodash.js` path and checks its version. It does not download
code or dependencies implicitly.

```sh
cargo build --offline --bin ink
python3 bench/broad-pipelines/run.py --lodash /path/to/lodash.js
python3 bench/broad-pipelines/run.py --lodash /path/to/lodash.js \
  --before-bundle /path/to/saved/before-js --output build/broad-pipelines/matched
```

The before bundle contains baseline and selected `.mjs` artifacts generated from
this same source before the JS conversion changes. Exact hashes from the recorded
run are in the protocol. Both laws and conversion machinery are independent axes.
`run.py` checks and replays the concrete laws before emission. This explicit
selection measures capability; it is not a deployment policy.

For automatic offline selection and separate data evaluation:

```sh
python3 bench/broad-pipelines/automatic.py --lodash /path/to/lodash.js
```

The script creates the source, isolated template catalogue and exact selection
workload, runs the ordinary planner including offline acquisition, and evaluates
other sizes/distributions against a literal-loop oracle and Lodash. Evaluation
inputs are not fed back into selection. Complete compilation time is recorded
separately from runtime. The committed receipt records actual observations and
the selected proof steps.

The timing boundary includes generated input/output conversion, the complete
trusted call and full result consumption. No row identity, input immutability,
ordered float semantics or whole-output work is omitted from validation. The
Lodash comparison is its actual filter/map/reduceRight chain in a positive-word
sum domain where its Number arithmetic and Ink's u32 arithmetic agree. Other
cases are general kernels, not full package/application ports.

There are 11 shuffled timing rounds, three sizes and three predicate selectivities.
Memory observations after batches are diagnostic; they are not exact live peaks,
allocation counts, or proof of memory savings. Paired bootstrap intervals in
`report.py` describe these captured rounds on one machine, not every future run.
The count/map and length/map rewrites can change linear work into constant work;
very large ratios there are not an application-wide result.

Read [the research report](../../docs/broad-performance-research.md) for
catalogue inventory, source/target limits, regression cases and future experiments.
