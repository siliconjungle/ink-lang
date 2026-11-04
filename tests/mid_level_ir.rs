//! Mid-level IR (docs/mid-level-ir.md): lowering of every example, effect
//! order, task concurrency, laziness, simplification and a thin JavaScript
//! printer checked against the reference evaluator.
use ink_core::mir::{lower, simplify, verify, Kind, Mir, Node, Op, Place, Region};
use serde_json::{json, Value};
use std::{collections::BTreeSet, path::Path, process::Command};
use verified_language::{
    core::{CheckedModule, Program, Type},
    eval, mir_js, syntax,
};

fn program(source: &str) -> Program {
    let p = syntax::parse(source).unwrap();
    CheckedModule::from_source(p.clone()).unwrap();
    p
}
fn graph<'a>(m: &'a Mir, name: &str) -> &'a ink_core::mir::Graph {
    m.graphs.iter().find(|g| g.name == name).unwrap_or_else(|| panic!("{name}: {:?}", m.unsupported.get(name)))
}
fn top<'a>(r: &'a Region, f: impl Fn(&Node) -> bool) -> Vec<&'a Node> {
    r.nodes.iter().filter(|n| f(n)).collect()
}
/// Whether `to` depends on `from` through inputs or effect order in region `r`.
fn reaches(r: &Region, from: u32, to: u32) -> bool {
    let mut seen = BTreeSet::from([from]);
    for n in &r.nodes {
        if n.inputs.iter().chain(&n.after).any(|d| seen.contains(d)) {
            seen.insert(n.id);
        }
    }
    seen.contains(&to) && from != to
}

#[test]
fn every_example_lowers_and_verifies() {
    let root = Path::new(env!("CARGO_MANIFEST_DIR")).join("examples");
    let mut count = 0;
    for entry in std::fs::read_dir(&root).unwrap() {
        let path = entry.unwrap().path();
        if path.extension().is_none_or(|e| e != "ink") {
            continue;
        }
        let Ok(loaded) = verified_language::modules::load(&path) else { continue };
        let p = loaded.program;
        let mut m = lower(&p);
        assert!(m.unsupported.is_empty(), "{}: {:?}", path.display(), m.unsupported);
        verify(&m).unwrap_or_else(|e| panic!("{}: {e}", path.display()));
        simplify(&mut m);
        verify(&m).unwrap_or_else(|e| panic!("{} after simplify: {e}", path.display()));
        count += 1;
    }
    assert!(count >= 100, "{count} examples");
}

