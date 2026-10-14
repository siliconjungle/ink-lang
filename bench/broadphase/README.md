# Complete static collision broadphase

Three explicit Ink source algorithms produce every pair of overlapping finite,
valid 2D axis-aligned boxes. Invalid boxes are ignored, boundary contact counts
as overlap, and the result is sorted by original input indices with each pair
present exactly once. Signed zero, subnormal values and exceptional raw float
bits are included in the reference/conformance fixtures.

- `all_pairs` scans candidate pairs directly.
- `sweep` stably orders boxes by minimum x and stops each scan when later boxes
  cannot overlap on x.
- `bvh` builds a static binary bounding-volume hierarchy by joining adjacent
  sorted leaves. Queries reject whole subtrees using their union bounds.

The stable radix-ordering helper is ordinary source over existing word and
buffer operations. It also canonicalizes pairs. No source syntax, primitive,
compiler matcher or automatic algorithm-replacement proof is introduced.

The tree candidate explores the hierarchical bounds used in the pinned
[Box2D tree](https://github.com/erincatto/box2d/blob/ac7c751eaeddbabdc1c4d41ae4f3a25d78627790/src/dynamic_tree.c).
Its static pairwise builder is different from Box2D's dynamic sibling selection,
insertion and rotations. Moving-object histories and maintained-tree updates
remain future work; static broadphase is not a complete rigid-body simulator.

## Controls and complete lifecycle

The harness compares all three Ink algorithms, independently implemented Rust
sweep and static-tree algorithms, and the actual pinned Box2D implementation.
The thin C adapter compiles unmodified `dynamic_tree.c`, `core.c` and
`math_functions.c`; it constructs the tree, creates proxies, queries every box,
sorts the full pair output and destroys the tree. Input copies and output
allocation/destruction are included in each timed invocation for every variant.

Outputs stay in their native owned representation during timing. A common
canonical pair view is constructed only for full correctness checks before and
after timing. Ink and Rust algorithms perform their own canonicalization inside
the timed call; the Box2D adapter sorts its output inside the call as well.

Datasets cover sparse uniform boxes, clusters, a deliberately unfavorable sweep
case with common x ranges and disjoint y ranges, fully overlapping boxes,
boundary-touching chains and zero-area points. Sizes range from 0 to 1,024. Output
cardinality is recorded: fully overlapping scenes necessarily produce quadratic
output, regardless of the acceleration structure.

Six implementations rotate through all timing positions. Fresh processes are
replication units; confidence intervals bootstrap their medians. Toolchains,
upstream revision and source/header, compiler, plan, emitted code, shared-library
and executable hashes are captured. A measurement is rejected if those inputs
change. These are observations of specific contracts and scenes, not a universal
physics-library ranking or rewrite authority.

## Validation and reproduction

`check-reference.py` uses an independent complete-pair oracle and checks 73
reference calls across all three algorithms plus radix boundary cases.
`tests/support/broadphase.rs` compares values and exact snapshots across C, Rust,
JavaScript and both Wasm targets before and after ordinary checked helper
expansion. GPU hosting is CPU fallback for this program; no device speed is claimed.

```sh
python3 bench/broadphase/check-reference.py
cargo test --test physical_capabilities broadphase -- --nocapture
python3 bench/broadphase/run.py --build-only
# Run after builds and other measurements stop.
python3 bench/broadphase/run.py --measure-only --rounds 8
```

The compiled benchmark also checks all six variants on small scenes before any
full measurement. Conformance and measurements must pass before a performance
result is reported. The integrated library passes 73 independent reference checks and portable
comparisons before and after checked helper expansion. Actual Box2D matches
all 23 collision scenes in the reference fixtures; all six compiled variants
also agree on the small benchmark scenes.

## Initial compiler result and general correction

`before-projected-reads-results.json` records eight fresh processes using the
initial compiler. At 1,024 boxes the Ink tree took 111–368 times as long as the
matched Rust tree, across the six scenes. Inspection found that every node
lookup copied the entire node list: scalar `length` and `at_or` observations
borrowed plain variables, but copied lists projected from records. The sweep
candidate accesses a plain list and did not have this particular penalty.

The correction in the Rust literal emitter extends those scalar observations
to checked lexical field paths. A lookup still returns an owned copy of the
selected element. Computed receivers retain their normal eager evaluation,
and fallback expressions remain lazy. If another argument references the root
record, the receiver remains owned so an index expression can consume the root
without invalidating a live borrow. No collection traversal, new representation,
algorithm substitution or user-visible syntax is selected by this correction.

The native regression counts element copies for a 4,096-element nested list:
zero for its length and one for a selected element. The portable regression
also covers captured lists, empty input, consuming index/fallback expressions,
computed receivers, wrapping words, strings and raw floating-point bits.

`compare.py` checks identical source, plans, controls, dependencies and compiler
flags, then alternates the old and new executable across paired fresh processes.
Both binaries must validate every complete output. Its report includes every
scene/size and every control; the old results remain available even when a new
compiler is faster. All 15 native lowering tests and all 11 combined physical
capability tests pass, including actual eligible GPU work elsewhere in that
suite. The eight paired timing rounds are complete in `projected-read-results.json`.
The full report retains all scene sizes, controls, process samples and intervals.

## Measured candidate at 1,024 boxes

Times are microseconds per complete call; eight paired fresh processes.

| Scene | Pairs | Ink scan | Ink sweep | Ink tree | Rust tree | Box2D | Tree speedup |
|---|---:|---:|---:|---:|---:|---:|---:|
| uniform | 0 | 1263.479 | 18.552 | 199.917 | 193.989 | 195.729 | 156.43× |
| clustered | 123667 | 1442.802 | 3856.490 | 5071.969 | 4790.542 | 6230.094 | 173.96× |
| x-overlap | 0 | 1256.323 | 414.021 | 147.875 | 151.365 | 194.167 | 113.17× |
| all-overlap | 523776 | 1716.896 | 14031.073 | 17344.146 | 14488.677 | 13358.323 | 110.92× |
| touching | 1023 | 1272.979 | 38.520 | 189.031 | 180.125 | 205.386 | 104.00× |
| points | 6305 | 1282.333 | 264.125 | 655.667 | 600.927 | 390.853 | 380.61× |

These measurements isolate the projected-list correction before integrating
subsequent upstream compiler changes. The matched Rust and actual Box2D controls
are unchanged; see their before/after ratios in the report for timing noise.
