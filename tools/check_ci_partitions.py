#!/usr/bin/env python3
"""Require every CI job and the exact disjoint union of conformance partitions."""
import json
import os
from pathlib import Path
import sys
from check_feature_parity import partition

COUNTS = {"general": 6, "contracts": 3, "representations": 4}


def check(receipts, catalog):
    expected = {
        "general": [s for s in catalog["cpu_suites"] if s not in ("source_contracts", "representation_parity")],
        "contracts": ["source_contracts"],
        "representations": ["representation_parity"],
    }
    seen = {}
    for receipt in receipts:
        shard = receipt["suite_shard"]
        index = receipt["partition_index"]
        count = COUNTS[shard]
        key = (shard, index)
        if key in seen or not 0 <= index < count:
            raise ValueError("duplicate or invalid partition")
        if receipt["partition_count"] != count or receipt["scope"] != "cpu" or receipt["inventory"] != "passed" or receipt["conformance"] != "shard-passed" or receipt["gaps"]:
            raise ValueError("failed or incompatible partition receipt")
        individual = shard != "general"
        if receipt["partition_tests"] != individual or receipt["all_suites"] != expected[shard]:
            raise ValueError("changed partition inventory")
        selected = expected[shard] if individual else partition(expected[shard], index, count)
        if receipt["suites"] != selected:
            raise ValueError("missing or extra suite")
        if individual:
            if set(receipt["test_partitions"]) != set(selected):
                raise ValueError("missing test inventory")
            for suite, tests in receipt["test_partitions"].items():
                names = tests["all"]
                if not names or names != sorted(set(names)) or tests["selected"] != partition(names, index, count):
                    raise ValueError("missing, duplicate or changed test partition")
        seen[key] = receipt
    if set(seen) != {(shard, index) for shard, count in COUNTS.items() for index in range(count)}:
        raise ValueError("missing conformance partition")
    for shard in ("contracts", "representations"):
        suite = expected[shard][0]
        inventories = [seen[(shard, i)]["test_partitions"][suite]["all"] for i in range(COUNTS[shard])]
        if any(names != inventories[0] for names in inventories):
            raise ValueError("test inventories differ across workers")
    print(f"Complete conformance: {len(catalog['cpu_suites'])} suites, {len(seen)} disjoint partitions")


if __name__ == "__main__":
    jobs = json.loads(os.environ["INK_JOB_RESULTS"])
    if not jobs or any(job["result"] != "success" for job in jobs.values()):
        raise SystemExit("Every required job must finish successfully")
    receipts = []
    for path in Path(sys.argv[1]).rglob("*.json"):
        # Evidence artifacts also contain program JSON; only exact audit files count.
        if path.name.startswith(("cpu-conformance-", "cpu-contracts-", "cpu-representations-")):
            receipts.append(json.loads(path.read_text()))
    check(receipts, json.loads(Path("tests/feature-parity.json").read_text()))
