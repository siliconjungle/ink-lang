# Keyed table transitions and future writes

Version-4 maintenance evidence connects the certificate's actual insert/replace/remove expressions to a database-defined keyed contribution-table model. The database proves both one-step correspondence and equality of every finite write history. The source bridge pins the model definitions and translates the actual candidate arithmetic before checking those equalities. The existing exact list/sum and optional journal forward/inverse proofs remain required.

This strengthens the cache proof boundary. It is not full native or transaction verification: row projection, the abstraction from native/reference maps to the contribution model, map enumeration, native arithmetic/ownership, undo scheduling, errors, events and commit control remain trusted. Arbitrary user changes have not been translated into this model.

## The model

`knowledge/table-maintenance` contains 63 immutable checked objects: the previous 39 exact-integer/journal objects and 24 new definitions/theorems. Signed integers are the existing unbounded canonical mathematical model. Keys contain two u64 words, representing all 128-bit values. Key comparison checks both words. u64/u32 source keys embed in this domain; nominal IDs already use u128 storage. String, exact-Int and other unsupported key domains retain scanning under version 4.

Contribution rows are finite keyed lists. Lookup finds the first matching key. Writing replaces/removes that match, or appends a present value when absent; absent removal leaves the table unchanged. The sum independently traverses every stored contribution. The theorem even covers duplicate keys in this mathematical model: only the first match changes, and shadowed contributions remain in the sum. Actual language tables have unique keys. The model does not establish correspondence between arbitrary duplicate lists and native tables.

The cached state contains rows and an exact total. Initialization recomputes the total. The cached step obtains the old contribution by actual lookup, writes the rows and runs the certificate's actual arithmetic. The independent reference step writes the rows and recomputes their sum. A trace records the complete contribution rows and total after every command.

The checked universal statements are:

```text
cached_step(initialise(rows), command)
    = initialise(reference_step(rows, command))

cached_trace(commands, initialise(rows))
    = reference_trace(commands, rows)
```

These quantify over arbitrary rows, signed values, numeric keys and finite command sequences, rather than a sampled length. Trace equality covers every intermediate state and tentative total within this write-only model. Commands do not yet include failed reads/writes, transaction begin/commit/abort, event emission, acknowledgements or version exhaustion.

The package supplies two version-4 certificates under one compiler: a reversible difference journal and a full snapshot journal. Both use the same keyed transition/history proofs. The native backend continues to execute the selected saved/apply/restore expressions. No new runtime optimisation algorithm is introduced by this milestone.

## Generalised induction

The old induction rule fixed every nonrecursive parameter. That was insufficient for a trace whose recursive call receives an updated state. The trusted generic checker now adds `GeneralizedInduction` and `GeneralizedHypothesis`. This is a logical rule, not a table, arithmetic or optimisation axiom. Existing proof object identities/meaning remain compatible; an old compiler rejects the new proof variant.

For induction over commands, the producer generalises the initial rows. In each cons branch, the checker supplies a hypothesis for the immediate command-tail field, universal in those rows. The proof can instantiate it with the rows produced by the current command. It cannot choose another recursive argument. Parameters and arguments are typed, hypotheses remain branch-local, every constructor is covered, and outer premises depending on the recursive/generalised variables are rejected. Boolean cases substitute captured free variables while preserving the schema's quantified parameters. Existing depth, work, parameter and hypothesis budgets bound checking.

Tests exercise a changing accumulator, ordinary-induction failure, free/bound Boolean captures, malformed parameter lists, argument arity/types, missing constructors, unavailable/escaped hypotheses and dependent fixed assumptions. The checker itself remains trusted Rust code. This extension is not a formal soundness proof of the checker.

## Source checking and rejection

The version-4 source bridge pins 18 table semantic roles, in addition to the 12 exact integer/list roles. It checks datatypes, key equality, actual lookup/write behavior, summation, the candidate's actual update function, initialized/cached/reference steps and both trace functions. The update function is reconstructed from the submitted Ink arithmetic, not selected by a theorem name. Proofs must establish the exact requested step/history equalities without external hypotheses.

Changing a function to a different, legitimate mathematical definition does not authorise changing source meaning. Rehashed false history evidence, missing roles, constant-false key equality, ignored writes, unchanged cached steps and arithmetic/model mismatch are rejected. Version 3 cannot carry table evidence, and version 4 cannot omit it. Unsupported key domains retain scanning in both reference and native planning, including bounded-cache planning. Version 1–3 certificates preserve their existing scope and identities.

The bridge still accepts a restricted maintenance schema; it does not compile arbitrary database-defined storage layouts or prove the row-local pipeline recogniser. Those remain parts of the full small-core migration in `PLAN.md`.

## Verification and performance

All **70 tests pass**. An independent first-match oracle checks 24 eight-write histories, including empty input, duplicates, high-word-distinct keys, absent removal and signed values, against both mathematical trace evaluators: 384 intermediate-state comparisons. Existing reference/native integration now runs the new certificate alongside older choices and covers large signed values, multi-table caches, repeated writes, aborts, ordered events and continued checkpoints. Those integration tests validate behavior; they do not make transaction effects part of the new theorem.

[The fresh maintained inventory comparison](../reports/table-transition-inventory-phase1/REPORT.md) has 756 samples, 18 cells, 12,030 independent native comparisons and 4,010 reference outcomes against C, C++ and Rust. Bounded Ink takes **1.77×** handwritten Rust u128 time by geometric mean and **2.55×** the fastest baseline per cell. The emitted bounded and exact runtime source is byte-identical to the previous version-3 implementation for this application. Stronger checking adds compiler work; it does not add runtime work or establish a speedup. The interactive host, differing LLVM versions/CPU targets, data structures and hand-maintained baseline protocol remain comparison limits.

The executed audit validates source/artifact/binary hashes, the complete sample matrix and summaries. It replays 108 measured native streams without rebuilding the timed binaries, reproduces both certificates under the same current compiler, checks exact emitted code/plans, compares previous version-3 runtime source, repeats native/reference validation and records fresh-process warm-filesystem certificate checking costs.

```sh
python3 dev.py test
python3 dev.py build --release
python3 knowledge/tools/table_transition_proofs.py build/table-package \
  --compiler target/release/ink
target/release/ink emit-state examples/state-benchmark.lang \
  --maintenance knowledge/table-maintenance/table.json -o build/table-program
python3 bench/state/run.py \
  --maintenance knowledge/table-maintenance/table.json \
  --output reports/table-transition-inventory-phase1 \
  --build-directory build/table-transition-inventory-bench
python3 tools/audit_table_report.py --execute
```

The original compiler at `build/table-original/lang` is an ignored local audit artifact from `d7a5d0c`; reports pin its identity. New checking requires the current generic induction extension. Future work must connect full actual table/transaction transitions, including rollback/error/event observations, before admitting runtime representations and measured adaptation. Durable recovery and the broader language/benchmark requirements remain open.
