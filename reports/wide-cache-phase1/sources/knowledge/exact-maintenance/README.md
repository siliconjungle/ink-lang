# Database-backed exact maintenance

These packages connect the [exact integer/sum library](../exact-integers/README.md) to actual Ink update expressions. The compiler checks the raw immutable library, twelve exact semantic definitions, and three universal proofs about the translated source expressions. Version 2 uses the generic induction kernel; it does not invoke the legacy polynomial normaliser.

```sh
python3 dev.py build --release --bin ink
python3 tools/maintenance_proofs.py build/exact-maintenance-replay
target/release/ink verify-maintenance knowledge/exact-maintenance/canonical.json
target/release/ink execute examples/inventory.lang examples/inventory-script.json --maintenance knowledge/exact-maintenance/canonical.json
target/release/ink emit-state examples/inventory.lang --maintenance knowledge/exact-maintenance/commuted.json -o build/database-inventory
python3 dev.py test --test database_maintenance
```

The external producer supplies two choices under the same compiler:

```ink
// canonical
fn insert(total: Int, new: Int) -> Int { return total + new; }
fn replace(total: Int, old: Int, new: Int) -> Int { return total - old + new; }
fn remove(total: Int, old: Int) -> Int { return total - old; }

// commuted: the database proves these exact expressions too
fn insert(total: Int, new: Int) -> Int { return new + total; }
fn replace(total: Int, old: Int, new: Int) -> Int { return new + (total - old); }
```

The certificate binds its source expressions, semantic version, model identities, raw library bytes and application proofs. The portable bundle preserves content hashes and direct-import restrictions. Every contained object belongs to the checked closure; missing, altered, oversized or unreferenced objects fail. A true theorem about a different expression cannot authorise a changed source update. There is no implicit fallback from a failed version-2 proof to version-1 authority.

The proofs quantify over arbitrary finite prefixes/suffixes and exact signed old/new values. Runtime execution uses BigInt, including values well beyond machine widths. Unary constructors are used only for proof semantics. This initial expression bridge accepts `+`, `-` and literal values up to 32; larger constants and multiplication still require the legacy version-1 path. The restriction is a proof-encoding limit, not an Int runtime limit or completion of the full language.

The core still recognises row-local sum/count pipelines and executes a built-in cache/transaction protocol. Its table-to-list projection, handling of filtered-out rows as zero contributions, rollback, events, range analysis and backend lowering remain trusted. Tests cover them, but these packages do not provide complete transaction/representation simulation proofs. The Rust kernel and semantic bridge are also trusted implementations, not mechanically verified code. The overall small-core migration remains open.

The [native report](../../reports/database-maintenance-phase1/REPORT.md) benchmarks the canonical version-2 implementation against maintained C/C++/Rust baselines. Canonical version 1 and version 2 produce byte-identical runtime source; changing the checking authority alone has no speed benefit.
