# Cheaper validation, owned capture and conservative selection

The JavaScript backend now compiles structural equality from checked types in
state expressions, sharing the existing pure-emission machinery. Equality keeps
the fixed semantics: contained float bits, declared record fields, sum tags and
ordered list elements. Scalar float equality still uses IEEE comparison.

State ingress compiles a capture traversal once per schema. Each public call
still validates scalars, enforces depth/cell bounds and allocates owned composite
values. Only the traversal is cached. Reusing or mutating a host object between
calls never reuses its captured values. Recursive representation converters also
resolve their fixed named schema once rather than rebuilding it at every node.

The knowledge producer can simplify ordinary action bodies from the exact
exported invariant and precondition equations. For example,
`examples/performance-invariant-guards.ink` has `requires unique(xs)` and a
redundant internal `unique(xs)` branch. The producer removes that branch and
supplies complete observation and next-state preservation proofs. The public
input guard still executes. Source initialisation, committed-state preservation
and restore checks remain. Invariants are not unconditional facts about an
intermediate state or nested call. The core semantics and proof calculus do not
change; producers are untrusted authoring tools.

Explicit offline JavaScript acquisition now runs three fresh processes and validates every
candidate before and after timing in each process. Candidates that fail any
process contribute no accepted observations. Selection requires a 10% gap
between the alternative's largest observed weighted cost and the baseline's
smallest. Every required phase must have at least three samples. This is an
empirical conservative guard, not a confidence bound or generalisation proof.
Full lifecycle ranking still includes supplied read/write/restore/migration costs
and optional measured memory limits. Missing comparable evidence retains baseline.

An optional `--measure-holdout` acquires only baseline plus the frozen training
choice. Disjoint typed inputs and identical objective weights are required.
The holdout may veto to baseline, but cannot search or pick a different candidate.
Formatting, unused record fields or numerically different JSON spellings of the
same binary32 value do not provide independent typed inputs. Correctness requires
ordinary proof replay and independent reference comparisons throughout.

The explicit multi-process and typed-holdout path uses bounded serial pure
JavaScript calls with JSON-compatible types. The independently developed
automatic planning path also supports Rust JSON calls and its own paired
uncertainty policy; it remains available after integration. Typed holdouts
decline other targets explicitly. It reports import, validation and emission separately,
but ranks warm complete calls and full output consumption. State lifecycle,
cold amortisation, migration acquisition and exact peak memory require external
observations. Existing externally supplied profiles keep their median policy.
Runtime profitability probes and removed learned search remain absent.

The [retained report](../reports/performance-generality-2026-10-13/README.md)
contains raw samples, artifacts, losses and proof/check receipts. The invariant
predicate is still quadratic; the new backend removes constant-factor overhead.
The capture comparison measures that mechanism alone. Neither establishes a
framework, DOM, all-JavaScript or latest-Frontier performance ranking.
