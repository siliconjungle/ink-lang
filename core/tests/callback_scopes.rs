use ink_core::{core::CheckedModule, eval, syntax};
#[test]
fn callbacks_receive_lexical_collection_types_before_surface_matching() {
    let source = r#"module scopes;
enum Item{Number(f32),Missing,}
fn number(x:f32)->Item{return Item.Number(x);}
fn observe(x:Item)->f32{return match x{Item.Number(v)=>v,Item.Missing=>0.0,};}
fn mapped(xs:List<Item>)->List<f32>{return xs.map(fn(x)=>match x{Item.Number(v)=>v,Item.Missing=>0.0,});}
fn indexed(xs:List<Item>)->List<f32>{return xs.map_indexed(fn(i)=>fn(x)=>match x{Item.Number(v)=>v+f32_from_u32(i),Item.Missing=>0.0,});}
fn zipped(xs:List<Item>)->List<f32>{return xs.zip(xs,fn(x)=>fn(y)=>match x{Item.Number(v)=>v+observe(y),Item.Missing=>0.0,});}
fn until(xs:List<Item>)->f32{return fold_until(xs,0.0,fn(x)=>fn(total)=>match x{Item.Number(v)=>false,Item.Missing=>true,},fn(x)=>fn(total)=>total+match x{Item.Number(v)=>v,Item.Missing=>0.0,});}
fn summed(xs:List<Item>)->f32{return foldl(xs,0.0,fn(x)=>fn(total)=>total+match x{Item.Number(v)=>v,Item.Missing=>0.0,});}
fn looped(xs:List<Item>)->f32{var total:f32=0.0;for x in xs{total=total+match x{Item.Number(v)=>v,Item.Missing=>0.0,};}return total;}
fn repeated(x:Item)->Item{return repeat(2,x,fn(i)=>fn(x)=>match x{Item.Number(v)=>Item.Number(v+1.0),Item.Missing=>Item.Number(1.0),});}
fn doubled(x:f32)->f32{return x*2.0;}
fn contextual(n:u32)->f32{return repeat_until(n,0,fn(acc)=>false,fn(i)=>fn(acc)=>doubled(acc));}
"#;
    let p = syntax::parse(source).unwrap();
    CheckedModule::from_source(p.clone()).unwrap();
    let item = eval::call(
        &p,
        "number",
        vec![eval::Value::F32(0.25f32.to_bits())],
        &mut 100000,
    )
    .unwrap();
    let twice = eval::call(&p, "repeated", vec![item.clone()], &mut 100000).unwrap();
    assert_eq!(
        eval::call(&p, "observe", vec![twice], &mut 100000).unwrap(),
        eval::Value::F32(2.25f32.to_bits())
    );
    for name in ["summed", "looped", "until"] {
        assert_eq!(
            eval::call(
                &p,
                name,
                vec![eval::Value::List(vec![item.clone()])],
                &mut 100000
            )
            .unwrap(),
            eval::Value::F32(0.25f32.to_bits())
        );
    }
    assert_eq!(
        eval::call(
            &p,
            "mapped",
            vec![eval::Value::List(vec![item.clone()])],
            &mut 100000
        )
        .unwrap()
        .json(),
        serde_json::json!([0.25])
    );
    for (name, expected) in [("indexed", 0.25), ("zipped", 0.5)] {
        assert_eq!(
            eval::call(
                &p,
                name,
                vec![eval::Value::List(vec![item.clone()])],
                &mut 100000
            )
            .unwrap()
            .json(),
            serde_json::json!([expected])
        );
    }
    let v = eval::call(&p, "contextual", vec![eval::Value::U32(4)], &mut 100000).unwrap();
    assert_eq!(v, eval::Value::F32(0));
}
#[test]
fn nonescaping_callback_templates_can_borrow_but_cannot_consume_captured_owners() {
    let source = r#"module loans;
fn read(f:fn(u32)->f32)->f32{return f(0)+f(1);}
fn direct(xs:List<f32>)->List<f32>{let b=buffer(xs);let total=read(fn(i)=>b.at_or(i,0.0));return b.set(0,total).freeze();}
fn view(xs:List<f32>)->List<f32>{let b=buffer(xs);let total=b.borrow_range(1,2,fn(v)=>read(fn(i)=>v.at_or(i,0.0)));return b.set(0,total).freeze();}
"#;
    let p = syntax::parse(source).unwrap();
    CheckedModule::from_source(p.clone()).unwrap();
    let xs = eval::Value::List(vec![
        eval::Value::F32(1f32.to_bits()),
        eval::Value::F32(2f32.to_bits()),
        eval::Value::F32(3f32.to_bits()),
    ]);
    for (name, expected) in [("direct", vec![3., 2., 3.]), ("view", vec![5., 2., 3.])] {
        assert_eq!(
            eval::call(&p, name, vec![xs.clone()], &mut 100000)
                .unwrap()
                .json(),
            serde_json::json!(expected)
        );
    }
    for bad in [
  "module bad;fn run(f:fn(u32)->Buffer<f32>)->Buffer<f32>{return f(0);}fn bad(xs:List<f32>)->List<f32>{let b=buffer(xs);return run(fn(i)=>b).freeze();}",
  "module bad;fn run(f:fn(u32)->f32)->f32{return f(0);}fn bad(xs:List<f32>)->f32{let b=buffer(xs);return run(fn(i)=>b.set(0,9.0).at_or(0,0.0));}",
  "module bad;fn run(f:fn(u32)->List<f32>)->List<f32>{return f(0);}fn bad(xs:List<f32>)->List<f32>{let b=buffer(xs);return b.borrow_range(0,1,fn(v)=>run(fn(i)=>v.freeze()));}",
 ] {assert!(syntax::parse(bad).and_then(CheckedModule::from_source).is_err(),"captured owner consumed");}
}

