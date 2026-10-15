use serde_json::{json, Value};
use std::{
    fs,
    path::{Path, PathBuf},
    process::Command,
};
use verified_language::{
    contracts, core::CheckedModule, eval, optimisation, registry, stateful::Runtime, syntax,
};
#[path = "support/parity.rs"]
mod parity;
fn root() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).to_path_buf()
}

#[test]
fn approximation_database_laws_replay_and_false_composition_is_rejected() {
    use verified_language::law_author;
    let source=fs::read_to_string(root().join("knowledge/libraries/approximation-laws.ink")).unwrap();
    let proofs=serde_json::from_slice::<std::collections::BTreeMap<String,law_author::Evidence>>(&fs::read(root().join("knowledge/libraries/approximation-laws.proofs.json")).unwrap()).unwrap();
    let admitted=law_author::compile_source(syntax::parse_law_source(&source).unwrap(),proofs.clone(),None).unwrap();
    assert_eq!(admitted.names.len(),12);
    for false_source in [source.replace("a-c<=first+second","a-c<=first+second-1"),source.replace("requires bc:b-c<=second;","requires bc:b-c<=second+1;"),source.replace("requires wider:small<=large;","requires wider:small<=large+1;")] {
        assert!(law_author::compile_source(syntax::parse_law_source(&false_source).unwrap(),proofs.clone(),None).is_err());
    }
}

#[test]
fn approximation_contracts_refine_within_budget_and_preserve_complete_execution() {
    let (program,_) = author("examples/approximation.ink", "approximation-baseline-proofs");
    let input=CheckedModule::from_source(program).unwrap();
    let bodies=std::collections::BTreeMap::from([("coarse".into(),contracts::Body::Pure(syntax::Expr::Var("x".into())))]);
    let refined=contracts::prepare(&input,&bodies).unwrap();
    let evidence=contracts::Evidence{schema:1,semantics:contracts::SEMANTICS.into(),source_sha256:contracts::subject_identity(&refined).unwrap(),proofs:Default::default(),state_proofs:Default::default(),knowledge:None,state_knowledge:None};
    let mut package:optimisation::Package=serde_json::from_value(json!({"schema":1,"semantics":"ink-evidence-v1","input_core_sha256":input.identity().unwrap(),"knowledge":registry::from_catalogue(&verified_language::laws::Catalogue{schema:1,semantics:verified_language::laws::SEMANTICS.into(),roots:vec![],objects:Default::default()}).unwrap(),"applications":[]})).unwrap();
    package.contract_refinement=Some(contracts::Refinement{bodies,evidence});
    let selected=optimisation::check(&input,&package).unwrap();
    let snapshot=Runtime::new_selected(&selected).unwrap().checkpoint_portable().unwrap();
    let values=[-100i64,-1,0,1,100];
    let mut steps=vec![];let mut expected=vec![];
    for x in values {
        steps.push(json!({"pure":"coarse","args":[x],"cpu_only":true}));
        expected.push(json!({"reply":{"value":{"Int":x.to_string()}},"snapshot":snapshot}));
    }
    for name in ["half_success","relative_example"] {
        steps.push(json!({"pure":name,"args":[],"cpu_only":true}));
        expected.push(json!({"reply":{"value":true},"snapshot":snapshot}));
    }
    let source=fs::read_to_string(root().join("examples/approximation.ink")).unwrap();
    parity::conformance_selected("checked-approximation-refinement",&selected,&source,steps,expected);
    let mut false_package=package.clone();
    false_package.contract_refinement.as_mut().unwrap().bodies.insert("coarse".into(),contracts::Body::Pure(syntax::Expr::Binary("-".into(),Box::new(syntax::Expr::Var("x".into())),Box::new(syntax::Expr::Num(1)))));
    let changed=contracts::prepare(&input,&false_package.contract_refinement.as_ref().unwrap().bodies).unwrap();
    false_package.contract_refinement.as_mut().unwrap().evidence.source_sha256=contracts::subject_identity(&changed).unwrap();
    assert!(optimisation::check(&input,&false_package).is_err(),"rehashing cannot widen the error budget");
}

