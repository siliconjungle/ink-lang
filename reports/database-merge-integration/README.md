# Database optimisation integration

The representation/database performance work is combined with the owned local
collection work on each repository’s main branch. Core source merged without
conflicts; independent backend/runtime manifests now bind the combined core API
at `588e716ba40882dfc0fbd330df2f6bbf5143216b`. Merge commits preserve this
immutable revision for standalone builds.

The knowledge membership sets were combined into snapshot
`575711aee5a3a3eb2318070f658a31bd4e80f17974af698db74c53a7441d46f7`,
with 1101 entries and 295 rewrite entries. Canonical objects, earlier snapshots,
frozen representation requests and archived measurements were preserved. The
disposable index was rebuilt against the combined snapshot.

Validation after integration:

- 53 independent core tests passed, including collection proofs and action transitions.
- 14 knowledge store/producer tests passed against the combined store.
- 31 integration tests passed across representations, local algorithms,
  collection pipelines, shared sequences, sort cardinality and filtered sort.
  Four manual performance harnesses remain ignored in routine runs.
- The owned-algorithm parity check additionally passed native C/Rust/JS and
  both C/Rust Wasm paths; each Wasm path matched 61 values/outcomes and exact snapshots.
- The standalone runtime passed locked/offline checking against the merged
  backend revisions and combined core pin. The root passed locked/offline checking.

The intermediate root CI run used old backend gitlinks and failed to compile
new core collection types. The final dependency pins include the corresponding
backend support; a new CI run validates the complete committed graph. These
checks do not certify backend correctness or expand the documented proof scope.

## Final dependency commits

```text
 20f0dfd05b302a76241993b771ebf65798ecff65 knowledge (remotes/origin/HEAD)
 bd5bb4fd6b2934a37e0ceee28746fb05ab1f67b4 lowerings/c (remotes/origin/HEAD)
 ce33c7f7742ca6297eeaa888af94489a16628adb lowerings/gpu (remotes/origin/HEAD)
 d4a27ab814eb0ef900c2c15828dc10661d3d31b3 lowerings/js (remotes/origin/HEAD)
 f78a913d73b98fc6fc5be3d512d1577ef6ad2e2a lowerings/rust (remotes/origin/HEAD)
 c9327ade07255ab49c337b30722d282d62e00304 lowerings/wasm (remotes/origin/HEAD)
 1bfa977b0f4a53e1efa1c7ccdf30a8a10958ffc3 planner (remotes/origin/HEAD)
 df401aec79d4f9b3dd11f40f54fdad611e868621 runtime (remotes/origin/HEAD)
```
