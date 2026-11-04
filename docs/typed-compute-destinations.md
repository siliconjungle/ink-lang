# Exact typed destinations for resident compute

Browser packed sessions expose `readInto(stepId, destination)` for flat numeric
List results. The explicit caller-owned destination can be Float32Array,
Float64Array, Uint32Array, Int32Array or BigUint64Array matching the declared
element type. Receipts contain the logical element count and transfer counters.
CPU sessions support the same call. GPU binary64 arithmetic remains unsupported;
a host destination does not grant a device capability.

The shared ABI validates real typed-array bounds using intrinsic getters, with
capacity errors before writes and an untouched unused tail. Numeric words copy
without materializing Number/BigInt arrays, preserving signed zero, infinities
and NaN payloads. Ordinary Array results keep their existing numeric/tag domain.
The explicit destination is mutable caller memory and must remain stable during
the async operation; it never aliases private session storage.

The GPU adapter copies mapped readback directly into that destination before
unmapping. It retains graph logical-length/header checks, direct-step capacities,
the existing reusable staging allocation and device error scopes. The mapped
view never escapes. Ordinary readback still returns detached owned values.
This is a transport mechanism, not arithmetic fusion, a physical-layout proof,
new source semantics, backend placement authority or a learned cost policy.

The external static-embedding experiment binds identical Ink sources and
byte-identical pool/norm/output shaders. Three fresh Chrome processes compare
the previous host, the new host with its ordinary read control, and the new
typed destination API. At batch 1,024 complete detached output takes 3.50 versus
1.70 microseconds per embedding (2.06x); batch one is unchanged. All five model
fixtures remain bit-exact. The benchmark includes common validation, ID packing,
three uploads/dispatches and complete readback; loading/setup and correctness
checking are separate. These measurements establish this explicit boundary's
benefit, not a general placement policy or speedup on every workload.

The same external experiment freezes unrelated matrix-column, feedback-filter
and channel-energy programs. Existing checked captured-fold batching gives Rust
3.03x, 8.03x and 2.48x average nonempty-case gains through typed owning calls,
but regresses JavaScript. A newly checked Buffer observation law does not
establish an additional robust gain and remains an external experiment. No
unconditional rewrite or target threshold follows from these observations.

Validation covers ABI native/browser word parity, exceptional float bits,
offset views, shadowed destination properties, short capacities, preserved tails,
mapped-memory poisoning, retained outputs and CPU resident close semantics.
The external reports retain matched controls, all process samples and adverse
outcomes. The broader generalized inference work remains in progress.
