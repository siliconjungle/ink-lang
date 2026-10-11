use ink_core::{core::CheckedModule, eval, stateful::Runtime, syntax::parse};
use serde_json::json;

fn pure(src: &str, name: &str, args: serde_json::Value) -> serde_json::Value {
    let p = parse(src).unwrap();
    CheckedModule::from_source(p.clone()).unwrap();
    let f = p.functions.iter().find(|f| f.name == name).unwrap();
    let vals = args
        .as_array()
        .unwrap()
        .iter()
        .zip(&f.params)
        .map(|(v, (_, t))| eval::Value::from_program_json(v, t, &p).unwrap())
        .collect();
    eval::call(&p, name, vals, &mut 100_000).unwrap().json()
}

#[test]
fn surface_conditionals_preserve_scope_laziness_and_owned_branches() {
    let src = r#"module surface;
      fn scoped(c:Bool,x:u32)->u32 {
        if c {let x=99;} return x;
      }
      fn early(c:Bool,x:u32)->u32 {
        if !c {return x;} let y=x+1; return y;
      }
      fn expression(c:Bool,x:u32)->u32 {return if c {x+1} else {x-1};}
      fn owners(c:Bool)->List<u32> {
        let b:Buffer<u32>=buffer([1,2,3]);
        if c {return b.push(4).freeze();} return b.freeze();
      }
      fn empty()->List<u32>{return [];}
    "#;
    assert_eq!(pure(src, "scoped", json!([true, 7])), json!(7));
    assert_eq!(pure(src, "scoped", json!([false, 7])), json!(7));
    assert_eq!(pure(src, "early", json!([false, 7])), json!(7));
    assert_eq!(pure(src, "early", json!([true, 7])), json!(8));
    assert_eq!(pure(src, "expression", json!([false, 7])), json!(6));
    assert_eq!(pure(src, "owners", json!([true])), json!([1, 2, 3, 4]));
    assert_eq!(pure(src, "owners", json!([false])), json!([1, 2, 3]));
    assert_eq!(pure(src, "empty", json!([])), json!([]));
}

#[test]
fn action_conditionals_do_not_execute_unselected_changes() {
    let src = r#"module lazy;
      enum Error{Failed,}
      state Rows:Table<u32,u32>=Table.empty();
      event seen:u32;
      change bad()->Result<u32,Error> writes(Rows) emits(seen) {
        Rows.remove(0);emit seen(9);return Err(Error.Failed);
      }
      change good()->Result<u32,Error> writes(Rows) emits(seen) {
        return Ok(if true {7} else {bad()?});
      }
      query literal()->List<u32>{return [1,2,3,];}
    "#;
    let p = parse(src).unwrap();
    let mut r = Runtime::new(p).unwrap();
    let out = r.invoke("good", vec![]).unwrap();
    assert!(out.committed);
    assert!(out.events.is_empty());
    assert_eq!(out.result.json(), json!({"Ok":7}));
    assert_eq!(
        r.invoke("literal", vec![]).unwrap().result.json(),
        json!([1, 2, 3])
    );
}

#[test]
fn shadowing_cannot_reuse_table_presence_facts() {
    let src = r#"module shadow;
      enum Error{Missing,}
      state Rows:Table<u32,u32>=Table.empty();
      change bad(key:u32)->Result<Unit,Error> writes(Rows){
        if Rows.contains(key){let key=99;Rows.replace(key,7);}return Ok(());
      }
    "#;
    assert!(CheckedModule::from_source(parse(src).unwrap()).is_err());
}

