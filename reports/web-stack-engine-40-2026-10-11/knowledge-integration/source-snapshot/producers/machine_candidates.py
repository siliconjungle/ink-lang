#!/usr/bin/env python3
"""External persistent-state packages; no compiler law recognises these examples."""
import argparse
import hashlib
import json
import subprocess
from pathlib import Path

SEMANTICS = "first-order-inductive-equality-v1"
V = lambda x: {"Var": x}
DATA = lambda x: {"Data": x}
U = lambda x: {"U64": x}
BOOL = lambda x: {"Bool": x}


def call(f, args): return {"Call": {"function": f, "arguments": args}}
def ctor(d, i, args): return {"Construct": {"datatype": d, "constructor": i, "arguments": args}}
def refl(t): return {"Refl": t}
def hyp(i=0): return {"Hypothesis": i}
def congruence(f, ps): return {"Call": {"function": f, "arguments": ps}}
def use(t, args): return {"Use": {"theorem": t, "arguments": args, "premises": []}}
def trans(a, b): return {"Trans": [a, b]}
def convert(a, b): return {"Convert": {"from": a, "to": b}}
def binary(op, a, b): return {"Binary": {"op": op, "left": a, "right": b}}
def choose(c, t, f): return {"If": {"condition": c, "on_true": t, "on_false": f}}
def match(t, bindings, body): return {"Match": {"scrutinee": t, "branches": [{"bindings": bindings, "body": body}]}}


class Store:
    def __init__(self, base=None):
        if base:
            self.lock = json.loads((base / "lock.json").read_text())
            self.names = json.loads((base / "names.json").read_text())
            self.objects = {p.stem: p.read_bytes() for p in (base / "objects").glob("*.json")}
        else:
            self.lock = {"schema": 1, "semantics": SEMANTICS, "objects": []}
            self.names, self.objects = {}, {}

    def add(self, name, declaration, deps):
        obj = {"schema": 1, "semantics": SEMANTICS, "name": name,
               "dependencies": list(dict.fromkeys(deps)), "declaration": declaration}
        raw = json.dumps(obj, separators=(",", ":"), ensure_ascii=False).encode()
        id = hashlib.sha256(raw).hexdigest()
        self.objects[id] = raw
        self.lock["objects"].append(id)
        self.names[name] = id
        return id

    def datatype(self, name, constructors, deps=()):
        return self.add(name, {"Datatype": {"constructors": [{"name": n, "fields": f} for n, f in constructors]}}, deps)

    def fn(self, name, params, result, body, deps=(), recursive=None):
        return self.add(name, {"Function": {"params": params, "result": result, "body": body, "recursive": recursive}}, deps)

    def induction(self, name, params, source, target, bindings, case_source, case_target, deps):
        proof = {"Induction": {"variable": "logical", "from": source, "to": target,
                               "cases": [{"bindings": bindings, "proof": convert(case_source, case_target)}]}}
        return self.add(name, {"Theorem": {"params": params, "conditions": [], "from": source, "to": target, "proof": proof}}, deps)


