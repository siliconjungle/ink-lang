# Arithmetic proofs

This package contains one list datatype, nine arithmetic/Boolean theorems and eight whole-function implementation proposals. The conditional theorem `given_equal` states `x - y = 0` under `x = y`; it is deliberately absent from the unconditional proposal list.

The files are immutable, content-addressed first-order library objects. The compiler reconstructs each theorem's Boolean circuit from fixed wrapping-u64 semantics and checks its hinted RUP refutation. Neither the solver nor these identities are compiled into the language core.

```sh
python3 dev.py build --release --bin ink
target/release/ink verify-library knowledge/bitvector/lock.json
target/release/ink build knowledge/bitvector/kernels.ink --implementation knowledge/bitvector/proposal.json --native-cpu -o build/arithmetic.o
```

No solver is required to import or check this installed package. Producing new certificates is a separate, untrusted operation:

```sh
python3 -m venv build/bitproof-venv
build/bitproof-venv/bin/python -m pip install python-sat==1.9.dev5
build/bitproof-venv/bin/python tools/bitvector_proofs.py build/my-arithmetic --compiler target/release/ink
```

Proof search has time and conflict budgets. Failure leaves no accepted transformation. `production.json` records the original producer's measurements and compiler identity; these are provenance, not proof authority. The benchmark checks the installed objects with its own recorded compiler. The Rust checker and semantic encoder remain trusted implementations; their correctness has not been mechanically proved.