#[test]
fn pure_helpers_share_exact_values_and_checked_results() {
    let src = r#"module values;
      enum Error{Overflow,}
      fn exact(x:Int)->Int{return x*x+1;}
      fn converted(x:i32)->Int{return Int(x);}
      fn total(xs:List<Int>)->Int{return sum(xs);}
      fn some(x:u32)->Option<u32>{return Some(x);}
      fn none()->Option<u32>{return None;}
      fn checked(x:u32)->Result<u32,Error>{
        return checked_add(x,1).map_err(fn(error)=>Error.Overflow);
      }
      fn mapped(x:Option<u32>)->Option<u32>{return x.map(fn(v)=>v+1);}
      fn recovered(x:Option<u32>)->Result<u32,Error>{return x.ok_or(Error.Overflow);}
      fn text()->String{return "hello";}
      fn unit()->Unit{return ();}
    "#;
    assert_eq!(
        pure(src, "exact", json!([{"Int":"18446744073709551616"}])),
        json!({"Int":"340282366920938463463374607431768211457"})
    );
    assert_eq!(pure(src, "converted", json!([-7])), json!({"Int":"-7"}));
    assert_eq!(
        pure(src, "total", json!([[{"Int":"7"},{"Int":"-2"}]])),
        json!({"Int":"5"})
    );
    assert_eq!(pure(src, "total", json!([[]])), json!({"Int":"0"}));
    assert_eq!(pure(src, "some", json!([7])), json!({"Some":7}));
    assert_eq!(pure(src, "none", json!([])), json!({"None":null}));
    assert_eq!(
        pure(src, "checked", json!([4294967295u32])),
        json!({"Err":"Error.Overflow"})
    );
    assert_eq!(pure(src, "checked", json!([7])), json!({"Ok":8}));
    assert_eq!(pure(src, "mapped", json!([{"Some":7}])), json!({"Some":8}));
    assert_eq!(
        pure(src, "mapped", json!([{"None":null}])),
        json!({"None":null})
    );
    assert_eq!(
        pure(src, "recovered", json!([{"None":null}])),
        json!({"Err":"Error.Overflow"})
    );
    assert_eq!(pure(src, "text", json!([])), json!("hello"));
    assert_eq!(pure(src, "unit", json!([])), json!(null));
}

#[test]
fn bounded_generics_and_aliases_elaborate_to_ordinary_core() {
    let src = r#"module generic;
      type Seq<T> = List<T>;
      type Rows = Table<u32,u32>;
      record Pair<A,B>{left:A,right:B,}
      fn identity<T>(x:T)->T{return x;}
      fn head<T>(xs:Seq<T>,fallback:T)->T{return xs.at_or(0,fallback);}
      fn nested<T>(x:T)->Pair<T,T>{return Pair<T,T>{left:identity<T>(x),right:x};}
      fn words(x:u32)->Pair<u32,u32>{return nested<u32>(x);}
      fn text()->String{return identity<String>("works");}
      fn first()->u32{return head<u32>([7,8],0);}
      state rows:Rows=Table.empty();
    "#;
    assert_eq!(pure(src, "words", json!([7])), json!({"left":7,"right":7}));
    assert_eq!(pure(src, "text", json!([])), json!("works"));
    assert_eq!(pure(src, "first", json!([])), json!(7));
    let p = parse(src).unwrap();
    assert!(p
        .functions
        .iter()
        .all(|f| f.name != "identity" && f.name != "nested"));
    let m = CheckedModule::from_source(p).unwrap();
    assert_eq!(
        CheckedModule::from_bytes(&m.bytes().unwrap())
            .unwrap()
            .identity()
            .unwrap(),
        m.identity().unwrap()
    );
    for src in [
        "module bad;type A=B;type B=A;",
        "module bad;type A=Missing;",
        "module bad;type u32=u64;",
        "module bad;fn id<T,T>(x:T)->T{return x;}",
        "module bad;fn id<T>(x:T)->T{return x;}fn f()->u32{return id<u32,u64>(1);}",
        "module bad;fn id<T>(x:T)->T{return x;}fn f()->u32{return id(1);}",
        "module bad;type Seq<T>=List<Seq<T>>;fn f(x:Seq<u32>)->u32{return 0;}",
    ] {
        assert!(
            parse(src).and_then(CheckedModule::from_source).is_err(),
            "accepted {src}"
        );
    }
}

