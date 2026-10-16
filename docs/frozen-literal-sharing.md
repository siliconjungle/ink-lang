# Shared mathematical data for frozen models

Long frozen lists and table rows can use transparent, zero-argument mathematical
definitions rather than one deeply nested constructor term. Lists of at most 32
elements retain their existing representation. Longer closed lists and tables
share tails in chunks of 16 cells. Every chunk is an ordinary typed, total
definition whose exact body is derived from the checked source data. The same
literal representation is available to closed lists in actions, so a selected
program can return the complete model without expanding its proof transport.

Closed data imports exactly the sorts and functions it references. Its identity
therefore does not depend on an unrelated helper's private record types. All
definitions reachable from source-derived frozen premises are rebound against
the actual input during selection checking, even if no selected action reads
that root. A hash, producer root or learned observation grants no equality.

The exported action case's `normal` is a bounded authoring aid, not a proof
premise. When full evaluation would exceed normal resource bounds or produce an
untransportable hint, it retains the exact typed case call. An exhaustive
constructor proof likewise returns the exact equation established by all its
checked branches without needlessly normalizing the complete conclusion again.
Later comparisons still use ordinary conversion. There is no new proof rule,
primitive, source syntax, erased invariant or trusted producer shortcut.

Independent core tests transport 33/64/128/232/512-element F32 lists and 232 table
rows, checking order, exceptional-value payloads and ordinary chunk/lookup
conversion. They cover helper-scope independence and exhaustive case proofs over
a complete 512-element result, including rejection of a changed result.
Knowledge tests specialize and execute complete 64/128/232/512-element finite
parameter lists, compare live updates and exact snapshots, and reject a one-bit
alteration. Existing short frozen proofs remain regression controls.

This is mathematical data sharing, not a runtime layout change or a performance
claim. Definition, work, byte, term and transport limits remain fixed. Large
frozen values can still exhaust the finite definition/work budget. Long action
continuations, general neural graph/tape specialization, equivalent long literals
requiring factored producer proofs, device learning and learned physical layouts
remain further work. Raising compiler limits is not the scaling strategy.
