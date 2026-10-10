# Local collection queue benchmark

Run `python3 bench/local-collections/run.py` from the distribution. It builds
literal native Rust, verifies each result, warms/calibrates each method and
records nine interleaved rounds. No compiler rewrite or heap primitive is used.
Inputs are deterministic pseudorandom u32 priorities. Heap ties use input index.
The linear queue returns the same numeric sequence. All methods include the
input copy, insertion, extraction, output allocation and destruction; exclude
JSON and compilation. The baseline Rust heap uses repeated insertions rather
than bulk heapification, matching the Ink algorithm.

Recorded on Apple M2, generated Ink Rust:

| Items | Ink heap | Ink linear queue | Linear / heap | Ink / Rust BinaryHeap |
| --- | --- | --- | --- | --- |
| 256 | 18.3 µs | 37.7 µs | 2.06× | 2.09× |
| 1,024 | 77.2 µs | 434 µs | 5.62× | 2.09× |
| 4,096 | 315 µs | 6.15 ms | 19.5× | 2.01× |
| 16,384 | 1.28 ms | 82.9 ms | 65.0× | 1.66× |

Owned storage makes the efficient queue implementable as ordinary Ink code.
Choosing that algorithm gives useful gains as queues grow. Generated Ink is
still slower than Rust's standard heap in this run. This is not a claim of an
Ink compiler advantage, and it measures queue work rather than full A* search.
Small queues can favour simpler scans. See `results.json` for raw timings,
repetition counts, complete source and toolchain/machine identity.
