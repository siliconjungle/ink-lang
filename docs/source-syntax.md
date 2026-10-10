# Complete source as proof data

`ink-source-syntax-v1` binds a database definition to the full checked module
and its resolved typed actions. It includes pure helper bodies, types, states,
events, keeps, action order, slots and instructions. Binding a program name,
source digest or only the changed expression would leave opportunities to prove
a fact about a different program.

The external `ink-knowledge/producers/source_syntax.py` producer reads
`emit-core` and `emit-actions` outputs and creates a small local database snapshot.
It supplies five ordinary datatype definitions and one literal program definition.
These are individual content-addressed entries, not installed compiler rules.
Per-program entries belong in the build's local database; they do not need to be
added to the shared catalogue. The immutable snapshot and dependency view support
offline replay.

```sh
ink emit-core example.ink -o core.json
ink emit-actions example.ink -o actions.json
python3 knowledge/producers/source_syntax.py core.json actions.json -o syntax
ink check-source-syntax example.ink --roles syntax/roles.json --view syntax/view.json
```

`emit-source-syntax` exports the independently reconstructed expected definitions
for inspection. The producer's Python encoder and the core's Rust encoder are
separate implementations. The checker admits the authenticated database view
through the unchanged proof kernel, then compares every grammar definition and
the program's exact literal definition. A well-typed, authentic definition of a
different image fails. Aliased roles, incompatible versions and hidden program
roots fail before returning the private `BoundSyntax` witness.

The encoding represents JSON nodes in a flat postorder table. Array elements
and object fields refer to earlier nodes. Balanced ordered trees store table
entries and references, avoiding the proof format's depth limit for wide modules.
Object keys are sorted, arrays retain their order, and strings contain their UTF-8
length and little-endian eight-byte words. Integers and float bit patterns retain
their complete width. The encoder permits unsigned integer wire values, bounds
input depth at 128 and construction at 100,000 terms. Large programs that exceed
these limits can still execute through the baseline; this interface returns an
explicit error. It does not increase any kernel or database limit.

This is a code-data correspondence boundary, not an executable logical
interpreter or a stateful replacement certificate. Source checking, elaboration,
the codec and the Rust proof kernel remain trusted. The typed reference runtime
does execute the resolved actions directly, but this binding does not prove that
execution refines a logical interpreter. Connecting actual primitive operations,
transactions and candidate implementations to that interpreter remains required.
No native speed improvement or universal optimisation claim follows from this
milestone.