#[test]
fn approximation_predicates_match_independent_integer_and_finite_space_oracles() {
    use syntax::{Function,Type};
    let source="module approximation_oracles;import \"std:approximation\" as approx;fn probability(space:List<u32>,num:Int,den:Int)->Bool{return approx.probability_at_least<u32>(space,fn(seed)=>seed==0,num,den);}";
    let dir=root().join("build/approximation-oracles");fs::create_dir_all(&dir).unwrap();
    fs::write(dir.join("source.ink"),source).unwrap();
    let mut p=verified_language::modules::load(dir.join("source.ink")).unwrap().program;
    // Compile the parser's actual postcondition expansions as ordinary Boolean
    // observers, then check target execution against independent host arithmetic.
    for (name,ty,clause) in [("absolute",Type::U64,"approximates reference within absolute budget"),("relative",Type::Int,"approximates reference within relative(budget,denominator)"),("ulps",Type::F32,"approximates reference within ulps budget")] {
        let typename=match ty{Type::U64=>"u64",Type::Int=>"Int",_=>"f32"};
        let parsed=syntax::parse(&format!("module observer;spec fn f(reference:{typename},budget:Int,denominator:Int)->{typename} {clause};implementation placeholder for f{{return reference;}}")).unwrap();
        p.functions.push(Function{name:name.into(),params:vec![("result".into(),ty.clone()),("reference".into(),ty),("budget".into(),Type::Int),("denominator".into(),Type::Int)],result:Type::Bool,body:parsed.contracts.specifications[0].ensures[0].clone()});
    }
    let mut cases=vec![];
    for a in [0u64,1,255,u32::MAX as u64,u64::MAX-1,u64::MAX] {
        for b in [0u64,1,u64::MAX] {
            for budget in [-1i128,0,1,255] {
                let good=budget>=0 && (a as i128-b as i128).abs()<=budget;
                cases.push(("absolute",json!([a,b,{"Int":budget.to_string()},{"Int":"1"}]),good));
            }
        }
    }
    for space in [vec![],vec![0],vec![1],vec![0,0,0,1],vec![0,1,2,3]] {
        for (num,den) in [(0i128,1i128),(1,2),(3,4),(1,1),(-1,2),(1,0),(3,2)] {
            let passed=space.iter().filter(|&&n|n==0).count() as i128;
            let good=!space.is_empty() && num>=0 && den>0 && num<=den && passed*den>=space.len() as i128*num;
            cases.push(("probability",json!([space,{"Int":num.to_string()},{"Int":den.to_string()}]),good));
        }
    }
    for (a,b,n,d) in [(99i128,100i128,1i128,100i128),(-99,-100,1,100),(1,0,1,100),(0,0,1,100),(100,100,1,0)] {
        let good=n>=0&&d>0&&(a-b).abs()*d<=b.abs()*n;
        cases.push(("relative",json!([{"Int":a.to_string()},{"Int":b.to_string()},{"Int":n.to_string()},{"Int":d.to_string()}]),good));
    }
    for (a,b,budget,good) in [(0u32,0x80000000u32,0,true),(1,0,1,true),(0x80000001,1,1,false),(0x80000001,1,2,true),(0x3f800001,0x3f800000,1,true),(0x7f800000,0x7f800000,0,false),(0x7fc00000,0x7fc00000,0,false)] {
        cases.push(("ulps",json!([{"F32Bits":a},{"F32Bits":b},{"Int":budget.to_string()},{"Int":"1"}]),good));
    }
    let snapshot=Runtime::new(p.clone()).unwrap().checkpoint_portable().unwrap();
    let steps=cases.iter().map(|(name,args,_)|json!({"pure":name,"args":args,"cpu_only":true})).collect();
    let expected=cases.iter().map(|(_,_,good)|json!({"reply":{"value":good},"snapshot":snapshot})).collect();
    parity::conformance("approximation-independent-oracles",p,source,steps,expected);
}
#[test]
fn public_compiler_calibrates_checked_candidates_and_rejects_overlapping_holdout() {
    let output=Command::new("python3").current_dir(root())
        .args(["tools/offline_holdout_conformance.py","--compiler",env!("CARGO_BIN_EXE_ink"),"--root","build/offline-holdout-conformance"])
        .output().unwrap();
    assert!(output.status.success(),"{}",String::from_utf8_lossy(&output.stderr));
    let report:Value=serde_json::from_slice(&fs::read(root().join("build/offline-holdout-conformance/checks.json")).unwrap()).unwrap();
    assert_eq!(report["status"],json!("passed"));assert_eq!(report["cases"].as_array().unwrap().len(),2);
}
fn author(file: &str, output: &str) -> (syntax::Program, PathBuf) {
    let dir = root().join("build").join(output);
    fs::create_dir_all(&dir).unwrap();
    let o = Command::new("python3")
        .current_dir(root())
        .env("PYTHONPATH", root().join("knowledge"))
        .args(["-m", "producers.contract_proofs", file])
        .arg(&dir)
        .args(["--compiler", env!("CARGO_BIN_EXE_ink")])
        .output()
        .unwrap();
    assert!(o.status.success(), "{}", String::from_utf8_lossy(&o.stderr));
    let mut p = verified_language::modules::load(root().join(file))
        .unwrap()
        .program;
    contracts::attach(
        &mut p,
        serde_json::from_slice(&fs::read(dir.join("evidence.json")).unwrap()).unwrap(),
    )
    .unwrap();
    CheckedModule::from_source(p.clone()).unwrap();
    (p, dir)
}
#[test]
fn contracts_invariants_and_boundaries_across_targets() {
    let (p, _) = author("examples/source-contracts.ink", "source-contract-proofs");
    let source = fs::read_to_string(root().join("examples/source-contracts.ink")).unwrap();
    let mut r = Runtime::new(p.clone()).unwrap();
    let mut steps = vec![];
    let mut expected = vec![];
    for (name, args) in [
        ("read", json!([])),
        ("reset", json!([0])),
        ("reset", json!([1])),
        ("twice", json!([])),
        ("read", json!([])),
    ] {
        let reply = match r.invoke_json(name, &args) {
            Ok(out) => json!({"outcome":out.json()}),
            Err(e) => json!({"host_error":e}),
        };
        steps.push(json!({"call":name,"args":args}));
        expected.push(json!({"reply":reply,"snapshot":r.checkpoint_portable().unwrap()}));
    }
    for (name, args, want) in [
        ("only_zero", json!([0]), json!(0)),
        ("increment", json!([7]), json!(8)),
        ("bags", json!([[1, 2, 1], [1, 1, 2]]), json!(true)),
        ("bags", json!([[1, 1], [1]]), json!(false)),
        (
            "float_bags",
            json!([[0.0],[{"F32Bits":2147483648u32}]]),
            json!(false),
        ),
        ("unique_values", json!([[1, 2, 1]]), json!(false)),
        (
            "ids",
            json!([[{"id":1,"value":2},{"id":2,"value":2}]]),
            json!(true),
        ),
        (
            "unique_keys",
            json!([[{"id":1,"value":2},{"id":1,"value":3}]]),
            json!(false),
        ),
    ] {
        let f = p.functions.iter().find(|f| f.name == name).unwrap();
        let values = args
            .as_array()
            .unwrap()
            .iter()
            .zip(&f.params)
            .map(|(v, (_, t))| eval::Value::from_program_json(v, t, &p).unwrap())
            .collect();
        assert_eq!(
            eval::call(&p, name, values, &mut 1000000).unwrap().json(),
            want
        );
        steps.push(json!({"pure":name,"args":args,"cpu_only":true}));
        expected.push(json!({"reply":{"value":want},"snapshot":r.checkpoint_portable().unwrap()}));
    }
    let error = eval::call(&p, "only_zero", vec![eval::Value::U64(1)], &mut 10000).unwrap_err();
    steps.push(json!({"pure":"only_zero","args":[1],"cpu_only":true}));
    expected
        .push(json!({"reply":{"host_error":error},"snapshot":r.checkpoint_portable().unwrap()}));

    // A correctly encoded snapshot with a false invariant must still be rejected.
    let layout = verified_language::snapshot::layout(&p).unwrap();
    let valid = r.checkpoint_portable().unwrap();
    let mut logical =
        verified_language::snapshot_wire::decode(&layout, &valid, Default::default()).unwrap();
    logical.tables[0] = vec![(json!(0), json!(1))];
    let forged =
        verified_language::snapshot_wire::encode(&layout, &logical, Default::default()).unwrap();
    assert!(Runtime::restore_portable(p.clone(), &forged)
        .err()
        .unwrap()
        .contains("invariant"));
    steps.push(json!({"reject_restore":forged}));
    parity::conformance("source-contracts-parity", p, &source, steps, expected);
}
#[test]
fn database_refinement_replays_and_emits_across_targets() {
    let out = root().join("build/contract-candidates");
    let command = Command::new("python3")
        .current_dir(root())
        .env("PYTHONPATH", root().join("knowledge"))
        .args([
            "-m",
            "producers.contract_candidates",
            "examples/contract-optimisations.ink",
        ])
        .arg(&out)
        .args(["--compiler", env!("CARGO_BIN_EXE_ink")])
        .output()
        .unwrap();
    assert!(
        command.status.success(),
        "{}",
        String::from_utf8_lossy(&command.stderr)
    );
    let report: Value =
        serde_json::from_slice(&fs::read(out.join("candidates.json")).unwrap()).unwrap();
    assert!(report["candidates"].as_array().unwrap().len()>=4,"{report}");
    assert!(report["attempts"].as_u64().unwrap()<=256);
    let input = CheckedModule::from_bytes(&fs::read(out.join("input-core.json")).unwrap()).unwrap();
    let source = fs::read_to_string(root().join("examples/contract-optimisations.ink")).unwrap();
    for (index, id) in report["candidates"].as_array().unwrap().iter().enumerate() {
        let entry: registry::Entry = serde_json::from_slice(
            &fs::read(out.join(format!("store/objects/{}.json", id.as_str().unwrap()))).unwrap(),
        )
        .unwrap();
        let packet: optimisation::Package =
            serde_json::from_value(entry.payload["package"].clone()).unwrap();
        let selected = optimisation::check(&input, &packet).unwrap();
        let snapshot = Runtime::new_selected(&selected)
            .unwrap()
            .checkpoint_portable()
            .unwrap();
        let steps = vec![
            json!({"pure":"zero","args":[[0,1,18446744073709551615u64]],"cpu_only":true}),
            json!({"pure":"copy","args":[[1,2,4294967295u32]],"expect_gpu":true}),
            json!({"pure":"sorted","args":[[1,2,3]],"cpu_only":true}),
            json!({"pure":"ids_are_unique","args":[[{"id":1,"value":7},{"id":2,"value":7}]],"cpu_only":true}),
        ];
        let expected = [
            json!(0),
            json!([1, 2, 4294967295u32]),
            json!([1, 2, 3]),
            json!(true),
        ]
        .into_iter()
        .map(|value| json!({"reply":{"value":value},"snapshot":snapshot}))
        .collect();
        parity::conformance_selected(
            &format!("contract-refinement-{index}"),
            &selected,
            &source,
            steps,
            expected,
        );
        let mut bad = packet.clone();
        if let Some(r) = &mut bad.contract_refinement {
            let name = r.bodies.keys().next().unwrap().clone();
            r.bodies
                .insert(name, contracts::Body::Pure(syntax::Expr::Num(99)));
        }
        assert!(optimisation::check(&input, &bad).is_err());
    }
}

