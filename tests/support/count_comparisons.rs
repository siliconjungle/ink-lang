use serde_json::json;
use verified_language::{core::CheckedModule, eval, stateful::Runtime, syntax};

#[test]
fn exact_count_uses_preserve_cpu_values_events_failures_and_snapshots() {
    let source = r#"module CountComparisons;
enum Error{Rejected,}
private state Saved:List<u32>=[];
event sizes:Int;
fn compare(xs:List<u32>,ys:List<u32>,limit:Int)->List<Bool>{return [
 count(xs)==count(ys),count(xs)!=count(ys),count(xs)<count(ys),
 count(xs)<=count(ys),count(xs)>count(ys),count(xs)>=count(ys),
 count(xs)==3,3!=count(xs),count(xs)<9007199254740991,
 9007199254740991>=count(xs),count(xs)==9007199254740993,
 count(xs)>-1,count(xs)==limit,count(xs)+1>count(ys)];}
fn escaped(xs:List<u32>)->List<Int>{return [count(xs),count(xs)+9007199254740993];}
fn word(xs:List<u32>)->u64{return count(xs);}
change save(xs:List<u32>,reject:Bool)->Result<Int,Error> writes(Saved) emits(sizes){
 Saved=xs;let n:Int=count(Saved);emit sizes(n);
 return choose(reject,Err(Error.Rejected),Ok(n));}
query inspect(xs:List<u32>,limit:Int)->List<Bool> reads(Saved){return [
 count(Saved)==count(xs),count(Saved)<3,3<=count(Saved),
 count(Saved)>=0,count(Saved)<9007199254740991,
 count(Saved)!=9007199254740993,count(Saved)>-1,count(Saved)==limit];}
"#;
    let p = syntax::parse(source).unwrap();
    let module = CheckedModule::from_source(p.clone()).unwrap();
    let mut runtime = Runtime::new(p.clone()).unwrap();
    let mut steps = vec![];
    let mut expected = vec![];
    for n in [0, 1, 3, 4, 257] {
        for m in [0, 1, 3, 11] {
            for limit in ["-1", "3", "9007199254740993"] {
                let args = json!([vec![u32::MAX; n], vec![7; m], {"Int":limit}]);
                let f = p.functions.iter().find(|f| f.name == "compare").unwrap();
                let input = args.as_array().unwrap().iter().zip(&f.params)
                    .map(|(v, (_, t))| eval::Value::from_program_json(v, t, &p).unwrap()).collect();
                let value = eval::call(&p, "compare", input, &mut 1_000_000).unwrap().json();
                steps.push(json!({"pure":"compare","args":args}));
                expected.push(json!({"reply":{"value":value},"snapshot":runtime.checkpoint_portable().unwrap()}));
            }
        }
        for name in ["escaped", "word"] {
            let args = json!([vec![7; n]]);
            let f = p.functions.iter().find(|f| f.name == name).unwrap();
            let input = args.as_array().unwrap().iter().zip(&f.params)
                .map(|(v, (_, t))| eval::Value::from_program_json(v, t, &p).unwrap()).collect();
            let value = eval::call(&p, name, input, &mut 1_000_000).unwrap().json();
            steps.push(json!({"pure":name,"args":args}));
            expected.push(json!({"reply":{"value":value},"snapshot":runtime.checkpoint_portable().unwrap()}));
        }
    }
    for (n, reject) in [(3, false), (11, true), (0, false), (4, false), (1, true)] {
        for (name, args) in [
            ("save", json!([vec![u32::MAX; n], reject])),
            ("inspect", json!([vec![11; n], {"Int":"9007199254740993"}])),
            ("inspect", json!([vec![7; 3], {"Int":"3"}])),
        ] {
            let before = runtime.checkpoint_portable().unwrap();
            let out = runtime.invoke_json(name, &args).unwrap();
            if name == "save" && reject {
                assert!(!out.committed);
                assert!(out.events.is_empty());
                assert_eq!(runtime.checkpoint_portable().unwrap(), before);
            }
            steps.push(json!({"call":name,"args":args}));
            expected.push(json!({"reply":{"outcome":out.json()},"snapshot":runtime.checkpoint_portable().unwrap()}));
        }
    }
    assert_eq!(steps.len(), 85);
    super::parity::conformance_checked("count-comparison-parity", &module, source, steps, expected);
}
