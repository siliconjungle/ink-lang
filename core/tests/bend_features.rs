use ink_core::{core::CheckedModule, eval, syntax::parse};
use serde_json::json;
fn run(src: &str, name: &str, args: serde_json::Value) -> serde_json::Value {
    let m = CheckedModule::from_source(parse(src).unwrap()).unwrap();
    let p = m.program();
    let f = p.functions.iter().find(|f| f.name == name).unwrap();
    let a = args
        .as_array()
        .unwrap()
        .iter()
        .zip(&f.params)
        .map(|(v, (_, t))| eval::Value::from_program_json(v, t, p).unwrap())
        .collect();
    eval::call(p, name, a, &mut 10_000_000).unwrap().json()
}
#[test]
fn ordered_work_and_partitioned_owners() {
    let src = r#"module parallel;
 fn mapped(xs:List<u32>,k:u32)->List<u32>{return parallel_map(xs,0,fn(i)=>fn(x)=>x+k+i);}
 fn buffers(xs:List<u32>,at:u32)->List<u32>{let b=buffer(xs);let b=b.split_at(at,fn(left)=>fn(right)=>left.map_parallel(2,fn(i)=>fn(x)=>x+10+i).append(right.map_parallel(2,fn(i)=>fn(x)=>x+20+i)));return b.freeze();}
 "#;
    assert_eq!(
        run(src, "mapped", json!([[1, 2, 4294967295u32], 4])),
        json!([5, 7, 5])
    );
    for (at, want) in [
        (0, json!([21, 23, 25])),
        (1, json!([11, 22, 24])),
        (99, json!([11, 13, 15])),
    ] {
        assert_eq!(run(src, "buffers", json!([[1, 2, 3], at])), want);
    }
    assert_eq!(run(src, "buffers", json!([[], 0])), json!([]));
    let m = CheckedModule::from_source(parse(src).unwrap()).unwrap();
    assert_eq!(m.semantics(), ink_core::core::PARALLEL_SEMANTICS);
    assert_eq!(
        CheckedModule::from_bytes(&m.bytes().unwrap())
            .unwrap()
            .identity()
            .unwrap(),
        m.identity().unwrap()
    );
}
#[test]
fn decreasing_recursion_is_checked() {
    let src = r#"module recursive;
 fn fact(n:u32)->u32{return choose(n==0,1,n*fact(n-1));}
 fn sum_tail(xs:List<u32>)->u32{return choose(length(xs)==0,0,xs.at_or(0,0)+sum_tail(xs.drop(1)));}
 fn tail(n:u32,acc:u32)->u32{return choose(n>0,tail(n-1,acc+1),acc);}
 "#;
    assert_eq!(run(src, "fact", json!([6])), json!(720));
    assert_eq!(run(src, "sum_tail", json!([[1, 2, 3]])), json!(6));
    assert_eq!(run(src, "tail", json!([10000, 3])), json!(10003));
}
#[test]
fn reject_races_aliases_wrapping_and_false_descent() {
    let bad=[
 "fn f(xs:List<u32>)->List<u32>{let b=buffer(xs);return parallel_map(xs,1,fn(i)=>fn(x)=>b.at_or(i,x));}",
 "fn f(xs:List<u32>)->List<u32>{let b=buffer(xs);let c=b.split_at(1,fn(a)=>fn(z)=>a.append(a));return c.freeze();}",
 "fn f(xs:List<u32>)->List<u32>{let b=buffer(xs);let c=b.map_parallel(1,fn(i)=>fn(x)=>b.at_or(i,x));return c.freeze();}",
 "fn f(n:u32)->u32{return f(n-1);}",
 "fn f(n:u32)->u32{return choose(n>0,f(n-2),0);}",
 "fn f(n:u32)->u32{return choose(n>0,f(n+1),0);}",
 "fn f(n:i32)->i32{return choose(n>0,f(n-1),0);}",
 "fn f(xs:List<u32>)->u32{return f(xs.drop(1));}",
 "fn f(n:u32)->u32{return choose(n>0,choose(true,f(0),0),0);}",
 "fn f(n:u32,xs:List<u32>)->u32{return choose(n>0,parallel_map(xs,1,fn(n)=>fn(x)=>f(n-1,xs)).at_or(0,0),0);}",
 "fn f(n:u32)->u32{let z=choose(n>0,n,1);return f(z-1);}",
 "fn f(n:u32)->u32{return choose(n>0,g(n-1),0);}fn g(n:u32)->u32{return f(n);}",
 ];
    for s in bad {
        let full = format!("module rejected;{s}");
        let p = parse(&full).unwrap();
        assert!(CheckedModule::from_source(p).is_err(), "accepted {s}");
    }
}