#[test]
fn loose_contracts_discover_checked_alternatives_and_remove_sorting() {
    let out=root().join("build/loose-contract-candidates");
    let command=Command::new("python3").current_dir(root())
        .env("PYTHONPATH",format!("{}:{}",root().join("knowledge").display(),root().join("planner").display()))
        .args(["-m","producers.contract_candidates","examples/contract-looseness.ink"])
        .arg(&out).args(["--compiler",env!("CARGO_BIN_EXE_ink"),"--max-per-spec","8"])
        .output().unwrap();
    assert!(command.status.success(),"{}",String::from_utf8_lossy(&command.stderr));
    let report:Value=serde_json::from_slice(&fs::read(out.join("candidates.json")).unwrap()).unwrap();
    let input=CheckedModule::from_bytes(&fs::read(out.join("input-core.json")).unwrap()).unwrap();
    let mut found=std::collections::BTreeSet::new();
    for id in report["candidates"].as_array().unwrap(){
        let entry:registry::Entry=serde_json::from_slice(&fs::read(out.join(format!("store/objects/{}.json",id.as_str().unwrap()))).unwrap()).unwrap();
        let packet:optimisation::Package=serde_json::from_value(entry.payload["package"].clone()).unwrap();
        let selected=optimisation::check(&input,&packet).unwrap();
        let bodies=&packet.contract_refinement.as_ref().unwrap().bodies;
        for (name,body)in bodies{
            let desired=match(name.as_str(),body){
                ("unordered",contracts::Body::Pure(syntax::Expr::Var(x)))=>x=="xs",
                ("choice",contracts::Body::Pure(syntax::Expr::Num(2)))=>true,
                ("bounded",contracts::Body::Pure(syntax::Expr::Num(0)))=>true,
                ("action_choice",contracts::Body::Action(stmts))=>matches!(stmts.as_slice(),[syntax::Statement::Return(syntax::Expr::Num(2))]),
                _=>false,
            };
            if desired{found.insert(name.clone());}
            if desired&&name=="unordered"{
                let snapshot=Runtime::new_selected(&selected).unwrap().checkpoint_portable().unwrap();
                let cases=[vec![],vec![3,1,3,2],vec![4294967295u32,0,4294967295u32]];
                let steps=cases.iter().map(|xs|json!({"pure":"unordered","args":[xs],"cpu_only":true})).collect();
                let expected=cases.iter().map(|xs|json!({"reply":{"value":xs},"snapshot":snapshot})).collect();
                parity::conformance_selected("bag-sort-elimination",&selected,include_str!("../examples/contract-looseness.ink"),steps,expected);
                let mut forged=packet.clone();forged.contract_refinement.as_mut().unwrap().bodies.insert(name.clone(),contracts::Body::Pure(syntax::Expr::Call("list".into(),vec![])));
                assert!(optimisation::check(&input,&forged).is_err(),"discarding multiplicities must fail");
            }
        }
    }
    assert_eq!(found,std::collections::BTreeSet::from(["unordered".into(),"choice".into(),"bounded".into(),"action_choice".into()]));
}

