#!/usr/bin/env python3
"""Fail closed on missing target capabilities; optionally run conformance.

An inventory is a coverage contract, not a compiler-correctness proof. The actual
tests require worker receipts, literal artifacts, GPU dispatch and checkpoints.
The default audits unrestricted GPU coverage. Contract scope requires complete
CPU coverage and exact eligible GPU kernels, with explicit required-GPU errors.
"""
import argparse
import json
import os
from pathlib import Path
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]


def audit(catalog, scope):
    cpu = ["c", "rust", "javascript", "c-wasm", "rust-wasm"]
    gpu = ["webgpu", "wgpu"]
    if catalog["schema"] != 1 or catalog["complete_cpu_targets"] != cpu or catalog["gpu_targets"] != gpu:
        raise ValueError("parity target inventory changed or omits a required target")
    required_suites = {
        "lowering_parity", "generated_parity", "durability", "modules",
        "selected_checkpoint", "action_optimisation", "action_transitions",
        "numerical_state", "mixed_durability", "bend_features", "feature_parity",
        "temporary_lowering", "composed_storage_parity", "storage_destination_parity",
        "checked_physical_selection_parity", "representation_parity", "database_planning",
        "bulk_collection_optimisation", "packed_tables", "incremental_selection",
        "standalone_representation", "representations", "point_delta", "language_foundations", "generic_libraries", "law_author", "literal_collection_optimisation",
        "standalone_representation", "representations", "point_delta",
        "scalable_state", "scalable_projection", "source_contracts", "law_source", "database_source_algorithms", "pipeline_templates", "json_tooling", "value_invariants", "abstract_interfaces", "storage_regions", "checked_sets", "recursive_value_validation", "state_protocol",
    }
    if set(catalog["cpu_suites"]) != required_suites or len(catalog["cpu_suites"]) != len(required_suites):
        raise ValueError("missing, duplicate or unknown mandatory conformance suite")
    source = (ROOT / "core/src/core.rs").read_text()
    for enum, expected in catalog["source_variants"].items():
        body = re.search(r"pub enum " + enum + r" \{(.*?)\n\}", source, re.S).group(1)
        actual = re.findall(r"^    ([A-Z]\w*)[,(]", body, re.M)
        if actual != expected:
            raise ValueError(f"{enum} changed without updating the feature coverage inventory: {actual}")
    if set(catalog["source_variants"]) != {"Type", "Expr", "Statement"}:
        raise ValueError("missing source variant inventory")
    variants = set(catalog["source_variants"]["Type"]) - set(catalog["non_executable_types"])
    covered = set()
    ids = set()
    gaps = []
    for feature in catalog["features"]:
        if feature["id"] in ids:
            raise ValueError("duplicate feature")
        ids.add(feature["id"])
        if covered.intersection(feature["types"]):
            raise ValueError("type assigned to multiple feature entries")
        covered.update(feature["types"])
        if not feature["tests"] or not set(feature["tests"]).issubset(catalog["cpu_suites"]):
            raise ValueError("feature must have required conformance suites")
        for suite in feature["tests"]:
            if not (ROOT / "tests" / (suite + ".rs")).is_file():
                raise ValueError("missing conformance suite " + suite)
        if set(feature["targets"]) != set(cpu + gpu):
            raise ValueError("feature omits a required target: " + feature["id"])
        for target in cpu + (gpu if scope == "all" else []):
            capability = feature["targets"][target]
            if capability["status"] not in ("implemented", "partial", "unsupported"):
                raise ValueError("unknown capability status")
            if capability["status"] != "implemented":
                gaps.append({"feature": feature["id"], "target": target, "reason": capability["reason"]})
    if covered != variants:
        raise ValueError("uncovered executable source types: " + str(sorted(variants - covered)))
    contract=catalog["gpu_contract"]
    if contract["semantics"] != "eligible-pure-exact-v1" or set(contract["host_only"]) != {"stateful-transactions","arbitrary-size-integers","general-dynamic-maps","recursive-physical-definitions"}:
        raise ValueError("GPU execution contract changed without a coverage update")
    if set(contract["capabilities"]) != {"exact-u64","exact-binary32","actual-eligible-dispatch","required-gpu-no-fallback"}:
        raise ValueError("missing required GPU contract capability")
    for name,capability in contract["capabilities"].items():
        if not capability["tests"] or not set(capability["tests"]).issubset(catalog["cpu_suites"]):
            raise ValueError("GPU contract capability needs mandatory conformance")
        if set(capability["targets"]) != set(gpu):
            raise ValueError("GPU contract omits target")
        for target,value in capability["targets"].items():
            if value["status"] not in ("implemented","partial","unsupported"):
                raise ValueError("unknown GPU contract status")
            if scope != "cpu" and value["status"] != "implemented":
                gaps.append({"feature":name,"target":target,"reason":value.get("reason","missing required GPU contract")})
    return gaps



def partition(items, index, count):
    if count < 1 or not 0 <= index < count:
        raise ValueError("invalid conformance partition")
    return list(items)[index::count]