#[test]
fn expanded_values_bind_their_semantics_and_lazy_effect_paths() {
    for source in [
        "module old;fn echo(x:Int)->Int{return x;}",
        "module old;fn echo(xs:List<Int>)->List<Int>{return xs.map(fn(x)=>x);}",
    ] {
        let m = CheckedModule::from_source(parse(source).unwrap()).unwrap();
        assert_ne!(m.semantics(), ink_core::core::VALUE_SEMANTICS);
        CheckedModule::from_bytes(&m.bytes().unwrap()).unwrap();
    }
    for source in [
        "module version;fn total(xs:List<Int>)->Int{return sum(xs);}",
        "module version;fn same(a:String,b:String)->Bool{return a==b;}",
        "module version;fn total(xs:List<Int>)->List<Int>{return xs.map(fn(x)=>x+1);}",
    ] {
        let m = CheckedModule::from_source(parse(source).unwrap()).unwrap();
        assert_eq!(m.semantics(), ink_core::core::VALUE_SEMANTICS);
        let mut v: serde_json::Value = serde_json::from_slice(&m.bytes().unwrap()).unwrap();
        v["semantics"] = json!(ink_core::core::EXACT_FLOAT_SEMANTICS);
        assert!(CheckedModule::from_bytes(&serde_json::to_vec(&v).unwrap()).is_err());
    }
    let src = r#"module effects;enum E{Bad,}state rows:Table<u32,u32>=Table.empty();
      change bad()->Result<u32,E> writes(rows){rows.remove(0);return Err(E.Bad);}
      change good()->Result<u32,E> writes(rows){return Ok(if true{7}else{bad()?});}
    "#;
    let m = CheckedModule::from_source(parse(src).unwrap()).unwrap();
    let actions = ink_core::action_ir::CheckedActions::elaborate(&m).unwrap();
    let effects = ink_core::effects::CheckedEffects::derive(&actions).unwrap();
    let paths = &effects.action("good").unwrap().paths;
    assert!(paths
        .iter()
        .any(|p| !p.written && p.exit == ink_core::effects::Exit::Return));
    assert!(paths
        .iter()
        .all(|p| !p.written || p.exit == ink_core::effects::Exit::Abort));
}

#[test]
fn word_operations_are_total_and_reject_non_words() {
    let source = "module bits;fn f(x:u32,k:u32)->u32{return rotate_right(~wrapping_shl(x,k),k);}";
    for k in [0, 1, 31, 32, 33, u32::MAX] {
        let x = 0x80000001u32;
        assert_eq!(
            pure(source, "f", json!([x, k])),
            json!((!x.wrapping_shl(k)).rotate_right(k))
        );
    }
    for source in [
        "module bad;fn f(x:Int)->Int{return word_not(x);}",
        "module bad;fn f(x:u32,k:u64)->u32{return wrapping_shl(x,k);}",
        "module bad;fn f(x:f32)->f32{return x & x;}",
        "module bad;fn word_xor(x:u32)->u32{return x;}",
    ] {
        assert!(parse(source).and_then(CheckedModule::from_source).is_err());
    }
}

