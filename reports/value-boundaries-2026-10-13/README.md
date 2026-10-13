# Value-boundary lifecycle evidence

`measurements.json` records the native ABI `List<u32>` boundary study from
`abi/examples/value_boundaries.rs`: JSON ingress, materialisation, validated
borrowing, indexing and flat numeric packing. Construction, resident reads and
complete construction-plus-read lifecycles are distinct phases. They cannot be
ranked interchangeably. These are a bounded numeric fixture, not arbitrary JSON
documents or a Frontier comparison.

`database-selection.json` binds the exact ABI and fixture source fingerprints,
target, shape, phase, immutable observation IDs and knowledge snapshot. The
generic representation planner consumes these measurements; a missing comparable
phase retains the baseline. Peak memory is unmeasured, so a measured memory
constraint cannot choose an alternative from this report. Indexed auxiliary
storage is four bytes per element; that is not process peak memory.

The saved measurements are an earlier development epoch, independent of the
later JavaScript compact transport and codec experiments. Codec/backend tests
establish operational conformance; cost observations do not discharge semantic
proof obligations.
