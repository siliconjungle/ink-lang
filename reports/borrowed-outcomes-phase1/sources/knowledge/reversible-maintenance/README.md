# Reversible exact maintenance

This package supplies two version-3 journal candidates for the same exact sum updates: `reversible.json` saves a difference; `snapshot.json` saves the entire previous total. Both are selected through actual save/apply/restore expressions and generic proof terms. The 39-object library contains canonical integer/list definitions and universal induction theorems; no solver or arithmetic-law catalogue is added to the compiler.

See [the checker, execution and trust boundary](../../docs/reversible-cache-journals.md), [wide-Int measurements](../../reports/reversible-cache-phase1/REPORT.md), and [C/C++/Rust inventory comparison](../../reports/reversible-inventory-phase1/REPORT.md).

Regenerate on a fresh checkout with:

```sh
python3 dev.py build --release
python3 tools/reversible_maintenance_proofs.py build/reversible-replay \
  --compiler target/release/ink --kernel target/release/ink
```

The archived milestone additionally verified the new theorem objects with the preserved original compiler; its hash and unchanged kernel source hashes are recorded in each report's `proof-extension.json`. The new source bridge is required to check journal composition. Exact BigInt caches use the selected journal; bounded u128 caches retain snapshots.