#[test]
fn lexical_scopes_preserve_shadowing_and_project_raw_values_with_bounded_copy_cost() {
    let p = syntax::parse(
        r#"module capture;
 record R{large:List<u32>,value:f32,}
 fn lookup(r:R,i:u32)->u32{return r.large.at_or(i,42);}
 fn projection(r:R)->f32{let x=r.value;let value=x;return value;}
 fn bumped(x:u32)->u32{let x=x+1;return x;}
 fn shadow(xs:List<u32>,x:u32)->List<u32>{return xs.map(fn(x)=>bumped(x));}
 fn captures(xs:List<u32>,x:u32)->List<u32>{return xs.map(fn(i)=>bumped(x+i-1));}
 "#,
    )
    .unwrap();
    CheckedModule::from_source(p.clone()).unwrap();
    let v = eval::Value::from_program_json(
        &serde_json::json!({"large":vec![7;10000],"value":{"F32Bits":0x80000000u32}}),
        &ink_core::syntax::Type::Named("R".into()),
        &p,
    )
    .unwrap();
    // Reading one scalar does not copy its 10,000-cell containing record.
    assert_eq!(
        eval::call(&p, "projection", vec![v.clone()], &mut 1000).unwrap(),
        eval::Value::F32(0x80000000)
    );
    for (i, expected) in [(0, 7), (9999, 7), (10000, 42)] {
        assert_eq!(
            eval::call(
                &p,
                "lookup",
                vec![v.clone(), eval::Value::U32(i)],
                &mut 1000
            )
            .unwrap(),
            eval::Value::U32(expected)
        );
    }
    for (name, expected) in [("shadow", vec![2, 3]), ("captures", vec![8, 9])] {
        let args = vec![
            eval::Value::List(vec![eval::Value::U32(1), eval::Value::U32(2)]),
            eval::Value::U32(7),
        ];
        assert_eq!(
            eval::call(&p, name, args, &mut 10000).unwrap().json(),
            serde_json::json!(expected)
        );
    }
}
