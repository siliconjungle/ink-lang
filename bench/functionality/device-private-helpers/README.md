# Internal helpers and device entry points

Implementation: `ef94307f53ca564dcea42cf3c95bda884315405f`.
`source-pins.json` binds the immutable compiler, every independent package and the
complete source. Core remains unchanged at standalone package
`1c1b5c577dfec1d8aef115864e28c944f1fb87ee`; its exact current 239-file tree retains
the preceding fresh private 534-test validation. No core gate is claimed rerun here.

A packed device part now transports its selected entry and keeps ordinary typed
helper interfaces internally. The outer complete host retains the original module
interface and state lifecycle. Original function indices and any required CPU
precondition exports remain intact. Unsupported helper work is still checked;
no source, ownership or equality authority comes from interface selection.

The same complete source previously kept `value`, `evaluated`, `lazy_total` and
`readout` on CPU because their helper closures included owned Buffer interfaces.
All four now have actual GPU implementations. The flat scalar fallback executes
its complete bounded body in one shader when graph intermediates cannot be
transported, preserving lazy control. Existing successful staged graphs retain
their stages. Direct filter/scan/sort restrictions remain. Every ordered
buffer-carrying fold now checks the carried bound; unproven growth rejects instead
of risking an out-of-capacity private write. Owned record/reverse-tape storage
and general dynamic growth remain unsupported device domains.

The authored consumer allocates conditional empty/fixed buffers, partitions them
at dynamic clipped indices, maps a partition and rejoins complementary owners.
It supplies flat scalar/list/record observations, stateful updates, ordered events,
precondition/postcondition failure, rollback and restore. Raw NaNs, signed zero,
subnormals, infinities, empty inputs and extreme split indices are controls.
The ordinary bounded source reverse derivative remains a separate CPU control.

All 84 outcomes and exact snapshots match reference/native/JavaScript/Wasm and
the native GPU host. There are 74 GPU-selected calls and 98 actual dispatches;
eight empty-list calls have no work, rather than being counted as dispatches.
Browser replay adds 252 complete comparisons, three restores and five required-GPU
rejection controls, with the same 74 GPU calls. The existing default source-history
command also retains 105 comparisons, nine restores, six rejection controls and
one device call, plus the 244-coordinate resident history with ten complete reads
on each browser backend and zero iteration transfers. Existing F32/F64 source
reverse suites retain 35/69 complete outcomes, and the terminal-control fixture
retains 25. Actual device work beside CPU reverse execution does not establish
GPU reverse training.

All 22 Rust package tests, 27 GPU package tests, three runtime unit tests and 33
distribution tests pass. Runtime/Wasm all-target checks and all affected locked
fetches pass. Test cases retain required preconditions, strict unsupported helper
work, nonzero function indices, bounded partitioning and unsafe fold rejection.
The default browser CI command requires the new consumer; its existing native
test prepares the browser images, without changing workflow files.

The archive contains the clean final bundle, complete raw histories, source,
exact scripts/expected snapshots, source reverse controls and selected Wasm images.
All 275 validated assets, including every final compiled Wasm image, match the
clean CLI byte for byte; its additional `plan.json` is CLI provenance. Temporary
builds and stale unreferenced parts are excluded. `tools/build_gpu_wasm.py` follows
only current manifest parts when an output directory is reused.

Run `python3 bench/functionality/device-private-helpers/verify.py` for retained
byte integrity. To reproduce, check out the implementation with its pinned
packages, run `INK_TEST_WGPU=1 INK_TEST_WASM=1 cargo test --test gpu --test compute
--test literal_collections_package --test source_reverse`, prepare the current
source-history browser bundles using `tools/build_gpu_wasm.py`, and run the
existing default `bench/gpu/replay-source-history-browser.mjs` command with Chrome.
The source test builds the new helper fixture's browser images. Package tests and
locked fetches are the ordinary independent Cargo commands.

These are local conformance and integrity results, not a claim of fully green
remote CI, compiler correctness, a speedup or completion of the wider programme.
GPU reverse tapes, prepared-graph execution, binary64 device work, general dynamic
storage and automatic profitable placement remain open.