#[test]
fn pure_postconditions_and_immutable_bindings_compose_inside_actions() {
    let directory=root().join("build/action-contract-composition");fs::create_dir_all(&directory).unwrap();
    let source="module action_facts;spec fn classify(x:u32)->u32 ensures result==1 || result==2;implementation alternatives for classify{return choose(x==0,1,2);}spec fn consume(y:u32)->Bool requires y==1 || y==2;ensures result;implementation accepted for consume{return true;}query run(x:u32)->Bool{let y=classify(x);return consume(y);}";
    fs::write(directory.join("source.ink"),source).unwrap();
    let (program,_)=author("build/action-contract-composition/source.ink","action-contract-composition/proofs");
    let mut runtime=Runtime::new(program.clone()).unwrap();
    let mut steps=vec![];let mut expected=vec![];
    for x in [0u32,17,u32::MAX]{
        let reply=runtime.invoke_json("run",&json!([x])).unwrap();assert_eq!(reply.json()["result"],json!(true));
        steps.push(json!({"call":"run","args":[x]}));expected.push(json!({"reply":{"outcome":reply.json()},"snapshot":runtime.checkpoint_portable().unwrap()}));
    }
    parity::conformance("action-contract-composition",program,source,steps,expected);
}
#[test]
fn total_changes_commit_and_nested_failures_roll_back_across_targets() {
    let source = r#"module total;
 private state N:u64=0;event Changed:u64;
 change set(n:u64)->Option<u64> writes(N) emits(Changed){N=n;emit Changed(n);return None;}
 change twice()->u64 writes(N) emits(Changed){set(1);set(2);return 3;}
 change fail()->Result<Unit,String> writes(N) emits(Changed){set(9);return Err("no");}
 query read()->u64 reads(N){return N;}
 "#;
    let p = syntax::parse(source).unwrap();
    let mut r = Runtime::new(p.clone()).unwrap();
    let mut steps = vec![];
    let mut expected = vec![];
    for (name, args) in [
        ("set", json!([5])),
        ("read", json!([])),
        ("twice", json!([])),
        ("read", json!([])),
        ("fail", json!([])),
        ("read", json!([])),
    ] {
        let result = r.invoke_json(name, &args).unwrap();
        if name == "set" || name == "twice" {
            assert!(result.committed);
        }
        if name == "fail" {
            assert!(!result.committed);
        }
        steps.push(json!({"call":name,"args":args}));
        expected.push(
            json!({"reply":{"outcome":result.json()},"snapshot":r.checkpoint_portable().unwrap()}),
        );
    }
    parity::conformance("total-changes-parity", p, source, steps, expected);
}
#[test]
fn imported_contracts_and_private_roots() {
    let dir = root().join("build/imported-contracts");
    fs::create_dir_all(&dir).unwrap();
    fs::write(dir.join("lib.ink"),"module helper; private state Secret:u64=4; spec fn same<T>(x:T)->T ensures result==x; implementation id for same{return x;} query read()->u64 reads(Secret){return Secret;}").unwrap();
    let source =
        "module client;import \"lib.ink\" as helper;fn run()->u32{return helper.same<u32>(7);}";
    fs::write(dir.join("main.ink"), source).unwrap();
    let p = verified_language::modules::load(dir.join("main.ink"))
        .unwrap()
        .program;
    CheckedModule::from_source(p.clone()).unwrap();
    assert_eq!(
        eval::call(&p, "run", vec![], &mut 1000).unwrap().json(),
        json!(7)
    );
    fs::write(dir.join("main.ink"),"module client;import \"lib.ink\" as helper;query steal()->u64 reads(helper.Secret){return helper.Secret;}").unwrap();
    assert!(verified_language::modules::load(dir.join("main.ink")).is_err());
}
#[test]
fn contract_laws_transfer_without_new_helper_certificates() {
    let (p, dir) = author(
        "examples/contract-optimisations.ink",
        "contract-transfer-proofs",
    );
    let mut evidence: contracts::Evidence =
        serde_json::from_slice(&fs::read(dir.join("evidence.json")).unwrap()).unwrap();
    let source = fs::read_to_string(root().join("examples/contract-optimisations.ink"))
        .unwrap()
        .replace("contract_optimisations", "unfamiliar")
        .replace("zero", "annihilate")
        .replace("scan for", "walk for");
    let mut next = syntax::parse(&(source + "\nfn unrelated(x:Bool)->Bool{return x;}")).unwrap();
    assert_ne!(
        contracts::subject_identity(&p).unwrap(),
        contracts::subject_identity(&next).unwrap()
    );
    evidence.source_sha256 = contracts::subject_identity(&next).unwrap();
    evidence.proofs = evidence
        .proofs
        .into_iter()
        .map(|(key, proof)| {
            (
                key.replace("zero:", "annihilate:")
                    .replace("scan:", "walk:"),
                proof,
            )
        })
        .collect();
    contracts::attach(&mut next, evidence).unwrap();
    CheckedModule::from_source(next).unwrap();
}
#[test]
fn javascript_bound_and_destination_entries_enforce_preconditions() {
    let source="module guard;spec fn copy(xs:List<u32>,n:u32)->List<u32> requires n==0;ensures result==xs;implementation direct for copy{return xs;} spec query unavailable()->u64 requires false;ensures result==0;implementation zero for unavailable{return 0;}";
    let module = CheckedModule::from_source(syntax::parse(source).unwrap()).unwrap();
    let emitted = verified_language::javascript::lower(&module).unwrap();
    let dir = root().join("build/contract-entrypoints");
    fs::create_dir_all(&dir).unwrap();
    fs::write(dir.join("program.mjs"), emitted.javascript).unwrap();
    fs::write(dir.join("check.mjs"),"import assert from 'node:assert/strict';import * as p from './program.mjs';const dest=new Uint32Array([7,8,9]);assert.throws(()=>p.callInto('copy',[[1,2],1],dest),/contract precondition failed/);assert.deepEqual([...dest],[7,8,9]);const state=p.createState();assert.throws(()=>state.bind('unavailable')(),/contract precondition failed/);assert.throws(()=>state.bind('unavailable',{resultOnly:true})(),/contract precondition failed/);").unwrap();
    let done = Command::new("node")
        .arg(dir.join("check.mjs"))
        .output()
        .unwrap();
    assert!(
        done.status.success(),
        "{}",
        String::from_utf8_lossy(&done.stderr)
    );
}

