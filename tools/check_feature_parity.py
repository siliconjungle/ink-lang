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


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--scope", choices=["all", "cpu", "contract"], default="all")
    parser.add_argument("--catalog", type=Path, default=ROOT / "tests/feature-parity.json")
    parser.add_argument("--run", action="store_true", help="run required compiled conformance after the inventory passes")
    parser.add_argument("--receipt", type=Path)
    args = parser.parse_args()
    catalog = json.loads(args.catalog.read_text())
    gaps = audit(catalog, args.scope)
    receipt = {"schema": 1, "scope": args.scope, "inventory": "failed" if gaps else "passed", "conformance": "not-run", "gaps": gaps}
    for gap in gaps:
        print(f"FAIL {gap['target']}/{gap['feature']}: {gap['reason']}", file=sys.stderr)
    status = 1 if gaps else 0
    if not gaps and args.run:
        if not os.environ.get("INK_TEST_ZIG"):
            raise ValueError("--run requires INK_TEST_ZIG; skipping Wasm is forbidden")
        env = {**os.environ, "INK_PARITY_REQUIRE_ALL": "1", "INK_THREADS": "4"}
        if args.scope in ("all", "contract"):
            if not os.environ.get("INK_TEST_CHROME"):
                raise ValueError("all-target --run requires INK_TEST_CHROME for actual browser GPU checks")
            env["INK_TEST_WGPU"] = "1"
        command = ["cargo", "test", "--locked"]
        for suite in catalog["cpu_suites"]:
            command += ["--test", suite]
        status = subprocess.run(command + ["--", "--nocapture", "--test-threads=1"], cwd=ROOT, env=env).returncode
        receipt["conformance"] = "passed" if status == 0 else "failed"
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
