# Reproduce compiled model images from committed sources

`tools/check_compiler_image.py` creates a fresh private distribution checkout and
Cargo target from a specified committed revision and its exact independent package
pins. It builds the ordinary compiler, builds baseline and selected frozen-program
packages, and verifies both with training replay. Executed JavaScript, source
cores, selection proofs and startup state must match the supplied packages byte
for byte. It never substitutes working compiler sources or a prebuilt compiler.

```sh
python3 tools/check_compiler_image.py --source COMMITTED_REVISION \
    --baseline build/baseline --selected build/selected \
    --log build/compiler-image.log --receipt build/compiler-image.json
```

The fixture is `examples/frozen-program.ink` with its committed configuration
trace. The tool archives compiler/core/stdlib/examples and all pinned executable
packages. Knowledge includes its tool and library sources; planner includes its
compiler tools and browser sources. Historical catalogues and research bundles
are excluded and those subsets are recorded explicitly. The dependency resolution
lock is recorded by hash; when not tracked in the source revision it is copied as
resolution data. Cargo performs normal dependency validation and compilation.

The receipt binds the revision, package pins, compared images, Cargo version,
resolution lock and complete log. It is written only after successful comparison.
For a retained acquisition, preserve its lock and log along with the receipt;
the [frozen-program report](../reports/frozen-program-2026-10-16/README.md) does so.
Package manifests and path-dependent planning metadata are not required to be
byte-identical. Every code/data image executed by this fixture is compared.

This detects uncommitted-source drift and reproducibility failures for a finite
fixture. It is not proof of compiler correctness or supply-chain authenticity.
The source-to-mathematics projection, checker, code generation, ABI/runtime,
toolchain and device implementation retain trusted code. Independent reference
histories, cross-target comparisons, ordinary proof replay and exact private core
tests address different parts of that chain; none makes the others unnecessary.