def counter(s):
    event = s.datatype("MachineEvent", [("Event", ["U64", "U64"])])
    events = s.datatype("MachineEvents", [("Nil", []), ("Cons", [DATA(event), "SelfType"])], [event])
    logical = s.datatype("LogicalCounter", [("State", ["U64", "U64", DATA(events)])], [events])
    physical = s.datatype("PhysicalCounter", [("State", [DATA(events), "U64", "U64"])], [events])
    reply = s.datatype("MachineReply", [("Committed", ["U64", "U64"]), ("Aborted", []), ("CommitExhausted", [])])
    nil = ctor(events, 0, [])
    append = s.fn("append_machine_event", [["events", DATA(events)], ["event", DATA(event)]], DATA(events),
                  {"Match": {"scrutinee": V("events"), "branches": [
                      {"bindings": [], "body": ctor(events, 1, [V("event"), nil])},
                      {"bindings": ["head", "tail"], "body": ctor(events, 1, [V("head"), {"SelfCall": [V("tail"), V("event")]}])},
                  ]}}, [events, event], recursive=0)
    enc = s.fn("counter_encode", [["logical", DATA(logical)]], DATA(physical),
               match(V("logical"), ["count", "commit", "events"], ctor(physical, 0, [V("events"), V("commit"), V("count")])), [logical, physical])
    dec = s.fn("counter_decode", [["physical", DATA(physical)]], DATA(logical),
               match(V("physical"), ["events", "commit", "count"], ctor(logical, 0, [V("count"), V("commit"), V("events")])), [logical, physical])
    fields = ["count", "commit", "events"]
    c = ctor(logical, 0, [V(x) for x in fields])
    roundtrip = s.induction("counter_roundtrip", [["logical", DATA(logical)]], call(dec, [call(enc, [V("logical")])]), V("logical"),
                            fields, call(dec, [call(enc, [c])]), c, [logical, dec, enc])
    next_count, next_commit = binary("+", V("count"), V("amount")), binary("+", V("commit"), U(1))
    exhausted = binary("==", V("commit"), U(2**64 - 1))
    stop = binary("||", V("abort"), exhausted)
    next_events = call(append, [V("events"), ctor(event, 0, [next_count, next_commit])])
    values = [choose(stop, V("count"), next_count), choose(stop, V("commit"), next_commit), choose(stop, V("events"), next_events)]
    logical_step = s.fn("counter_logical_step", [["state", DATA(logical)], ["abort", "Bool"], ["amount", "U64"]], DATA(logical),
                       match(V("state"), fields, ctor(logical, 0, values)), [logical, event, append])
    physical_step = s.fn("counter_physical_step", [["state", DATA(physical)], ["abort", "Bool"], ["amount", "U64"]], DATA(physical),
                        match(V("state"), ["events", "commit", "count"], ctor(physical, 0, [values[2], values[1], values[0]])), [physical, event, append])
    args = [V("abort"), V("amount")]
    step_proof = s.induction("counter_step_commutes", [["logical", DATA(logical)], ["abort", "Bool"], ["amount", "U64"]],
                            call(physical_step, [call(enc, [V("logical")]), *args]), call(enc, [call(logical_step, [V("logical"), *args])]),
                            fields, call(physical_step, [call(enc, [c]), *args]), call(enc, [call(logical_step, [c, *args])]), [logical, enc, logical_step, physical_step])
    response = choose(V("abort"), ctor(reply, 1, []), choose(exhausted, ctor(reply, 2, []), ctor(reply, 0, [next_count, next_commit])))
    logical_reply = s.fn("counter_logical_reply", [["state", DATA(logical)], ["abort", "Bool"], ["amount", "U64"]], DATA(reply), match(V("state"), fields, response), [logical, reply])
    physical_reply = s.fn("counter_physical_reply", [["state", DATA(physical)], ["abort", "Bool"], ["amount", "U64"]], DATA(reply), match(V("state"), ["events", "commit", "count"], response), [physical, reply])
    reply_proof = s.induction("counter_reply_commutes", [["logical", DATA(logical)], ["abort", "Bool"], ["amount", "U64"]],
                             call(physical_reply, [call(enc, [V("logical")]), *args]), call(logical_reply, [V("logical"), *args]),
                             fields, call(physical_reply, [call(enc, [c]), *args]), call(logical_reply, [c, *args]), [logical, enc, logical_reply, physical_reply])
    queries = []
    for i, name in enumerate(fields):
        result = DATA(events) if name == "events" else "U64"
        ql = s.fn(f"logical_{name}", [["state", DATA(logical)]], result, match(V("state"), fields, V(name)), [logical, *([events] if name == "events" else [])])
        qp = s.fn(f"physical_{name}", [["state", DATA(physical)]], result, match(V("state"), ["events", "commit", "count"], V(name)), [physical, *([events] if name == "events" else [])])
        theorem = s.induction(f"{name}_commutes", [["logical", DATA(logical)]], call(qp, [call(enc, [V("logical")])]), call(ql, [V("logical")]),
                              fields, call(qp, [call(enc, [c])]), call(ql, [c]), [logical, enc, qp, ql])
        queries.append((name, ql, qp, theorem, []))
    return dict(logical=logical, physical=physical, encode=enc, decode=dec, roundtrip=roundtrip,
                step=logical_step, physical_step=physical_step, step_proof=step_proof,
                reply=logical_reply, physical_reply=physical_reply, reply_proof=reply_proof,
                arg_sorts=["Bool", "U64"], op_name="change", queries=queries,
                case_bindings=fields)


def table(s):
    n = s.names
    logical, physical = n["LayoutRows"], n["LayoutColumns"]
    unit = s.datatype("MachineUnit", [("Unit", [])])
    logical_reply = s.fn("row_unit_reply", [["state", DATA(logical)], ["write", DATA(n["LayoutWrite"])]], DATA(unit), ctor(unit, 0, []), [logical, n["LayoutWrite"], unit])
    physical_reply = s.fn("column_unit_reply", [["state", DATA(physical)], ["write", DATA(n["LayoutWrite"])]], DATA(unit), ctor(unit, 0, []), [physical, n["LayoutWrite"], unit])
    query = s.fn("column_query", [["state", DATA(physical)], ["key", DATA(n["TableKey128"])]], DATA(n["LayoutOptionalRow"]),
                 call(n["layout_row_lookup"], [call(n["layout_decode"], [V("state")]), V("key")]),
                 [physical, n["TableKey128"], n["LayoutOptionalRow"], n["layout_decode"], n["layout_row_lookup"]])
    return dict(logical=logical, physical=physical, encode=n["layout_encode"], decode=n["layout_decode"], roundtrip=n["layout_roundtrip"],
                step=n["layout_row_step"], physical_step=n["layout_column_step"], step_proof=n["layout_step_exact"],
                reply=logical_reply, physical_reply=physical_reply, reply_proof=None, arg_sorts=[DATA(n["LayoutWrite"])], op_name="write",
                queries=[("lookup", n["layout_row_lookup"], query, None, [DATA(n["TableKey128"])] )])


