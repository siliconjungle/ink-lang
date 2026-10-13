#!/usr/bin/env python3
"""Summarise frozen process cohorts without combining implementation epochs."""
import argparse
import json
import statistics
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
REPORTS = ROOT / "reports/frontier-json-2026-10-13"
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--process", type=int, nargs="+", required=True)
parser.add_argument("--output", type=Path, required=True)
args = parser.parse_args()
groups = defaultdict(lambda: defaultdict(list))
sources = []
provenance = None
sizes = None
for process in args.process:
    paths = [REPORTS / f"state-targeted-{mode}-4096-{process}.json"
             for mode in ("replace", "mixed", "read-heavy")]
    paths.append(REPORTS / f"json-{process}.json")
    for path in paths:
        data = json.loads(path.read_text())
        if data["instrumented"] or not data["validation"]:
            raise ValueError(f"Unvalidated or instrumented report: {path}")
        current = data["provenance"]
        # File identities and repository revisions bind the implementation epoch;
        # captured_at necessarily differs across fresh processes.
        binding = {key: current[key] for key in ("hashes", "revisions", "target", "node")}
        if provenance is None:
            provenance = binding
        elif binding != provenance:
            raise ValueError(f"Different implementation/target epoch: {path}")
        if "sizes" in data:
            if sizes is not None and sizes != data["sizes"]:
                raise ValueError("Wire sizes changed between processes")
            sizes = data["sizes"]
        sources.append(str(path.relative_to(ROOT)))
        for row in data["measurements"]:
            key = (row.get("workload", row.get("operation")),
                   row.get("rows", row.get("fields")), row["lane"])
            groups[key][process].append(int(row["elapsed_ns"]) / row["calls"])

measurements = []
for (workload, size, lane), processes in sorted(groups.items()):
    if set(processes) != set(args.process):
        raise ValueError(f"Missing process in cohort: {workload}, {size}, {lane}")
    medians = [statistics.median(values) for values in processes.values()]
    measurements.append(dict(workload=workload, size=size, lane=lane,
        median_ns_per_call=statistics.median(medians),
        process_medians_ns=dict(zip(map(str, processes), medians)),
        process_median_min_ns=min(medians), process_median_max_ns=max(medians)))
result = dict(schema=1, status="all-metrics target unmet", provenance=provenance,
    processes=args.process, source_reports=sources, measurements=measurements,
    sizes=sizes, aggregation="Median of per-process medians of rotated timing rounds",
    limits=["Shared development host; no exclusive CPU reservation",
            "Database indexed state is a supplied checked alternative, not the default selection",
            "JSON binary and Frontier patch formats have different contracts",
            "No equivalent startup or peak-memory ranking; no general Ink JSON snapshot diff"])
args.output.parent.mkdir(parents=True, exist_ok=True)
args.output.write_text(json.dumps(result, indent=2) + "\n")
print(args.output)