#[test]
fn local_mutation_and_finite_iteration_preserve_scope_and_order() {
    let source = r#"module loops;
      fn nested()->u32{var x:u32=0;for i in 0..3{for j in 0..2{x=x+i+j;}}return x;}
      fn bounded(n:u32)->u32{var x:u32=0;while x<n limit 4{x=x+1;}return x;}
      fn range()->u32{var total:u32=0;for i in 2..5{total=total+i;}return total;}
      fn ordered(xs:List<u32>)->u32{var total:u32=0;for x in xs{total=total*10+x;}return total;}
      fn scoped(c:Bool)->u32{var x:u32=7;if c {x=9;let x=99;}return x;}
      fn local(c:Bool)->u32{var x:u32=7;if c {var x:u32=99;x=100;}return x;}
      fn shadow()->u32{var x:u32=7;for x in 0..3{}return x;}
      fn owners(xs:List<u32>)->List<u32>{var b:Buffer<u32>=Buffer.empty();for x in xs{b=b.push(x);}return b.freeze();}
      fn collect<T>(xs:List<T>)->List<T>{var b:Buffer<T>=Buffer.empty();for x in xs{b=b.push(x);}return b.freeze();}
      fn generic(xs:List<u32>)->List<u32>{return collect<u32>(xs);}
      fn backward(xs:List<u32>)->u32{return foldr(xs,0,fn(x)=>fn(acc)=>acc*10+x);}
      fn bools(xs:List<Bool>)->u32{return foldl(xs,0,fn(x)=>fn(acc)=>if x {acc+1}else{acc});}
      query changed(c:Bool)->u32{var x:u32=7;if c {x=9;let x=99;}return x;}
    "#;
    assert_eq!(pure(source, "nested", json!([])), json!(9));
    for (n, want) in [(0, 0), (2, 2), (9, 4)] {
        assert_eq!(pure(source, "bounded", json!([n])), json!(want));
    }
    assert_eq!(pure(source, "range", json!([])), json!(9));
    assert_eq!(pure(source, "ordered", json!([[1, 2, 3]])), json!(123));
    assert_eq!(pure(source, "backward", json!([[1, 2, 3]])), json!(321));
    assert_eq!(
        pure(source, "bools", json!([[true, false, true]])),
        json!(2)
    );
    assert_eq!(pure(source, "scoped", json!([true])), json!(9));
    assert_eq!(pure(source, "scoped", json!([false])), json!(7));
    assert_eq!(pure(source, "local", json!([true])), json!(7));
    assert_eq!(pure(source, "shadow", json!([])), json!(7));
    assert_eq!(pure(source, "owners", json!([[1, 2, 3]])), json!([1, 2, 3]));
    assert_eq!(
        pure(source, "generic", json!([[1, 2, 3]])),
        json!([1, 2, 3])
    );
    assert_eq!(pure(source, "generic", json!([[]])), json!([]));
    let mut r = Runtime::new(parse(source).unwrap()).unwrap();
    assert_eq!(
        r.invoke("changed", vec![ink_core::stateful::Value::Bool(true)])
            .unwrap()
            .result
            .json(),
        json!(9)
    );
    for source in [
        "module bad;fn f()->u32{let x=0;x=1;return x;}",
        "module bad;fn f()->u32{var x=0;return x;}",
        "module bad;fn f()->u32{var x:u32=0;for i in 0..65537{x=x+i;}return x;}",
        "module bad;fn f()->u32{var x:u32=0;for i in 0..3{return i;}return x;}",
        "module bad;fn f()->u32{var x:u32=0;for i in 0..3{i=1;}return x;}",
    ] {
        assert!(
            parse(source).and_then(CheckedModule::from_source).is_err(),
            "accepted {source}"
        );
    }
}

#[test]
fn pure_callbacks_specialise_with_immutable_captures_and_checked_signatures() {
    let source = r#"module callbacks;
      fn apply<T,U>(x:T,f:fn(T)->U)->U{return f(x);}
      fn transform<T,U>(xs:List<T>,f:fn(T)->U)->List<U>{return xs.map(f);}
      fn twice(x:u32,f:fn(u32)->u32)->u32{return f(f(x));}
      fn plus(x:u32)->u32{return x+1;}
      fn captured(x:u32,offset:u32)->u32{return apply<u32,u32>(x,fn(item)=>item+offset);}
      fn named(x:u32)->u32{return apply<u32,u32>(x,plus);}
      fn repeated(x:u32)->u32{return twice(x,plus);}
      fn mapped(xs:List<u32>,offset:u32)->List<u32>{return transform<u32,u32>(xs,fn(item)=>item+offset);}
      fn scopes(x:u32)->u32{let item=x+3;return apply<u32,u32>(x,fn(x)=>x+item);}
    "#;
    assert_eq!(pure(source, "captured", json!([7, 3])), json!(10));
    assert_eq!(pure(source, "named", json!([7])), json!(8));
    assert_eq!(pure(source, "repeated", json!([7])), json!(9));
    assert_eq!(
        pure(source, "mapped", json!([[1, 2, 3], 10])),
        json!([11, 12, 13])
    );
    assert_eq!(pure(source, "scopes", json!([7])), json!(17));
    for source in [
      "module bad;fn apply(x:u32,f:fn(u32)->u32)->u32{return f(x);}fn f()->u32{return apply(1,fn(x)=>true);}",
      "module bad;fn apply(x:u32,f:fn(u32)->u32)->u32{return f(x);}fn f()->u32{let b:Buffer<u32>=buffer([1]);return apply(1,fn(x)=>b.len());}",
      "module bad;fn f(x:fn(u32)->u32)->fn(u32)->u32{return x;}",
      "module bad;state x:fn(u32)->u32=1;",
      "module bad;fn recursive(x:u32,f:fn(u32)->u32)->u32{return recursive(x,f);}fn root()->u32{return recursive(1,fn(x)=>x);}",
    ] {assert!(parse(source).and_then(CheckedModule::from_source).is_err(),"accepted {source}");}
}

