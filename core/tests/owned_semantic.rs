use ink_core::{
    check,
    core::{CheckedModule, Type},
    eval::{self, Value},
    laws::{Catalogue, CheckedCatalogue, Equation, Proof},
    semantic::{self as s, Budget, Node, Term},
    syntax::parse,
};
use std::collections::BTreeMap;
fn logical(v: &Value, t: &Type) -> Term {
    let sort = s::value(t.clone());
    match (v, t) {
        (Value::U32(n), _) => s::word(t.clone(), *n as u64),
        (Value::U64(n), _) => s::word(t.clone(), *n),
        (Value::I32(n), _) => s::word(t.clone(), *n as u32 as u64),
        (Value::Bool(n), _) => s::term(sort, Node::Bool(*n)),
        (Value::F32(n), _) => s::term(sort, Node::Float(*n)),
        (Value::List(xs), Type::List(inner)) => {
            xs.iter()
                .rev()
                .fold(s::term(sort.clone(), Node::Nil), |tail, x| {
                    s::term(
                        sort.clone(),
                        Node::Cons(Box::new(logical(x, inner)), Box::new(tail)),
                    )
                })
        }
        _ => panic!("unsupported test value {v:?} {t:?}"),
    }
}
fn check_call(module: &CheckedModule, name: &str, args: Vec<Value>) {
    let p = module.program();
    let f = p.functions.iter().find(|f| f.name == name).unwrap();
    let from = s::elaborate(
        &f.body,
        &check::params_env(&f.params).unwrap(),
        p,
        &f.result,
    )
    .unwrap();
    let substitutions = f
        .params
        .iter()
        .zip(&args)
        .map(|((name, t), v)| (name.clone(), logical(v, t)))
        .collect();
    let from = s::substitute(&from, &substitutions, &mut Budget::new()).unwrap();
    let actual = eval::call(p, name, args, &mut 100000).unwrap();
    let catalogue = CheckedCatalogue::check(
        &Catalogue {
            schema: 1,
            semantics: ink_core::laws::SEMANTICS.into(),
            roots: vec![],
            objects: BTreeMap::new(),
        },
        p,
    )
    .unwrap();
    let eq = Equation {
        from: from.clone(),
        to: logical(&actual, &f.result),
    };
    catalogue
        .prove(
            p,
            &BTreeMap::new(),
            &[],
            &eq,
            &Proof::Normalize,
            &mut Budget::new(),
            0,
        )
        .unwrap_or_else(|e| panic!("{name}: {e}; {eq:?}"));
    let false_result = if f.result == Type::Bool {
        s::term(
            s::value(Type::Bool),
            Node::Bool(!matches!(actual, Value::Bool(true))),
        )
    } else {
        s::word(Type::U32, 987654321)
    };
    if f.result == Type::Bool || f.result == Type::U32 {
        assert!(catalogue
            .prove(
                p,
                &BTreeMap::new(),
                &[],
                &Equation {
                    from,
                    to: false_result
                },
                &Proof::Normalize,
                &mut Budget::new(),
                0
            )
            .is_err());
    }
}
#[test]
fn symbolic_map_membership_observes_its_keys_and_preserves_captured_queries() {
    let module=CheckedModule::from_source(parse(r#"module MapKeys;
fn direct(m:Map<u32,Bool>,key:u32)->Bool{return m.contains(key);}
fn observed(m:Map<u32,Bool>,key:u32)->Bool{return foldr(m.keys(),false,fn(item)=>fn(found)=>key==item||found);}
fn built(xs:List<u32>,key:u32)->Bool{let m:Map<u32,Bool>=foldl(xs,Map.empty(),fn(item)=>fn(m)=>m.set(item,false));return m.contains(key);}
"#).unwrap()).unwrap();
    let p=module.program();
    let bodies:Vec<_>=["direct","observed"].iter().map(|name|{
        let f=p.functions.iter().find(|f|f.name==*name).unwrap();
        s::elaborate(&f.body,&check::params_env(&f.params).unwrap(),p,&f.result).unwrap()
    }).collect();
    let env=BTreeMap::from([
        ("m".into(),s::value(Type::Map(Box::new(Type::U32),Box::new(Type::Bool)))),
        ("key".into(),s::value(Type::U32)),
    ]);
    let catalogue=CheckedCatalogue::check(&Catalogue{schema:1,semantics:ink_core::laws::SEMANTICS.into(),roots:vec![],objects:BTreeMap::new()},p).unwrap();
    catalogue.prove(p,&env,&[],&Equation{from:bodies[0].clone(),to:bodies[1].clone()},&Proof::Normalize,&mut Budget::new(),0).unwrap();
    let names=env.iter().map(|(n,t)|(n.clone(),t.clone())).collect::<Vec<_>>();
    let wrap=|body:&Term|{
        let closed=s::close_scope(body,&names,&mut Budget::new()).unwrap();
        names.iter().rev().fold(closed,|body,(_,sort)|s::lambda(sort.clone(),body))
    };
    catalogue.prove(p,&BTreeMap::new(),&[],&Equation{from:wrap(&bodies[0]),to:wrap(&bodies[1])},&Proof::Normalize,&mut Budget::new(),0).unwrap();
    assert!(catalogue.prove(p,&env,&[],&Equation{from:bodies[0].clone(),to:s::term(s::value(Type::Bool),Node::Bool(false))},&Proof::Normalize,&mut Budget::new(),0).is_err());
    for xs in [vec![],vec![3],vec![3,7,3]] {
        for key in [0,3,7,u32::MAX] {
            check_call(&module,"built",vec![Value::List(xs.iter().map(|x|Value::U32(*x)).collect()),Value::U32(key)]);
        }
    }
}
#[test]
fn symbolic_key_observations_cover_supported_scalar_domains() {
    for (syntax_type,ty,samples) in [
        ("Bool",Type::Bool,vec![Value::Bool(false),Value::Bool(true)]),
        ("i32",Type::I32,vec![Value::I32(i32::MIN),Value::I32(0),Value::I32(i32::MAX)]),
        ("u64",Type::U64,vec![Value::U64(0),Value::U64(1<<32),Value::U64(u64::MAX)]),
    ] {
        let source=format!(r#"module KeyDomain;
fn direct(m:Map<{syntax_type},u32>,key:{syntax_type})->Bool{{return m.contains(key);}}
fn observed(m:Map<{syntax_type},u32>,key:{syntax_type})->Bool{{return foldr(m.keys(),false,fn(item)=>fn(found)=>key==item||found);}}
fn built(xs:List<{syntax_type}>,key:{syntax_type})->Bool{{let m:Map<{syntax_type},u32>=foldl(xs,Map.empty(),fn(item)=>fn(m)=>m.set(item,0));return m.contains(key);}}
"#);
        let module=CheckedModule::from_source(parse(&source).unwrap()).unwrap();let p=module.program();
        let elaborate=|name:&str|{let f=p.functions.iter().find(|f|f.name==name).unwrap();s::elaborate(&f.body,&check::params_env(&f.params).unwrap(),p,&f.result).unwrap()};
        let env=BTreeMap::from([("m".into(),s::value(Type::Map(Box::new(ty.clone()),Box::new(Type::U32)))),("key".into(),s::value(ty))]);
        let catalogue=CheckedCatalogue::check(&Catalogue{schema:1,semantics:ink_core::laws::SEMANTICS.into(),roots:vec![],objects:BTreeMap::new()},p).unwrap();
        catalogue.prove(p,&env,&[],&Equation{from:elaborate("direct"),to:elaborate("observed")},&Proof::Normalize,&mut Budget::new(),0).unwrap();
        for n in 0..=samples.len(){
            let mut rows=samples[..n].to_vec();rows.extend_from_within(..);
            for key in &samples{check_call(&module,"built",vec![Value::List(rows.clone()),key.clone()]);}
        }
    }
    for key in ["String","f32"] {
        let source=format!("module Unsupported;fn direct(m:Map<{key},u32>,key:{key})->Bool{{return m.contains(key);}}");
        assert!(CheckedModule::from_source(parse(&source).unwrap()).is_err());
    }
}
#[test]
fn buffer_edits_and_owned_iteration_match_reference() {
    let module=CheckedModule::from_source(parse(r#"module Owned;
fn edit(xs:List<u32>,i:u32,j:u32,n:u32)->List<u32>{let b=buffer(xs);let b=b.set(i,37);let b=b.swap(i,j);let b=b.push(19);let b=b.pop();return b.truncate(n).freeze();}
fn filled(n:u32)->List<u32>{let b:Buffer<u32> = buffer_fill(n,17);return b.freeze();}
fn empty()->List<u32>{let b:Buffer<u32> = Buffer.empty();return b.push(9).freeze();}
fn stopped(xs:List<u32>,n:u32)->List<u32>{let b=buffer(xs);let b=repeat_until(n,b,fn(b)=>b.len()>=4,fn(i)=>fn(b)=>b.push(i));return b.freeze();}
"#).unwrap()).unwrap();
    for len in 0..6 {
        let xs = Value::List((0..len).map(|n| Value::U32(n * 7)).collect());
        for i in [0, 2, 7, u32::MAX] {
            for j in [0, 3, u32::MAX] {
                check_call(
                    &module,
                    "edit",
                    vec![xs.clone(), Value::U32(i), Value::U32(j), Value::U32(3)],
                );
            }
        }
        for n in [0, 1, 4] {
            check_call(&module, "stopped", vec![xs.clone(), Value::U32(n)]);
        }
    }
    for n in [0, 1, 5] {
        check_call(&module, "filled", vec![Value::U32(n)]);
    }
    check_call(&module, "empty", vec![]);
    let subject = ink_core::optimisation::subject(&module).unwrap();
    assert_eq!(subject.functions.len(), 4);
}
#[test]
fn local_maps_match_order_upsert_removal_and_lazy_reads() {
    let module=CheckedModule::from_source(parse(r#"module Maps;
fn keys(a:i32,b:i32,r:i32)->List<i32>{let m:Map<i32,u32> = Map.empty();let m=m.set(a,7);let m=m.set(b,11);let m=m.set(a,19);return m.remove(r).keys();}
fn values(a:i32,b:i32,r:i32)->List<u32>{let m:Map<i32,u32> = Map.empty();let m=m.set(a,7);let m=m.set(b,11);let m=m.set(a,19);return m.remove(r).values();}
fn read(k:u64,r:u64)->u32{let m:Map<u64,u32> = Map.empty();let m=m.set(k,7);let m=m.set(0,11);let m=m.remove(r);return m.get_or(k,99)+m.len();}
fn has(k:Bool,r:Bool)->Bool{let m:Map<Bool,f32> = Map.empty();let m=m.set(k,1.0);let m=m.remove(r);return m.contains(k);}
fn boolkeys()->List<Bool>{let m:Map<Bool,u32> = Map.empty();let m=m.set(true,1);let m=m.set(false,2);return m.keys();}
"#).unwrap()).unwrap();
    for a in [-5, 0, 7] {
        for b in [-5, 0, 7] {
            for r in [-5, 0, 9] {
                for name in ["keys", "values"] {
                    check_call(
                        &module,
                        name,
                        vec![Value::I32(a), Value::I32(b), Value::I32(r)],
                    );
                }
            }
        }
    }
    for k in [0, 1, u64::MAX] {
        for r in [0, 1, u64::MAX] {
            check_call(&module, "read", vec![Value::U64(k), Value::U64(r)]);
        }
    }
    for k in [false, true] {
        for r in [false, true] {
            check_call(&module, "has", vec![Value::Bool(k), Value::Bool(r)]);
        }
    }
    check_call(&module, "boolkeys", vec![]);
}

#[test]
fn owned_values_preserve_nan_payloads_and_scalar_reflexivity_excludes_floats() {
    let module=CheckedModule::from_source(parse(r#"module Bits;
fn values(x:f32,y:f32)->List<f32>{let m:Map<Bool,f32> = Map.empty();let m=m.set(true,x);let m=m.set(false,y);return m.values();}
fn edited(xs:List<f32>,x:f32)->List<f32>{let b=buffer(xs);return b.set(0,x).swap(0,1).freeze();}
fn reflexive(x:f32)->Bool{return x==x;}
"#).unwrap()).unwrap();
    check_call(
        &module,
        "values",
        vec![Value::F32(0x7fc01234), Value::F32(0x80000000)],
    );
    check_call(
        &module,
        "edited",
        vec![
            Value::List(vec![Value::F32(0x7fc05678), Value::F32(0)]),
            Value::F32(0x7fc01234),
        ],
    );
    // Exceptional float computation remains fail-closed. In particular the
    // general scalar reflexivity rule must never turn NaN == NaN into true.
    let catalogue = CheckedCatalogue::check(
        &Catalogue {
            schema: 1,
            semantics: ink_core::laws::SEMANTICS.into(),
            roots: vec![],
            objects: BTreeMap::new(),
        },
        module.program(),
    )
    .unwrap();
    let nan = s::term(s::value(Type::F32), Node::Float(0x7fc01234));
    let from = s::op(s::value(Type::Bool), "binary:==", vec![nan.clone(), nan]);
    let to = s::term(s::value(Type::Bool), Node::Bool(true));
    assert!(catalogue
        .prove(
            module.program(),
            &BTreeMap::new(),
            &[],
            &Equation { from, to },
            &Proof::Normalize,
            &mut Budget::new(),
            0
        )
        .is_err());
}
