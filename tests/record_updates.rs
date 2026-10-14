use serde_json::{json,Value};
use verified_language::{eval,stateful::Runtime,syntax};
#[path="support/parity.rs"] mod parity;

#[test]
fn record_updates_and_multi_argument_callbacks_preserve_all_cpu_observations() {
    let source=include_str!("../examples/record-updates.ink");
    let program=syntax::parse(source).unwrap();
    let mut runtime=Runtime::new(program.clone()).unwrap();
    let mut steps=vec![];
    let mut expected=vec![];
    for (name,args,want) in [
        ("updated",json!([{"left":7,"right":9},99]),json!({"left":7,"right":99})),
        ("total",json!([[4294967295u32,2]]),json!(1)),
        ("total",json!([[]]),json!(0)),
        ("owned",json!([]),json!([1,2,7,9])),
    ] {
        let function=program.functions.iter().find(|f|f.name==name).unwrap();
        let values=args.as_array().unwrap().iter().zip(&function.params)
            .map(|(v,(_,t))|eval::Value::from_program_json(v,t,&program).unwrap()).collect();
        assert_eq!(eval::call(&program,name,values,&mut 100_000).unwrap().json(),want);
        steps.push(json!({"pure":name,"args":args}));
        expected.push(json!({"reply":{"value":want},"snapshot":runtime.checkpoint_portable().unwrap()}));
    }
    let before=runtime.checkpoint_portable().unwrap();
    for (args,want) in [
        (json!([true,true,true]),json!({"Err":"Error.Base"})),
        (json!([false,true,true]),json!({"Err":"Error.First"})),
        (json!([false,false,true]),json!({"Err":"Error.Second"})),
        (json!([false,false,false]),json!({"Ok":{"left":3,"right":2}})),
    ] {
        let result=runtime.invoke_json("changed",&args).unwrap();
        assert_eq!(result.result.json(),want);
        if want.get("Err").is_some() {
            assert!(!result.committed);
            assert!(result.events.is_empty());
            assert_eq!(runtime.checkpoint_portable().unwrap(),before);
        } else {
            assert!(result.committed);
            let outcome=result.json();
            assert_eq!(outcome["events"].as_array().unwrap().len(),3);
            // Base runs once and both overrides run in their written order.
            assert_eq!(outcome["events"].as_array().unwrap().iter()
                .map(|event|event["value"].clone()).collect::<Vec<Value>>(),vec![json!(1),json!(2),json!(3)]);
        }
        steps.push(json!({"call":"changed","args":args}));
        expected.push(json!({"reply":{"outcome":result.json()},"snapshot":runtime.checkpoint_portable().unwrap()}));
    }
    let result=runtime.invoke_json("calls",&json!([])).unwrap();
    assert_eq!(result.result.json(),json!(3));
    steps.push(json!({"call":"calls","args":[]}));
    expected.push(json!({"reply":{"outcome":result.json()},"snapshot":runtime.checkpoint_portable().unwrap()}));
    parity::conformance("record-updates-parity",program,source,steps,expected);
}
