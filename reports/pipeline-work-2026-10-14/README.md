# Make planning cost follow requested work

This experiment changes engine overhead, not Ink semantics, admitted laws,
generated application code, runtime selection policy or transport formats.
Discovery indexes and timings remain untrusted. Every surviving proposal still
passes the ordinary proof checker.

## Decisions

* **Keep search-local derived data.** Read structural prices once per search,
  including caller overrides, instead of loading and parsing the same resource
  for every candidate function body. The next search reads fresh defaults.
  Schema-2 target models retain their existing path. Reuse the already computed
  exact body fingerprint for sorting proposals instead of serialising it again.
* **Keep selective discovery.** Use existing covering indexes to retrieve matching
  entry IDs before snapshot membership filtering. Replace correlated `EXISTS`
  probes with `IN` subqueries for operation, effect, parameter type and condition.
  No database migration, new index format or change to canonical storage.
* **Keep lazy negative matching.** Check the typed head index before serialising
  a whole subtree. With no compatible head or wildcard, there is no candidate to
  match and no reason to retain a large cached miss. New template instances are
  immediately visible; binder-aware matching is unchanged. Cache diagnostics and
  available memory can change, so searches stopped by memory/time limits need not
  discover exactly the same number of candidates.
* **Reject the proof-prefix implementation experiment.** Grouping canonical
  prefix comparisons by length, borrowing step slices and cloning only the
  winning witness did not establish a benefit on the real plan-session fixture.
  Three preliminary pairs gave a median ratio of 1.007, with a bootstrap interval
  spanning 0.961 to 1.071. The implementation was removed. The additional
  fresh-versus-reused admission regression test remains.
* **Do not enable eager discovery globally.** Building the existing whole-store
  in-memory accelerator costs more than indexed lookup for these short sessions.
  Its existing explicit opt-in remains unchanged. Longer-lived workloads may
  amortise that cost; this experiment does not establish a universal winner.

No persistent cross-compilation cache or proof DAG was added. Exact context
invalidation and a demonstrated workload benefit would be prerequisites. Existing
sharing and bounded caches remain in place; no cached identity grants authority.

## Results

Median wall times, with seven paired runs per case. Ratios are medians of
paired candidate/baseline ratios, not ratios of the two displayed medians.
Intervals are seeded percentile bootstrap intervals over those seven ratios;
they describe these local fixtures, not general workloads.

| Case | Baseline | Candidate | Paired ratio (95% interval) |
| --- | ---: | ---: | ---: |
| Small search | 9.03 ms | 8.48 ms | 0.916 (0.837-1.020) |
| Wide search | 15.212 s | 1.232 s | 0.081 (0.080-0.083) |
| Unmatched subtrees | 53.87 ms | 6.54 ms | 0.122 (0.120-0.131) |
| Matching subtrees | 250.38 ms | 251.49 ms | 1.006 (0.994-1.014) |
| Rare query, 256 entries | 29.68 ms | 24.08 ms | 0.783 (0.751-0.875) |
| Rare query, 4,096 entries | 141.04 ms | 24.12 ms | 0.169 (0.158-0.171) |
| Broad query, 256 entries | 33.84 ms | 34.11 ms | 1.004 (1.002-1.061) |
| Broad query, 4,096 entries | 168.26 ms | 103.12 ms | 0.606 (0.596-0.701) |
| Eager index + queries, 4,096 entries | 236.12 ms | 236.87 ms | 0.998 (0.981-1.008) |

The broad 256-entry control has a small measured cost (0.27 ms between medians
over 64 queries); this is a tradeoff, not a speedup. Matching-heavy control is
essentially unchanged. The indexed path retains the larger rare-query and
large-store benefits, so the SQL change is kept. Eager construction takes about
237 ms on the candidate versus 24 ms for its ordinary rare-query case: do not
pay that setup cost by default for short sessions.

Median peak worker RSS falls from 65.78 to 55.13 MiB for wide search and from
43.83 to 28.53 MiB for rare queries at 4,096 entries. Matching-heavy RSS is
41.69 versus 42.14 MiB; no universal memory reduction is claimed.

## Method

Baseline: distribution `2a8e4271e1fc496f49282ef74b81a3640ce2d8d2`,
planner `53b6de2d67a42b04699e7e9f9ef56c900e070142`,
knowledge `bc1cbc1e26aca28f9bd49d12d6341e67e44cc108`.
Retained candidate: planner `e8a0a13a57d328f831185e33716ec50e1a41c43a`,
knowledge `1f04dd7160a69ee039edef08dd9091121751f624`.
Machine: Apple M4 Pro, 48 GiB RAM. Python/platform/SQLite versions and source
fingerprints are recorded in `results.json`.

Seven paired rounds use fresh Python processes, alternating baseline/candidate
order and a fixed hash seed. No benchmark-related test or build ran alongside
the final timings. Ordinary desktop/background activity was not disabled.
Worker timings include imports and engine work; fixture construction is excluded.
Each case requires identical output digests in every round and variant.
Peak RSS is recorded per worker (and separately for subprocesses), not sampled
allocation counts. It includes Python and imports.

The beam-search fixture fixes source terms and grows alternatives; an independent
synthetic oracle admits only identity replacements. It checks selected chains,
attempt order, costs and proposal counts, **not mathematical proof soundness**.
The separate real compiler integrations check actual proof replay. Matching uses
deep repeated terms with both hit-heavy and miss-heavy controls. Discovery grows
a generated store from 256 to 4,096 entries, checking rare and broad queries
against independently computed IDs. Eager-index timing includes index creation.
These are mechanism measurements, not a whole-application or frozen-corpus
speedup claim. No new knowledge law was authored or evaluated here.

## Validation

* Full planner unit suite: 171 passed.
* Store and incremental-store suites: 35 passed.
* Discovery accelerator suite: 4 passed.
* Core planning suite: 5 passed, including fresh/reused result equality,
  modified proof bytes, schema/semantics changes and stale source rejection.
* Cold semantic discovery: created its index and replayed the selected proof.
* Plan-session binding integration: proposals admitted and baseline retained
  without comparable performance evidence.

Both CLI integrations used the baseline release compiler; core implementation
remains byte-for-byte unchanged after rejecting the prefix experiment.

The all-knowledge suite was started but deliberately interrupted during unrelated
indexed-aggregate proof-generation tests; it is not reported as passing. Some
existing Python tests emit unclosed SQLite connection ResourceWarnings.
No lowering or executable semantics changed, so full native/GPU conformance was
not rerun for these Python engine changes.

## Reproduction

Create separate baseline and candidate directories, each with `planner/` and
`knowledge/` source checkouts at the pinned revisions. The baseline can use
`git archive` of the revisions above; the candidate uses this distribution's
submodule pins. From the candidate distribution:

```sh
python3 tools/bench_pipeline_work.py --baseline /path/to/baseline --candidate . \
  --rounds 7 --output /path/to/results.json
```

The harness creates private temporary stores and never changes the installed
knowledge snapshot. `--cases checker` additionally requires a release compiler
at each root's `ink` or `target/release/ink`. The preliminary rejected experiment
is archived separately in `rejected-prefix-results.json`; the default benchmark
does not claim that this removed implementation is present.