def run_test_partition(suites, index, count, env, receipt):
    command = ["cargo", "test", "--locked", "--no-run", "--message-format=json"]
    for suite in suites:
        command += ["--test", suite]
    build = subprocess.run(command, cwd=ROOT, env=env, stdout=subprocess.PIPE, text=True)
    if build.returncode:
        return build.returncode
    binaries = {}
    for line in build.stdout.splitlines():
        try:
            artifact = json.loads(line)
        except json.JSONDecodeError:
            continue
        if artifact.get("reason") == "compiler-artifact" and artifact.get("executable") and artifact.get("target", {}).get("name") in suites:
            binaries[artifact["target"]["name"]] = artifact["executable"]
    if set(binaries) != set(suites):
        raise ValueError("missing conformance test executable")
    receipt["test_partitions"] = {}
    for suite in suites:
        listing = subprocess.run([binaries[suite], "--list", "--format=terse"], cwd=ROOT, env=env, capture_output=True, text=True, check=True)
        tests = sorted(line[:-6] for line in listing.stdout.splitlines() if line.endswith(": test"))
        if not tests:
            raise ValueError("empty conformance test inventory: " + suite)
        selected = partition(tests, index, count)
        receipt["test_partitions"][suite] = {"all": tests, "selected": selected}
        for test in selected:
            print(f"Conformance {suite}/{test} partition {index}/{count}", flush=True)
            result = subprocess.run([binaries[suite], test, "--exact", "--nocapture", "--test-threads=1"], cwd=ROOT, env=env)
            if result.returncode:
                return result.returncode
    return 0


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--scope", choices=["all", "cpu", "contract"], default="all")
    parser.add_argument("--catalog", type=Path, default=ROOT / "tests/feature-parity.json")
    parser.add_argument("--run", action="store_true", help="run required compiled conformance after the inventory passes")
    parser.add_argument("--receipt", type=Path)
    parser.add_argument("--shard", choices=["all", "general", "representations", "contracts"], default="all",
                        help="fixed CPU suite partition; partial receipts identify exactly which suites ran")
    parser.add_argument("--partition-index", type=int, default=0)
    parser.add_argument("--partition-count", type=int, default=1)
    parser.add_argument("--partition-tests", action="store_true", help="partition individual tests instead of entire suites")
    args = parser.parse_args()
    partition([], args.partition_index, args.partition_count)
    if args.partition_count != 1 and args.scope != "cpu":
        raise ValueError("partitioned execution requires CPU scope")
    catalog = json.loads(args.catalog.read_text())
    gaps = audit(catalog, args.scope)
    if args.shard != "all" and args.scope != "cpu":
        raise ValueError("suite sharding requires CPU scope")
    suites = catalog["cpu_suites"]
    if args.shard == "general":
        suites = [s for s in suites if s not in ("representation_parity", "source_contracts")]
    elif args.shard == "representations":
        suites = [s for s in suites if s == "representation_parity"]
    elif args.shard == "contracts":
        suites = [s for s in suites if s == "source_contracts"]
    all_suites = suites
    if not args.partition_tests:
        suites = partition(suites, args.partition_index, args.partition_count)
    if not suites:
        raise ValueError("empty conformance suite partition")
    receipt = {"schema": 1, "scope": args.scope, "inventory": "failed" if gaps else "passed", "conformance": "not-run", "gaps": gaps}
    receipt.update(suite_shard=args.shard, suites=suites, all_suites=all_suites, partition_index=args.partition_index, partition_count=args.partition_count, partition_tests=args.partition_tests)
    for gap in gaps:
        print(f"FAIL {gap['target']}/{gap['feature']}: {gap['reason']}", file=sys.stderr)
    status = 1 if gaps else 0
    if not gaps and args.run:
        try:
            from pysat.solvers import Glucose3
        except ImportError as error:
            raise ValueError("--run requires the knowledge dependency python-sat==1.9.dev5") from error
        if not os.environ.get("INK_TEST_ZIG"):
            raise ValueError("--run requires INK_TEST_ZIG; skipping Wasm is forbidden")
        if {"bend_features", "standalone_representation", "point_delta"}.intersection(suites) and not os.environ.get("INK_TEST_LEAN"):
            raise ValueError("--run requires INK_TEST_LEAN for independent lifecycle proof checking")
        env = {**os.environ, "INK_PARITY_REQUIRE_ALL": "1", "INK_THREADS": "4"}
        if args.scope in ("all", "contract"):
            if not os.environ.get("INK_TEST_CHROME"):
                raise ValueError("all-target --run requires INK_TEST_CHROME for actual browser GPU checks")
            env["INK_TEST_WGPU"] = "1"
        command = ["cargo", "test", "--locked"]
        for suite in suites:
            command += ["--test", suite]
        if args.partition_tests:
            status = run_test_partition(suites, args.partition_index, args.partition_count, env, receipt)
        else:
            status = subprocess.run(command + ["--", "--nocapture", "--test-threads=1"], cwd=ROOT, env=env).returncode
        receipt["conformance"] = ("passed" if args.shard == "all" else "shard-passed") if status == 0 else "failed"
        if status == 0 and args.scope in ("all", "contract"):
            status = subprocess.run(["python3", "bench/gpu/prepare-lowering-parity-browser.py", env["INK_TEST_ZIG"]], cwd=ROOT, env=env).returncode
            if status == 0:
                status = subprocess.run(["node", "bench/gpu/lowering-parity-browser.mjs", env["INK_TEST_CHROME"]], cwd=ROOT, env=env).returncode
            receipt["conformance"] = "passed" if status == 0 else "failed"
    if args.receipt:
        args.receipt.parent.mkdir(parents=True, exist_ok=True)
        args.receipt.write_text(json.dumps(receipt, indent=2) + "\n")
    print(json.dumps({"scope": args.scope, "inventory": receipt["inventory"], "conformance": receipt["conformance"], "gaps": len(gaps)}))
    return status


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (KeyError, ValueError, AttributeError) as error:
        print("Invalid parity inventory: " + str(error), file=sys.stderr)
        sys.exit(2)