#[test]
fn unique_state_invariants_and_bag_queries_across_targets() {
    let (p, _) = author("examples/state-contracts.ink", "state-contract-proofs");
    let source = fs::read_to_string(root().join("examples/state-contracts.ink")).unwrap();
    let mut runtime = Runtime::new(p.clone()).unwrap();
    let one = json!({"id":1,"value":7});
    let two = json!({"id":2,"value":9});
    let duplicate = json!({"id":1,"value":99});
    let mut steps = vec![];
    let mut expected = vec![];
    for (name, args) in [
        ("length_ready", json!([])),
        ("replace_all", json!([[one, two]])),
        ("length_ready", json!([])),
        ("same_bag", json!([[two, one]])),
        ("add_bag", json!([[two], one])),
        ("same_bag", json!([[one, one]])),
        ("replace_all", json!([[one, duplicate]])),
        ("contents", json!([])),
        ("clear", json!([])),
        ("contents", json!([])),
    ] {
        let reply = match runtime.invoke_json(name, &args) {
            Ok(out) => json!({"outcome":out.json()}),
            Err(e) => json!({"host_error":e}),
        };
        steps.push(json!({"call":name,"args":args}));
        expected.push(json!({"reply":reply,"snapshot":runtime.checkpoint_portable().unwrap()}));
    }
    assert!(expected[6]["reply"]["host_error"]
        .as_str()
        .unwrap()
        .contains("precondition"));
    assert_eq!(expected[5]["snapshot"], expected[6]["snapshot"]);
    let layout = verified_language::snapshot::layout(&p).unwrap();
    let valid = runtime.checkpoint_portable().unwrap();
    let mut logical =
        verified_language::snapshot_wire::decode(&layout, &valid, Default::default()).unwrap();
    logical.tables[0] = vec![(json!(0), json!([one, duplicate]))];
    let forged =
        verified_language::snapshot_wire::encode(&layout, &logical, Default::default()).unwrap();
    assert!(Runtime::restore_portable(p.clone(), &forged)
        .err()
        .unwrap()
        .contains("invariant"));
    steps.push(json!({"reject_restore":forged}));
    parity::conformance("state-contracts-parity", p, &source, steps, expected);
}

