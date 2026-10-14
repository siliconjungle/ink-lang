use serde_json::json;
use verified_language::{eval,modules,stateful::Runtime,syntax::Type};
#[path="support/parity.rs"] mod parity;

fn conform(path:&str,name:&str) {
    let program=modules::load(path).unwrap().program;
    let function=program.functions.iter().find(|f|f.name=="materialize").unwrap();
    let Type::Result(_,error)=&function.result else {panic!()};
    let Type::Named(error)=error.as_ref() else {panic!()};
    let base=json!({"id":4294967297u64,"parents":[],"position":0,"remove":0,"text":[65,66,67,68,69]});
    let cases=vec![
        (json!([]),json!({"Ok":[]})),
        (json!([base.clone(),
            {"id":8589934593u64,"parents":[4294967301u64],"position":1,"remove":1,"text":[88,89]},
            {"id":12884901889u64,"parents":[4294967301u64],"position":2,"remove":2,"text":[90]},
            {"id":17179869185u64,"parents":[8589934595u64,12884901891u64],"position":1,"remove":3,"text":[128578]}]),json!({"Ok":[65,128578,69]})),
        (json!([base.clone(),
            {"id":8589934593u64,"parents":[4294967298u64],"position":1,"remove":0,"text":[90]}]),json!({"Ok":[65,90,66,67,68,69]})),
        (json!([base.clone(),
            {"id":8589934593u64,"parents":[4294967301u64],"position":0,"remove":0,"text":[55296]}]),json!({"Err":format!("{error}.InvalidOperation")})),
        (json!([base.clone(),
            {"id":4294967299u64,"parents":[4294967301u64],"position":0,"remove":0,"text":[90]}]),json!({"Err":format!("{error}.InvalidOperation")})),
    ];
    let runtime=Runtime::new(program.clone()).unwrap();
    let mut steps=vec![];let mut expected=vec![];
    for (changes,want) in cases {
        let args=json!([changes]);
        for name in ["materialize","scalar"] {
            let f=program.functions.iter().find(|f|f.name==name).unwrap();
            let values=args.as_array().unwrap().iter().zip(&f.params)
                .map(|(v,(_,t))|eval::Value::from_program_json(v,t,&program).unwrap()).collect();
            assert_eq!(eval::call(&program,name,values,&mut 20_000_000).unwrap().json(),want,"{name} {args}");
            steps.push(json!({"pure":name,"args":args}));
            expected.push(json!({"reply":{"value":want},"snapshot":runtime.checkpoint_portable().unwrap()}));
        }
    }
    parity::conformance(name,program,&std::fs::read_to_string(path).unwrap(),steps,expected);
}

#[test]
fn compressed_causal_runs_preserve_cpu_values_errors_and_snapshots(){
 conform("examples/crdts/span_graph.ink","span-event-graph-parity");
}
#[test]
fn compressed_cursor_runs_preserve_cpu_values_errors_and_snapshots(){
 conform("examples/crdts/span_cursor_graph.ink","span-cursor-event-graph-parity");
}
