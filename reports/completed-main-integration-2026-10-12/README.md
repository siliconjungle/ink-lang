# Completed Ink work integration

This integration combines the completed adaptive pipeline work (`138f9f65`),
Frontier representations and scalable storage (`4747cc68`), the Frontier diff
benchmark (`ca8644f9`), database implementation selection from PR #17,
completed private snapshot sharing/field updates (`62f63f63`), and the
finished composable-state integration (`f8d0eb31`, PR #22).
It is based on remote main `7210c73e` and preserves the intervening language,
ownership, storage, incremental proof and durability changes.

`package-audit.json` records the ten independent package revisions. Every finished
Frontier package commit, and the adaptive planner/runtime commits, is an ancestor
of its recorded remote main revision. Root commits are integrated with their full
history rather than copied files.

Integration repairs preserve both Option operations, typed and dynamic storage,
shared opaque aliases through dense-map promotion, durable nested rollback,
query/transition exports, and source-bound host observers. Pure JavaScript helpers
omit the unused state fuel primitive. Early-exit fixtures use a non-reserved name.

Current proof packets live in `knowledge/research/frontier-extensions-current` and
`knowledge/research/scalable-state-current`. Historical packets retain their
recorded compiler identity. The current packets are re-authored and checked for
this compiler; hashes and archived receipts do not grant proof authority.

`adaptive-browser.json` contains the refreshed real Chrome/Apple Metal checks:
12 exact placement comparisons, overlapping real workers, owned inputs/outputs,
feedback, unavailable devices, invalid shaders, and failed workers. Offline
training and held-out observations are recorded separately. The accompanying
profile is bound to the exact emitted code, host, planner, device and observed
domains; it is optional and cannot justify a semantic rewrite.

This audit excludes the still-active tree/sequence and generalized batching
implementations. Snapshot sharing and composed-state work finished during the
audit and are included, with their original measurements and proof artifacts
preserved.

Fresh CI installs `python-sat==1.9.dev5` for representation authoring. The solver
produces candidate certificates; the existing kernel independently checks them.

The packed native compute script emits NDJSON; the state script emits a single
array. The parity helper now decodes the selected transport before checking exact
values, receipt counts and required actual GPU dispatch.

The stable partition producer is published separately as
`knowledge/producers/partition_representation.py`; the indexed cached-tree
producer retains its existing name. The combined knowledge snapshot retains all
7,551 authenticated objects from both snapshots and preserves twelve prior name
bindings under `integrated-prior/`. New producers use the installed namespace.

Compact journals retain bulk-operation before-images and durable outer rollback.
The combined JavaScript host also retains ordered-key invalidation and detached
state replies. The composed-state report is preserved at
`docs/evidence/composable-state/validation.json`.

`adaptive-browser-final.json` and its separate training/profile files repeat the
12 real-browser comparisons after adding immutable snapshot sharing.