#[test]
fn payload_enums_and_exhaustive_matching_elaborate_into_nominal_records_and_sums() {
    let source = r#"module patterns;
      enum Message<T>{Empty,Value(T),Pair(T,T),}
      enum Choice{Left,Right,}
      fn get(x:Message<u32>)->u32{return match x {Message.Empty=>0,Message.Value(v)=>v,Message.Pair(a,b)=>a+b,};}
      fn value(x:u32)->u32{return get(Message<u32>.Value(x));}
      fn pair(x:u32,y:u32)->u32{return get(Message<u32>.Pair(x,y));}
      fn empty()->u32{return get(Message<u32>.Empty);}
      fn optional(x:Option<u32>)->u32{return match x {Some(v)=>v,None=>9,};}
      fn result(x:Result<u32,u32>)->u32{return match x {Ok(v)=>v,Err(e)=>e+1,};}
      fn boolean(x:Bool)->u32{return match x {false=>7,true=>8,};}
      fn plain(x:Choice)->u32{return match x {Choice.Left=>1,Choice.Right=>2,};}
    "#;
    assert_eq!(pure(source, "value", json!([7])), json!(7));
    assert_eq!(pure(source, "pair", json!([7, 9])), json!(16));
    assert_eq!(pure(source, "empty", json!([])), json!(0));
    assert_eq!(pure(source, "optional", json!([{"Some":7}])), json!(7));
    assert_eq!(pure(source, "optional", json!([{"None":null}])), json!(9));
    assert_eq!(pure(source, "result", json!([{"Err":7}])), json!(8));
    assert_eq!(pure(source, "boolean", json!([false])), json!(7));
    assert_eq!(pure(source, "plain", json!(["Choice.Right"])), json!(2));
    for source in [
      "module bad;enum E{A(u32),B,}fn f(x:E)->u32{return match x{E.A(v)=>v,};}",
      "module bad;enum E{A(u32),B,}fn f(x:E)->u32{return match x{E.A=>0,E.B=>1,};}",
      "module bad;enum E{A(u32),B,}fn f(x:E)->u32{return match x{E.A(v)=>v,E.A(w)=>w,};}",
      "module bad;enum E{A(u32),B,}fn f()->E{return E.A(true);}",
      "module bad;fn f(x:Bool)->u32{return match x{true=>0,};}",
      "module bad;enum E{A(u32),B,}enum F{A(u32),B,}fn f(x:E)->u32{return match x{F.A(v)=>v,F.B=>1,};}",
    ] {assert!(parse(source).and_then(CheckedModule::from_source).is_err(),"accepted {source}");}
}

#[test]
fn pure_result_propagation_and_action_bindings_keep_effect_and_version_boundaries() {
    let source = r#"module flow;
      fn increment(x:Result<u32,u32>)->Result<u32,u32>{let v:u32=x?;return Ok(v+1);}
      query optional(x:Option<u32>)->u32{return match x{Some(v)=>v,None=>9,};}
      fn apply(x:u32,f:fn(u32)->u32)->u32{return f(x);}
      query applied(x:u32)->u32{return apply(x,fn(v)=>v+1);}
    "#;
    assert_eq!(
        pure(source, "increment", json!([{"Ok":7}])),
        json!({"Ok":8})
    );
    assert_eq!(
        pure(source, "increment", json!([{"Err":7}])),
        json!({"Err":7})
    );
    let m = CheckedModule::from_source(parse(source).unwrap()).unwrap();
    let actions = ink_core::action_ir::CheckedActions::elaborate(&m).unwrap();
    let mut wire: serde_json::Value = serde_json::from_slice(&actions.bytes().unwrap()).unwrap();
    assert_eq!(wire["semantics"], ink_core::action_ir::VALUE_SEMANTICS);
    wire["semantics"] = json!(ink_core::action_ir::NUMERICAL_SEMANTICS);
    assert!(ink_core::action_ir::CheckedActions::from_bytes(
        &m,
        &serde_json::to_vec(&wire).unwrap()
    )
    .is_err());
    let mut runtime = Runtime::new(m.program().clone()).unwrap();
    assert_eq!(
        runtime
            .invoke_json("optional", &json!([{"None":null}]))
            .unwrap()
            .result
            .json(),
        json!(9)
    );
    assert_eq!(
        runtime
            .invoke_json("applied", &json!([7]))
            .unwrap()
            .result
            .json(),
        json!(8)
    );
    for source in [
      "module bad;fn apply(x:u32,f:fn(u32)->u32)->u32{return f(x);}change effect(x:u32)->u32{return x;}change bad(x:u32)->u32{return apply(x,fn(v)=>effect(v));}",
      "module bad;fn f(x:Result<u32,u32>)->u32{let v=x?;return v;}",
      "module bad;fn f(x:Result<u32,u32>)->Result<u32,Bool>{let v=x?;return Ok(v);}",
    ] {assert!(parse(source).and_then(CheckedModule::from_source).is_err(),"accepted {source}");}
}

