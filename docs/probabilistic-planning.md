# Probabilistic search with exact admission

Ink has opt-in seeded stochastic proposal ranking, shared-budget restarts,
independent CPU search processes, bounded word superoptimization, offline Bayesian
autotuning, exact-result database accelerators and HNSW neighbourhood hints.
The optional learned search ranking model, its training command and model flag
have been removed: the saved complete-planning comparison took 1280.74 ms versus
471.97 ms for deterministic search, with the same selected structural cost.
Deterministic search remains the default; archived measurements retain their
original revisions.

Compiled Ink kernels execute pure word scoring and candidate evaluation on CPU
or GPU through an optional loopback bridge. Python still coordinates the planner;
proof replay remains in the independent core.

`ink-plan-adaptive` selects a search approach using saved complete-call evidence
for observed catalogue-size/source-complexity/budget cohorts. Exact source and
snapshot pins, target, compiler, Python and planner/producer code/data must match.
It requires independent heldout gains without losing checked structural quality.
There is no unsupported extrapolation or online trial; unfamiliar cases use
ordinary search. The wrapper currently adds measurable overhead and is opt-in.

Randomness, similarity, Bloom filters, hashes and test vectors
never establish equivalence. Samples and counterexamples only reject proposals.
Each selected transformation requires an ordinary source-bound proof, checked
against the original module. Failed search and device work retain checked CPU
execution. Saved observations/models live outside mathematical discovery.

HNSW is useful for retrieving promising laws or prior optimization recipes from
a large catalogue. It trades recall for work through graph neighbourhood search.
The current path uses a deterministic structural sketch, not external semantic
embeddings. It orders proposals while preserving the complete typed candidate set.
A finite checker budget can still change which valid result is found; restarts
retain an ordinary lane. The current small catalogue does not benefit.

The self-hosted evaluator supports bounded one-register u32 straight-line
candidates with 256 padded instructions. The independent sample evaluator checks
its values, and the core's universal word-ring normalization admits replacements.
It does not prove arbitrary floating-point programs, full state machines or all
backend implementations. More irregular search remains on CPU.

Offline tuning explores already eligible configurations using complete owned-result
observations. Explicit setup and expected lifecycle call counts enter the objective.
An alternative needs correctness without fallback and at least 10% improvement on
every independent warm and setup-charged holdout. The experiment replays frozen
measurements; it does not install profiles, change automatic routing or introduce
online profitability probes. Missing comparable evidence retains the baseline.

Measured results and reproduction: [report](../reports/probabilistic-planner-2026-10-12/README.md),
[benchmark commands](../bench/probabilistic-planner/README.md).
The larger CPU/GPU comparisons against Svelte and Preact remain in the separate
[GPU report](../reports/gpu-signals-2026-10-12/README.md); the new planner experiments
do not demonstrate complete self-hosted planning superiority over either framework.

Research adaptations: [STOKE](https://github.com/StanfordPL/stoke) motivates
stochastic proposal search and separate exact checking;
[MLOS](https://github.com/microsoft/MLOS) motivates offline tuning;
[PGM](https://pgm.di.unipi.it/) motivates position predictions with bounded exact
search; [HNSW paper](https://arxiv.org/abs/1603.09320) and
[hnswlib parameters](https://github.com/nmslib/hnswlib/blob/master/ALGO_PARAMS.md)
explain hierarchical graph retrieval and its recall/build/memory tradeoffs.
These adaptations import no external proof authority.
