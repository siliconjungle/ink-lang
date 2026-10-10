# Source-value integration with canonical knowledge

This integrates the reviewed value bridge over architecture base 0e7c0f5 and
knowledge eaded53, preserving the separate planner/runtime/backend repositories.
The codec is in core/src/source_values.rs; its export and existing row/column
tests use the reorganised source/research paths. The earlier 7508a4b-base evidence
in reports/source-values-phase1 is retained unchanged.

The new database snapshot is
5404c144f95f7f5a57f5ad35c8cee25cc3f58daa10d8ac08667e163bff83a1b9,
with 595 canonical entries. A clean build_store authoring run reproduces the
snapshot and executable rewrite view byte for byte. Existing 42 rewrite payloads
and name targets are unchanged. All six Store and three planner tests pass.

The new registry regression loads the 55-object incremental-view closure through
Store's canonical API and verifies it through CheckedBundle. A separate freshly
published snapshot contains a correctly rehashed false theorem: snapshot/content
checking succeeds, then mathematical verification rejects it. Authentic storage
and checked mathematics remain separate gates. Historical append proofs and
actual runtime-value tests remain in the distribution suite. Every one of the 595 canonical entries
also verifies across 36 selected dependency closures. An attempted whole-store
first-order view exceeds the existing 128-entry logic-context budget and is
rejected; the checker cap is unchanged. Large storage and bounded proof
admission are distinct scopes. all-closures.json records the individual views.

The witness checks values/order under a specialised source-row model, with
explicit unary-integer/resource limits. It does not complete action/effect or
native representation refinement. These mathematical entries do not enable a
transaction shortcut. No new timing or universal speed claim follows.

Run from the committed, pinned distribution:

```sh
python3 dev.py test --locked --offline --no-fail-fast
python3 dev.py test --locked --offline --manifest-path core/Cargo.toml
python3 dev.py test --locked --offline --test source_values --test incremental_views
(cd knowledge && python3 -m unittest discover -s tests -v)
(cd planner && python3 -m unittest discover -s tests -v)
python3 knowledge/producers/build_store.py --output build/reproduced-store
```

**186 distribution tests and 18 independent offline core tests pass.** The
24 focused tests cover the bridge, incremental proofs and existing source-row/
column checks. Exact logs and source hashes are in metadata.json. The archive on the
architecture base separately records its real native/browser GPU validation;
this milestone does not repeat or extend those execution claims.