#[test]
fn fixed_shapes_and_bounded_constant_generics_are_checked_before_execution() {
    let source = r#"module arrays;
      fn length<T,const N:u32>(xs:Array<T,N>)->u32{return N;}
      fn make()->Array<u32,3>{return array<u32,3>([1,2,3]);}
      fn empty()->Array<Bool,0>{return array<Bool,0>([]);}
      fn size()->u32{return length<u32,3>(make());}
      fn read(i:u32)->u32{return make().at_or(i,9);}
      fn updated()->List<u32>{return make().with(1,7).values();}
      fn no_update()->List<u32>{return make().with(3,7).values();}
      fn zero()->u32{return empty().len();}
      fn count<const N:u32>(x:u32)->u32{var total:u32=x;for i in 0..2{total=total+N;}return total;}
      fn concrete()->u32{return count<3>(1);}
    "#;
    assert_eq!(pure(source, "size", json!([])), json!(3));
    assert_eq!(pure(source, "zero", json!([])), json!(0));
    assert_eq!(pure(source, "read", json!([1])), json!(2));
    assert_eq!(pure(source, "read", json!([3])), json!(9));
    assert_eq!(pure(source, "updated", json!([])), json!([1, 7, 3]));
    assert_eq!(pure(source, "no_update", json!([])), json!([1, 2, 3]));
    assert_eq!(pure(source, "concrete", json!([])), json!(7));
    for source in [
        "module bad;fn f()->Array<u32,2>{return array<u32,2>([1]);}",
        "module bad;fn f(x:Array<u32,65>)->u32{return 0;}",
        "module bad;fn id<T>(x:T)->T{return x;}fn f()->u32{return id<3>(1);}",
        "module bad;fn n<const N:u32>()->u32{return N;}fn f()->u32{return n<u32>();}",
        "module bad;fn f(x:Array<Buffer<u32>,2>)->u32{return 0;}",
    ] {
        assert!(
            parse(source).and_then(CheckedModule::from_source).is_err(),
            "accepted {source}"
        );
    }
}

#[test]
fn inferred_counts_are_exact_and_recursion_measures_cannot_be_shadowed_or_wrap() {
    let source = "module counts;fn f(xs:List<u32>)->Int{let n=count(xs);return n;}";
    assert_eq!(pure(source, "f", json!([[1, 2, 3]])), json!({"Int":"3"}));
    let source="module hygiene;fn f(x:Option<u32>,__ink_surface_0:u32)->u32{return match x{Some(v)=>v+__ink_surface_0,None=>__ink_surface_0,};}";
    assert_eq!(pure(source, "f", json!([{"Some":7},3])), json!(10));
    assert_eq!(pure(source, "f", json!([{"None":null},3])), json!(3));
    for source in [
      "module bad;fn f(a:u32,b:u32)->u32{if b>0{return f(a+1,b-1);}if a>0{return f(a-1,2);}return 0;}",
      "module bad;fn f(a:u32,b:u32)->u32{if b>0{let a=9;return f(a,b-1);}if a>0{return f(a-1,2);}return 0;}",
      "module bad;fn f(a:u32,b:u32)->u32{if b>0{return f(a,b-2);}if a>0{return f(a-1,2);}return 0;}",
    ] {assert!(parse(source).and_then(CheckedModule::from_source).is_err(),"accepted {source}");}
}

