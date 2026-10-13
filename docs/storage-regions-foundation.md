# Storage library foundation

This is work toward the physical-storage substrate in
[the programme plan](general-machinery-plan.md), not completion of that substrate.

`knowledge/libraries/storage-regions.ink` constructs an immutable word arena from
variable-length rows. One owned word buffer holds payloads; another holds start
and length pairs. Empty rows retain their own spans. Construction checks exact
collection counts before converting lengths to wrapping words, and checks the
requested capacity without relying on overflowing addition. The abstract arena
invariant requires each span to fit the supplied word sequence. Imported source
cannot construct the arena or read its fields directly.

A handle is a checked relative slot and extent. `read` checks the extent against
the supplied arena before looking up its span. Handles deliberately have no
allocation identity: a handle with the same extent can address a different arena.
They are relative coordinates, not evidence of provenance or a borrow lifetime.
Untrusted arena and handle values pass their ordinary boundary validators.

`knowledge/libraries/chunked-sequences.ink` builds nonempty chunks of at most a
positive width using a buffer of completed chunks and an owned current buffer.
The final partial chunk is retained; an empty input has no chunks. The invariant
allows different partial chunk lengths, including at untrusted boundaries. It
claims neither full intermediate chunks nor an index-to-chunk arithmetic law.

Both algorithms are source library code using shared buffer operations, records,
finite loops and ordinary predicates. There is no arena or chunked-sequence
strategy case in the compiler. Their result-validity proofs are proposals from
the database producer and must replay against the exact source obligations.
These proofs establish validity of successful construction; they do not prove
universal encode/decode round trips or eliminate the final validator traversal.

Nested builders exposed a general elaboration issue: a loop carried every
mutable local, including an unrelated owner whose field had already moved. Loop
state now carries only outer locals assigned in its body. Unchanged locals remain
lexical captures, and ownership checking still rejects repeatedly consuming a
capture. Conditional assignment, local shadowing, nested loops, bounded loops and
the limit on actual carried locals have independent core regressions.

Imported optional handles also exposed an exact definition replay issue:
reification added a typed binding around `None` even when checked source already
provided its type. Reification now preserves the constructor, retaining any
explicit source binding. Portable definition replay remains exact; it does not
accept equality merely because the bodies normalize to the same result.

The producer searches Boolean cases behind known callback applications and treats
internally bound callbacks as closed expressions. Splitting the positive predicate
also decides its comparison with a Boolean literal. These are bounded search
choices, not kernel rules or privileged validator names. An escaping binder is
not a proposed case condition. Every branch still has to prove the original goal.

Remaining work includes general element types, checked region/borrow lifetimes,
direct range views and destination reuse, source-bound representation relations,
universal codec laws, sparse indexes and compact trees, extraction of existing
physical strategy knowledge, and comparable lifecycle performance measurements.
CPU execution or eligible numeric GPU control dispatch does not establish device
support for these storage operations. No performance improvement is claimed from
conformance checks.

The combined imported fixture also exercises catalogue composition. Its entries
pass individually, but their combined replay exceeded the former single shared
semantic work allowance. Admission now bounds proof work per immutable entry;
entry work/depth limits and catalogue size/dependency limits remain in force.
Core resource regressions check both composition and rejection of a single
oversized proof. This is not permission to trust a previously observed result.

Reference clients can reuse an admitted `CheckedModule` through
`eval::call_checked`. Its immutable seal prevents changing source or proof bytes
between calls; each call retains argument validation, ingress predicates and fuel
limits. Raw `Program` calls still perform admission. The storage fixture uses
this API instead of replaying its full catalogue for every small reference input.
The fixture's debug checking runs on an explicit 16 MiB test thread stack; its
initial default 2 MiB test-thread run overflowed before target comparisons.
