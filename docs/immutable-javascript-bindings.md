# Immutable JavaScript bindings

Literal JavaScript emission now reuses fresh immutable locals and parameters of
nonrecursive functions. Assigning another name to an already evaluated immutable
value needs no generated copy. This reduces source size while preserving each
operation, rounding point, argument evaluation and public value boundary.

Mutable loop fields, branch results and recursive call parameters retain fresh
snapshots. In particular, a simultaneous swap must capture both old values before
updating either slot. Reading a field or calling a helper is still evaluated at
its source position; the change does not merge such expressions or cache their
results. Prepared calls use the same rule, with fresh primals for changing inputs.

No source syntax, executable-core meaning, equality law or layout selection
changes. These are target-local binding facts, independent of the optimisation
database and of inferred arithmetic facts. The emitter and JavaScript engine
remain trusted implementation code.

The [retained investigation](../reports/immutable-bindings-2026-10-16/README.md)
compares generated text, collection and neural modules from unchanged checked
core bytes. Generated source is smaller; timings are mixed. This change does not
close the Pretext, Handwired or Freerange performance requirements. Full complex
text preparation/layout, device training and frozen specialization remain open.
