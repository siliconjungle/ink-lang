The selected evidence measures a single declared read-heavy mutable-table workload.
`receipt.json` records the compiler binary hash and the source revision used before
this producer was published. The new knowledge revision is recorded in the parent
batch receipt. `measure-summary.json` gives phase costs and explicit weights;
`*.samples.json` contains all fresh-process samples. Original request paths identify
the measured artifacts; their exact bytes are retained here under the same names.

From the distribution root, with a compiler built from the recorded source and pinned proof dependency:

```sh
PYTHONPATH=knowledge:planner build/proof-python/bin/python bench/v8-learning/parameter-cache/measure.py --output build/parameter-cache-reproduction
```

The output directory must not exist. Generation, proof checking and reference
execution precede timing. Rebuilt artifacts must exactly match the retained modules;
the new compiler binary hash is recorded separately. The runner validates complete outcomes and exact portable
snapshots before and after each paired measurement. Retained source/proof packets
are sufficient for independent replay; generated Cargo targets are not inputs.
Cold reads and writes regress. No global selection rule or asymptotic exception is
introduced by this evidence.
