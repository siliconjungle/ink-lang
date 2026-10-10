use ink_core::{core::CheckedModule, eval, syntax::parse};
use serde_json::json;

fn result(source: &str, name: &str, args: serde_json::Value) -> serde_json::Value {
    let p = CheckedModule::from_source(parse(source).unwrap())
        .unwrap()
        .into_program();
    let f = p.functions.iter().find(|f| f.name == name).unwrap();
    let args = args
        .as_array()
        .unwrap()
        .iter()
        .zip(&f.params)
        .map(|(v, (_, t))| eval::Value::from_program_json(v, t, &p).unwrap())
        .collect();
    eval::call(&p, name, args, &mut 1_000_000).unwrap().json()
}

#[test]
fn buffers_move_through_helpers_without_changing_inputs() {
    let source = r#"module temporary;
    fn edit(b:Buffer<u32>)->Buffer<u32>{let first=b.at_or(0,99);return b.set(0,first+7).swap(0,1).push(42).pop();}
    fn run(xs:List<u32>)->List<u32>{let b=buffer(xs);let b=edit(b);return b.freeze();}
    fn empty()->List<u32>{let b:Buffer<u32> =Buffer.empty();return b.pop().set(99,1).swap(0,1).freeze();}
    fn filled(n:u32)->List<i32>{let b:Buffer<i32> =buffer_fill(n,-3);return b.truncate(2).freeze();}
    "#;
    assert_eq!(result(source, "run", json!([[1, 2, 3]])), json!([2, 8, 3]));
    assert_eq!(result(source, "empty", json!([])), json!([]));
    assert_eq!(result(source, "filled", json!([4])), json!([-3, -3]));
}

#[test]
fn maps_are_reusable_ordered_local_values() {
    let source = r#"module temporary;
    fn edit(m:Map<i32,u64>)->Map<i32,u64>{return m.set(-2,99).set(5,100).set(-2,7).remove(0);}
    fn keys()->List<i32>{let m:Map<i32,u64> =Map.empty();let m=edit(m);return m.keys();}
    fn values()->List<u64>{let m:Map<i32,u64> =Map.empty();let m=edit(m);return m.values();}
    fn lookup(k:i32)->u64{let m:Map<i32,u64> =Map.empty();let m=edit(m);return choose(m.contains(k),m.get_or(k,101),m.get_or(k,102));}
    "#;
    assert_eq!(result(source, "keys", json!([])), json!([-2, 5]));
    assert_eq!(result(source, "values", json!([])), json!([7, 100]));
    assert_eq!(result(source, "lookup", json!([-2])), json!(7));
    assert_eq!(result(source, "lookup", json!([3])), json!(102));
}

#[test]
fn stopping_is_checked_before_each_step_and_limit_is_explicit() {
    let source = r#"module temporary;
    fn run(limit:u32,goal:u32)->u32{return repeat_until(limit,0,fn(x)=>x>=goal,fn(i)=>fn(x)=>x+1);}
    fn owned(limit:u32)->List<u32>{let b:Buffer<u32> =Buffer.empty();let b=repeat_until(limit,b,fn(b)=>b.len()>=3,fn(i)=>fn(b)=>b.push(i));return b.freeze();}
    "#;
    for (limit, goal, want) in [(0, 9, 0), (10, 0, 0), (10, 3, 3), (2, 9, 2)] {
        assert_eq!(result(source, "run", json!([limit, goal])), json!(want));
    }
    assert_eq!(result(source, "owned", json!([10])), json!([0, 1, 2]));
}

#[test]
fn ownership_and_persistence_rejections_are_checked_on_core_replay() {
    let rejected=[
        "fn f(xs:List<u32>)->List<u32>{let b=buffer(xs);let c=b;return b.freeze();}",
        "fn f(xs:List<u32>)->u32{let b=buffer(xs);let c=b.freeze();return b.len();}",
        "record P{a:Buffer<u32>,b:Buffer<u32>,} fn f(xs:List<u32>)->P{let b=buffer(xs);return P{a:b,b:b};}",
        "fn f(xs:List<u32>)->u32{let b=buffer(xs);return repeat_until(2,0,fn(x)=>false,fn(i)=>fn(x)=>sum(b.freeze()));}",
        "fn f(xs:List<u32>)->List<u32>{let b=buffer(xs);let b=repeat_until(2,b,fn(b)=>sum(b.freeze())==0,fn(i)=>fn(b)=>b);return b.freeze();}",
        "record P{b:Buffer<u32>,} state S:Table<u32,P> =Table.empty();",
        "fn f()->Map<f32,u32>{return Map.empty();}",
        "fn f()->Buffer<Buffer<u32>>{return Buffer.empty();}",
        "fn f(xs:List<u32>)->List<Buffer<u32>>{return xs.map(fn(x)=>buffer_fill(1,x));}",
        "fn f(xs:List<u32>)->u32{let b=buffer(xs);let xs=choose(true,b.freeze(),b.freeze());return b.len();}",
        "event e:Buffer<u32>;",
        "fn f(xs:List<u32>)->u32{let b=buffer(xs);let ys=xs.map(fn(x)=>sum(b.freeze()));return b.len();}",
    ];
    for source in rejected {
        assert!(
            CheckedModule::from_source(parse(&format!("module rejected;{source}")).unwrap())
                .is_err(),
            "accepted {source}"
        );
    }
    let valid = CheckedModule::from_source(
        parse("module valid;fn f()->u32{return repeat_until(3,0,fn(x)=>x==2,fn(i)=>fn(x)=>x+1);}")
            .unwrap(),
    )
    .unwrap();
    assert_eq!(valid.semantics(), ink_core::core::LOCAL_SEMANTICS);
    let bytes = valid.bytes().unwrap();
    assert_eq!(
        CheckedModule::from_bytes(&bytes)
            .unwrap()
            .identity()
            .unwrap(),
        valid.identity().unwrap()
    );
    let mut forged: serde_json::Value = serde_json::from_slice(&bytes).unwrap();
    forged["semantics"] = json!(ink_core::core::COMPUTE_SEMANTICS);
    assert!(CheckedModule::from_bytes(&serde_json::to_vec(&forged).unwrap()).is_err());
}

#[test]
fn lazy_reads_and_branch_local_moves_preserve_ownership() {
    let source = r#"module branches;
    fn length_of(b:Buffer<u32>)->u32{return b.len();}
    fn run(xs:List<u32>,which:Bool)->List<u32>{let b=buffer(xs);return choose(which,b.push(1).freeze(),b.push(2).freeze());}
    fn lazy(xs:List<u32>)->List<u32>{let b=buffer(xs);let c:Buffer<u32> =Buffer.empty();let x=b.at_or(0,length_of(c));return b.push(x).freeze();}
    "#;
    assert_eq!(result(source, "run", json!([[3], true])), json!([3, 1]));
    assert_eq!(result(source, "run", json!([[3], false])), json!([3, 2]));
    assert_eq!(result(source, "lazy", json!([[3]])), json!([3, 3]));
}
#[test]
fn external_calls_cannot_export_owned_handles() {
    let p =
        parse("module hidden;fn internal(xs:List<u32>)->Buffer<u32>{return buffer(xs);}").unwrap();
    let e = eval::call(&p, "internal", vec![eval::Value::List(vec![])], &mut 1000).unwrap_err();
    assert!(e.contains("internal to a pure invocation"));
}
