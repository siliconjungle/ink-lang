# Unpromoted broad-wrapper measurements

These complete receipts retain the experiments that constrained the implementation.
They were collected with the earlier 16,384-call / 100 ms warmup and 12 ms batch
settings. They are not accepted rollout receipts under the current policy.

- `broad-learning`: one Chrome forecast-8 process regressed 43.9%; the other two
  improved. Every Node 22/26 case passed. The broader fixed public wrapper was
  dropped for structured results instead of changing the regression budget.
- `broad-boundaries`: one Node 26 shift-public-100 A/A ratio was 0.869, so the run
  was inconclusive even though candidate results stayed within the budget.
- `broad-boundaries-repeat`: a complete repeat hit a Chrome shift-prepared-8 A/A
  ratio of 1.176. Candidate results stayed within the budget.

The implementation comes from JavaScript package
`ef4686f9ced95c55730fcf4ed1d9a653af96b543` linked into distribution
`7c13d5291ba7336cd1db1e21ffab42e7d387ce13`. That distribution commit retains the
exact measurement tools and policy bound by these receipts. Candidate artifacts
are compressed exact measured bytes. The repeated boundary candidate is identical
to the first boundary candidate.

`inputs-config.json` and `inputs-workload.mjs` retain the exact thirteen-case
comparison inputs. To stage a diagnostic replay, place them as `config.json` and
`workload.mjs` in a sibling directory of `bench/functionality/call-boundaries`,
with copies/links of the unchanged `source.ink` and `baseline.mjs` from that
folder. This preserves the adapter's relative worker import. The forecast/learning
comparison uses the unchanged `bench/functionality/engine-gate` config and inputs.
Keep each receipt's original policy and settings; do not combine observations
across compiler or methodology epochs. Diagnostic replay cannot promote an artifact.

The final same-artifact floor also exposed the old relative-only A/A rule:
`strict-relative-prepared.json.gz` is blocked by a 3.5 ns scalar control delta
(about 19% of a very small baseline), while every candidate delta is within the
existing 20 ns absolute regression budget. `strict-relative-policy.mjs.gz` is its
exact hash-checked policy source; the config is the current `config.json`, and
the candidate bytes equal `prepared-baseline.mjs`. The release policy applies
the same absolute floor to controls and candidates. Tests retain rejection of
large noise and real regressions. The full release matrices were rerun, rather
than relabelling this blocked receipt.
