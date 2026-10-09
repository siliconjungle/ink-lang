# Delta-first exact maintenance

This package extends the 35-object exact integer/sum library with two universal theorems. `subtraction_as_addition` unfolds the exact subtraction meaning by datatype cases; `addition_delta_first` uses previously checked associativity and commutativity. The unchanged generic kernel checks all 37 immutable objects. There is no new integer axiom, polynomial procedure or optimiser law in the compiler.

```ink
fn insert(total: Int, new: Int) -> Int { return total + new; }
fn replace(total: Int, old: Int, new: Int) -> Int {
    return total + (new - old);
}
fn remove(total: Int, old: Int) -> Int { return total - old; }
```

The application proof combines the new equality with the existing arbitrary-position sum replacement theorem. It authorises this exact source expression for arbitrary signed integers, not just measured values or nonnegative totals. Reversed subtraction, a canonical proof substituted for the delta proof, and removal of the new theorem fail even after recomputing certificate identities.

```sh
python3 tools/delta_maintenance_proofs.py build/delta-maintenance-replay
target/release/ink verify-maintenance knowledge/delta-maintenance/delta.json
target/release/ink emit-state examples/inventory.lang --maintenance knowledge/delta-maintenance/delta.json -o build/delta-inventory
python3 dev.py test --test database_maintenance
```

The producer first extended the database under the original compiler, before the separate operand-borrowing improvement. `reports/cache-lowering-phase1/proof-extension.json` and executed replay bind that compiler identity to all original source hashes and the new certificate. It then selected a new actual implementation without rebuilding the compiler. Unary proof integers do not replace runtime BigInt.

Equality does not prove speed. [Inventory measurements](../../reports/cache-lowering-phase1/REPORT.md) show little effect from the new order. In the [wide signed-Int experiment](../../reports/wide-cache-phase1/REPORT.md), delta-first helps when a small row changes beside a large aggregate but is slightly worse when the changing row is also wide. Both alternatives remain available; automatic measured selection is unfinished. The bridge still supports only `+`, `-` and small proof literals, and the table/cache/transaction and representation protocols still require general database refinement evidence.
