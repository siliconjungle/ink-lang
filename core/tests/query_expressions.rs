use ink_core::{core::CheckedModule, eval, syntax::parse};
use serde_json::{json, Value};

fn call(source: &str, name: &str, args: Value) -> Value {
    let p = parse(source).unwrap();
    CheckedModule::from_source(p.clone()).unwrap();
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
fn ordered_queries_preserve_duplicates_captures_and_join_order() {
    let src = r#"module queries;
      record Pair{a:u32,b:u32,}
      fn mapped(xs:List<u32>,offset:u32)->List<u32>{return list<u32>{
        from x in xs; where x>1; select x+offset;
      };}
      fn joined(xs:List<u32>,ys:List<u32>)->List<Pair>{return list<Pair>{
        from x in xs join y in ys on x==y where y>0 select Pair{a:x,b:y}
      };}
      fn lateral(xs:List<u32>)->List<u32>{return list<u32>{
        from x in xs; where x>0; from y in [x,x+1]; select x*10+y;
      };}
      fn nested(xs:List<u32>)->List<List<u32>>{return list<List<u32>>{
        from x in xs; select list<u32>{from y in [x,x+1];select y;};
      };}
    "#;
    assert_eq!(
        call(src, "mapped", json!([[3, 1, 3, 2], 10])),
        json!([13, 13, 12])
    );
    assert_eq!(call(src, "mapped", json!([[], 10])), json!([]));
    assert_eq!(
        call(src, "joined", json!([[2, 1, 2], [2, 2, 1]])),
        json!([
        {"a":2,"b":2},{"a":2,"b":2},{"a":1,"b":1},{"a":2,"b":2},{"a":2,"b":2}])
    );
    assert_eq!(call(src, "joined", json!([[], [1, 2]])), json!([]));
    assert_eq!(call(src, "joined", json!([[1, 2], []])), json!([]));
    assert_eq!(
        call(src, "lateral", json!([[0, 2, 1]])),
        json!([22, 23, 11, 12])
    );
    assert_eq!(
        call(src, "nested", json!([[2, 1]])),
        json!([[2, 3], [1, 2]])
    );
}

#[test]
fn exists_queries_are_boolean_and_skip_work_after_a_witness() {
    let src = r#"module exists_queries;
      fn any(xs:List<u32>,ys:List<u32>)->Bool{return exists{
        from x in xs; join y in ys on x==y; where x>0;
      };}
      fn projected(xs:List<u32>)->Bool{return exists{from x in xs;select x>7;};}
      fn early(xs:List<u32>)->Bool{return exists{from x in xs;
        from y in choose(x==1,[x],repeat(65536,[],fn(i,acc)=>acc.concat([i])));
        select y==1;
      };}
    "#;
    assert_eq!(call(src, "any", json!([[0, 2], [2, 0]])), json!(true));
    assert_eq!(call(src, "any", json!([[0], [0]])), json!(false));
    assert_eq!(call(src, "any", json!([[], [1]])), json!(false));
    assert_eq!(call(src, "projected", json!([[1, 8, 2]])), json!(true));
    assert_eq!(call(src, "projected", json!([[1, 2]])), json!(false));
    // Evaluating the second lateral source would exhaust the reference budget.
    assert_eq!(call(src, "early", json!([[1, 2]])), json!(true));
}

#[test]
fn queries_are_hygienic_generic_and_preserve_structural_float_bits() {
    let src = r#"module hygiene;
      fn copied<T>(xs:List<T>)->List<T>{return list<T>{from x in xs;select x;};}
      fn run(xs:List<u32>,__ink_local_0:u32)->List<u32>{
        let x=__ink_local_0;
        return list<u32>{from x in xs;select x+__ink_local_0;};
      }
      fn floats()->List<f32>{return copied<f32>([f32_from_bits(2147483648),f32_from_bits(2143289345)]);}
      fn bits()->List<u32>{return floats().map(fn(x)=>f32_bits(x));}
      fn words(xs:List<u32>)->List<u32>{return copied<u32>(xs);}
    "#;
    assert_eq!(call(src, "run", json!([[1, 2], 7])), json!([8, 9]));
    assert_eq!(call(src, "words", json!([[3, 1, 3]])), json!([3, 1, 3]));
    assert_eq!(
        call(src, "bits", json!([])),
        json!([2147483648u32, 2143289345u32])
    );
}

#[test]
fn invalid_queries_cannot_bypass_typing_ownership_or_scoping() {
    for body in [
        "list<u32>{from x in xs;select true;}",
        "list<u32>{from x in xs;where x;select x;}",
        "list<u32>{from x in xs;join x in xs on true;select x;}",
        "list<u32>{from x in xs;join y in [x] on true;select y;}",
        "list<u32>{from x in xs;select y;}",
        "list<u32>{from x in 1;select x;}",
        "list<u32>{from x in xs;}",
        "list<u32>{from x in xs;select x;where true;}",
    ] {
        let source = format!("module bad;fn run(xs:List<u32>)->List<u32>{{return {body};}}");
        assert!(
            parse(&source).and_then(CheckedModule::from_source).is_err(),
            "accepted {body}"
        );
    }
    let source="module bad;fn run(xs:List<u32>)->List<u32>{let b=buffer(xs);return list<u32>{from x in xs;select b.push(x).len();};}";
    assert!(parse(source).and_then(CheckedModule::from_source).is_err());
    let source = "module bad;fn run(xs:List<u32>)->Bool{return exists{from x in xs;select x;};}";
    assert!(parse(source).and_then(CheckedModule::from_source).is_err());
}

#[test]
fn independent_inputs_execute_once_in_source_order_and_rollback_together() {
    let src = r#"module ordered_inputs;
      private state Trace:List<u32>=[];
      event Seen:u32;
      enum Error{Aborted,}
      change input(tag:u32,empty:Bool)->List<u32> writes(Trace) reads(Trace) emits(Seen){
        Trace=Trace.concat([tag]);emit Seen(tag);
        return choose(empty,[],[tag,tag]);
      }
      change run(empty:Bool,abort:Bool)->Result<List<u32>,Error> reads(Trace) writes(Trace) emits(Seen){
        let result=list<u32>{from x in input(1,empty);join y in input(2,false) on true;select x*10+y;};
        if abort{return Err(Error.Aborted);}
        return Ok(result);
      }
      query trace()->List<u32> reads(Trace){return Trace;}
    "#;
    let p = parse(src).unwrap();
    CheckedModule::from_source(p.clone()).unwrap();
    let mut rt = ink_core::stateful::Runtime::new(p).unwrap();
    let first = rt.invoke_json("run", &json!([false, false])).unwrap();
    assert_eq!(first.result.json(), json!({"Ok":[12,12,12,12]}));
    assert_eq!(
        rt.invoke_json("trace", &json!([])).unwrap().result.json(),
        json!([1, 2])
    );
    assert_eq!(
        rt.invoke_json("run", &json!([true, false]))
            .unwrap()
            .result
            .json(),
        json!({"Ok":[]})
    );
    assert_eq!(
        rt.invoke_json("trace", &json!([])).unwrap().result.json(),
        json!([1, 2, 1, 2])
    );
    let checkpoint = rt.checkpoint_portable().unwrap();
    assert_eq!(
        rt.invoke_json("run", &json!([false, true]))
            .unwrap()
            .result
            .json(),
        json!({"Err":"Error.Aborted"})
    );
    assert_eq!(rt.checkpoint_portable().unwrap(), checkpoint);
}

#[test]
fn lifted_regions_do_not_erase_capabilities_contracts_or_callback_effects() {
    let prefix = r#"module bad;
      private state Counter:u32=0;
      change source()->List<u32> writes(Counter){Counter=1;return [1];}
    "#;
    for body in [
        "change run()->List<u32>{return list<u32>{from x in source();select x;};}",
        "change run()->List<u32> writes(Counter){return list<u32>{from x in [1];select source().at_or(0,0);};}",
        "query run()->List<u32> reads(Counter){return list<u32>{from x in source();select x;};}",
    ] {
        assert!(parse(&format!("{prefix}{body}")).and_then(CheckedModule::from_source).is_err(),"accepted {body}");
    }
    let error=parse(&format!("{prefix}change run()->List<u32> writes(Counter){{return list<u32>{{from x in [1];select source().at_or(0,0);}};}}"))
        .and_then(CheckedModule::from_source).err().unwrap();
    assert!(error.contains("collection lambda cannot call a change"),"{error}");
    let annotation="module bad;fn wrong(xs:List<u32>)->List<Bool>{return list<u32>{from x in xs;select true;};}";
    assert!(parse(annotation).and_then(CheckedModule::from_source).is_err());
    let source = r#"module bad;
      spec fn positive(x:u32)->u32 requires x>0;ensures result==x;
      implementation original for positive{return x;}
      change run(xs:List<u32>)->List<u32>{return list<u32>{from x in xs;select positive(x);};}
    "#;
    assert!(parse(source).and_then(CheckedModule::from_source).is_err());
    let source = r#"module valid;
      change run(xs:List<u32>)->Bool{return exists{from x in xs;select x==7;};}
    "#;
    let mut rt = ink_core::stateful::Runtime::new(parse(source).unwrap()).unwrap();
    assert_eq!(
        rt.invoke_json("run", &json!([[1, 7, 9]]))
            .unwrap()
            .result
            .json(),
        json!(true)
    );
    assert_eq!(
        rt.invoke_json("run", &json!([[]])).unwrap().result.json(),
        json!(false)
    );
}

#[test]
fn scalar_primitive_inputs_keep_their_own_types_in_owned_modules() {
    let source = r#"module signatures;
      fn owner(xs:List<u32>)->List<u32>{return buffer(xs).freeze();}
      fn bits()->u32{return f32_bits(f32_from_bits(2143289345));}
      fn converted()->f32{return f32_from_u64(18446744073709551615);}
      fn population()->u32{return popcount(18446744073709551615);}
    "#;
    assert_eq!(call(source, "bits", json!([])), json!(2143289345u32));
    assert_eq!(call(source, "converted", json!([])), json!(u64::MAX as f32));
    assert_eq!(call(source, "population", json!([])), json!(64));
}

#[test]
fn query_elaboration_replays_as_ordinary_equality_and_rehashed_false_laws_fail() {
    use ink_core::{laws::{self,Catalogue,CheckedCatalogue,Law,Proof},registry,semantic as s};
    use std::collections::BTreeMap;
    let p=parse(r#"module correspondence;
      fn query(xs:List<u32>,threshold:u32)->List<u32>{return list<u32>{from x in xs;where x>=threshold;select x*3;};}
      fn pipeline(xs:List<u32>,threshold:u32)->List<u32>{return xs.filter(fn(x)=>x>=threshold).map(fn(x)=>x*3);}
      fn false_pipeline(xs:List<u32>,threshold:u32)->List<u32>{return xs.filter(fn(x)=>x>threshold).map(fn(x)=>x*3);}
    "#).unwrap();
    CheckedModule::from_source(p.clone()).unwrap();
    let terms=p.functions.iter().map(|f|{
        let env=f.params.iter().cloned().collect();
        (f.name.clone(),s::elaborate(&f.body,&env,&p,&f.result).unwrap())
    }).collect::<BTreeMap<_,_>>();
    let params=p.functions[0].params.iter().map(|(n,t)|(n.clone(),s::value(t.clone()))).collect();
    let law=Law{schema:1,semantics:laws::SEMANTICS.into(),params,conditions:vec![],
        from:terms["query"].clone(),to:terms["pipeline"].clone(),proof:Proof::Normalize,
        dependencies:vec![],definition_context:None,types:vec![],assumptions:vec![]};
    let check=|law:Law|{
        let id=registry::identity(&registry::Entry::from_law(&law).unwrap()).unwrap();
        CheckedCatalogue::check(&Catalogue{schema:1,semantics:laws::SEMANTICS.into(),roots:vec![id.clone()],objects:BTreeMap::from([(id,law)])},&p)
    };
    check(law.clone()).unwrap();
    let mut forged=law;forged.to=terms["false_pipeline"].clone();
    assert!(check(forged).is_err());
}