#[test]
fn action_refinement_preserves_guards_and_checks_selected_postconditions() {
    use contracts::{Body, Evidence, Refinement};
    use std::collections::BTreeMap;
    let source = "module action_refinement; spec query pick(n:u64)->u64 requires n==0; ensures result==1 || result==2; implementation first for pick{return 1;} query read()->u64{return pick(0);}";
    let module = CheckedModule::from_source(syntax::parse(source).unwrap()).unwrap();
    let bodies = BTreeMap::from([(
        "pick".into(),
        Body::Action(vec![syntax::Statement::Return(syntax::Expr::Num(2))]),
    )]);
    let prepared = contracts::prepare(&module, &bodies).unwrap();
    let evidence = Evidence {
        schema: 1,
        semantics: contracts::SEMANTICS.into(),
        source_sha256: contracts::subject_identity(&prepared).unwrap(),
        proofs: Default::default(),
        state_proofs: Default::default(),
        knowledge: None,
        state_knowledge: None,
    };
    let knowledge = serde_json::from_value(json!({"schema":1,"snapshot":{"schema":1,"semantics":"ink-knowledge-snapshot-v1","root":registry::identity(&json!({"schema":1,"entries":[]})).unwrap()},"roots":[],"objects":{},"membership":{}})).unwrap();
    let packet = optimisation::Package {
        schema: 1,
        semantics: optimisation::SEMANTICS.into(),
        input_core_sha256: module.identity().unwrap(),
        knowledge,
        applications: vec![],
        action_replacement: None,
        contract_refinement: Some(Refinement { bodies, evidence }),
    };
    let selected = optimisation::check(&module, &packet).unwrap();
    let mut runtime = Runtime::new_selected(&selected).unwrap();
    let mut steps = vec![];
    let mut expected = vec![];
    for (name, args) in [
        ("pick", json!([0])),
        ("read", json!([])),
        ("pick", json!([1])),
        ("first", json!([0])),
    ] {
        let reply = match runtime.invoke_json(name, &args) {
            Ok(out) => json!({"outcome":out.json()}),
            Err(error) => json!({"host_error":error}),
        };
        steps.push(json!({"call":name,"args":args}));
        expected.push(json!({"reply":reply,"snapshot":runtime.checkpoint_portable().unwrap()}));
    }
    assert_eq!(expected[0]["reply"]["outcome"]["result"], json!(2));
    assert_eq!(expected[1]["reply"]["outcome"]["result"], json!(2));
    assert!(expected[2]["reply"]["host_error"]
        .as_str()
        .unwrap()
        .contains("precondition"));
    assert_eq!(expected[3]["reply"]["outcome"]["result"], json!(1));
    parity::conformance_selected(
        "action-contract-refinement",
        &selected,
        source,
        steps,
        expected,
    );
    let mut bad = packet;
    let refinement = bad.contract_refinement.as_mut().unwrap();
    refinement.bodies.insert(
        "pick".into(),
        Body::Action(vec![syntax::Statement::Return(syntax::Expr::Num(3))]),
    );
    let prepared = contracts::prepare(&module, &refinement.bodies).unwrap();
    refinement.evidence.source_sha256 = contracts::subject_identity(&prepared).unwrap();
    assert!(optimisation::check(&module, &bad).is_err());
}
