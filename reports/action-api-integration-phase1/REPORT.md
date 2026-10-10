# Coherent whole-action API integration

Functional source is the commit in metadata.json. All six standalone packages resolve the same reviewed core git revision; dependent lowerer/runtime manifests pin the corresponding public backend commits. Root patches resolve those packages to the same local source for cross-package fixtures.

Each standalone package passed `cargo test --all-targets`. C/Rust/GPU/Wasm have no behavior tests in those harnesses; JavaScript passed two differential scenarios and the runtime passed three durability tests plus one execution/fallback test. The root therefore also ran 14 meaningful enabled tests: action_optimisation (4), action_transitions (6), selected_checkpoint (3), distribution (1). The complete whole-action case compares ten exact outcomes and checkpoint bytes across CPU backends, both Wasm adapters and mixed wgpu host fallback. The mixed selected-checkpoint case includes an actual GPU kernel call. Stateful action execution on a wgpu host remains CPU execution.

An all-target root check passed without warnings. Initial standalone attempts ran out of local disk before validation; disposable build caches were removed and a shared target used. The first root attempt rejected the previous SQLite snapshot cache; rebuilding the disposable index for the pinned 662-entry snapshot resolved it. Archived logs are the successful reruns.

This is bounded conformance evidence. It does not prove generated instructions, backend correctness, interpreter correctness, arbitrary physical representations, resource-exhaustion equivalence or concurrent behavior. Numerical state/action boundary work is not included in this milestone.
