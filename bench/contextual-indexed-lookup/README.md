# Contextual indexed membership

This development fixture tests ordinary map/filter callbacks that return records,
combine independent membership predicates, or contain another map. It includes
left and right folds, reversed equality operands and a query-dependent table that
cannot be hoisted. It is not an untouched application or a native Set replacement.

Run from the distribution root with a built compiler:

```sh
PYTHONPATH=planner:knowledge python3 bench/contextual-indexed-lookup/prepare.py \
  --compiler target/debug/ink --output build/contextual-index-experiment
python3 bench/contextual-indexed-lookup/analyse.py build/contextual-index-experiment \
  --output build/contextual-index-experiment/report.json
```

Preparation freezes the compiler, planner and knowledge authoring files in a new
output directory. Canonical objects remain shared immutable files. Ordinary
balanced planning uses the installed registry, independently for small and large
workloads. Each workload has separate record, predicate and nested-query phases;
three fresh training processes and different validation inputs feed the existing
profitability gate. The harness does not choose a producer, rewrite or candidate.

The separately checked explicit indexed variant is a counterfactual control.
Three further processes evaluate every input-size/query-count/distribution cell
for each static plan against the baseline, explicit indexed implementation and
native JavaScript Set. Timing includes index construction, result materialisation
and complete output consumption. Inputs, import and compilation are excluded.
Eight rounds balance positions and directed adjacent pairs across four variants.
Raw samples, emitted-file hashes, order schedules, output checks and every loss
are retained. Empty query batches and one-query calls expose construction costs.
A plan selected for large batches is not a promise of profitability on tiny ones.

The current producer bounds discovery and preserves query-dependent scans. The
proofs authorize equivalent results; they do not establish persistent indexes,
peak memory use, GPU execution, full-library coverage or general profitability.

Use `--seed-offset N` when registering a subsequent experiment to obtain distinct
training, rejection-only validation and evaluation inputs. The offset is recorded
before acquisition; changing it does not make this development source an unseen
program. Never use evaluation measurements to choose or repair that run's plan.
