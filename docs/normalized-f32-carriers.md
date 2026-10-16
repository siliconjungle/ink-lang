# Normalized JavaScript F32 values

The pure JavaScript emitter distinguishes a value already in Ink's internal F32
representation from an arbitrary JavaScript Number. That representation is either
a rounded binary32 Number or a private tag preserving exact NaN bits. Being in
this representation does not establish a finite value, a Number, a numerical
range, ownership, immutability or an arithmetic equality.

Each used scalar F32 function parameter is normalized on entry. Expression
producers and fresh const aliases carry the resulting representation fact.
Scalar loop slots carry it only after a normalized initializer and because every
emitted subsequent assignment normalizes its F32 result. Mutable slots still
need snapshots for simultaneous updates and captures. Failed optional helper
expansion restores these facts along with its fresh-name counter.

This removes repeated `__nfValue` calls on already normalized values. It does not
remove arithmetic rounding, change operation order, reassociate expressions,
narrow precision or replace any algorithm. There is no new syntax, ABI, core
meaning, equality law or automatic selection rule.

Borrowed host record and list fields remain untrusted carriers. Every typed read
keeps its first normalization at its source position. In particular, a JavaScript
double such as `1 + 2**-25` must round before F32 arithmetic. Reading the same host
field again does not authorize caching it, suppressing a getter or skipping a
thrown error. Parameters used only by a precondition also require their typed
read; a public input adapter's borrowing policy is not a normalization proof.

Stateful modules retain their existing raw-bit carrier. Pure prepared calls use
the same representation rule and still evaluate fresh primals and derivatives
for changing weights, context and targets. This is trusted target implementation
machinery; neither the tests nor existing source proofs certify the emitter or
JavaScript engine.

The dedicated fixture checks both carriers against the independent evaluator,
including raw/signalling NaN payloads, signed zero, subnormals, arithmetic overflow,
recursive swaps, source shadowing, mutable loop state, collections and owned
buffers. Host-boundary checks include nonrepresentable doubles, repeated and
throwing getters, and contract-only scalar consumers. The required cross-target
fixture compares complete values and snapshots; its separate numeric GPU control
does not imply device execution of the whole fixture.
