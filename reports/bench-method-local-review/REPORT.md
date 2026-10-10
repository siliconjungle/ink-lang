# Local review of benchmark methodology

Claude’s benchmark-method branch is integrated with the current ownership
lowering and proof audit. The state and pure harnesses both complete locally.
These are smoke runs on a shared M4 Pro, not headline performance measurements.

The state run uses seven variants, including Rust’s literal two-write abort,
one discarded warmup and three interleaved rounds across 12 cells. All 14,035
native observations and 4,010 reference outcomes agree. The 252 timing samples
produce paired bootstrap intervals. The pure run produces 378 timing samples
after its own oracle checks. See the separate raw reports and metadata.

Review fixed report provenance: captured toolchain environment now reaches the
report instead of being rediscovered without the isolated Rust PATH; reported
round counts match arguments; Apple Clang’s version is not claimed to identify
its LLVM major. Measured source archives include the methodology and manifests.
Knowledge is identified by its exact git pin and per-file hashes instead of
copying the entire database into every report. A correlated sample with a known
constant ratio independently checks the paired interval, and benchmark links
resolve.

The existing Linux report remains immutable. Local runs disclose dirty measured
code and the unestablished Apple Clang/Rust backend match. Three rounds and short
pure batches are sufficient for harness validation, not a language ranking.
No database-selected journal/outbox/always-abort plan is enabled, and no new
claim of beating Rust is established.
