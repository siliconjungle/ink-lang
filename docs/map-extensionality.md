# Finite map equality in database proofs

`MapExtensional` is a general proof rule for the existing canonical finite
`Map<K,V>` meaning. It adds no executable operation, source syntax, representation
selector or optimisation matcher. Algorithms and algebraic identities remain
ordinary database laws whose complete proofs must replay.

For an equation `left == right` of the same map type, its certificate supplies
two distinct fresh names: `parameter` of key type `K`, and
`fallback_parameter` of value type `V`. The checker reconstructs two obligations:

1. `left.contains(parameter) == right.contains(parameter)`.
2. `left.get_or(parameter, fallback_parameter) == right.get_or(parameter, fallback_parameter)`.

Both are universally quantified. The names must be absent from the surrounding
environment; they cannot specialise the rule to an observed key or a chosen
fallback. No additional hypotheses enter either obligation. The `presence` and
`values` subproofs run through the ordinary bounded checker with the caller's
existing hypotheses and exact module context. Binder opening and dependency
collection visit both subproofs.

The justification is finite-map extensionality: equal membership gives the same
key domain, and equal reads give the same value at every present key. Absent
keys return the identical arbitrary fallback on both sides. Membership remains
necessary even when `V` has only one possible value; read equality alone would
not distinguish an empty map from a map containing that value. Fixed canonical
key order then gives the same keys, values, length and enumeration order.

The value obligation is semantic term equality. It does not substitute numeric
floating-point equality for bit equality: signed zero, NaN payloads, complete
list elements and record fields must be preserved. The rule ranges over exactly
the map sorts already admitted by core; it does not make new key sorts legal.

This rule does not justify persistent-state mutation, alias observability,
allocation failures, reordering effects, or profitability. Stateful physical
representations still require their separate action-preservation and migration
proofs. Search may propose map identities; profiles may rank checked choices;
neither can grant equality authority.

Validation is in `core/tests/map_extensionality.rs`: symbolic overwrite across
key and payload sorts; conditioned commutation with exact float payloads;
absent-key cases; rejection of changed domains and values; fresh-name and
single-key forgery attempts; binder opening; and strict certificate decoding.
These tests are required before publishing this rule.
