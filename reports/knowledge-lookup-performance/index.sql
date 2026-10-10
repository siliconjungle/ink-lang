-- Disposable discovery/cache schema v1. Rebuilt from canonical Git objects.
-- Proof authority stays in the semantic core, including for cached witnesses.
PRAGMA foreign_keys = ON;

CREATE TABLE snapshots (
    id TEXT PRIMARY KEY,
    root TEXT NOT NULL
) STRICT;

CREATE TABLE entries (
    id TEXT PRIMARY KEY,
    kind TEXT NOT NULL CHECK (kind IN (
        'definition', 'theorem', 'rewrite', 'implementation',
        'representation', 'maintenance', 'bridge'
    )),
    semantics TEXT NOT NULL,
    result TEXT NOT NULL CHECK (json_valid(result)),
    parameters TEXT NOT NULL CHECK (json_valid(parameters)),
    conditions TEXT NOT NULL CHECK (json_valid(conditions))
) STRICT;
CREATE INDEX entry_lookup ON entries (semantics, kind, result);

CREATE TABLE members (
    snapshot_id TEXT REFERENCES snapshots (id),
    entry_id TEXT REFERENCES entries (id),
    witness TEXT NOT NULL CHECK (json_valid(witness)),
    PRIMARY KEY (snapshot_id, entry_id)
) STRICT;

CREATE TABLE dependencies (
    entry_id TEXT REFERENCES entries (id),
    dependency_id TEXT REFERENCES entries (id) DEFERRABLE INITIALLY DEFERRED,
    PRIMARY KEY (entry_id, dependency_id)
) STRICT;

CREATE TABLE types (
    entry_id TEXT REFERENCES entries (id),
    role TEXT CHECK (role IN ('parameter', 'result')),
    name TEXT,
    type TEXT NOT NULL CHECK (json_valid(type)),
    PRIMARY KEY (entry_id, role, name)
) STRICT;
CREATE INDEX types_lookup ON types (type, role, entry_id);

CREATE TABLE operations (
    entry_id TEXT REFERENCES entries (id),
    operation TEXT,
    PRIMARY KEY (entry_id, operation)
) STRICT;
CREATE INDEX operations_lookup ON operations (operation, entry_id);

CREATE TABLE effects (
    entry_id TEXT REFERENCES entries (id),
    effect TEXT,
    PRIMARY KEY (entry_id, effect)
) STRICT;
CREATE INDEX effects_lookup ON effects (effect, entry_id);

CREATE TABLE applicability (
    entry_id TEXT REFERENCES entries (id),
    position INTEGER CHECK (position >= 0),
    condition TEXT NOT NULL CHECK (json_valid(condition)),
    PRIMARY KEY (entry_id, position)
) STRICT;
CREATE INDEX applicability_lookup ON applicability (condition, entry_id);

CREATE TABLE names (
    name TEXT PRIMARY KEY,
    entry_id TEXT NOT NULL REFERENCES entries (id)
) STRICT;

-- Observation references are intentionally independent of the selected snapshot.
-- Costs never establish a proof premise or change mathematical membership.
CREATE TABLE observations (
    id TEXT PRIMARY KEY,
    program_id TEXT NOT NULL,
    plan_id TEXT NOT NULL,
    target TEXT NOT NULL CHECK (json_valid(target)),
    workload TEXT NOT NULL CHECK (json_valid(workload)),
    metrics TEXT NOT NULL CHECK (json_valid(metrics))
) STRICT;
CREATE INDEX observation_lookup ON observations (program_id, plan_id, target, workload);
