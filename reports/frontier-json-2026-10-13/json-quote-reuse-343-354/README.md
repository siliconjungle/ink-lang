# Explicit bounded JSON quote reuse

The ABI supplies an optional cache of immutable quoted strings and exact UTF-8 lengths. Numeric token grammar, duplicate checks, order, source budgets and output byte charging remain active, including hits. Entries and estimated string payload bytes are bounded. No default chooses the cache. This is fixed boundary support, not authority to rewrite a source program or skip its validations.

## Measurements

Three fresh processes per variant/fixture, fifteen rotated rounds and full output-byte consumption. Processes343–345 cache text only and fail to show a useful gain. Processes346–348 also cache the exact UTF-8 length: numeric data is mixed, cold rendering is 25–33% slower, and complete pipelines are not consistently improved enough to choose a default. Shared-host load changes substantially; compare paired ratios, not absolute times across these groups.

For repeated Unicode/escape-heavy documents, processes349–351 show prepared render ratios **0.740 / 0.751 / 0.748** and complete text/edit/output ratios **0.938 / 0.937 / 0.917**. Cold render ratios are **1.395 / 1.379 / 1.396**. Frontier complete pipeline timings remain178.06 /185.47 /187.84 microseconds against cached Ink593.50 /646.84 /671.73: Ink still loses this comparison.

Independent complete-session processes352–354 include cache construction, first fill, every prepared edit, UTF-8 output conversion and full output checksumming. At256 calls, cached/control ratios are **0.785 / 0.777 / 0.762**, about21–24% less elapsed time in every process. At32 calls the ratios are0.782 /0.971 /0.924; short-session results are mixed or slower. These measurements support only the explicit long-session Unicode option, not an unconditional cache or all-metrics win. Imports/input preparation/forced GC are outside timings. A separate isolated Node process measured about106,454 retained heap bytes per filled cache across128 caches, against37,448 estimated payload bytes and1,024 entries. Clearing released the measured retained allocation. This is one forced-GC diagnostic, not peak memory or a universal bound; startup profitability still needs measurement. A payload cap is not a process-heap guarantee.

## Correctness and provenance

Full ABI tests pass. Actual emitter tests over ordinary/composed record and sum layouts pass with the local ABI and exact current core. Separate runtime conformance checks exact lexemes, Unicode, duplicates, low resource budgets on repeated hits, owner forgery and cross-module caches. The cache returns immutable strings and frozen token metadata; it never exposes private source values.

Initial runs used exact ABI support substitution into frozen generated modules while build attempts failed for disk space. After space was recovered, a freshly rebuilt compiler emitted a module **byte-for-byte identical to the final measured token-cache prototype**. Both acquisition mechanisms and exact hashes are retained, without relabelling the initial build. ABI standalone CI gates its published revision separately. The original text-only candidate and all losing results are archived as well.
