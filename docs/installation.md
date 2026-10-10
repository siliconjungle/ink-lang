# Installation and inspection

Build the distribution from a recursive clone. Rust/Cargo and Git are needed to
build it; the optional planner and proof producer use Python 3.10 or newer.

```sh
git clone --recurse-submodules https://github.com/siliconjungle/ink-lang.git
cd ink-lang
python3 tools/install.py --prefix "$HOME/.local/ink-0.1"
export PATH="$HOME/.local/ink-0.1/bin:$PATH"
ink --version
ink doctor
```

The installer builds the CLI with `cargo install --locked` and packages committed
bytes from the pinned planner and knowledge checkouts, including the canonical
store and general-law producer. `--cargo PATH` selects Cargo. `--binary PATH`
packages an already-built compiler instead. The installation contains `bin/ink`
and `share/ink`; move the complete directory to relocate it. It uses a fresh,
dedicated prefix and publishes it only after assembly succeeds. To upgrade,
install into another fresh prefix, validate it, then switch PATH. Existing
installations are not overwritten. Remove the dedicated prefix to uninstall.

`share/ink/distribution.json` records package revisions, file hashes, binary hash
and whether the source checkout had local edits. These describe packaging, not
proof validity. Generated native/Wasm projects still use their separately pinned
primitive/runtime dependencies and target toolchains; those are not vendored by
this installer. GPU availability depends on the application's host and device.

## Optional tools and independent packages

`cargo install --path . --locked --bin ink` remains sufficient for a bare CLI.
Its standard modules are embedded. Reference execution, literal emission and
frozen selection replay do not need an installed planner or knowledge store.

Optional tools resolve in this order:

1. An explicit `--search-tool PATH` or `--view-tool PATH`.
2. `INK_DISTRIBUTION`, pointing to a directory with `planner/` and `knowledge/`.
3. `share/ink` beside the installed `bin` directory.
4. The original compiler checkout, for development when no bundle exists.

An explicitly chosen or installed bundle with missing resources produces a
diagnostic; it does not silently mix resources from the original checkout.
`--python PATH` chooses the interpreter for search and view proofs.

The planner and database can also live separately:

```sh
INK_KNOWLEDGE_ROOT=/path/to/knowledge-python-package \
ink build program.ink --target javascript -o program.mjs \
  --search-tool /path/to/planner/plan.py \
  --python /path/to/python3 \
  --optimise /path/to/database/store/snapshot.json
```

`INK_KNOWLEDGE_ROOT` locates the Python package directory containing
`ink_knowledge/`; the `--optimise` path selects the canonical database independently.
Installed Python packages can instead supply that import. SQLite is a disposable
local index, rebuilt when absent; a cache for another snapshot must be rebuilt
explicitly. The planner proposes bounded evidence and the compiler checks it.
Paths and packaging hashes confer no admission authority.

## Inspect a program and its checked plan

```sh
ink modules program.ink
ink explain program.ink
ink explain program.ink --selection selection.json
ink explain program.ink --optimise knowledge/store/snapshot.json
```

`modules` reports source dependencies and content identities. `explain` reports
input/selected core identities, signatures and effects, eligible and unavailable
expression regions, checked law applications and proof dependencies, and logical
checkpoint identity. It validates a selection before printing it. The source
form and `--core` form use the same checks. Search is optional; replay needs no
Python, planner, current database or network.

`doctor` reports tool versions, resource locations and missing dependencies as
JSON. It is an inspection command, so missing optional tools do not fail it.
It does not compile a target, probe a GPU or establish proof conditions.

For deeper inspection, `emit-core`, `emit-actions`, `emit-effects` and
`emit-semantic` export checked representations; build plans retain selection
packages for offline replay. These are inspectable debugging surfaces. Source
breakpoints and an interactive step debugger are not implemented. The compiler,
source/primitive correspondence, target emission and host adapters remain trusted.
