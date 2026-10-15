# Direct binary64 literal emission

A profile of the prepared binary64 text counter exposed repeated `__dfFromBits`
work inside ordinary helpers. Finite source constants now emit as round-tripping
JavaScript number literals in pure and action code. This removes per-evaluation
BigInt/DataView conversion without changing any arithmetic operation, rounding
point, logical type or checked source identity. Explicit nonfinite bit constructors
and private NaN-payload carriers retain their existing behavior.

The JavaScript package is `22ca38eda9d6f0de35e55fa6114efdce35c9f7a3`, compared
with `f44cf1d61bcf2eebb80651c9e895353980dca0ed`. The checked core and previous
artifact are retained in the [callback study](../prepared-loops-2026-10-16/README.md).
The current artifact also matches ordinary CLI emission byte for byte. No equality
law, narrowed arithmetic, validity assumption or profitability policy is introduced.

## Paired diagnostic

Node 25.3.0 / Apple M4 Pro, three fresh processes. Existing
`bench/prepared-text/measure.mjs` checks complete counts against actual pinned
Pretext before and after every batch. Per-process lane medians use nine samples
of 32 calls; displayed values are medians across those three processes. Paired
gain is the median process-pair ratio. Timings are nanoseconds per complete call,
including Result materialization and excluding input capture/token construction.

| Segments | Previous prepared | Current prepared | Pretext | Paired gain |
| --- | ---: | ---: | ---: | ---: |
| 8 | 4,293 | 3,629 | 91 | 1.170× |
| 64 | 6,742 | 5,908 | 288 | 1.176× |
| 512 | 14,543 | 9,408 | 786 | 1.495× |

The 512-segment counter is still about twelve times slower than Pretext. This is
a short designed diagnostic with synthetic measured widths, not a held-out corpus,
font/browser fidelity, portable ranking, full Pretext or broad application win.
All ordinary lanes, raw timings, setup/capture/token construction and first calls
remain in `layout-*.json`. At eight segments ordinary calls regress in this sample
(6,650 ns previous / 6,934 ns current). No memory improvement was measured.

`before.cpuprofile` is the exploratory 200,000-call profile, with its driver.
It sampled constant bit conversion as one cost among dispatch, record construction,
helpers and collection accesses. Sampling is diagnostic evidence rather than a
proof or an allocation count; profiling is separate from the paired timing runs.

## Validation and reproduction

The standalone JavaScript suite passes 50 tests. Its new raw-bit regression checks
2,210 boundary and seeded values across ordinary pure, compiled, prepared and action
calls, plus detached NaN wrappers. Finite literal nodes cover both zeros, subnormals,
normal boundaries, neighboring representable values, extreme finite values and
random significands/exponents. Checked core rejects nonfinite literal nodes, so
nonfinite payloads use ordinary explicit bit constructors in the same comparison.

The final binary64 suite passes four tests, including 65-observation and separate
frozen histories with exact checkpoints and an actual F32 GPU dispatch each. The
three prepared-text tests pass, including the 232-case upstream oracle and the
182-observation compiled history with one actual F32 GPU dispatch. Binary64 device
work still retains compiled CPU fallback. Logs and source/artifact bindings are
retained; these checks do not prove the backend or whole compiler correct.

Reproduce current emission and the diagnostic:

```
ink build reports/prepared-loops-2026-10-16/text.core.json --core --target javascript -o build/literals.mjs
node bench/prepared-text/measure.mjs reports/prepared-loops-2026-10-16/text-current.mjs build/literals.mjs build/prepared-text-oracle/upstream/line-break.js build/literals-layout.json
python3 reports/binary64-literals-2026-10-16/audit.py
```

Use `bench/prepared-text/generate-oracle.mjs` to prepare the exact upstream control.
This literal improvement does not complete complex text layout, segmentation and
measurement preparation, general source reverse AD, mutable-session staging,
checked binary64 narrowing or the three-project performance requirement.
