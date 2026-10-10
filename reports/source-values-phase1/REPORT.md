# Runtime value correspondence and append-view review

On the 7508a4b distribution base, **184 distribution tests and 13 independently
built offline core tests pass**. Seven new bridge tests and two incremental-view
tests are included. Exact source and log identities are in metadata.json.

The sealed value witness is constructed from CheckedModule plus the verified
source model/certificate. It validates actual runtime inhabitants rather than
trusting a test's hand-built logical payload. Existing row-model and column
search/write/alignment/undo/native-storage tests now use that witness. The new
reference test checks 24 successful/aborted transaction prefixes through the
checked mathematical column encoding and decoding. Negative cases include
nominal identity, missing/extra fields, branch/member types, u32 width, UTF-8,
closed canonical syntax, source mismatch, full ID words, table order/duplicates
and resource budgets. A valid 10,001-bit runtime integer remains executable
while the unary logical bridge refuses its expansion.

Claude's c799245 knowledge work was reviewed and merged at 9366b0d with explicit
append/deletion/order limits. The 55-object closure (20 new entries), lock and
names reproduce byte for byte; the 35-view historical catalogue verifies under
the unchanged checker. The additional join test checks 256 append combinations
against independently enumerated matching pairs. A correctly rehashed false
join_right_append is rejected by ordinary proof admission. The payload-negation
counterexample is tested: joining 3 with 4 contributes 7, while -3 with 4
contributes 1, so payload negation is not signed deletion.

The proof kernel's acceptance rules and native lowering are unchanged by this
work. The codec/source translator, generated runtimes and toolchains remain
trusted. This does not prove arbitrary source action/control-flow, rollback,
event-publication or native storage refinement. No timing run or speedup is
claimed. Unary Int resource limits and dependence on the legacy specialised
row/maintenance interface remain open.

A concurrent authorised Ink chat published a canonical store/planner/runtime
restructuring during validation. This report preserves evidence on its stated
base. The reviewed work is published on separate review branches pending
adaptation to core/src and knowledge/research; it does not overwrite those
new main branches. The later integration must be validated against its exact
new pins and recorded separately.

Reproduce this historical review branch:

```sh
python3 dev.py test --locked --offline --no-fail-fast
python3 dev.py test --locked --offline --manifest-path core/Cargo.toml
python3 dev.py test --locked --offline --test source_values --test incremental_views
python3 dev.py build --locked --offline --bin ink
python3 knowledge/tools/catalogue.py verify --compiler target/debug/ink
python3 knowledge/tools/incremental_view_proofs.py build/incremental-review \
  --compiler target/debug/ink
```
