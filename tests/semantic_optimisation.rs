use std::{collections::BTreeMap, path::PathBuf, process::Command};
use verified_language::{
    core::{CheckedModule, Type},
    eval,
    laws::{self, Catalogue, CheckedCatalogue, Equation, Law, Proof},
    optimisation::{self, Package, Site},
    semantic::{self as s, Node, Sort},
    syntax,
};
fn module(source: &str) -> CheckedModule {
    CheckedModule::from_source(syntax::parse(&format!("module test; {source}")).unwrap()).unwrap()
}
fn catalogue() -> Catalogue {
    {
        let b: verified_language::registry::Bundle =
            serde_json::from_slice(&std::fs::read("knowledge/store/rewrite-view.json").unwrap())
                .unwrap();
        verified_language::registry::CheckedBundle::check(&b)
            .unwrap()
            .catalogue()
            .unwrap()
    }
}
fn empty() -> Catalogue {
    Catalogue {
        schema: 1,
        semantics: laws::SEMANTICS.into(),
        roots: vec![],
        objects: BTreeMap::new(),
    }
}
fn pack(m: &CheckedModule, c: Catalogue, applications: Vec<Site>) -> Package {
    Package {
        schema: 1,
        semantics: optimisation::SEMANTICS.into(),
        input_core_sha256: m.identity().unwrap(),
        knowledge: verified_language::registry::from_catalogue(&c).unwrap(),
        applications,
    }
}
fn pick(c: &Catalogue, operation: &str, ty: &Type) -> String {
    c.roots
        .iter()
        .find(|id| {
            let l = &c.objects[*id];
            l.from.sort == s::value(ty.clone())
                && matches!(&l.from.node,Node::Op(n,_) if n==operation)
                && (operation!="binary:+" || (l.params.len()==1 && matches!(&l.from.node,Node::Op(_,a) if matches!(a[1].node,Node::Word(0)))))
        })
        .unwrap()
        .clone()
}
#[test]
fn universal_loop_and_collection_laws_check_independently() {
    let m = module("fn id(x:u32)->u32{return x;}");
    let c = catalogue();
    let checked = CheckedCatalogue::check(&c, m.program()).unwrap();
    assert_eq!(checked.roots().len(), c.roots.len());
}
#[test]
fn loop_count_and_increment_are_instantiated_generically() {
    let m = module("fn bump(x:u32,k:u32)->u32{return repeat(65536,x,fn(i)=>fn(a)=>a+k);}");
    let c = catalogue();
    let law = pick(&c, "call:repeat", &Type::U32);
    let args = BTreeMap::from([
        ("n".into(), s::term(Sort::Nat, Node::Nat(65536))),
        ("x".into(), s::free(s::value(Type::U32), "x")),
        ("k".into(), s::free(s::value(Type::U32), "k")),
    ]);
    let package = pack(
        &m,
        c,
        vec![Site {
            function: "bump".into(),
            path: vec![],
            law,
            arguments: args,
            premises: vec![],
        }],
    );
    let selected = optimisation::check(&m, &package).unwrap();
    assert!(
        !serde_json::to_string(&selected.module().program().functions[0].body)
            .unwrap()
            .contains("repeat")
    );
    for (x, k) in [(0, 1), (u32::MAX, 1), (u32::MAX, u32::MAX), (123, 876543)] {
        let input = vec![eval::Value::U32(x), eval::Value::U32(k)];
        let a = eval::call(m.program(), "bump", input.clone(), &mut 2_000_000).unwrap();
        let b = eval::call_selected(&selected, "bump", input, &mut 100).unwrap();
        assert_eq!(a, b);
    }
    let c = verified_language::native::lower_selected(&selected).unwrap();
    assert!(!c.contains("<65536u"));
}
#[test]
fn rules_apply_under_binders_without_capture() {
    let m = module("fn f(xs:List<u32>)->List<u32>{return xs.map(fn(x)=>x+0);}");
    let c = catalogue();
    let law = pick(&c, "binary:+", &Type::U32);
    let args = BTreeMap::from([("x".into(), s::term(s::value(Type::U32), Node::Bound(0)))]);
    let selected = optimisation::check(
        &m,
        &pack(
            &m,
            c,
            vec![Site {
                function: "f".into(),
                path: vec![1, 0],
                law,
                arguments: args,
                premises: vec![],
            }],
        ),
    )
    .unwrap();
    assert!(
        !serde_json::to_string(&selected.module().program().functions[0].body)
            .unwrap()
            .contains("Binary")
    );
    assert_eq!(
        eval::call_selected(
            &selected,
            "f",
            vec![eval::Value::List(vec![eval::Value::U32(9)])],
            &mut 100
        )
        .unwrap(),
        eval::Value::List(vec![eval::Value::U32(9)])
    );
}
#[test]
fn branch_conditions_are_proved_at_the_actual_site() {
    let m = module("fn f(x:u32,y:u32)->u32{return choose(y==0,x+y,x);}");
    let c = catalogue();
    let law = c
        .roots
        .iter()
        .find(|id| {
            !c.objects[*id].conditions.is_empty() && c.objects[*id].from.sort == s::value(Type::U32)
        })
        .unwrap()
        .clone();
    let arguments = BTreeMap::from([
        ("x".into(), s::free(s::value(Type::U32), "x")),
        ("y".into(), s::free(s::value(Type::U32), "y")),
    ]);
    let site = Site {
        function: "f".into(),
        path: vec![1],
        law,
        arguments,
        premises: vec![Proof::Normalize],
    };
    let selected = optimisation::check(&m, &pack(&m, c.clone(), vec![site.clone()])).unwrap();
    for y in [0, 1, u32::MAX] {
        let a = vec![eval::Value::U32(12), eval::Value::U32(y)];
        assert_eq!(
            eval::call(m.program(), "f", a.clone(), &mut 100).unwrap(),
            eval::call_selected(&selected, "f", a, &mut 100).unwrap()
        );
    }
    let unguarded = module("fn f(x:u32,y:u32)->u32{return x+y;}");
    let mut site = site;
    site.path = vec![];
    assert!(optimisation::check(&unguarded, &pack(&unguarded, c, vec![site])).is_err());
}
#[test]
fn altered_bytes_unknown_operations_and_missing_premises_fail_closed() {
    let m = module("fn f(x:u32)->u32{return x+0;}");
    let mut c = catalogue();
    let law = pick(&c, "binary:+", &Type::U32);
    c.objects.get_mut(&law).unwrap().to = s::word(Type::U32, 99);
    assert!(CheckedCatalogue::check(&c, m.program()).is_err());
    let mut term = s::word(Type::U32, 0);
    term.node = Node::Op("call:trusted_magic".into(), vec![]);
    assert!(s::validate(&term, &BTreeMap::new(), m.program(), &mut s::Budget::new()).is_err());
    let original = m.identity().unwrap();
    let mut package = pack(&m, empty(), vec![]);
    package.input_core_sha256 = "wrong".into();
    assert!(optimisation::check(&m, &package).is_err());
    assert_eq!(m.identity().unwrap(), original);
}
#[test]
fn float_reassociation_and_numeric_equality_as_bit_equality_are_rejected() {
    let m = module("fn f(x:f32)->f32{return x;}");
    let env = BTreeMap::from([("x".into(), s::value(Type::F32))]);
    let x = s::free(s::value(Type::F32), "x");
    let one = s::term(s::value(Type::F32), Node::Float(1f32.to_bits()));
    let ten = s::term(s::value(Type::F32), Node::Float(10f32.to_bits()));
    let loop_ = s::op(
        s::value(Type::F32),
        "call:repeat",
        vec![
            s::term(Sort::Nat, Node::Nat(10)),
            x.clone(),
            s::lambda(
                s::value(Type::U32),
                s::lambda(
                    s::value(Type::F32),
                    s::op(
                        s::value(Type::F32),
                        "binary:+",
                        vec![s::term(s::value(Type::F32), Node::Bound(0)), one],
                    ),
                ),
            ),
        ],
    );
    let goal = Equation {
        from: loop_,
        to: s::op(s::value(Type::F32), "binary:+", vec![x, ten]),
    };
    let c = CheckedCatalogue::check(&empty(), m.program()).unwrap();
    assert!(c
        .prove(
            m.program(),
            &env,
            &[],
            &goal,
            &Proof::Normalize,
            &mut s::Budget::new(),
            0
        )
        .is_err());
    let positive = s::term(s::value(Type::F32), Node::Float(0));
    let negative = s::term(s::value(Type::F32), Node::Float(0x80000000));
    let equality = Equation {
        from: positive,
        to: negative,
    };
    let proof = Proof::AssertEquality {
        equality: equality.clone(),
        premise: Box::new(Proof::Normalize),
        body: Box::new(Proof::Hypothesis(0)),
    };
    assert!(c
        .prove(
            m.program(),
            &BTreeMap::new(),
            &[],
            &equality,
            &proof,
            &mut s::Budget::new(),
            0
        )
        .is_err());
}
#[test]
fn a_new_catalogue_entry_changes_execution_without_rebuilding_the_compiler() {
    let m = module("fn f(x:u32)->u32{return x+x+x;}");
    let c = empty();
    let old = optimisation::check(&m, &pack(&m, c.clone(), vec![])).unwrap();
    assert_eq!(old.module().identity().unwrap(), m.identity().unwrap());
    let subject = optimisation::subject(&m).unwrap();
    let x = s::free(s::value(Type::U32), "x");
    let law = Law {
        schema: 1,
        semantics: laws::SEMANTICS.into(),
        params: BTreeMap::from([("x".into(), s::value(Type::U32))]),
        conditions: vec![],
        from: subject.functions["f"].clone(),
        to: s::op(
            s::value(Type::U32),
            "binary:*",
            vec![x.clone(), s::word(Type::U32, 3)],
        ),
        proof: Proof::Normalize,
        dependencies: vec![],
    };
    let id = verified_language::registry::identity(
        &verified_language::registry::Entry::from_law(&law).unwrap(),
    )
    .unwrap();
    let mut c = c;
    c.roots.push(id.clone());
    c.objects.insert(id.clone(), law);
    let package = pack(
        &m,
        c,
        vec![Site {
            function: "f".into(),
            path: vec![],
            law: id,
            arguments: BTreeMap::from([("x".into(), x)]),
            premises: vec![],
        }],
    );
    let selected = optimisation::check(&m, &package).unwrap();
    assert_ne!(selected.module().identity().unwrap(), m.identity().unwrap());
    assert_eq!(
        eval::call_selected(&selected, "f", vec![eval::Value::U32(u32::MAX)], &mut 100).unwrap(),
        eval::Value::U32(u32::MAX.wrapping_mul(3))
    );
}
#[test]
fn external_search_and_interpreter_share_the_checked_selection() {
    let dir = std::env::temp_dir().join(format!("ink-generic-test-{}", std::process::id()));
    std::fs::create_dir_all(&dir).unwrap();
    let source = dir.join("program.ink");
    std::fs::write(
        &source,
        "module test; fn f(x:u32)->u32{return repeat(10,x,fn(i)=>fn(a)=>a+1);}",
    )
    .unwrap();
    let args = dir.join("args.json");
    std::fs::write(&args, "[4294967295]").unwrap();
    let binary = PathBuf::from(env!("CARGO_BIN_EXE_ink"));
    let hash = sha2_hash(&std::fs::read(&binary).unwrap());
    let result = Command::new(&binary)
        .args([
            "run",
            source.to_str().unwrap(),
            "f",
            args.to_str().unwrap(),
            "--optimise",
            "knowledge/store/snapshot.json",
            "--search-budget",
            "16",
        ])
        .output()
        .unwrap();
    assert!(
        result.status.success(),
        "{}",
        String::from_utf8_lossy(&result.stderr)
    );
    assert_eq!(String::from_utf8_lossy(&result.stdout).trim(), "9");
    assert_eq!(hash, sha2_hash(&std::fs::read(binary).unwrap()));
    std::fs::remove_dir_all(dir).unwrap();
}
fn sha2_hash(bytes: &[u8]) -> String {
    use sha2::{Digest, Sha256};
    format!("{:x}", Sha256::digest(bytes))
}
#[test]
fn all_executable_expression_forms_round_trip_through_semantic_terms() {
    let m=module("record R { x:u32, y:f32, } fn f(xs:List<u32>,ys:List<u32>,r:R)->u32 { let z:u32=repeat(2,r.x,fn(i)=>fn(a)=>a+i); return choose(z>0,sum(xs.zip(ys,fn(a)=>fn(b)=>a+b).map_indexed(fn(i)=>fn(x)=>x+i).filter(fn(x)=>x>1).scan().sort()),quot_or(xs.at_or(0,7),2,rem_or(z,3,0))); } fn v(x:f32)->f32 {return vec2(x,-x).y;} fn rec(r:R)->R {return R{x:r.x+0,y:r.y};}");
    for f in &m.program().functions {
        let env = verified_language::check::params_env(&f.params).unwrap();
        let t = s::elaborate(&f.body, &env, m.program(), &f.result).unwrap();
        let e = s::reify(&t, m.program()).unwrap();
        let round = s::elaborate(&e, &env, m.program(), &f.result).unwrap();
        assert_eq!(t, round, "{}", f.name);
    }
}
#[test]
fn induction_rejects_a_premise_that_does_not_hold_for_subproblems() {
    let m = module("fn f(x:u32)->u32{return x;}");
    let n = s::free(Sort::Nat, "n");
    let env = BTreeMap::from([("n".into(), Sort::Nat)]);
    let hyp = vec![Equation {
        from: n.clone(),
        to: s::term(Sort::Nat, Node::Nat(0)),
    }];
    let goal = Equation {
        from: n.clone(),
        to: s::term(Sort::Nat, Node::Nat(0)),
    };
    let proof = Proof::Induction {
        variable: "n".into(),
        names: vec!["next".into()],
        base: Box::new(Proof::Normalize),
        step: Box::new(Proof::Hypothesis(0)),
    };
    let c = CheckedCatalogue::check(&empty(), m.program()).unwrap();
    assert!(c
        .prove(
            m.program(),
            &env,
            &hyp,
            &goal,
            &proof,
            &mut s::Budget::new(),
            0
        )
        .is_err());
}
#[test]
fn checked_laws_cannot_be_reused_with_different_function_definitions() {
    let m = module("fn helper(x:u32)->u32{return x;}");
    let c = CheckedCatalogue::check(&empty(), m.program()).unwrap();
    let other = module("fn helper(x:u32)->u32{return x+1;}");
    let x = s::free(s::value(Type::U32), "x");
    let goal = Equation {
        from: x.clone(),
        to: x,
    };
    assert!(c
        .prove(
            other.program(),
            &BTreeMap::from([("x".into(), s::value(Type::U32))]),
            &[],
            &goal,
            &Proof::Normalize,
            &mut s::Budget::new(),
            0
        )
        .is_err());
}
#[test]
fn the_same_proof_calculus_checks_alternative_routed_compositions() {
    use verified_language::source_routing::{self, Stage, ValueRef};
    let m = module("fn original(x:u32)->u32{return x+x;} fn faster(x:u32)->u32{return x*2;}");
    let route = source_routing::Package {
        schema: 1,
        semantics: source_routing::PROVED_SEMANTICS.into(),
        input_core_sha256: m.identity().unwrap(),
        entry: "original".into(),
        stages: vec![Stage {
            id: "fast".into(),
            function: "faster".into(),
            backend: "c".into(),
            domain: "cpu".into(),
            arguments: vec![ValueRef::Input(0)],
        }],
        output: ValueRef::Stage("fast".into()),
    };
    let evidence = source_routing::Equivalence {
        knowledge: verified_language::registry::from_catalogue(&empty()).unwrap(),
        proof: Proof::Normalize,
    };
    let checked = source_routing::check_equivalent(&m, &route, &evidence).unwrap();
    assert!(checked.equivalence().is_some());
    assert!(source_routing::check(&m, &route).is_err());
    let dir = std::env::temp_dir().join(format!("ink-proved-route-{}", std::process::id()));
    verified_language::runtime::emit_routed(&checked, &dir).unwrap();
    assert!(dir.join("ink-route.mjs").exists());
    let mut baseline = route.clone();
    baseline.semantics = source_routing::SEMANTICS.into();
    baseline.stages[0].function = "original".into();
    let mut invalid = route.clone();
    invalid.stages[0].arguments = vec![ValueRef::Literal(source_routing::Literal::U32(0))];
    let raw = serde_json::to_vec(&route).unwrap();
    let base = serde_json::to_vec(&baseline).unwrap();
    for (name, bytes) in [
        ("core.json", m.bytes().unwrap()),
        ("fast.json", raw.clone()),
        ("base.json", base.clone()),
        ("invalid.json", serde_json::to_vec(&invalid).unwrap()),
        ("proof.json", serde_json::to_vec(&evidence).unwrap()),
    ] {
        std::fs::write(dir.join(name), bytes).unwrap();
    }
    std::fs::write(
        dir.join("index.json"),
        serde_json::to_vec(&serde_json::json!([
        {"route":"fast.json","proof":"proof.json"},
        {"route":"invalid.json","proof":"proof.json"}]))
        .unwrap(),
    )
    .unwrap();
    let target = serde_json::json!({"hardware":"test","driver":"test","toolchain":"test","backend":"mixed","bridge":"host"});
    let workload = serde_json::json!({"shape":[1],"distribution":"synthetic","concurrency":1,"residency":"host"});
    std::fs::write(
        dir.join("target.json"),
        serde_json::to_vec(&target).unwrap(),
    )
    .unwrap();
    std::fs::write(
        dir.join("workload.json"),
        serde_json::to_vec(&workload).unwrap(),
    )
    .unwrap();
    let observations = serde_json::json!([{"schema":1,"program":m.identity().unwrap(),"entries":[],"plan":sha2_hash(&base),"target":target,"workload":workload,"metrics":{"complete_call_ns":["2000000"],"peak_bytes":4}},{"schema":1,"program":m.identity().unwrap(),"entries":[],"plan":sha2_hash(&raw),"target":target,"workload":workload,"metrics":{"complete_call_ns":["1000000"],"peak_bytes":4}}]);
    std::fs::write(
        dir.join("observations.json"),
        serde_json::to_vec(&observations).unwrap(),
    )
    .unwrap();
    let result=Command::new("python3").env("PYTHONPATH","knowledge").arg("-c").arg("import sys,json;from ink_knowledge import Store;s=Store.publish(sys.argv[1],[]);[s.observe(o) for o in json.load(open(sys.argv[2]))];s.rebuild()")
        .arg(dir.join("knowledge/research")).arg(dir.join("observations.json")).output().unwrap();
    assert!(
        result.status.success(),
        "{}",
        String::from_utf8_lossy(&result.stderr)
    );
    let output = dir.join("chosen.json");
    let result = Command::new("python3")
        .args([
            "planner/route.py",
            "--compiler",
            env!("CARGO_BIN_EXE_ink"),
            "--core",
            dir.join("core.json").to_str().unwrap(),
            "--baseline",
            dir.join("base.json").to_str().unwrap(),
            "--candidates",
            dir.join("index.json").to_str().unwrap(),
            "--knowledge-root",
            dir.join("knowledge/research").to_str().unwrap(),
            "--target",
            dir.join("target.json").to_str().unwrap(),
            "--workload",
            dir.join("workload.json").to_str().unwrap(),
            "-o",
            output.to_str().unwrap(),
        ])
        .output()
        .unwrap();
    assert!(
        result.status.success(),
        "{}",
        String::from_utf8_lossy(&result.stderr)
    );
    let receipt: serde_json::Value = serde_json::from_slice(&result.stdout).unwrap();
    assert_eq!(receipt["checked"], 2);
    assert_eq!(receipt["rejected"].as_array().unwrap().len(), 1);
    assert_eq!(std::fs::read(&output).unwrap(), raw);
    assert!(PathBuf::from(receipt["selected_proof"].as_str().unwrap()).exists());
    std::fs::remove_dir_all(dir).unwrap();
    let mut bad = route;
    bad.stages[0].arguments = vec![ValueRef::Literal(source_routing::Literal::U32(0))];
    assert!(source_routing::check_equivalent(&m, &bad, &evidence).is_err());
}
#[test]
fn optimisation_preserves_state_declarations_and_transaction_bodies() {
    let m=module("id Key; enum Error{Bad,} record Row{value:u32,} state Rows:Table<Key,Row> = Table.empty(); fn f(x:u32)->u32{return x+0;} event changed:u32; change publish(x:u32)->Result<Unit,Error> emits(changed) {emit changed(f(x));return Ok(());} query get()->Int reads(Rows) {return count(Rows.values());}");
    let c = catalogue();
    let law = pick(&c, "binary:+", &Type::U32);
    let site = Site {
        function: "f".into(),
        path: vec![],
        law,
        arguments: BTreeMap::from([("x".into(), s::free(s::value(Type::U32), "x"))]),
        premises: vec![],
    };
    let selected = optimisation::check(&m, &pack(&m, c, vec![site])).unwrap();
    assert_eq!(
        serde_json::to_value(&m.program().states).unwrap(),
        serde_json::to_value(&selected.module().program().states).unwrap()
    );
    assert_eq!(
        serde_json::to_value(&m.program().actions).unwrap(),
        serde_json::to_value(&selected.module().program().actions).unwrap()
    );
    let mut before = verified_language::stateful::Runtime::new(m.program().clone()).unwrap();
    let mut after =
        verified_language::stateful::Runtime::new(selected.module().program().clone()).unwrap();
    for x in [0, 12, u32::MAX] {
        assert_eq!(
            before
                .invoke_json("publish", &serde_json::json!([x]))
                .unwrap()
                .json(),
            after
                .invoke_json("publish", &serde_json::json!([x]))
                .unwrap()
                .json()
        );
    }
}

