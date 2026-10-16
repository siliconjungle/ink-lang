# Scalar primitives through action sequencing

The action projection now routes registered pure value primitives through its
existing fixed expression correspondence. This closes a sequencing gap: F32
bitcasts and numeric operations already had fixed mathematical meanings, but
the continuation path could reject them when projecting an action.

Arguments execute once in source order, carrying their current state and events.
Only their resulting typed values enter the fixed primitive application.
Nested change failures, `?`, rollback, lazy branches and source observation sites
retain their existing meanings. A registry entry does not grant correspondence:
the existing typed projection must implement the operation or checking rejects.
Binary64 and unsupported conversions remain outside this proof domain.

The standalone tests compare projected complete transitions against reference
execution across binary32 boundaries, including signed zero, subnormals,
infinities and signalling NaN payloads. They check ordered effectful operands,
committed state, events and rollback, plus observations inside a bitcast and
unsupported-domain rejection. These are implementation checks, not a proof of
the projection, checker, runtime or backends.

This adds no primitive, executable-core version, source syntax, optimisation law
or profitable-selection exception. It allows ordinary proofs to use existing
fixed scalar meanings through the sequencing path. Structural/algorithmic
specialization remains knowledge-owned and needs complete admission proofs.
