# Offline comparisons

From the distribution checkout, compile then observe the ordinary knowledge library
alternatives with construction included:

```
ink emit-core bench/composable-state/libraries.ink -o build/composable-library-core.json
ink build bench/composable-state/libraries.ink --target javascript -o build/composable-libraries.mjs
node bench/composable-state/libraries.mjs build/composable-libraries.mjs build/library-observations.json target/debug/ink build/composable-library-core.json
```

For state traces, derive `examples/composable-filtered-state.ink`, produce a direct
and a maintained `total_query` request, and check both before emitting JavaScript:

```
ink emit-action-model examples/composable-filtered-state.ink -o build/aggregate-model.json
python3 knowledge/producers/representations.py build/aggregate-model.json --cache-query total_query --preserve-cache --aggregate-query -o build/aggregate-proposal.json
```

Extract `requests[0]` and `requests[1]` to direct/cache request files, then use
`ink emit-representation SOURCE REQUEST --target javascript -o FILE.mjs` for each.
Compile ordinary source with `ink build SOURCE --target javascript -o ordinary.mjs`.
Run:

```
node bench/composable-state/state.mjs ordinary.mjs direct.mjs cached.mjs build/state-observations.json target/debug/ink examples/composable-filtered-state.ink
```

The script checks full invocation envelopes, aborted writes and byte-identical
portable state, records restore separately, and alternates sample order. Compilation,
proof checking and initial construction are outside steady-state measurements;
join-library index construction remains inside its measured call. No allocation-byte
or universal speedup claim is made. These raw observations do not enable automatic
selection without fitting and comparable lifecycle evidence through the existing
planner gates. Repeated source execution in composed writes must also be priced.

Re-author current replay fixtures without changing historical source bindings:

```
python3 bench/composable-state/prepare-fixtures.py --compiler target/debug/ink
```

Every request and migration is checked before the admission receipt is written.
The new fixtures live under `knowledge/research/composable-state`; earlier requests
keep their original bytes. Migration uses an identity function when the endpoints
have the same physical sort and relations, and otherwise proposes decode/encode
with a checked preservation proof.

Replay the published immutable admissions with a rebuilt compiler:

```
python3 bench/composable-state/replay-admissions.py --compiler target/debug/ink --mathematics-source source-group examples/grouped-state.ink
```

This checks every published candidate and mathematical root again. It preserves
the earlier receipts and source pins, and records the new compiler artifact hash.
