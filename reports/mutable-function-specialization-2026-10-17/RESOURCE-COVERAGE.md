# Embedded resource coverage supplement

The historical `compiler-sources.json` lists 688 owned source/resource files. It
omits `abi/selection.wasm`; its list is not a complete embedded-resource inventory.
The original receipts, source identities, plans and emitted images remain intact.

The [supplemental receipt](resource-supplement.json) checks the 554,195-byte asset
against the pinned ABI revision, the retained private source copy, and an actual
WebGPU bundle emitted by the historical retained compiler. All three match SHA-256
`1597f63e25b60e0b0b92486c5b370a01f3828603a47149efe9f953099bb1e6b0`.
This checks byte provenance, not the ABI implementation's mathematical correctness.
New compiler inventories also record tracked root-level package resources.