#[test]
fn exact_integer_correspondence_uses_a_bounded_ring_without_wrapping() {
    use ink_core::{
        check,
        laws::{self, Catalogue, CheckedCatalogue, Equation, Proof},
        semantic as s,
    };
    use std::collections::BTreeMap;
    let module=CheckedModule::from_source(parse("module exact;fn count_values(xs:List<u32>)->Int{return count(xs);}fn equivalent(x:Int)->Int{return (x+1)*(x-1);}fn canonical(x:Int)->Int{return x*x-1;}fn sum_values()->Int{return sum([Int(1),Int(2)]);}").unwrap()).unwrap();
    let subject = ink_core::optimisation::subject(&module).unwrap();
    assert!(subject.unavailable.is_empty(), "{:?}", subject.unavailable);
    let catalogue = CheckedCatalogue::check(
        &Catalogue {
            schema: 1,
            semantics: laws::SEMANTICS.into(),
            roots: vec![],
            objects: BTreeMap::new(),
        },
        module.program(),
    )
    .unwrap();
    let env = BTreeMap::from([("x".into(), s::value(ink_core::core::Type::Int))]);
    catalogue
        .prove(
            module.program(),
            &env,
            &[],
            &Equation {
                from: subject.functions["equivalent"].clone(),
                to: subject.functions["canonical"].clone(),
            },
            &Proof::Normalize,
            &mut s::Budget::new(),
            0,
        )
        .unwrap();
    let from = s::op(
        s::value(ink_core::core::Type::Int),
        "binary:+",
        vec![
            s::word(ink_core::core::Type::Int, u64::MAX),
            s::word(ink_core::core::Type::Int, 1),
        ],
    );
    assert!(catalogue
        .prove(
            module.program(),
            &BTreeMap::new(),
            &[],
            &Equation {
                from,
                to: s::word(ink_core::core::Type::Int, 0)
            },
            &Proof::Normalize,
            &mut s::Budget::new(),
            0
        )
        .is_err());
    let f = module
        .program()
        .functions
        .iter()
        .find(|f| f.name == "canonical")
        .unwrap();
    let t = s::elaborate(
        &f.body,
        &check::params_env(&f.params).unwrap(),
        module.program(),
        &f.result,
    )
    .unwrap();
    let rebuilt = s::reify(&t, module.program()).unwrap();
    check::infer_as(
        &rebuilt,
        &check::params_env(&f.params).unwrap(),
        module.program(),
        &f.result,
    )
    .unwrap();
    assert_eq!(
        pure(
            "module x;fn f()->Int{return sum([Int(1),Int(2)]);}",
            "f",
            json!([])
        ),
        json!({"Int":"3"})
    );
}

