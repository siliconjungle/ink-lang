# Invocation-local authoring reuse

V8 value numbering and scoped facts motivate retaining exact repeated results
within a fixed context. Ink applies that idea to untrusted proof authoring in
`producers.point_delta.normal`. It starts caching after 32 function expansions,
with at most 256 entries and 2 MB of ASCII JSON keys/results. A key binds the
function, normalized arguments and call depth. Registry and opaque/blocked/eager
modes are fixed for one invocation; the next invocation starts empty. Only
successful results enter the cache; hits allocate fresh containers. Oversized or
unsupported values follow the original path. Lazy branches and depth limits stay
unchanged. There is no proof-verdict cache or new checker authority.

Three fresh processes compare the frozen old function against the new function
with complete output hashing and unchanged inputs. Each group has nine randomly
interleaved rounds after warmup; `results.json` retains per-process medians and raw
reports retain all rounds. Repeated helper DAGs gain about 13.1× in training and
22.1× in held-out depths/seeds. These are deliberately repetitive controls. Four
captured contract terms have about 1–2% overhead; 54 captured state terms are
approximately unchanged. The initial eager-key design regressed small cases and
was replaced by the invocation-local work threshold before these retained runs.
No whole-compiler or generated-program speedup follows from this microbenchmark.

`check.py` compares all 64 old/new normal forms and independently replays six
helper-DAG theorems through ordinary Convert with existing checker limits. It also
requires rejection of a reauthenticated false result. The unit suite exercises
mode/definition separation, argument identity, lazy branches, depth failure,
cache bounds and mutable-result separation. `inputs.json` binds the original
exports; the compressed inputs retain only the necessary definitions and terms.

Reproduce from this distribution and its exact independent pins:

```sh
PYTHONPATH=knowledge:planner build/proof-python/bin/python bench/v8-learning/normalizer/check.py
PYTHONPATH=knowledge:planner build/proof-python/bin/python bench/v8-learning/normalizer/measure.py
```

`frozen-normal.py` is extracted verbatim from the baseline revision recorded in
`results.json`; helpers are unchanged. Generated theorems and temporary Stores are
reconstructed by the script and retired automatically. No duplicate knowledge
store or build target is retained. The frozen corpus diagnostic is recorded
separately and cannot establish causal compile-time or runtime gains.
