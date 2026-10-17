# Device entry points and internal helpers

Mixed-module device parts expose one checked function through the packed host
ABI. Its typed helpers stay in the complete pure program and use their ordinary
source interfaces. A helper returning an owned buffer no longer forces its flat
caller to CPU merely because the helper has no public packed layout. The outer
complete host still supplies every original function, action, event and snapshot.
This is transport selection, without erasing work or changing source admission.

Rust's `packed::lower_entry` validates only the entry transport and any required
precondition callback exports. It retains original function indices and the full
typed source emitter. GPU's `compute::lower_entry` likewise exposes only the chosen
entry while checking all executed helpers. The module assembler checks device
capability before producing a part, so CPU-only functions need no unused device
CPU image. Unsupported root transport, binary64 work, owners or other operations
retain the complete host fallback. Source preconditions remain checked; neither
interface selection nor an internal helper grants an algebraic fact.

If graph decomposition would require an unsupported intermediate interface, a
scalar result can use one complete literal statement shader. Lazy branches stay
inside that shader. Already supported staged graphs keep their existing shape.
The fallback retains expression/depth/private-array bounds and declines direct
filter/scan/sort work, whose traversal limits must remain intact. Temporary buffer
owners still have their existing 64-element capacity. Ordered `foldl`, `foldr` and
inclusive `fold_until` now check their carried buffer bound just as repeat loops
do; unproven growth retains CPU execution. This closes a missing bound check.

`examples/device-private-helpers.ink` uses owned helper returns, conditional empty
allocation, dynamic splitting, in-place indexed maps and complementary rejoining.
Flat list/scalar/record callers run on the GPU. The same source supplies stateful
observation, ordered events, failed preconditions/postconditions, rollback and
restore, and ordinary bounded reverse-AD controls that remain on CPU. Validation
checks full values and snapshots across reference/native/JavaScript/Wasm and the
native GPU host, followed by JavaScript/Wasm/WebGPU browser replay. Raw NaN payloads,
signed zero, subnormals, infinities, empty buffers and clipped split points are
explicit controls. No throughput claim follows from these checks.

The required `source_reverse` suite includes this complete consumer and builds
its browser images when both `INK_TEST_WGPU=1` and `INK_TEST_WASM=1`. The existing
default browser source-history command additionally requires its complete history.
`tools/build_gpu_wasm.py` follows only active device parts in the current manifest,
so stale output folders do not become compiler inputs or needless build work.

Internal owned record/tape storage, broader dynamic growth and sums on the GPU,
the original prepared graph, binary64 device work and automatic profitable
placement remain separate open capabilities. This does not establish GPU reverse
training or complete the wider functionality programme.
