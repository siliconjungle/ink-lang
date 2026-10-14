# Complete Set calls

Generate JavaScript for `tests/fixtures/checked-sets/main.ink` with its contract
proof packet, then run:

```sh
ink build tests/fixtures/checked-sets/main.ink \
  --contract-proofs tests/fixtures/checked-sets/proofs.json \
  --target javascript -o build/sets.mjs
node bench/checked-sets/run.mjs build/sets.mjs > build/set-measurements.json
```

The benchmark compares complete construction, membership, union, intersection
and difference calls with a handwritten u32 implementation. Both validate
public Set inputs, preserve stable order and consume complete outputs. Wire
calls use the exact same argument and result codecs. Input construction and
encoding are outside call timing; encoding is separately recorded. Eleven
interleaved rounds retain raw samples, empty inputs, module hashes and machine
identity. Positive outputs agree, invalid duplicate inputs reject and inputs
stay unchanged.

The control covers u32 identity; it establishes no float/record algorithm
replacement. These shared-machine samples are observations, not proof premises
or automatic selection evidence. Native/Wasm, state histories and memory/lifetime
measurements remain to be added. The literal implementation retains quadratic
worst-case work; efficient proof-backed strategies are still required.

An optional third argument supplies a module with checked boundary-reader
selection. Its lane is compared with the exact same codecs and complete calls.
The three-lane report includes `distinct`; only selected interfaces use the
specialized reader. At 256 inputs, selected/literal wire ratios of 1.001 for
`distinct` and 1.044 for `union` show no material benefit in these samples.
Invariant validation and the generic algorithms remain the dominant costs.
