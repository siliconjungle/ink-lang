# Historical representation scaling experiments

These measurements used the retired generic stateful representation executor.
Its active drivers and adapters have been removed. Reproduce them from the
recorded revisions, rather than interpreting these timings as ordinary compiled
Ink performance. New measurements use `bench/point-delta/standalone-aggregate.rs.txt`.

The archived preliminary samples were collected while multiple builds and other
work were active in this checkout. They establish exercised sizes and identify
large costs; they do not establish precise cross-revision speedup ratios.

`before.json` profiles the full constructor transport. `after-preliminary.json`
retains typed physical state. `after-readonly-preliminary.json` additionally avoids
logical snapshot transport on fixed source queries. The initial dominant cost was
execution plus repeated whole-state encoding/copying, not aggregate arithmetic.
The changed runtime retains immutable typed state and bounds changed private
storage before publication. Unchanged storage reuses its validated bounds by
constructor/scalar equality and child pointer identity.

`aggregate-preliminary.json` exercises 48, 256, 1024 and 2048 rows; direct, refresh,
sum delta and count delta; each query with 0/10/50/90/100% reads; five 100-call
samples; independent source replies/snapshots. Checking, initialization and generic
migration are outside steady state. The handwritten scanner excludes generic
ingress and snapshot validation. The final driver also includes an independent
handwritten maintained aggregate and separately times direct migrations.

Frozen admission requests, compiled sources and drivers are reproducible from
`tests/point_delta.rs`, `bench/point-delta/scaling.rs.txt`,
`bench/point-delta/aggregate.rs.txt` and `bench/point-delta/scaling_compile.py`.
Completed merged-main measurements and exact graph/toolchain provenance are in
[the final report](merged-main-2026-10-11/README.md); old losing candidates remain
archived. Compilation timing separates CLI checking, emission that repeats checking,
and an independently timed native compiler, with dependency builds excluded.
