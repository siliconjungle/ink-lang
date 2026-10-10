# Relocatable installation and checked inspection

Source revision: `5e6564224926e3f12a1d96cd194e679686bf849a`.

The distribution installs a fresh, complete prefix containing a compiler and
committed pinned planner/knowledge resources. No core, runtime or backend code
or pins changed. Explicit producer paths and independent Python/database paths
continue to work. Frozen selection checking needs neither package nor Python.

`ink doctor` reports version/file availability without claiming target/device
validation. `ink explain` checks source and optional evidence before reporting
signatures, effects, eligible/unavailable regions, applications/dependencies,
checkpoint identity and remaining trusted implementations. Neither inspection
command executes application actions or grants new proof authority.

## Validation

- 23 focused installation, semantic optimisation and maintained-view tests pass.
- 7 enabled action/selected-checkpoint tests pass across C, Rust, JavaScript and
  both Wasm paths, including exact checkpoint restoration and durable continuation.
  The action fixture's GPU route uses the CPU host; the selected fixture executes
  one eligible map through actual wgpu.
- All-target Cargo check passes without warnings.
- Real `cargo install --locked` succeeds. The final release prefix moves outside
  the repository, resolves only its installed resources and checks an add-zero
  selection from the pinned store. All 832 packaged asset hashes match.
- The relocation scenario exercises embedded standard modules, installed default
  search and required view proofs, separate producer/database directories, an
  incomplete bundle, unavailable Python, refusal to overwrite an installation,
  offline frozen replay with empty PATH and removed producer/database, and
  rejection of a corrupted selection before any inspection result is printed.

Raw logs and JSON observations accompany this report. Counts overlap and this is
functional validation, not a performance result. The installer needs Git and
Rust/Cargo to build from a recursive source checkout; `--binary` packages an
already-built compiler. Target toolchains, generated-project dependency downloads
and devices remain separate requirements. Fresh prefixes are the upgrade path.
Interactive source debugging, numerical state/action consistency, whole-action
logical/native correspondence and general physical replacement remain open.
