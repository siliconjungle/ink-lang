# Database-owned loop relations

`knowledge/libraries/local-relations.ink` supplies ordinary general laws for
ordered pure folds. A preserved observer is a frame; a checked relation between
two evolving states permits different physical and logical steps. Generalized
induction carries both initial states. Every concrete instance must establish its
step assumption under the actual relation and, for `foldl_relates`, the actual
element acceptance predicate. False frames and discarding implementations reject.

The record instance changes one field while retaining another. The buffer/list
instance relates owned push to immutable append through the frozen sequence.
`storage-observations.ink` additionally supplies element-validity preservation
and sequence observations. These facts now prove successful refined-element
copying through an owned record accumulator, including calls from state changes.
They are database mathematics, not a recognized buffer-copy strategy.

The general equality checker transports a true fixed `value:equal` predicate to
exact identity of its operands, including after beta reduction of a relation
callback. This is a general checking extension using fixed structural equality,
not a theorem-name whitelist. IEEE scalar `binary:==` grants no raw-bit identity.
Derived-fact, proof-work and nesting limits remain bounded. Ordinary typed aliases,
raw float payloads and missing relational premises have independent regressions.

The [frame-rule reference](https://www.cs.cmu.edu/afs/cs.cmu.edu/project/fox-19/member/jcr/www15818As2011/ch1.pdf)
motivates local reasoning. This implementation covers pure ordered loops, not the
full action-region frame calculus. It grants no event or write reordering.
Intermediate action reads, errors, rollback, versions and event order still use
the existing source-bound whole-action obligations. Borrow lifetimes, footprint
separation and compositional action/loop relations remain required.

`knowledge/libraries/incremental-laws.ink` also composes both-input join deltas:
the change/change contribution is retained, including when both old inputs are
empty. Signed exact-integer contributions support deletion cancellation. These
laws reuse existing map/filter/group/join/sum proofs and the general arithmetic
checker; no maintenance case was added to the compiler. The algebra is informed
by [DBSP](https://www.vldb.org/pvldb/vol16/p1601-budiu.pdf). Executable maintenance,
future histories, cache composition, migration and profitability still require
their separate source-bound representation proofs and measurements.
