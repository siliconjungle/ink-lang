use ink_core::{
    action_model::{check_functions, FunctionProjection, FunctionReplacement, FUNCTION_SEMANTICS},
    core::{CheckedModule, Expr},
    logic::{Proof, Term},
    planning, registry, syntax,
};
use std::collections::{BTreeMap, BTreeSet};

fn module(source: &str) -> CheckedModule {
    CheckedModule::from_source(syntax::parse(source).unwrap()).unwrap()
}
fn bundle(objects: BTreeMap<String, registry::Entry>) -> registry::Bundle {
    let entries = objects.keys().cloned().collect::<Vec<_>>();
    assert!(entries.len() <= 64);
    registry::Bundle {
        schema: 1,
        snapshot: registry::Snapshot {
            schema: 1,
            semantics: registry::SNAPSHOT_SEMANTICS.into(),
            root: registry::identity(&serde_json::json!({"schema":1,"entries":entries})).unwrap(),
        },
        roots: entries.clone(),
        membership: entries.iter().map(|id| (id.clone(), registry::Membership {
            entries: entries.clone(), path: vec![],
        })).collect(),
        objects,
    }
}
fn request(a: &CheckedModule, b: &CheckedModule, names: &[&str]) -> FunctionReplacement {
    let names = names.iter().map(|s| s.to_string()).collect::<BTreeSet<_>>();
    let before = FunctionProjection::derive(a, &names).unwrap();
    let after = FunctionProjection::derive(b, &names).unwrap();
    let mut objects = before.objects.clone();
    objects.extend(after.objects.clone());
    FunctionReplacement {
        schema: 1, semantics: FUNCTION_SEMANTICS.into(), input_core_sha256: a.identity().unwrap(),
        selected: serde_json::from_slice(&b.bytes().unwrap()).unwrap(),
        knowledge: bundle(objects),
        proofs: names.into_iter().map(|name| {
            let args = before.functions[&name].params.iter()
                .map(|(n,_)| Term::Var(n.clone())).collect::<Vec<_>>();
            let call = |function: String| Term::Call {function, arguments: args.clone()};
            let proof = Proof::Convert {from:call(before.functions[&name].function.clone()),
                to:call(after.functions[&name].function.clone())};
            (name,proof)
        }).collect(),
    }
}
fn selected(a: &CheckedModule, body: Expr) -> CheckedModule {
    let mut p = a.program().clone();
    p.functions.iter_mut().find(|f|f.name=="run").unwrap().body = body;
    CheckedModule::from_source(p).unwrap()
}

