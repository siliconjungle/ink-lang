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
CPU image. Unsupported root transport, binary64 work, public owners or other operations
retain the complete host fallback. Source preconditions remain checked; neither
interface selection nor an internal helper grants an algebraic fact.

If graph decomposition would require an unsupported intermediate interface, a
flat scalar or bounded list result can use one complete literal statement shader. Lazy branches stay
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

Broader dynamic growth and sums on the GPU, source-generated reverse tapes,
the original prepared graph, binary64 device work and automatic profitable
placement remain separate open capabilities. This does not establish GPU reverse
training or complete the wider functionality programme.

## Private record buffers and fixed list observations

Private buffers can hold flat numeric records or supported 32-bit vectors, and
ordinary records can carry several private owners through helpers, field reads,
lazy branches and loops. Bound summaries follow the complete nested field path.
Each loop checks every carried owner; partition bounds retain their origin through
copies and shrinking operations before complementary rejoining. Branches retain
partition identity only when both arms agree. These are literal storage checks,
not facts usable as equality proofs or public ownership transport.

WGSL private storage uses actual vector/record alignment and tail padding. The
cumulative 4,096-word array allowance includes owners, owning-record copies,
partition arrays, branch result carriers and local immutable lists. Types and
summary copies share bounded emitter work; unsupported layouts or exhausted
allowances retain CPU execution. The existing 64-element buffer capacity is
unchanged. Record values containing owners become addressable private variables
before field mutation. Constructor element types use core's existing typed
lexical traversal, including anonymous fixed buffer constructors.

Private numeric scans retain source order: F32 uses the existing exact arithmetic
helper rather than adding its raw word carrier; U64 uses the two-word helper and
zero. The traversal classifier uses checked lexical receiver types, distinguishing
bounded private-buffer scans from input-sized list scans. The latter keep their
existing direct-work restrictions.

A complete literal list result can use fixed constructor capacity, input-derived
capacity or the maximum of both. The manifest's optional `floor` on a `max`
capacity is an allocation bound; the shader computes the selected logical length
and keeps branch evaluation lazy. Native and browser hosts validate the bound.
An empty selected result does not acquire the allocation's larger logical length.
Existing supported graph decompositions retain their stages. Large scalar emitter
arms are outlined so recursive helper compilation retains the normal stack/depth
fallback; validation does not increase the process stack.

`examples/device-record-tape.ink` is an ordinary fixed tape-storage consumer. Its
complete observation returns all four six-field nodes, all adjoints, step count
and length. Additional functions exercise record-wrapped partitions, exact F32 and
U64 scans, mixed fixed/input-sized results and empty results. The required source
history combines this consumer with the original transactional helper fixture.
This supplies private tape storage, not source-generated reverse differentiation
or GPU reverse training. General growable tapes and sum/string/private-list
interfaces still need further literal machinery.

The retained [complete execution receipt](../bench/functionality/device-record-buffers/checks.json)
records 138 reference/native/JavaScript/Wasm/native-GPU-host outcomes, 128 selected
GPU calls and 152 actual dispatches. Browser replay checks 414 complete
comparisons for this history, alongside the existing source reverse and resident
training controls. The same source keeps all seven new consumers on CPU under
the preceding published compiler. Neither eligibility nor conformance establishes
a speedup or profitable automatic placement.
