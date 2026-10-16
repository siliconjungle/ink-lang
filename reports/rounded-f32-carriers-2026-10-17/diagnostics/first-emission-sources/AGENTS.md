This repository owns JavaScript emission for checked Ink programs. Keep Ink's
core types and semantics unchanged. Reject unsupported capabilities explicitly.
Optimisation laws and representation choices belong in ink-knowledge;
search/cost selection belongs in ink-planner; profiling, scheduling, fallback
and bundle assembly belong in ink-runtime. Validate generated code against the
reference interpreter, including integer overflow and binary32 operation order.
Do not claim checked rewrites prove emitted JavaScript or target machine code.

Immutable keep retention is fixed deterministic execution support. Derive its
dependencies from the core's checked effects; invalidate on concrete root writes,
restore cached before-images on action failure and host rollback, and clear caches
on explicit restore. Exclude owned Buffer/Map descendants. Retained composites
remain private immutable source values: pure parameters never gain unique storage,
and every public boundary still returns detached owned values. Never retain mutable
host containers or cache thrown errors; a source Result Err is an ordinary value. Typed
bound calls may skip scalar ingress checks, but must capture composite inputs,
return owned outputs, preserve transactions and retain all committed events.
Private first-order constructor nodes are immutable by construction. Direct
recursive calls may replay only on the private depth sentinel, using the existing
explicit call stack; other errors propagate. Use the core term visitor and retain
stack-only emission when the optional lane exceeds the source-size limit.

Sealed pure-call preparation may delegate to bounded, lazily created helpers.
Preserve per-syntactic-site caches and transitive parameter stability masks;
arguments execute once in source order. Stable checks stay at their original lazy
position and thrown failures retry. Bound helper preparation depth (sixteen),
source/body work and emitted size; missing factories retain ordinary calls.
Retained owners must satisfy the core readonly-loan analysis, and no cached/input
value gains unique storage. Changing model weights/context must run fresh primals;
opacity never authenticates a prepared graph at an ABI boundary. This is literal
execution support, not rewrite or profitability authority.

Sequential value-loop preparation carries lexical stability into callbacks;
iteration indices, elements and carried state always have dynamic provenance.
Preserve shadowing, zero-iteration laziness, argument order and simultaneous
updates. `fold_until` executes its triggering step before stopping;
`repeat_until` tests before its step. Strict operand traversal must not lift
short-circuit operands or sum callbacks out of their branches. Retain ordinary
execution for owned loop state/captures, unsupported forms and bounded analysis
failure. The opportunity scan (512 visits, depth 32) only avoids useless wrappers;
it supplies neither semantic facts nor a profitable-selection claim. Instrument
ordinary and residual invocation bodies when measuring source validation; a
factory's construction is not a validation execution.

Mixed immutable records carry bounded field provenance through literal constructors,
projections and helper returns. Keep returned-value provenance separate from the
work needed to produce it: unused dynamic arguments/fields, guards and failures
still execute before any cached projection. Iteration bindings stay dynamic.
Mask sharing uses only private captured policies, never source/host object access.
Bound expanded alias summaries as well as traversal; exhaustion retains ordinary
execution. Do not raise source limits to accommodate verbose optional masks.

Optional/result callback preparation preserves selected-arm laziness and receiver
execution once. Only a complete immutable captured sum fixes its payload; changing
sums keep dynamic payloads, while a None arm's Unit is constant. Loop arguments
stay dynamic. Use checked sum views/constructors and ordinary ownership fallback;
strict defaults and thrown failure retry keep source behavior. Bounded opportunity
conditions and structural work estimates affect only explicit preparation, never
proof/evidence authority. Keep direct ordinary calls for non-reusable captured
policies, and share private policy predicates without evaluating source work.

Local immutable record fields can cross bounded readonly helper expansion and
value loops. Arguments/fields evaluate once before the callee; aliases, worker
captures and simultaneous updates retain snapshots. Expanded parameters stay
shared. Preserve owned/recursive/codec fallback, account for returned expression
bytes, and reserve stack headroom for core visitors. Failed optional emission
restores its lines/callbacks/type helpers/field mappings/fresh names and ordinary
admission budget. Structural expansion grants no equality or profitability fact.
Record merges inside expanded helpers evaluate only the selected branch and
assign fresh field slots after its work. Whole-value uses rebuild normally;
mutable merge slots must never become immutable-number or alias facts by name.

Normalized F32 carriers are rounded Numbers or exact NaN tags, not Number/range
facts. Normalize used scalar parameters at entry; borrowed composite fields keep
each first typed read at its source position, including repeated/throwing getters.
Scalar loop slots qualify only when initialization and every subsequent store
preserve the carrier; they still need mutable-value snapshots. Restore normalized
facts on optional-helper rollback with fresh names. Stateful bit carriers remain
separate. This grants no arithmetic rewrite, ownership or profitability authority.
