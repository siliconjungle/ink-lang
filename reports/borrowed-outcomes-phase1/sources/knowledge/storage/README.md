# Native table storage policies

These typed policies select contiguous row or column buffers for `Items` and pin the existing version-4 maintenance certificate. The `small` policies promote to BTreeMap on insertion beyond 256 entries; `flat` policies never promote. They are selectable under one compiler through `emit-state --storage FILE`.

These files are **not proofs of the physical implementations**. Schema/name/limit/certificate-identity checking is separate from the existing cache arithmetic/history proofs. Native storage, promotion and ownership remain trusted lowering, tested against independent observations. Policies contain no arbitrary Rust code. See [the design and limits](../../docs/compact-storage.md) and [the controlled comparison](../../reports/ordered-storage-phase1/REPORT.md).

The database supplies choices and thresholds; the compiler does not infer a fastest policy. Large mixed updates can make permanently flat storage expensive. Automatic profiling/selection and general verified physical representation objects remain unfinished.
