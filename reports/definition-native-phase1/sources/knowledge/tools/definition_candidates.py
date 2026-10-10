#!/usr/bin/env python3
"""Untrusted examples of proof-backed executable definition selection.

These are definitions, not native storage-policy assertions. The unchanged
compiler checks the whole library and the unconditional endpoint proof.
"""
import argparse
import hashlib
import json
import shutil
import subprocess
from pathlib import Path


def call(function, arguments):
    return {"Call": {"function": function, "arguments": arguments}}


def use(theorem, arguments):
    return {"Use": {"theorem": theorem, "arguments": arguments, "premises": []}}


def run(argv):
    result = subprocess.run([str(x) for x in argv], check=True, text=True, capture_output=True)
    return json.loads(result.stdout)


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--example", choices=["map", "row", "ledger"], required=True)
    ap.add_argument("--compiler", type=Path, required=True)
    ap.add_argument("--output-dir", type=Path, required=True)
    args = ap.parse_args()
    compiler = args.compiler.resolve()
    compiler_id = hashlib.sha256(compiler.read_bytes()).hexdigest()
    out = args.output_dir.resolve()
    if out.exists():
        raise SystemExit("candidate output directory must be fresh")
    root = Path(__file__).resolve().parents[1]
    base = root / {"map": "inductive", "row": "source-column-layout", "ledger": "source-column-ledger"}[args.example]
    # First check the original library. No Python proof interpretation grants authority.
    run([compiler, "verify-library", base / "lock.json"])
    lock = json.loads((base / "lock.json").read_text())
    names = json.loads((base / "names.json").read_text())
    var = lambda name: {"Var": name}
    if args.example == "map":
        datatype = names["List64"]
        params = [["xs", {"Data": datatype}]]
        result = {"Data": datatype}
        body = call(names["map_inc"], [call(names["map_double"], [var("xs")])])
        dependencies = [datatype, names["map_inc"], names["map_double"]]
        target = names["map_composed"]
        proof = use(names["map_composition"], [var("xs")])
        original = None
        name = "map_staged"
    else:
        rows, write = names["LayoutRows"], names["LayoutWrite"]
        params = [["rows", {"Data": rows}], ["write", {"Data": write}]]
        result = {"Data": rows}
        arguments = [var("rows"), var("write")]
        body = call(names["layout_decode"], [call(names["layout_column_step"], [call(names["layout_encode"], [var("rows")]), var("write")])])
        dependencies = [rows, write, names["layout_decode"], names["layout_column_step"], names["layout_encode"]]
        proof = {"Sym": {"Trans": [
            {"Call": {"function": names["layout_decode"], "arguments": [use(names["layout_step_exact"], arguments)]}},
            use(names["layout_roundtrip"], [call(names["layout_row_step"], arguments)]),
        ]}}
        original = names["layout_row_step"]
        name = "row_step_via_columns"
    obj = {"schema": 1, "semantics": lock["semantics"], "name": name,
           "dependencies": dependencies,
           "declaration": {"Function": {"params": params, "result": result, "body": body, "recursive": None}}}
    raw = json.dumps(obj, separators=(",", ":"), ensure_ascii=False).encode()
    identity = hashlib.sha256(raw).hexdigest()
    if original is None:
        original = identity
    else:
        target = identity
    out.mkdir(parents=True)
    shutil.copytree(base / "objects", out / "objects")
    (out / "objects" / f"{identity}.json").write_bytes(raw)
    lock["objects"].append(identity)
    names[name] = identity
    (out / "lock.json").write_text(json.dumps(lock, indent=2) + "\n")
    (out / "names.json").write_text(json.dumps(names, indent=2) + "\n")
    (out / "exports.json").write_text(json.dumps([original], indent=2) + "\n")
    baseline = run([compiler, "emit-definition", out / "lock.json", out / "exports.json", "-o", out / "baseline.rs"])
    package = {"schema": 1, "semantics": "ink-definition-selection-v1", "observations": "first-order-total-values-v1",
               "bundle_sha256": baseline["bundle_sha256"], "proposals": [{"original": original, "replacement": target, "proof": proof}]}
    (out / "selection.json").write_text(json.dumps(package, indent=2) + "\n")
    selected = run([compiler, "emit-definition", out / "lock.json", out / "exports.json", "--select", out / "selection.json", "-o", out / "selected.rs"])
    if compiler_id != hashlib.sha256(compiler.read_bytes()).hexdigest():
        raise SystemExit("compiler changed during candidate production")
    print(json.dumps({"status": "checked", "example": args.example, "compiler_sha256": compiler_id,
                      "original": original, "replacement": target, "baseline": baseline, "selected": selected,
                      "scope": "first-order returned-value equality and emitted definition bodies; not Ink source transactions, physical flat columns or a profitability claim"}))


if __name__ == "__main__":
    main()
