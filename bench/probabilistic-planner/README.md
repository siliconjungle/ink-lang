# Reproduce probabilistic planner experiments

Run from the distribution checkout with all pinned submodules available. Build
the ordinary `target/debug/ink` first and supply a compatible Zig 0.15.2 path.

```sh
export PYTHONPATH="$PWD/planner:$PWD/knowledge"
python3 bench/probabilistic-planner/prepare.py --zig /absolute/path/to/zig
python3 -m ink_planner.semantic_search --compiler target/debug/ink \
  --core build/probabilistic-planner/core.json \
  --snapshot build/probabilistic-planner/knowledge/store/snapshot.json \
  --knowledge-root build/probabilistic-planner/knowledge --budget 64 \
  --search-strategy stochastic --search-seed 173 --search-restarts 4 \
  --search-trace build/probabilistic-planner/train-trace.json \
  -o build/probabilistic-planner/search.json
python3 -m ink_planner.search_policy \
  --rows build/probabilistic-planner/train-trace.json \
  --knowledge-root build/probabilistic-planner/knowledge \
  -o build/probabilistic-planner/search-model.json
python3 -m venv build/probabilistic-planner/ann-env
build/probabilistic-planner/ann-env/bin/pip install hnswlib==0.8.0 numpy==2.4.4
build/probabilistic-planner/ann-env/bin/python bench/probabilistic-planner/measure.py
build/probabilistic-planner/ann-env/bin/python bench/probabilistic-planner/neighbourhood.py
build/probabilistic-planner/ann-env/bin/python bench/probabilistic-planner/neighbourhood.py --large
npm --prefix bench/probabilistic-planner ci
npm --prefix bench/probabilistic-planner run bench
python3 bench/probabilistic-planner/tune.py
python3 bench/probabilistic-planner/adaptive.py
python3 tests/probabilistic_planner_integration.py
python3 -m unittest discover -s planner/tests -v
python3 -m unittest discover -s knowledge/tests -p test_discovery_accelerator.py -v
python3 bench/probabilistic-planner/report.py
```

Run measured commands serially, without simultaneous tests. The browser defaults
to the installed macOS Chrome; `CHROME=/absolute/path` overrides it. Actual hardware
WebGPU is required: nonempty GPU samples need dispatch/readback receipts and no
fallback. All words are checked against independent plain JavaScript; corner and
owned-result histories are exercised. Small deployed calls are batched to avoid
zero-duration timer samples. First use creates fresh engines in the same page;
module/browser/driver caches are shared, so it is not cold-machine evidence.

`INK_PLANNER_BACKEND=javascript npm --prefix bench/probabilistic-planner run serve`
starts the optional loopback bridge and prints its endpoint. Supply that endpoint
to `ink-plan --search-strategy stochastic --selfhost-endpoint URL` or
`ink-synthesize --selfhost-endpoint URL`. Production default routing retains CPU
without a comparable saved profile. The bridge accepts bounded data, never commands.

The tuning example uses rounds 0..3 for exploration and 4..6 as independent holdout
inputs. It charges an explicitly labelled first-use estimate from measured 65536-row
fresh-engine runs to all sizes and retains failed gates. No profile is installed.
HNSW scaling uses synthetic vectors, separately labelled from the actual 18-law
Ink planning fixture; retrieval recall is measured against exhaustive exact top-k.
The large probe sweeps query effort at 100000 vectors. Adaptive search builds a
saved profile from disjoint child-planner training/holdout rounds and measures
fourteen complete wrapper calls. A failed gate retains ordinary search.
