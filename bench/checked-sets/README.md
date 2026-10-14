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
measurements remain to be added. The generic literal implementation retains
quadratic worst-case work. The indexed fixture uses database-authored Map/Buffer
construction and indexed u32 queries with checked preservation proofs.

An optional third argument supplies a candidate module; an optional fourth
argument labels that lane. It is compared with the exact same codecs and complete
calls. Every lane warms for 50 ms and every sample contains at least 16 calls.
The historical boundary-reader receipts used the earlier shorter warmup.
The three-lane report includes `distinct`; only selected interfaces use the
specialized reader. At 256 inputs, selected/literal wire ratios of 1.001 for
`distinct` and 1.044 for `union` show no material benefit in these samples.
Invariant validation and the generic algorithms remain the dominant costs.

For construction, reusable private value guarantees and retained native Set
controls, run `node bench/checked-sets/handles.mjs MODULE.mjs`. Capture,
construction, encoding, decoding and the first decoded invariant check are
separate lifecycle observations. Steady calls include detached output
materialization and full consumption. Raw handles validate once; checked source
outputs already establish their declared value interfaces. Membership still
scans the logical list and is slower than the retained native index.
