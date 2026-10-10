# Ink C lowering

Straightforward portable C emission for Ink's current pure collection subset.
The compiler checks types/effects and database replacements; this backend consumes
`ink_core::core::CheckedModule`. It adds no optimisation catalogue.

`cargo run --release -- CORE.json -o program.c` rechecks the versioned core input
before writing output. Clang/LLVM can compile that C to native code or Wasm.
The C emitter, allocation runtime and target toolchain remain trusted. This is
not a direct assembly or GPU backend.

Part of the personal siliconjungle Ink repositories. The distribution pins this
repository as a submodule. Core schema/toolchain compatibility must be explicit;
repository identities do not establish correctness.