def package(s, info, original):
    l = info["logical"]
    p = l if original else info["physical"]
    identity = s.fn("logical_state_identity", [["state", DATA(l)]], DATA(l), V("state"), [l])
    enc, dec = (identity, identity) if original else (info["encode"], info["decode"])
    left = s.fn("machine_relation_left", [["physical", DATA(p)], ["logical", DATA(l)]], DATA(p), V("physical"), [p, l])
    right = s.fn("machine_relation_right", [["physical", DATA(p)], ["logical", DATA(l)]], DATA(p), call(enc, [V("logical")]), [p, l, enc])
    logical, physical = V("logical"), V("physical")
    snapshot = hyp() if original else trans(congruence(dec, [hyp()]), use(info["roundtrip"], [logical]))
    arguments = [V(f"arg{i}") for i in range(len(info["arg_sorts"]))]
    step = info["step"] if original else info["physical_step"]
    preserve = congruence(step, [hyp(), *[refl(a) for a in arguments]])
    if not original: preserve = trans(preserve, use(info["step_proof"], [logical, *arguments]))
    reply = info["reply"] if original else info["physical_reply"]
    if original:
        reply_proof = congruence(reply, [hyp(), *[refl(a) for a in arguments]])
    elif info["reply_proof"]:
        reply_proof = trans(congruence(reply, [hyp(), *[refl(a) for a in arguments]]), use(info["reply_proof"], [logical, *arguments]))
    else:
        reply_proof = convert(call(reply, [physical, *arguments]), call(info["reply"], [logical, *arguments]))
    queries = []
    for name, ql, qp, theorem, args in info["queries"]:
        arguments = [V(f"arg{i}") for i in range(len(args))]
        if original:
            qp, proof = ql, congruence(ql, [hyp(), *[refl(a) for a in arguments]])
        elif theorem:
            proof = trans(congruence(qp, [hyp(), *[refl(a) for a in arguments]]), use(theorem, [logical, *arguments]))
        else:
            proof = congruence(ql, [snapshot, *[refl(a) for a in arguments]])
        queries.append(dict(name=name, logical=ql, physical=qp, proof=proof))
    initial_args = [call(enc, [logical]), logical]
    return dict(schema=1, semantics="ink-relational-machine-v1", observations="first-order-sequential-state-values-v1", bundle_sha256="",
                logical_state=DATA(l), physical_state=DATA(p), encode=enc, decode=dec,
                relations=[dict(left=left, right=right)],
                initialisation=[convert(call(left, initial_args), call(right, initial_args))], snapshot=snapshot,
                operations=[dict(name=info["op_name"], logical_step=info["step"], physical_step=step, logical_reply=info["reply"], physical_reply=reply,
                                 preservation=[preserve], reply=reply_proof)], queries=queries)


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--example", choices=["row", "ledger", "counter"], required=True)
    ap.add_argument("--representation", choices=["original", "alternative"], default="alternative")
    ap.add_argument("--compiler", required=True, type=Path)
    ap.add_argument("--output-dir", required=True, type=Path)
    args = ap.parse_args()
    compiler, out = args.compiler.resolve(), args.output_dir.resolve()
    if out.exists(): raise SystemExit("machine candidate directory must be fresh")
    original_compiler = hashlib.sha256(compiler.read_bytes()).hexdigest()
    root = Path(__file__).resolve().parents[1] / "research"
    s = Store(None if args.example == "counter" else root / ("source-column-layout" if args.example == "row" else "source-column-ledger"))
    info = counter(s) if args.example == "counter" else table(s)
    pkg = package(s, info, args.representation == "original")
    out.mkdir(parents=True)
    (out / "objects").mkdir()
    for id, raw in s.objects.items(): (out / "objects" / f"{id}.json").write_bytes(raw)
    for name, data in [("lock", s.lock), ("names", s.names)]: (out / f"{name}.json").write_text(json.dumps(data, indent=2) + "\n")
    (out / "exports.json").write_text(json.dumps([pkg["encode"]], indent=2) + "\n")
    # Obtain the compiler's canonical bundle identity; Python hashes are identity
    # bookkeeping, not permission to bypass checking.
    baseline = subprocess.run([str(compiler), "emit-definition", str(out / "lock.json"), str(out / "exports.json"), "-o", str(out / "definitions.rs")], check=True, text=True, capture_output=True)
    pkg["bundle_sha256"] = json.loads(baseline.stdout)["bundle_sha256"]
    (out / "machine.json").write_text(json.dumps(pkg, indent=2) + "\n")
    checked = subprocess.run([str(compiler), "emit-machine", str(out / "lock.json"), str(out / "machine.json"), "-o", str(out / "machine.rs")], text=True, capture_output=True)
    if checked.returncode:
        raise SystemExit(checked.stderr.strip())
    if original_compiler != hashlib.sha256(compiler.read_bytes()).hexdigest(): raise SystemExit("compiler changed during machine production")
    print(json.dumps(dict(status="checked", example=args.example, representation=args.representation,
                          compiler_sha256=original_compiler, evidence=json.loads(checked.stdout),
                          scope="persistent first-order machine refinement, not Ink source-action admission, physical flat buffers or timing evidence")))


if __name__ == "__main__": main()
