# Source row/key/projection proof bridge

Four source-specific undo packages reproduce byte-for-byte under compiler SHA-256 `b1028af4485ef43d7ed3fff9fea2142178f77f2cdf3842942d7071a54533da96`. The preceding generic checker, SHA-256 `b9b6a63ff645a63b87a5bd2cf07111a3376e837eef27be25c17277e880d3b855`, independently accepts all their mathematical declarations and proofs. No proof-kernel, native lowering or storage primitive changes accompany the new source value/projection lowering.

`audit.json` records source binding verification and complete package reproduction. `tests.log` records 83 passing tests. `benchmark-inputs.json` records exact reproduction of five measured benchmark bodies/plans under the new compiler. `previous-undo-audit.json` records byte-identical reproduction of both earlier abstract undo packages. `verification.json` pins archived sources, outputs, unchanged core/runtime source identities and preserved lifecycle binary hashes. Four production logs record acceptance of each database object.

See [source-row-models.md](../../docs/source-row-models.md) for model meanings, cases, commands and boundaries. This milestone binds actual logical row/key types and contribution expressions to a mathematical wrapper. It does not admit native representations, prove full user-action/protocol execution or claim new performance. The full language goal remains open.