#[test]
fn nested_optimisations_compose_and_enable_further_rules_automatically() {
    let dir = std::env::temp_dir().join(format!("ink-composition-{}", std::process::id()));
    std::fs::create_dir_all(&dir).unwrap();
    let source = dir.join("program.ink");
    let output = dir.join("selected.json");
    std::fs::write(
        &source,
        "module composed; fn f(xs:List<u32>)->List<u32>{return xs.map(fn(x)=>((x+7)+(x+7)+(x+7))*1+0);}",
    )
    .unwrap();
    let result = Command::new(env!("CARGO_BIN_EXE_ink"))
        .args([
            "emit-core",
            source.to_str().unwrap(),
            "--optimise",
            "knowledge/store/snapshot.json",
            "--search-budget",
            "64",
            "-o",
            output.to_str().unwrap(),
        ])
        .output()
        .unwrap();
    assert!(
        result.status.success(),
        "{}",
        String::from_utf8_lossy(&result.stderr)
    );
    let selected = CheckedModule::from_bytes(&std::fs::read(output).unwrap()).unwrap();
    let body = serde_json::to_string(&selected.program().functions[0].body).unwrap();
    assert_eq!(body.matches("Binary\":[\"+").count(), 1, "{body}");
    assert!(body.contains("Num\":3"), "{body}");
    let xs = eval::Value::List(vec![
        eval::Value::U32(0),
        eval::Value::U32(1),
        eval::Value::U32(u32::MAX),
    ]);
    let result = eval::call(selected.program(), "f", vec![xs], &mut 100).unwrap();
    assert_eq!(
        result,
        eval::Value::List(vec![
            eval::Value::U32(21),
            eval::Value::U32(24),
            eval::Value::U32(u32::MAX.wrapping_add(7).wrapping_mul(3))
        ])
    );
    std::fs::remove_dir_all(dir).unwrap();
}
#[test]
fn operational_list_models_preserve_index_scan_sort_and_float_sum_order() {
    let m = module("fn f(x:u32)->u32{return x;}");
    let c = CheckedCatalogue::check(&empty(), m.program()).unwrap();
    fn list(ty: Type, xs: Vec<s::Term>) -> s::Term {
        let sort = s::value(Type::List(Box::new(ty)));
        xs.into_iter()
            .rev()
            .fold(s::term(sort.clone(), Node::Nil), |tail, head| {
                s::term(sort.clone(), Node::Cons(Box::new(head), Box::new(tail)))
            })
    }
    let input = list(
        Type::I32,
        vec![
            s::word(Type::I32, 3),
            s::word(Type::I32, u32::MAX as u64),
            s::word(Type::I32, 2),
        ],
    );
    for (name, expected) in [
        ("method:scan", vec![3, 2, 4]),
        ("method:sort", vec![u32::MAX as u64, 2, 3]),
    ] {
        let from = s::op(input.sort.clone(), name, vec![input.clone()]);
        let to = list(
            Type::I32,
            expected
                .into_iter()
                .map(|n| s::word(Type::I32, n))
                .collect(),
        );
        c.prove(
            m.program(),
            &BTreeMap::new(),
            &[],
            &Equation { from, to },
            &Proof::Normalize,
            &mut s::Budget::new(),
            0,
        )
        .unwrap();
    }
    let floats = list(
        Type::F32,
        [1e20f32, -1e20f32, 3f32]
            .into_iter()
            .map(|x| s::term(s::value(Type::F32), Node::Float(x.to_bits())))
            .collect(),
    );
    let from = s::op(s::value(Type::F32), "call:sum", vec![floats]);
    let to = s::term(s::value(Type::F32), Node::Float(3f32.to_bits()));
    c.prove(
        m.program(),
        &BTreeMap::new(),
        &[],
        &Equation {
            from: from.clone(),
            to,
        },
        &Proof::Normalize,
        &mut s::Budget::new(),
        0,
    )
    .unwrap();
    assert!(c
        .prove(
            m.program(),
            &BTreeMap::new(),
            &[],
            &Equation {
                from,
                to: s::term(s::value(Type::F32), Node::Float(0))
            },
            &Proof::Normalize,
            &mut s::Budget::new(),
            0
        )
        .is_err());
}
#[test]
fn nested_loop_laws_preserve_outer_captures_and_reject_index_dependent_steps() {
    let m = module(
        "fn f(xs:List<u32>)->List<u32>{return xs.map(fn(x)=>repeat(3,x,fn(i)=>fn(a)=>a+x));}",
    );
    let c = catalogue();
    let id = pick(&c, "call:repeat", &Type::U32);
    let bound = s::term(s::value(Type::U32), Node::Bound(0));
    let args = BTreeMap::from([
        ("n".into(), s::term(Sort::Nat, Node::Nat(3))),
        ("x".into(), bound.clone()),
        ("k".into(), bound),
    ]);
    let site = Site {
        function: "f".into(),
        path: vec![1, 0],
        law: id.clone(),
        arguments: args,
        premises: vec![],
    };
    let selected = optimisation::check(&m, &pack(&m, c.clone(), vec![site])).unwrap();
    let input = vec![eval::Value::List(vec![
        eval::Value::U32(11),
        eval::Value::U32(u32::MAX),
    ])];
    assert_eq!(
        eval::call(m.program(), "f", input.clone(), &mut 1000).unwrap(),
        eval::call_selected(&selected, "f", input, &mut 1000).unwrap()
    );
    let index_dependent = module("fn f(x:u32)->u32{return repeat(3,x,fn(i)=>fn(a)=>a+i);}");
    let site = Site {
        function: "f".into(),
        path: vec![],
        law: id,
        arguments: BTreeMap::from([
            ("n".into(), s::term(Sort::Nat, Node::Nat(3))),
            ("x".into(), s::free(s::value(Type::U32), "x")),
            ("k".into(), s::word(Type::U32, 1)),
        ]),
        premises: vec![],
    };
    assert!(optimisation::check(&index_dependent, &pack(&index_dependent, c, vec![site])).is_err());
}

