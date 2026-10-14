# Composed compact state protocol controls

The current compiler checked eight database-authored combinations over the already checked record/sum layout and preflight plan. `prepare-state-protocols.py --base-plan` now explores protocol choices over an existing checked implementation, counting depth relative to that starting plan. Source binding and every composed step still pass the ordinary checker.

Three fresh processes, nine rotated rounds, 4,096-row replacement histories. Candidate 4 uses compact commit metadata plus column events; control 0 has the same source/layouts and preflight actions with ordinary metadata/event retention. Both ordinary/prepared lanes and both frozen Frontier main patch lanes execute complete replies, versions, events and acknowledgements. Initial/final exact Ink snapshots, rollback and logical outcomes pass, including separate mixed-32 conformance.

Candidate/control ordinary ratios are **1.060 / 0.710 / 1.247**; prepared ratios **1.265 / 0.806 / 1.702**. Two processes regress, one improves. Ordinary Ink remains slower than Frontier in all three; prepared comparisons are mixed. These measurements do not authorize a default or selected implementation. They do not contradict retention-memory gains for longer unacknowledged event windows: this fixture acknowledges events immediately, and memory was not measured here.

Exact modules, admitted plan/proof packets, receipts, preparation manifest, harness and all raw data are retained. Shared host and substantial variation; no confidence intervals or all-metrics claim. Source schema includes arbitrary JSON metadata; the compact protocol changes do not eliminate its ordinary capture cost. Git revisions and compiler/harness hashes are in the raw receipts.
