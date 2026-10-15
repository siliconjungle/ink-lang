Native control for the checked repeated-fold sharing law. Read `summary.json` and `receipt.json` together: aggregate medians improve about 7%, but process-level variability prevents a robust gain claim. This uses the generated JSON-call boundary, including typed input conversion; JavaScript used its trusted-value boundary, so absolute timings are not comparable. Full results and unchanged snapshots are checked against independently prepared source outcomes before and after timing.

Reproduce from the distribution root with the pinned compiler/planner and proof environment:

```sh
PYTHONPATH=knowledge:planner build/proof-python/bin/python bench/v8-learning/native-sharing/run.py --output build/native-sharing-reproduction
```

The output directory must not exist. Cargo uses the local reuse entry point. Exact emitted Rust/helper sources, adapter, dependency lock and samples are retained; Cargo targets are disposable.