#[test]
fn search_composes_supporting_lemmas_to_discharge_rule_conditions() {
    let m = module("fn f(xs:List<u32>)->u64{return count(xs.map(fn(x)=>x));}");
    let all = catalogue();
    let ls = s::value(Type::List(Box::new(Type::U32)));
    let xs = s::free(ls.clone(), "xs");
    let identity_id = all
        .roots
        .iter()
        .find(|id| {
            let law = &all.objects[*id];
            law.from.sort == ls && law.to == xs
        })
        .unwrap()
        .clone();
    let supporting = all.objects[&identity_id].clone();
    let law = Law {
        schema: 1,
        semantics: laws::SEMANTICS.into(),
        params: BTreeMap::from([("xs".into(), ls)]),
        conditions: vec![Equation {
            from: supporting.from.clone(),
            to: xs.clone(),
        }],
        from: optimisation::subject(&m).unwrap().functions["f"].clone(),
        to: s::op(s::value(Type::U64), "call:count", vec![xs]),
        proof: Proof::Congruence(vec![Proof::Hypothesis(0)]),
        dependencies: vec![identity_id.clone()],
    };
    let id = verified_language::registry::identity(
        &verified_language::registry::Entry::from_law(&law).unwrap(),
    )
    .unwrap();
    let c = Catalogue {
        schema: 1,
        semantics: laws::SEMANTICS.into(),
        roots: vec![id.clone()],
        objects: BTreeMap::from([(identity_id, supporting), (id, law)]),
    };
    CheckedCatalogue::check(&c, m.program()).unwrap();
    let dir = std::env::temp_dir().join(format!("ink-premise-search-{}", std::process::id()));
    std::fs::create_dir_all(&dir).unwrap();
    let input = dir.join("core.json");
    let output = dir.join("selected.json");
    std::fs::write(&input, m.bytes().unwrap()).unwrap();
    let b = verified_language::registry::from_catalogue(&c).unwrap();
    let store = dir.join("store");
    std::fs::create_dir_all(store.join("objects")).unwrap();
    std::fs::create_dir_all(store.join("trees")).unwrap();
    for (id, e) in &b.objects {
        std::fs::write(
            store.join("objects").join(format!("{id}.json")),
            verified_language::registry::canonical(e).unwrap(),
        )
        .unwrap();
    }
    let leaf = serde_json::json!({"schema":1,"entries":b.objects.keys().collect::<Vec<_>>()});
    std::fs::write(
        store
            .join("trees")
            .join(format!("{}.json", b.snapshot.root)),
        verified_language::registry::canonical(&leaf).unwrap(),
    )
    .unwrap();
    std::fs::write(store.join("names.json"), "{}").unwrap();
    let catalogue = store.join("snapshot.json");
    std::fs::write(
        &catalogue,
        verified_language::registry::canonical(&b.snapshot).unwrap(),
    )
    .unwrap();
    let result = Command::new(env!("CARGO_BIN_EXE_ink"))
        .args([
            "emit-core",
            input.to_str().unwrap(),
            "--core",
            "--optimise",
            catalogue.to_str().unwrap(),
            "-o",
            output.to_str().unwrap(),
        ])
        .output()
        .unwrap();
    assert!(
        result.status.success(),
        "{}",
        String::from_utf8_lossy(&result.stderr)
    );
    let selected = CheckedModule::from_bytes(&std::fs::read(output).unwrap()).unwrap();
    let body = serde_json::to_string(&selected.program().functions[0].body).unwrap();
    assert!(!body.contains("map"), "{body}");
    std::fs::remove_dir_all(dir).unwrap();
}
