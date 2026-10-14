# Finite-map membership observations

The fixed local-map meaning connects `m.contains(key)` to membership in
`m.keys()`. For an abstract map, semantic normalization exposes a Boolean fold
over the key list. Concrete empty, insert and remove operations keep their
existing reductions. The definition applies to every supported key domain
(`u32`, `u64`, `i32`, `Bool`) and does not inspect an algorithm name, proof hash,
target or profile. The value type does not affect membership.

The query is captured outside the two fold parameters using ordinary lambda
application. This preserves binder identity when a membership observation is
nested inside a callback. This is trusted primitive meaning in the checker;
it does not replace executable map lookup with a list scan.

This connection closes a missing step in the knowledge producer's complete
ordered indexed-set simulation: coverage of the map's keys can establish a
witness for an abstract membership query. The set algorithm, coverage induction,
step simulation and final output equality remain ordinary checked database
proofs. The definition does not authorize an indexed replacement on its own,
and a checked equality is not evidence that the replacement is profitable.

Validation includes all four key sorts with nested query binders, rejection of
membership in a different map, independent owned-storage semantic checks, and
the complete indexed-construction producer's positive and adversarial cases.
The broader compiler conformance suites still govern executable backends.
