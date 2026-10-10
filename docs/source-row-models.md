# Source rows, keys and contributions in the proof database

The compiler can now lower actual source row types and row-local contribution expressions into the existing first-order proof language. An external producer uses those definitions to prove complete-row/cache rollback for arbitrary finite write histories. The contribution is computed from the source row, rather than supplied as an independent mathematical field.

This is a source value/projection bridge. It does not yet admit a native representation or prove that arbitrary user changes execute the abstract journal protocol.

## Source definitions and bindings

`model-row SOURCE KEEP --maintenance CERTIFICATE -o MODEL.json` checks the source and version-4 certificate, then emits immutable datatype/function objects. Their meanings come from source types, declared record fields, the row pipeline and the key type. No optimisation law or proof-production tactic is added to the compiler. The generic proof kernel and native lowering are unchanged.

The value lowering handles nested records, exact Int, Bool, String, Unit, lists, Option, Result, nullary enums, numeric values and nominal 128-bit IDs. Records use declaration-order fields. Strings have a mathematical UTF-8 byte-list representation. Source u32 values embed in u64; u32 arithmetic is rejected because its modular width requires separate modelling. Numeric keys become `(0, key)` and nominal IDs preserve both high/low words. Datatype identity, source AST identity, key/row types, projection definitions and the maintenance identity are retained in the description.

The current row-expression lowering handles field access, constants, Boolean/u64 primitives and exact Int `+`/`-`. It follows actual map/filter stages and uses a nested conditional to return zero for filtered rows. Count contributes one for an included row. Symbolic unsigned-to-Int casts, exact multiplication/comparison, arbitrary source calls and recursive source value types remain unsupported. Existing native compilation continues to work for its supported programs; this new proof-export command fails closed for unsupported correspondence.

`verify-row-model SOURCE MODEL.json --maintenance CERTIFICATE` reconstructs the expected source definitions and checks exact descriptions, immutable objects and a locally checked extended library. A bound library may additionally identify a wrapper datatype and contribution adapter. These must store the complete actual row and call its source-derived projection. A mathematically valid constant contribution function cannot replace that adapter merely by changing hashes or metadata.

`source-model.json` contains the source definitions. The external producer adds an undo model with `StoredRow(RowPayload)` and a projection adapter, then writes `binding.json` containing the extended library and those two checked adapter identities. Its journal expressions still come from the actual saved/apply/restore expressions in the certificate. The supporting lookup, cache-inverse, observation and finite-history proofs are supplied by database objects.

## Two distinct source schemas

`examples/source-row-undo.ink` has a nine-field record with a nested Detail, strings, lists, Option, Result, an enum, a nominal ID and u32 data. Its contribution filters on a nested Boolean and adds two exact Int fields. It uses u64 table keys.

`examples/source-row-ledger.ink` stores two nested Line records, an optional memo and an enabled flag. Its contribution subtracts prior amount from current amount. Its nominal account keys occupy the full 128-bit domain, including keys that share their low word.

Both schemas have snapshot and reversible journal packages. The first contains 105 objects: 63 existing foundation objects, 10 source definitions and 32 undo definitions/theorems. The second contains 102: 63 foundation objects, seven source definitions and 32 undo objects. All four are produced with one compiler identity and also checked by the preserved preceding generic kernel. The packages share many immutable identities; their counts are per closure, not four disjoint sets.

The compiler does not recognise either example name. The same lowering walks their types and expressions; the external producer instantiates its proof construction with their actual row sort and projection.

## Validation and performance

All 83 tests pass. Source-model tests compare both journal choices with the independent reference interpreter. They cover 24 composite-row prefixes and 16 ledger rows, checking source projections, cached totals, complete row lookup, rollback and high/low key preservation. Different payloads can have the same contribution. A rehashed valid but unrelated projection, a wrong wrapper adapter, changed source fields/projections, changed maintenance identity and missing objects are rejected. Count is exercised independently; unsupported casts, u32 arithmetic and recursive types fail closed.

Six new native fixtures run 48 actions each across both journals and tree/row/column layouts: 288 results match the reference. Seventy-two aborted invocations preserve logical checkpoint bytes. Every invocation restores its checkpoint before continuation; six final snapshots match the independent reference bytes. The earlier whole-row abort/promotion and other protocol tests also remain in the complete suite. These native checks are regression evidence, not universal native refinement.

The [recorded audit](../reports/source-row-undo-phase1/REPORT.md) reproduces all four packages byte-for-byte, validates bindings against current source, and checks their full mathematical libraries with the original checker. It also regenerates the five lifecycle benchmark bodies and plans exactly. Runtime implementations and all 44 recorded lifecycle timed/probe artifact hashes are unchanged, so no new timing run or performance gain is claimed. The latest C/C++/Rust measurements remain the lifecycle report.

## Remaining correspondence

The new lowering is trusted compiler code; it has not itself been mechanically proved correct. The mathematical type domains deliberately include some values outside valid source embeddings, such as non-byte u64 string elements. The undo theorem holds on this wider domain, but this does not prove the native String/Int codec or its injection.

The bound wrapper and projection do not establish that the package's entire protocol implements source actions. A valid extra function or theorem is not transformation authority. The [bounded runtime value/table bridge](source-value-correspondence.md) now checks canonical source embeddings and key order. Its implementation remains trusted, and the unary integer model is resource-limited. Native map lookup/update abstraction, runtime enumeration, projection-to-list sums, action/control-flow lowering, errors, poison state, tentative queries, event order/publication, commit exhaustion, migration and durability still need correspondence. The native code generation path does not consume these standalone bindings to select new transformations.

Next connect shared map/protocol operations to actual source changes and native storage, including success and failure observations, then admit safe representation replacements and measured selection. The full language, small-core migration, ownership/arenas, compact links, inline variable-size data and performance acceptance criteria remain open in PLAN.md.

## Reproduction

```sh
python3 dev.py build --release --bin lang
python3 dev.py test
target/release/lang model-row examples/source-row-undo.ink total \
    --maintenance knowledge/table-maintenance/table.json -o build/source-row.json
target/release/lang verify-row-model examples/source-row-undo.ink \
    knowledge/source-row-undo/reversible/binding.json \
    --maintenance knowledge/table-maintenance/table.json
python3 tools/audit_source_rows.py --compiler target/release/lang \
    --kernel build/table-undo-original/lang --reproduce \
    --python ../../work/toolchain/bitproof-venv/bin/python
```

Proof production needs Python with `python-sat`; the recorded environment uses 1.9.dev5. The preserved compiler paths are local artifacts, not distributed binaries. A newly built compatible checker can be passed as both `--compiler` and `--kernel`; that validates the packages but does not repeat the independent original-binary check recorded here.
