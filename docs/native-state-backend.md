# Native state backend

`lang emit-state SOURCE -o DIRECTORY --maintenance PACKAGE.json` emits a standalone Rust crate. Rust/LLVM compiles its typed records, tables, changes, queries and events to machine code. No language AST evaluator is linked into the generated program. The generated Rust and `plan.json` expose the selected implementation and its trust boundary.

The optional `--bounded-totals` flag runs conservative range analysis. It currently recognises only an exact sum of one unsigned record field over a finite table. Unsupported expressions keep their BigInt representation. It never substitutes observed data ranges for declared guarantees.

## Range argument

For a map keyed by a `k`-bit unsigned key, there can be at most `2^k` entries. For a `v`-bit unsigned field, each contribution is between zero and `2^v - 1`. Consequently:

```
0 <= sum <= 2^k * (2^v - 1)
```

The compiler computes the bound with arbitrary-precision arithmetic and selects a u128 cache only if the maximum is at most `2^128 - 1`. For example, u64 keys and u32 fields need at most 96 bits. u64 keys and u64 fields also fit. A nominal 128-bit ID with a u32 field does not qualify, even if the current dataset is small. Signed contributions, products, filters and other pipelines currently fall back to the existing BigInt implementation.

The range evidence is recorded in the generated manifest. Its derivation and Rust implementation are trusted, domain-specific compiler reasoning, not a proof checked by the future general kernel.

## Checked maintenance and modular execution

The imported maintenance certificate is still checked in exact integer arithmetic. It proves the insert, replace and remove expressions preserve the finite-map sum invariant. Only after validation and successful range analysis does the compiler emit the actual certificate expressions using wrapping u128 arithmetic.

This remains valid even if an intermediate expression is negative or exceeds 128 bits. Polynomial evaluation commutes with reduction modulo `2^128`. The certificate establishes that the final mathematical result equals the new exact sum; the range argument establishes that this sum has exactly one unsigned representative within u128. Therefore the emitted residue is the exact result. The argument applies to the supported `+`, `-`, `*` polynomial fragment; it would not justify division, ordering or arbitrary checked arithmetic inside certificates.

Tests cover equivalent update expressions with negative and greater-than-128-bit intermediate values. They also check a table of u64 values whose total exceeds u64, including the high word of the generated query ABI.

## Transactions and host interface

Generated code uses a typed undo journal and staged events. Map insertion/removal returns the old value, which becomes the undo entry without a redundant lookup. Failed transactions restore the table and cached totals and discard staged events. Successful transactions advance the version and publish ordered events into an in-memory outbox. Nested change errors abort the enclosing change even when the caller ignores their return value.

Normal queries return their declared language type. JSON queries retain the exact `{"Int":"..."}` encoding. For a parameterless query that directly returns a bounded keep, the compiler also generates `query_words_l_NAME(&self) -> (u64, u64)`. The pair contains the low and high words of the same nonnegative exact integer. This avoids BigInt allocation at native host boundaries; it does not truncate the value or change the language result. Eligibility follows source structure and checked bounds, never a benchmark function name.

The benchmark uses this view for the bounded variant and the ordinary BigInt result path for the unbounded variant. Both expose the same C ABI to the common timing driver.

## Current limits

This is a bootstrap implementation. Storage is BTreeMap, scans materialise vectors, and cloning and transactional bookkeeping remain conservative. Portable native/reference snapshots are implemented; see `portable-snapshot.md`. Live runtime implementation migration, automatic profile-based selection, durable storage, concurrency and stateful WebAssembly are not implemented. The reference runtime's fuel budget is not imposed on native code. Resource exhaustion may terminate the generated process; this is not a durable transaction guarantee.

The frontend, fixed proof schemas, range reasoning, generated Rust, runtime support, BigInt library and Rust/LLVM backend remain trusted. Differential tests validate behaviour but are not an end-to-end correctness proof.