const EFFECTS: &str = "module effects;
state A: u32 = 0;
state B: u32 = 0;
event changed: u32;
fn check(x: u32) -> Result<u32, String> { return choose(x > 100, Err(\"too big\"), Ok(x)); }
change step(x: u32) -> Result<u32, String> writes(A, B) emits(changed) {
  A = A + x;
  B = B + 1;
  emit changed(A);
  let y = check(x)?;
  A = A + y;
  return Ok(A);
}
query total() -> u32 reads(A, B) { return A + B; }
fn lazy(a: Bool, x: u32) -> Bool { return a && check(x) == Ok(x); }
";

#[test]
fn effects_are_ordered_per_state_and_try_is_a_barrier() {
    let p = program(EFFECTS);
    let m = lower(&p);
    verify(&m).unwrap();
    let g = graph(&m, "step");
    assert_eq!((g.kind.clone(), g.placement.clone()), (Kind::Change, vec![Place::Server]));
    assert_eq!((g.writes.clone(), g.emits.clone()), (vec!["A".to_string(), "B".to_string()], vec!["changed".to_string()]));
    let writes = top(&g.body, |n| matches!(&n.op, Op::Write { .. }));
    let (a1, b1, a2) = (writes[0].id, writes[1].id, writes[2].id);
    assert!(matches!(&writes[1].op, Op::Write { state, .. } if state == "B"));
    // Writes to different states are unordered; the emit reads A after its write.
    assert!(!reaches(&g.body, a1, b1) && !reaches(&g.body, b1, a1));
    let emit = top(&g.body, |n| matches!(n.op, Op::Emit { .. }))[0].id;
    assert!(reaches(&g.body, a1, emit) && !reaches(&g.body, b1, emit));
    // `?` waits for every earlier effect, and later effects wait for it.
    let barrier = top(&g.body, |n| matches!(n.op, Op::Try))[0].id;
    for id in [a1, b1, emit] {
        assert!(reaches(&g.body, id, barrier));
    }
    assert!(reaches(&g.body, barrier, a2));
    let q = graph(&m, "total");
    assert_eq!((q.placement.clone(), q.reads.clone()), (vec![Place::Replica, Place::Server], vec!["A".to_string(), "B".to_string()]));
    // `&&` keeps its right operand in a branch region: the call is not in the top region.
    let l = graph(&m, "lazy");
    assert!(top(&l.body, |n| matches!(&n.op, Op::Call { .. })).is_empty());
    assert_eq!(top(&l.body, |n| matches!(n.op, Op::Gamma)).len(), 1);
}

#[test]
fn task_graphs_expose_independent_effects() {
    let p = program(include_str!("../examples/effect-tasks.ink"));
    let m = lower(&p);
    let g = graph(&m, "triage");
    assert_eq!((g.kind.clone(), g.placement.clone()), (Kind::Task, vec![Place::Host]));
    let effect = |name: &str| top(&g.body, |n| matches!(&n.op, Op::Effect { name: e, .. } if e == name))[0].id;
    let (fetch, lookup, classify, summarise, notify) = (effect("fetch_ticket"), effect("lookup_customer"), effect("classify"), effect("summarise"), effect("notify"));
    for (a, b) in [(lookup, classify), (lookup, summarise), (classify, summarise)] {
        assert!(!reaches(&g.body, a, b) && !reaches(&g.body, b, a), "{a} and {b} must be independent");
    }
    for x in [lookup, classify, summarise] {
        assert!(reaches(&g.body, fetch, x));
    }
    let record = top(&g.body, |n| matches!(&n.op, Op::Action { name, .. } if name == "record"))[0].id;
    for x in [lookup, classify, summarise] {
        assert!(reaches(&g.body, x, record));
    }
    assert!(reaches(&g.body, record, notify));
    // Guarded effects carry their check and fallback as regions.
    let c = g.body.nodes.iter().find(|n| n.id == classify).unwrap();
    assert_eq!(c.regions.len(), 2);
    assert_eq!(g.writes, ["Labels", "Triaged"]);
}

const NUMBERS: &str = "module numbers;
enum Mode { Up, Down, }
record P { x: f32, y: f32, }
fn mix(a: u32, b: u32) -> u32 { return a * 2654435761 + b - 7; }
fn len2(p: P) -> f32 { return p.x * p.x + p.y * p.y; }
fn scale(p: P, k: f32) -> P { return P{x: p.x * k, y: p.y / k}; }
fn pick(o: Option<u32>, d: u32) -> u32 { return o.fold(fn(v)=>v, fn(none)=>d) + 1; }
fn shout(s: String) -> u32 { return string_byte_len(string_concat(s, \"!\")); }
fn add_all(xs: List<u32>) -> u32 { return foldl(xs, 0, fn(x)=>fn(acc)=>acc + x); }
fn twice(a: u32, b: u32) -> u32 { return (a + b) * (a + b) + (a + b); }
fn xor(a: Bool, b: Bool) -> Bool { return a && !b || b && !a; }
fn flip(m: Mode, o: Option<Mode>) -> Mode {
  return o.fold(fn(v)=>choose(v == m, Mode.Up, Mode.Down), fn(none)=>choose(m == Mode.Up, Mode.Down, Mode.Up));
}
fn same(a: P, b: P) -> Bool { return a == b; }
";

struct Random(u64);
impl Random {
    fn next(&mut self) -> u64 {
        self.0 = self.0.wrapping_mul(6364136223846793005).wrapping_add(1442695040888963407);
        self.0 >> 33
    }
    fn value(&mut self, t: &Type, p: &Program) -> Value {
        match t {
            Type::Bool => json!(self.next() % 2 == 0),
            Type::U32 => json!(if self.next() % 3 == 0 { self.next() % 8 } else { self.next() as u32 as u64 }),
            Type::F32 => {
                let sign = if self.next() % 2 == 0 { 1.0 } else { -1.0 };
                json!((sign * ((self.next() % 20_000) as f32 / 64.0 + 0.5)) as f64)
            }
            Type::String => json!(["", "a", "Zoë", "日本", "hello world"][(self.next() % 5) as usize]),
            Type::List(x) => Value::Array((0..self.next() % 4).map(|_| self.value(x, p)).collect()),
            Type::Option(x) => if self.next() % 3 == 0 { json!({"None": null}) } else { json!({"Some": self.value(x, p)}) },
            Type::Named(n) if p.enums.contains_key(n) => {
                let vs = &p.enums[n];
                json!(format!("{n}.{}", vs[(self.next() % vs.len() as u64) as usize]))
            }
            Type::Named(n) => {
                let fields = p.records[n].clone();
                Value::Object(fields.iter().map(|(k, t)| (k.clone(), self.value(t, p))).collect())
            }
            other => panic!("no generator for {other:?}"),
        }
    }
}

fn printed_matches_reference(source: &str, functions: &[&str], simplified: bool, tag: &str) {
    let p = program(source);
    let module = CheckedModule::from_source(p.clone()).unwrap();
    let mut m = lower(&p);
    if simplified {
        simplify(&mut m);
        verify(&m).unwrap();
    }
    let root = Path::new(env!("CARGO_MANIFEST_DIR"));
    let dir = root.join("build/mid-level-ir").join(tag);
    let _ = std::fs::remove_dir_all(&dir);
    std::fs::create_dir_all(&dir).unwrap();
    let mut random = Random(7);
    for f in functions {
        let func = p.functions.iter().find(|x| &x.name == f).unwrap();
        let js = mir_js::module(&m, &p.records, f).unwrap_or_else(|e| panic!("{f}: {e}"));
        let inputs: Vec<Vec<Value>> = (0..40).map(|_| func.params.iter().map(|(_, t)| random.value(t, &p)).collect()).collect();
        let want: Vec<Value> = inputs
            .iter()
            .map(|args| {
                let vs = args.iter().zip(&func.params).map(|(v, (_, t))| eval::Value::from_program_json(v, t, &p).unwrap()).collect();
                eval::call_checked(&module, f, vs, &mut 1_000_000).unwrap().json()
            })
            .collect();
        std::fs::write(dir.join(format!("{f}.mjs")), js).unwrap();
        std::fs::write(dir.join(format!("{f}.json")), serde_json::to_vec(&inputs).unwrap()).unwrap();
        let script = format!(
            "import {{call}} from './{f}.mjs';import {{readFileSync}} from 'node:fs';\
             const inputs=JSON.parse(readFileSync(new URL('./{f}.json', import.meta.url)));\
             console.log(JSON.stringify(inputs.map(a=>call({f:?},a))));"
        );
        std::fs::write(dir.join(format!("{f}.run.mjs")), script).unwrap();
        let out = Command::new("node").arg(dir.join(format!("{f}.run.mjs"))).output().unwrap();
        assert!(out.status.success(), "{f}: {}", String::from_utf8_lossy(&out.stderr));
        let got: Value = serde_json::from_slice(&out.stdout).unwrap();
        assert_eq!(got, json!(want), "{f} differs from the reference evaluator");
    }
}

#[test]
fn a_thin_javascript_printer_matches_the_reference_evaluator() {
    let all = ["mix", "len2", "scale", "pick", "shout", "add_all", "twice", "xor", "flip", "same"];
    printed_matches_reference(NUMBERS, &all, false, "numbers");
    printed_matches_reference(NUMBERS, &all, true, "numbers-simplified");
    printed_matches_reference(include_str!("../examples/circuit-target.ink"), &["authored", "next", "safe"], true, "crossing");
    printed_matches_reference(include_str!("../examples/effect-tasks.ink"), &["rule_label", "plan_of"], true, "tasks");
    printed_matches_reference(include_str!("../examples/learn-holes.ink"), &["authored", "step"], true, "holes");
    // Effectful graphs are not pure functions; the printer refuses them.
    let p = program(EFFECTS);
    assert!(mir_js::module(&lower(&p), &p.records, "step").is_err());
}

#[test]
fn simplification_merges_repeated_work_without_crossing_branches() {
    let p = program(NUMBERS);
    let mut m = lower(&p);
    let before = graph(&m, "twice").body.nodes.len();
    let removed = simplify(&mut m);
    let twice = graph(&m, "twice");
    assert!(removed >= 2 && twice.body.nodes.len() < before, "{removed}");
    // One `a + b` remains.
    assert_eq!(top(&twice.body, |n| matches!(&n.op, Op::Binary { operator } if operator == "+")).len(), 2);
    // Work inside a lazy branch stays there.
    let mut lazy = lower(&program(EFFECTS));
    simplify(&mut lazy);
    assert!(top(&graph(&lazy, "lazy").body, |n| matches!(&n.op, Op::Call { .. })).is_empty());
}
