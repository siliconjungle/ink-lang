# Modules and a small standard library

The Ink distribution resolves explicit source imports before semantic checking:

```ink
module shop;
import "stock.ink" as stock;
import "std:words" as words;

change put(id: stock.ItemId, n: u32)
    -> Result<Unit, stock.Error>
    writes(stock.Items) emits(stock.changed)
{
    return stock.put(id, stock.Item { stock: words.clamp32(n, 0, 100) });
}
```

Paths are relative to the importing file. `std:words` and `std:lists` are embedded,
versioned source modules shipped with the compiler. No network resolution or
implicit catalogue update occurs. Every top-level declaration is accessible
through the import namespace, including types, functions, queries, changes,
state roots, keeps and events. The root module's names remain its public host
entry points; imported implementation names are linked internally. There are
no private declarations, package manager, dynamic imports or import cycles yet.

Qualified types, record constructors and effects use the same namespace syntax
as function calls. Record fields and locally shadowed values retain their own
names. Import aliases cannot be shadowed by parameters, locals, lambdas or
module declarations. Duplicate module identities in separate files, missing
exports and cycles have explicit diagnostics. Parser errors include source
file, original line and column, even after namespace expansion. Module loading
is bounded to 64 files, 1 MB per file and 4 MB total source.

Run `ink modules SOURCE` to inspect the resolved dependency graph and content identities. The loader records each dependency's declared module, resolved path and SHA-256.
It links ordinary existing IR and then runs the same type/effect/dependency
checks and core admission. It adds no types, proof rules or optimisation catalogue.
Imported declarations use bounded deterministic names derived from their declared
module and declaration identities. Alias changes and relocating identical module files do not
change the linked program identity; changing a module declaration can change
persistent type/state identities. Schema evolution is outside the current scope.

`stdlib/words.ink` contains min/max for u32/u64 and u32 clamp. Clamp evaluates
`min(max(value, low), high)`; callers should supply `low <= high` when that is
their intended interval. `stdlib/lists.ink` contains sum, integer prefix scan,
sorting for u32/u64 and count for u32 lists. Arithmetic follows Ink's wrapping
word semantics. These are ordinary checked source functions, not trusted
optimisations or an algorithm catalogue. More library modules can use the same
import mechanism.

Run the example with `ink build examples/modules/main.ink -o build/shop` or
choose `--target javascript`, `rust`, `wasm32` or `webgpu`. Imported flat pure
closures remain eligible for GPU execution; imported actions execute on the
host. `tests/modules.rs` checks scope, namespace errors, imported types/state/
events and complete backend parity, including Wasm/wgpu when enabled.

## Install

After a recursive clone, `python3 tools/install.py --prefix DIRECTORY` installs a
relocatable CLI and its optional pinned planner/knowledge tool bundle. A bare
`cargo install --path . --locked --bin ink` includes the embedded standard helpers.
Use `ink doctor` for tool locations and `ink explain SOURCE` to inspect checked
types, effects, selections and checkpoint identity. Native/Wasm/GPU builds still
require their target toolchains. See [installation and inspection](installation.md)
for independent package paths, offline replay and the remaining debugging scope.
