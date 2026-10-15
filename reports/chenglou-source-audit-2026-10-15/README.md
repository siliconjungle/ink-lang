# Pinned source inventory

`inventory.json` records every tracked file at the three exact upstream revisions,
including file hashes, subsystem classification and roadmap stages. Symlinks are
hashed as link text. Generate with `tools/audit_chenglou_sources.py --help`.

This inventory makes omissions visible; it is not a claim that every file has been
semantically reviewed or that its ideas have been ported. Current implementations
and remaining acceptance work are tracked in `docs/chenglou-optimisation-programme.md`.

Reviewed mechanisms include Handwired packed Boolean circuits and numerical
restrictions; Freerange branch narrowing, exclusions and explicit unknowns; and
Pretext preparation reuse and deferred materialisation. Initial checked word-fact
and numeric-table implementations are retained separately. Broader circuit/AD,
precision, Unicode layout, caching and placement work is still open. Authored and
learned arithmetic can share a graph without making arbitrary discrete code
meaningfully differentiable.