#[test]
fn contracts_validate_explicit_results_and_roll_back_postcondition_failure() {
    let source = r#"module contracts;
      enum Error{Input,Output,}
      fn bounded(x:u32)->Result<u32,Error>
        requires(x>0,Error.Input)
        ensures(reply=>reply.fold(fn(v)=>v<10,fn(e)=>true),Error.Output)
        {return Ok(x+1);}
      fn first_failure()->Result<u32,Error> ensures(r=>false,Error.Input) ensures(r=>false,Error.Output){return Ok(1);}
      query original(x:u32)->Result<u32,Error> ensures(r=>x==3,Error.Input){let x:u32=99;return Ok(x);}
      state Rows:Table<u32,u32>=Table.empty();event changed:u32;
      change put(x:u32)->Result<u32,Error> writes(Rows) emits(changed)
        requires(x>0,Error.Input)
        ensures(reply=>reply.fold(fn(v)=>v<10,fn(e)=>true),Error.Output)
        {if Rows.contains(x){return Err(Error.Input);}Rows.insert(x,x);emit changed(x);return Ok(x);}
    "#;
    assert_eq!(
        pure(source, "bounded", json!([0])),
        json!({"Err":"Error.Input"})
    );
    assert_eq!(pure(source, "bounded", json!([3])), json!({"Ok":4}));
    assert_eq!(
        pure(source, "bounded", json!([9])),
        json!({"Err":"Error.Output"})
    );
    assert_eq!(
        pure(source, "first_failure", json!([])),
        json!({"Err":"Error.Input"})
    );
    let mut r = Runtime::new(parse(source).unwrap()).unwrap();
    assert_eq!(
        r.invoke_json("original", &json!([3]))
            .unwrap()
            .result
            .json(),
        json!({"Ok":99})
    );
    let before = r.checkpoint_portable().unwrap();
    for x in [0, 10] {
        let out = r.invoke_json("put", &json!([x])).unwrap();
        assert!(!out.committed);
        assert!(out.events.is_empty());
        assert_eq!(r.checkpoint_portable().unwrap(), before);
    }
    assert!(r.invoke_json("put", &json!([3])).unwrap().committed);
    for source in [
      "module bad;change effect()->Bool{return true;}change f()->Result<u32,u32> requires(effect(),0){return Ok(1);}",
      "module bad;fn f(x:u32)->u32 requires(x>0,0){return x;}",
      "module bad;fn f(x:u32)->Result<u32,u32> requires(x,0){return Ok(x);}",
      "module bad;fn f(x:u32)->Result<u32,u32> requires(x>0,true){return Ok(x);}",
      "module bad;fn f(x:u32)->Result<u32,u32> ensures(r=>true,0) requires(x>0,0){return Ok(x);}",
    ]{assert!(parse(source).and_then(CheckedModule::from_source).is_err(),"accepted {source}");}
}

#[test]
fn aliases_preserve_payload_constructors_and_patterns() {
    let source="module alias;enum Message<T>{Empty,Value(T),}type Number=Message<u32>;fn unwrap(x:Number)->u32{return match x{Number.Empty=>0,Number.Value(v)=>v,};}fn value()->u32{return unwrap(Number.Value(7));}fn empty()->u32{return unwrap(Number.Empty);}";
    assert_eq!(pure(source, "value", json!([])), json!(7));
    assert_eq!(pure(source, "empty", json!([])), json!(0));
}

#[test]
fn returning_action_branches_preserve_legacy_fallback_without_executing_it() {
    let source = r#"module fallback;
      enum Error{Failed,}
      event seen:u32;
      change branch(c:Bool)->Result<u32,Error> emits(seen) {
        if c {emit seen(1);return Ok(1);} else {emit seen(2);return Ok(2);}
        emit seen(999);return Err(Error.Failed);
      }
    "#;
    let p = parse(source).unwrap();
    // Complete-code authentication must still bind the source fallback.
    assert_eq!(p.actions[0].body.len(), 3);
    let mut r = Runtime::new(p).unwrap();
    for (condition, value) in [(true, 1), (false, 2)] {
        let reply = r.invoke_json("branch", &json!([condition])).unwrap();
        assert!(reply.committed);
        assert_eq!(reply.result.json(), json!({"Ok":value}));
        assert_eq!(reply.events.len(), 1);
        assert_eq!(reply.events[0].value.json(), json!(value));
    }
}

#[test]
fn mutable_action_branches_rejoin_values_and_discard_caller_continuations_on_return() {
    let source = r#"module mutable_actions;
      enum Error{Failed,}
      event seen:u32;
      change joined(c:Bool)->Result<u32,Error> emits(seen) {
        var x:u32=10;
        if c {x=20;emit seen(x);} else {x=30;emit seen(x);}
        return Ok(x);
      }
      change early(c:Bool)->Result<u32,Error> {
        var x:u32=10;
        if c {x=20;return Ok(x);} x=30;return Ok(x);
      }
    "#;
    let mut r = Runtime::new(parse(source).unwrap()).unwrap();
    for (condition, expected) in [(true, 20), (false, 30)] {
        let reply = r.invoke_json("joined", &json!([condition])).unwrap();
        assert!(reply.committed);
        assert_eq!(reply.result.json(), json!({"Ok":expected}));
        assert_eq!(reply.events.len(), 1);
        assert_eq!(reply.events[0].value.json(), json!(expected));
        let reply = r.invoke_json("early", &json!([condition])).unwrap();
        assert!(reply.committed);
        assert_eq!(reply.result.json(), json!({"Ok":expected}));
    }
}
