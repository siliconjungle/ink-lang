# Whole-row rollback evidence

The database now proves that undo restores complete row payloads and exact cached totals at every key after any finite sequence of writes. Both full-snapshot and reversible-difference journals work under the unchanged compiler. These are standalone mathematical libraries; they do not yet authorise a native representation or remove runtime work.

## What is proved

A row contains an arbitrary finite list of u64 payload words and a separate signed, unbounded contribution. A key contains two u64 words. The map is an override log: lookup returns the newest value for an equal key, and an absent-value override hides older values. This is an abstract finite map, rather than the sorted representation used by native storage.

A write saves the entire previous optional row and the candidate's cache undo value, installs the new optional row, and updates the total. The producer translates the actual save/apply/restore expressions from the existing version-4 certificate evidence. It does not substitute a hand-picked journal formula. Undo processes those frames in reverse write order.

The final theorem states:

```text
observe(rollback(execute(writes, machine)), key)
    = observe(rollback(machine), key)
```

Observation includes the complete optional row and exact total. The theorem quantifies over all finite write histories, all 128-bit keys, payloads, signed contributions, arbitrary initial totals and existing undo stacks. Repeated writes, deletion, absent deletion, insertion and reinsertion are included. The initial total need not equal the sum: exact restoration also holds for a machine whose cache already has an offset.

Supporting theorems establish key identity, double-write lookup restoration, inversion of the actual cache expressions, correspondence between map rollback and an observation-based rollback, and one-write restoration. Generalised induction lifts the one-write result to histories. The existing generic equality/induction checker and bounded bitvector checker verify these derivations; no new compiler axiom, solver, optimisation rule or native code is added.

Each package contains 96 content-addressed objects: the existing 63 and 33 new definitions/theorems. The two packages share many identities. They are in `knowledge/table-undo` and `knowledge/table-undo-snapshot`. `model.json` describes their scope and names their roots; it is documentation metadata, not a new compiler admission certificate. The generic library loader checks object meaning and proof validity. A future source bridge must independently bind the required model meanings before granting transformation authority.

## Checks

The complete suite passes 78 tests. The new independent BTreeMap oracle checks 840 forward row/cache observations, 840 rollback observations, 840 observations after extending an already nonempty undo stack, and 168 complete execution prefixes. Keys with identical low words and different high words are included. Payloads change independently of contributions.

Eight hostile packages rebuild every affected content identity and proof reference. They change key equality to ignore high words, save the new payload instead of the old one, omit cache restoration, or drop undo frames. Both journal variants reject them through proof checking, rather than stale hashes.

Six native fixtures compare 54 results against the reference interpreter, including 512-bit signed data, payload changes with unchanged contributions, repeated replacement/removal/reinsertion, absent removals, staged events and future updates. Twelve aborted invocations must leave byte-identical logical checkpoints. Every native invocation restores its checkpoint before continuing; six final snapshots match the independent reference bytes. Tree, row and column layouts are tested with promotion at one row for compact layouts, so the failed transaction crosses the threshold. Physical capacity/promotion need not roll back; logical observations must.

The [recorded audit](../reports/whole-row-undo-phase1/REPORT.md) checks both disk and bundled objects and reproduces both packages byte-for-byte under the preserved compiler.

## Remaining boundary

This does not prove the abstraction from native maps or source rows to the model. Payload words are mathematical data, not a verified source codec. Sorted enumeration, map-to-list sums, source projections, exact native arithmetic, ownership/lowering and the backend remain trusted. Event publication/order, poison errors, nested change control, transaction commit counters, migration and durability are outside this theorem. Native tests provide evidence for their tested cases, not universal proofs.

The next step is to connect actual source row codecs and map operations to a shared transition model, then prove transaction control/effects and safe physical replacement. The full language and performance requirements in PLAN.md remain open. Existing benchmark results remain the performance evidence because runtime output is unchanged.

## Reproduction

```sh
python3 dev.py test
target/release/lang verify-library knowledge/table-undo/lock.json
target/release/lang verify-library knowledge/table-undo-snapshot/lock.json
python3 tools/audit_table_undo.py
```

Reproduction additionally needs Python with `python-sat` (the recorded producer uses 1.9.dev5):

```sh
python3 tools/audit_table_undo.py --compiler build/table-undo-original/lang \
    --reproduce --python ../../work/toolchain/bitproof-venv/bin/python
```

The compiler path is a preserved local artifact, not distributed in Git. A newly built compatible checker can also validate/reproduce these packages; the audit records its actual SHA-256 and checks it stays unchanged throughout the run.
