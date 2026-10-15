# Ink semantic core

An independently buildable crate with its own `src/` tree. It defines syntax, types/effects, executable semantics, interpreters and general equality/induction checking. It has no dependency on the distribution, target lowerers, planner, runtime or knowledge checkout.

`registry` defines the common canonical knowledge entry and authenticated bounded snapshot-view contract. It checks hashes, Merkle membership, dependency closure and semantics, then admits typed scalar, inductive and executable semantic proofs through their mathematical kernels. Unsupported admission domains reject; a database label is never authority. `optimisation` and `source_routing` check applications and composed source graphs against exact executable module identities.

```sh
cargo test --manifest-path core/Cargo.toml
```

Source-independent mathematical entries can be reused, but source-dependent laws are rechecked against the actual definition context. Pure result equivalence does not establish resource, trace, state-migration, backend or physical bridge equivalence. Existing specialised maintenance/machine proof terms retain their domain-specific obligations.