#[test]
fn pure_modules_replay_pointwise_helper_elimination_and_compose() {
    for ty in ["u32", "i32", "u64", "f32", "Bool", "List<f32>"] {
        let a = module(&format!("module funcs; fn identity(x:{ty})->{ty}{{return x;}}
            fn run(x:{ty})->{ty}{{return identity(x);}}
            fn caller(x:{ty})->{ty}{{return run(x);}}"));
        let b = selected(&a, Expr::Var("x".into()));
        let r = request(&a, &b, &["run"]);
        assert_eq!(check_functions(&a, &r).unwrap().identity().unwrap(), b.identity().unwrap());
        let plan = planning::Package {schema:1, semantics:planning::SEMANTICS.into(),
            input_core_sha256:a.identity().unwrap(),steps:vec![planning::Step::Functions(r)]};
        let wire = registry::canonical(&plan).unwrap();
        let decoded = serde_json::from_slice(&wire).unwrap();
        assert_eq!(planning::check(&a,&decoded).unwrap().module().identity().unwrap(),b.identity().unwrap());
    }
}

#[test]
fn projection_and_replacement_preserve_all_float_payload_bits() {
    let a = module("module bits; fn identity(x:f32)->f32{return x;}
        fn run(x:f32)->f32{return identity(x);}");
    let b = selected(&a, Expr::Var("x".into()));
    let checked = check_functions(&a,&request(&a,&b,&["run"])).unwrap();
    let projection = FunctionProjection::derive(&a,&BTreeSet::from(["run".into()])).unwrap();
    let context = projection.context().unwrap();
    for bits in [0,0x80000000,1,0x007fffff,0x7f800000,0xff800000,0x7fa01234,0xffc01234] {
        let call = Term::Call {function:projection.functions["run"].function.clone(),
            arguments:vec![Term::U64(bits as u64)]};
        assert_eq!(context.evaluate(&[],&call).unwrap(),Term::U64(bits as u64));
        for source in [&a,&checked] {
            let result = ink_core::eval::call(source.program(),"run",
                vec![ink_core::eval::Value::F32(bits)],&mut 10000).unwrap();
            assert!(matches!(result,ink_core::eval::Value::F32(n) if n==bits));
        }
    }
}

#[test]
fn invalid_equalities_and_unproved_callee_changes_reject() {
    let a = module("module funcs; fn identity(x:u64)->u64{return x;}
        fn run(x:u64)->u64{return identity(x);}");
    let b = selected(&a,Expr::Num(0));
    assert!(check_functions(&a,&request(&a,&b,&["run"])).is_err());
    let mut p = a.program().clone(); p.functions[0].body = Expr::Num(0);
    p.functions[1].body = Expr::Var("x".into());
    let b = CheckedModule::from_source(p).unwrap();
    // Proving the caller alone cannot hide the unproved changed callee.
    assert!(check_functions(&a,&request(&a,&b,&["run"])).is_err());
    assert!(check_functions(&a,&request(&a,&b,&["identity","run"])).is_err());
    let a = module("module bad_float; fn run(x:f32)->f32{return x+0.0;}");
    let b = selected(&a,Expr::Var("x".into()));
    assert!(check_functions(&a,&request(&a,&b,&["run"])).is_err());
}

#[test]
fn module_binding_definition_roots_and_exact_proof_set_are_mandatory() {
    let a = module("module funcs; fn identity(x:u64)->u64{return x;}
        fn run(x:u64)->u64{return identity(x);}");
    let b = selected(&a,Expr::Var("x".into()));
    let good = request(&a,&b,&["run"]);
    assert!(check_functions(&a,&good).is_ok());
    let mut bad = good.clone();bad.input_core_sha256="0".repeat(64);
    assert!(check_functions(&a,&bad).is_err());
    let mut bad = good.clone();bad.proofs.clear();assert!(check_functions(&a,&bad).is_err());
    let mut bad = good.clone();bad.proofs.insert("identity".into(),bad.proofs["run"].clone());
    assert!(check_functions(&a,&bad).is_err());
    let mut bad = good.clone();bad.knowledge.roots.clear();assert!(check_functions(&a,&bad).is_err());
    let mut bad = good.clone();bad.knowledge.objects.clear();bad.knowledge.membership.clear();
    assert!(check_functions(&a,&bad).is_err());
    let mut bad = good.clone();
    let (_,entry)=bad.knowledge.objects.iter_mut().next().unwrap();entry.payload["declaration"]=serde_json::json!({});
    assert!(check_functions(&a,&bad).is_err());
    // Rehashed, valid membership in an unrelated source's definitions is insufficient.
    let foreign = module("module funcs; fn run(x:u64)->u64{return 0;}");
    let foreign = FunctionProjection::derive(&foreign,&BTreeSet::from(["run".into()])).unwrap();
    let mut bad = good;bad.knowledge=bundle(foreign.objects);
    assert!(check_functions(&a,&bad).is_err());
}

#[test]
fn public_interfaces_and_non_function_source_cannot_change() {
    let a = module("module funcs; fn identity(x:u64)->u64{return x;}
        fn run(x:u64)->u64{return identity(x);}
        query serve(x:u64)->u64{return run(x);}");
    let b = selected(&a,Expr::Var("x".into()));
    let good = request(&a,&b,&["run"]);
    for variant in 0..4 {
        let mut p = b.program().clone();
        match variant {
            0=>p.module="other".into(),
            1=>p.actions[0].body=vec![ink_core::core::Statement::Return(Expr::Num(0))],
            2=>p.functions.reverse(),
            _=>p.functions.push(ink_core::core::Function {name:"extra".into(),params:vec![],
                result:ink_core::core::Type::U64,body:Expr::Num(0)}),
        }
        let changed = CheckedModule::from_source(p).unwrap();
        let mut bad = good.clone();bad.selected=serde_json::from_slice(&changed.bytes().unwrap()).unwrap();
        assert!(check_functions(&a,&bad).is_err(),"variant {variant}");
    }
}

#[test]
fn projection_is_bounded_and_ignores_unreachable_unsupported_helpers() {
    let a = module("module funcs; fn run(x:u64)->u64{return x;}
        fn double(x:f64)->f64{return x+x;}");
    assert!(FunctionProjection::derive(&a,&BTreeSet::new()).is_err());
    assert!(FunctionProjection::derive(&a,&BTreeSet::from(["missing".into()])).is_err());
    assert!(FunctionProjection::derive(&a,&BTreeSet::from(["double".into()])).is_err());
    FunctionProjection::derive(&a,&BTreeSet::from(["run".into()])).unwrap().context().unwrap();
}

#[test]
fn projected_interfaces_are_independent_of_callee_type_discovery() {
    let a = module("module scope; record Node{flag:Bool,}
        fn hidden(n:Node,x:List<f32>)->List<f32>{return x;}
        fn run(x:List<f32>)->List<f32>{return hidden(Node{flag:true},x);}");
    let b = selected(&a,Expr::Var("x".into()));
    let names = BTreeSet::from(["run".into()]);
    let before = FunctionProjection::derive(&a,&names).unwrap();
    let after = FunctionProjection::derive(&b,&names).unwrap();
    assert_eq!(before.functions["run"].params,after.functions["run"].params);
    assert_eq!(before.functions["run"].result,after.functions["run"].result);
    check_functions(&a,&request(&a,&b,&["run"])).unwrap();

    let prefix="module imports;record Node{flag:Bool,}
        fn append(n:Node,xs:List<f32>)->List<f32>{return buffer(xs).push(0.0).freeze();}";
    let a=module(&format!("{prefix} fn run(xs:List<f32>)->List<f32>{{return append(Node{{flag:true}},xs);}}"));
    let b=module(&format!("{prefix} fn run(xs:List<f32>)->List<f32>{{return buffer(xs).push(0.0).freeze();}}"));
    let before=FunctionProjection::derive(&a,&names).unwrap();
    let after=FunctionProjection::derive(&b,&names).unwrap();
    let definitions=|model:&FunctionProjection|model.objects.iter().map(|(id,entry)|
        (registry::canonical(&entry.payload).unwrap(),id.clone())).collect::<BTreeMap<_,_>>();
    let left=definitions(&before);let right=definitions(&after);
    for (declaration,id) in &left {
        if let Some(other)=right.get(declaration) {assert_eq!(id,other,"identical declaration imports changed");}
    }
}

#[test]
fn mutable_graph_projection_matches_owned_source_execution() {
    let a = module("module graph;
        fn step(index:u32,x:f32,values:Buffer<f32>)->Buffer<f32>{
          let value=values.at_or(index,0.0)+x;return values.push(value);
        }
        fn run(code:List<u32>,x:f32,input:List<f32>)->List<f32>{
          let values=foldl(code,buffer(input),fn(index)=>fn(values)=>
            step(index,x,values));
          return values.freeze();
        }");
    let model = FunctionProjection::derive(&a,&BTreeSet::from(["run".into()])).unwrap();
    let context = model.context().unwrap();
    let f = &model.functions["run"];
    let list = |sort: &ink_core::logic::Sort, values: &[u64]| {
        let ink_core::logic::Sort::Data(datatype) = sort else {panic!()};
        values.iter().rev().fold(Term::Construct {datatype:datatype.clone(),constructor:0,arguments:vec![]},
            |tail,n| Term::Construct {datatype:datatype.clone(),constructor:1,arguments:vec![Term::U64(*n),tail]})
    };
    for code in [vec![],vec![0],vec![0,1,2],vec![u32::MAX,0]] {
        for bits in [0,0x80000000,1,0x3f800000,0x7f800000,0x7fa01234,0xffc01234] {
            let input=vec![ink_core::eval::Value::F32(0x80000000),ink_core::eval::Value::F32(bits)];
            let expected=ink_core::eval::call(a.program(),"run",vec![
                ink_core::eval::Value::List(code.iter().map(|n|ink_core::eval::Value::U32(*n)).collect()),
                ink_core::eval::Value::F32(bits),ink_core::eval::Value::List(input)],&mut 100000).unwrap();
            let ink_core::eval::Value::List(expected)=expected else {panic!()};
            let expected=expected.iter().map(|value| match value {
                ink_core::eval::Value::F32(bits)=>*bits as u64,_=>panic!(),
            }).collect::<Vec<_>>();
            let invocation=Term::Call {function:f.function.clone(),arguments:vec![
                list(&f.params[0].1,&code.iter().map(|n|*n as u64).collect::<Vec<_>>()),
                Term::U64(bits as u64),list(&f.params[2].1,&[0x80000000,bits as u64])]};
            assert_eq!(context.evaluate(&[],&invocation).unwrap(),list(&f.result,&expected));
        }
    }
}
