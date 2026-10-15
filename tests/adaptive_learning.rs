use serde_json::json;
use verified_language::{core::CheckedModule, stateful::Runtime, syntax, training};
#[path="support/parity.rs"] mod parity;
const SOURCE:&str=include_str!("../examples/adaptive-layout.ink");

#[test]
fn learning_capabilities_are_checked_after_transport() {
    let p=syntax::parse(SOURCE).unwrap();
    let module=CheckedModule::from_source(p.clone()).unwrap();
    for modifier in ["private trainable state Model", "trainable private state Model"] {
        CheckedModule::from_source(syntax::parse(&SOURCE.replace("trainable state Model",modifier)).unwrap()).unwrap();
    }
    let roundtrip=CheckedModule::from_bytes(&module.bytes().unwrap()).unwrap();
    assert_eq!(roundtrip.program().contracts.learning.trainable,["Model"]);
    for source in [
        SOURCE.replace("learn change observe", "change observe"),
        SOURCE.replace("trainable state Model", "state Model"),
        SOURCE.replace("writes(Model)", "writes(Model,Authored)"),
        format!("{SOURCE}\nchange bypass()->Result<Unit,String> reads(Model) writes(Model) {{return observe(Context{{width:0.0,length:0.0}},0.2,0.1);}}"),
    ] { assert!(syntax::parse(&source).and_then(CheckedModule::from_source).is_err()); }
    let mut forged=p;
    forged.contracts.learning.learn.push("suggest".into());
    assert!(CheckedModule::from_source(forged).unwrap_err().contains("learning action"));
    let mut bytes:serde_json::Value=serde_json::from_slice(&module.bytes().unwrap()).unwrap();
    bytes["program"]["contracts"]["learning"]["learn"]=json!([]);
    assert!(CheckedModule::from_bytes(&serde_json::to_vec(&bytes).unwrap()).is_err());
}

fn trace()->training::Trace {
    let contexts=[(0.,0.,0.2),(1.,0.,0.7),(0.,1.,0.7),(1.,1.,0.2)];
    training::Trace{schema:1,epochs:400,observations:contexts.iter().map(|(w,l,t)|training::Observation{
        call:"observe".into(),args:json!([{"width":w,"length":l},t,0.1])}).collect()}
}
#[test]
fn offline_training_learns_interactions_and_restores_exactly() {
    let module=CheckedModule::from_source(syntax::parse(SOURCE).unwrap()).unwrap();
    let result=training::replay(&module,&trace()).unwrap();
    let again=training::replay(&module,&trace()).unwrap();
    assert_eq!(result.snapshot,again.snapshot);
    let mut rt=Runtime::restore_portable(module.program().clone(),&result.snapshot).unwrap();
    for (w,l,target) in [(0.,0.,0.2),(1.,0.,0.7),(0.,1.,0.7),(1.,1.,0.2),(0.5,0.5,0.45),(0.25,0.75,0.5125)] {
        let value=rt.invoke_json("suggest",&json!([{"width":w,"length":l}])).unwrap().result.json().as_f64().unwrap();
        assert!((value-target).abs()<0.002,"{w},{l}: {value} != {target}");
    }
    assert_eq!(result.receipt["updates"],1600);
    for name in ["authored","suggest","missing"] {
        let mut bad=trace();bad.observations[0].call=name.into();
        assert!(training::replay(&module,&bad).is_err());
    }
    let mut bad=trace();bad.observations[0].args=json!([{"width":0.,"length":0.},0.3,1000.]);
    assert!(training::replay(&module,&bad).unwrap_err().contains("rejected"));
}

#[test]
fn online_learning_preserves_values_errors_events_and_snapshots_across_targets() {
    let source=format!("{SOURCE}\nlearn change rejected()->Result<Unit,String> writes(Model) emits(learned) {{Model=Weights{{bias:7.0,width:7.0,length:7.0,interaction:7.0}};emit learned(7.0);return Err(\"reject\");}}");
    let p=syntax::parse(&source).unwrap();let mut rt=Runtime::new(p.clone()).unwrap();
    let mut steps=vec![];let mut expected=vec![];
    let mut calls=vec![("suggest",json!([{"width":0.2,"length":0.8}])),("authored",json!([42]))];
    for _ in 0..4 {for o in trace().observations {calls.push(("observe",o.args));}}
    calls.extend([("suggest",json!([{"width":0.,"length":0.}])),("suggest",json!([{"width":1.,"length":1.}])),
        ("observe",json!([{"width":0.,"length":0.},0.3,1000.])),("rejected",json!([])),
        ("suggest",json!([{"width":0.,"length":0.}]))]);
    for (name,args) in calls {
        let before=rt.checkpoint_portable().unwrap();
        let result=rt.invoke_json(name,&args).unwrap();
        let snapshot=rt.checkpoint_portable().unwrap();
        if name=="rejected" || (name=="observe" && !result.committed) {assert_eq!(before,snapshot);}
        steps.push(json!({"call":name,"args":args}));expected.push(json!({"reply":{"outcome":result.json()},"snapshot":snapshot}));
    }
    let args=json!([[0.,0.5,1.,-1.],0.25]);
    steps.push(json!({"pure":"batch","args":args,"expect_gpu":true}));
    expected.push(json!({"reply":{"value":[0.,0.0625,0.25,0.25]},"snapshot":rt.checkpoint_portable().unwrap()}));
    parity::conformance("adaptive-learning",p,&source,steps,expected);
}

#[test]
fn learning_metadata_survives_imports_and_generic_instantiation() {
    use std::fs;
    let dir=std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("build/adaptive-module-test");
    fs::create_dir_all(&dir).unwrap();
    fs::write(dir.join("model.ink"),SOURCE).unwrap();
    fs::write(dir.join("main.ink"),r#"module main; import "model.ink" as model;
        adaptive fn identity<T>(x:T)->T{return x;}
        fn used()->u32{return identity<u32>(7);}
        adaptive query prediction()->f32 reads(model.Model){return model.suggest(model.Context{width:0.5,length:0.5});}
    "#).unwrap();
    let program=verified_language::modules::load(dir.join("main.ink")).unwrap().program;
    let m=CheckedModule::from_source(program).unwrap();
    let d=&m.program().contracts.learning;
    assert_eq!(d.trainable.len(),1);assert_eq!(d.learn.len(),1);
    assert_eq!(d.adaptive.len(),5); // three imported, one query, one instantiated generic
    let mut rt=Runtime::from_checked(&m).unwrap();
    assert!(rt.invoke_json("prediction",&json!([])).is_ok());
}

#[test]
fn offline_cli_exports_a_portable_model_and_receipt() {
    use std::{fs,process::Command};
    let dir=std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("build/adaptive-cli-test");fs::create_dir_all(&dir).unwrap();
    let trace_path=dir.join("trace.json");let snapshot=dir.join("model.snapshot");
    fs::write(&trace_path,serde_json::to_vec(&trace()).unwrap()).unwrap();
    let out=Command::new(env!("CARGO_BIN_EXE_ink")).args(["train","examples/adaptive-layout.ink"])
        .arg(&trace_path).arg("-o").arg(&snapshot).output().unwrap();
    assert!(out.status.success(),"{}",String::from_utf8_lossy(&out.stderr));
    let receipt:serde_json::Value=serde_json::from_slice(&out.stdout).unwrap();assert_eq!(receipt["updates"],1600);
    // CLI module loading is used here too, so the exact module identity agrees.
    let p=verified_language::modules::load("examples/adaptive-layout.ink").unwrap().program;
    let mut rt=Runtime::restore_portable(p,&fs::read(snapshot).unwrap()).unwrap();
    let value=rt.invoke_json("suggest",&json!([{"width":0.5,"length":0.5}])).unwrap().result.json().as_f64().unwrap();
    assert!((value-0.45).abs()<0.002);
}

#[test]
fn source_logic_configures_and_triggers_another_learner_transactionally() {
    let source = include_str!("../examples/learning-orchestration.ink");
    let module = CheckedModule::from_source(syntax::parse(source).unwrap()).unwrap();
    let mut rt = Runtime::from_checked(&module).unwrap();
    let mut steps = vec![];
    let mut expected = vec![];
    let mut call = |rt: &mut Runtime, name: &str, args: serde_json::Value| {
        let result = rt.invoke_json(name, &args).unwrap();
        steps.push(json!({"call":name,"args":args}));
        expected.push(
            json!({"reply":{"outcome":result.json()},"snapshot":rt.checkpoint_portable().unwrap()}),
        );
        result
    };
    let context = json!({"input":1.,"target":1.});
    let result = call(&mut rt, "feedback", json!([context]));
    assert!(result.committed);
    let value = &result.result.json()["Ok"];
    let mut first = 0f32;
    for _ in 0..2 {
        let e = first - 1.;
        let d = e + e;
        first -= 0.1f32 * d;
    }
    let input = first;
    let e = 0.25f32 * input - 1.;
    let d = input * e + e * input;
    let second = 0.25f32 - 0.05f32 * d;
    assert_eq!(value["first"]["weight"], json!(first));
    assert_eq!(value["second"]["weight"], json!(second));
    assert_eq!(value["first"]["updates"], 2);
    assert_eq!(value["second"]["updates"], 1);
    assert_eq!(value["settings"]["second_rate"], json!(0.05f32));
    assert_eq!(result.events.len(), 2);
    let settings = json!({"first_rate":0.1,"second_rate":0.02,"budget":2,"first_paused":true,"second_paused":false});
    assert!(call(&mut rt, "configure", json!([settings])).committed);
    let result = call(&mut rt, "feedback", json!([context]));
    assert!(result.committed);
    assert_eq!(result.result.json()["Ok"]["first"]["updates"], 2);
    assert_eq!(result.events.len(), 1);
    let checkpoint = rt.checkpoint_portable().unwrap();
    assert!(!call(&mut rt, "train_first", json!([context, 1])).committed);
    assert_eq!(checkpoint, rt.checkpoint_portable().unwrap());
    assert!(!call(&mut rt, "train_second", json!([context, 9])).committed);
    assert_eq!(checkpoint, rt.checkpoint_portable().unwrap());
    assert!(!call(&mut rt, "cancel", json!([context])).committed);
    assert_eq!(checkpoint, rt.checkpoint_portable().unwrap());
    let _ = call(&mut rt, "models", json!([]));
    assert_eq!(checkpoint, rt.checkpoint_portable().unwrap());
    steps.push(json!({"pure":"batch","args":[[2.,-0.25]],"expect_gpu":true}));
    expected.push(json!({"reply":{"value":[4.5,0.5625]},"snapshot":checkpoint}));
    parity::conformance_checked(
        "learning-orchestration-parity",
        &module,
        source,
        steps,
        expected,
    );
}

#[test]
fn continuous_sessions_preserve_serving_queue_versions_and_recovery_across_targets() {
    let source = include_str!("../examples/continuous-learning.ink");
    let p = verified_language::modules::load("examples/continuous-learning.ink")
        .unwrap()
        .program;
    let module = CheckedModule::from_source(p).unwrap();
    let mut rt = Runtime::from_checked(&module).unwrap();
    let mut steps = vec![];
    let mut expected = vec![];
    fn call(
        rt: &mut Runtime,
        steps: &mut Vec<serde_json::Value>,
        expected: &mut Vec<serde_json::Value>,
        name: &str,
        args: serde_json::Value,
        commits: bool,
    ) -> serde_json::Value {
        let before = rt.checkpoint_portable().unwrap();
        let out = rt.invoke_json(name, &args).unwrap();
        let commits = commits && !["predict", "status", "models"].contains(&name);
        assert_eq!(out.committed, commits, "{name}: {:?}", out.json());
        let checkpoint = rt.checkpoint_portable().unwrap();
        if !commits {
            assert_eq!(before, checkpoint, "{name} changed failed state");
        }
        steps.push(json!({"call":name,"args":args}));
        expected.push(json!({"reply":{"outcome":out.json()},"snapshot":checkpoint}));
        out.result.json()
    }
    macro_rules! invoke {
        ($name:expr,$args:expr,$ok:expr) => {
            call(&mut rt, &mut steps, &mut expected, $name, $args, $ok)
        };
    }
    let observation = json!({"input":1.,"target":1.,"rate":0.1});
    for id in 1..=4 {
        assert_eq!(
            invoke!("enqueue", json!([id, observation]), true),
            json!({"Ok":true})
        );
    }
    invoke!("enqueue", json!([5, observation]), false);
    invoke!("begin", json!([]), true);
    invoke!("work", json!([1, 1]), true);
    assert_eq!(invoke!("predict", json!([1.]), true), json!({"Ok":0.}));
    invoke!("publish", json!([1, false]), false);
    invoke!("work", json!([1, 1]), true);
    let models = invoke!("models", json!([]), true);
    let mut independent = 0f32;
    for _ in 0..2 {
        let e = independent - 1.;
        independent -= 0.1f32 * (e + e);
    }
    assert_eq!(models["Ok"][0]["weight"], json!(0.));
    assert_eq!(models["Ok"][1]["weight"], json!(independent));
    let halfway = rt.checkpoint_portable().unwrap();
    rt = Runtime::restore_portable(module.program().clone(), &halfway).unwrap();
    assert_eq!(halfway, rt.checkpoint_portable().unwrap());
    invoke!("replace", json!([{"weight":0.5,"updates":10}]), true);
    invoke!("publish", json!([1, true]), false);
    invoke!("work", json!([1, 1]), false);
    invoke!("cancel", json!([]), true);
    invoke!("begin", json!([]), true);
    invoke!("work", json!([1, 1]), false);
    invoke!("work", json!([2, 3]), false);
    invoke!("work", json!([2, 2]), true);
    let published = invoke!("publish", json!([2, false]), true);
    assert_eq!(published["Ok"]["version"], 2);
    assert_eq!(published["Ok"]["published_through"], 2);
    assert_eq!(published["Ok"]["pending"], 2);
    invoke!("abort_turn", json!([]), false);
    let paused = json!({"capacity":3,"budget":1,"publish_every":2,"paused":true,"drop_newest":true});
    invoke!("configure", json!([paused]), true);
    invoke!("begin", json!([]), false);
    invoke!("enqueue", json!([5, observation]), true);
    assert_eq!(
        invoke!("enqueue", json!([6, observation]), true),
        json!({"Ok":false})
    );
    invoke!("enqueue", json!([6, observation]), false);
    let mut too_small = paused.clone();
    too_small["capacity"] = json!(2);
    invoke!("configure", json!([too_small]), false);
    let mut active = paused;
    active["paused"] = json!(false);
    invoke!("configure", json!([active]), true);
    let current = invoke!("predict", json!([1.]), true);
    let first = invoke!("pump", json!([]), true);
    assert_eq!(first["Ok"]["processed"], 1);
    assert_eq!(first["Ok"]["version"], 2);
    assert_eq!(invoke!("predict", json!([1.]), true), current);
    invoke!("pump", json!([]), true);
    let last = invoke!("pump", json!([]), true);
    assert_eq!(last["Ok"]["published_through"], 5);
    assert_eq!(last["Ok"]["version"], 4);
    assert_eq!(last["Ok"]["pending"], 0);
    invoke!(
        "enqueue",
        json!([7,{"input":1.,"target":1e30,"rate":0.1}]),
        true
    );
    invoke!("pump", json!([]), false); // Candidate error rolls back begin and work.
    invoke!("cancel", json!([]), true);
    invoke!("discard", json!([7]), true);
    let end = invoke!("status", json!([]), true);
    assert_eq!(end["Ok"]["dropped"], 2);
    assert_eq!(end["Ok"]["next"], 8);
    steps.push(json!({"pure":"batch","args":[[2.,-0.25]],"expect_gpu":true}));
    expected
        .push(json!({"reply":{"value":[4.5,0.5625]},"snapshot":rt.checkpoint_portable().unwrap()}));
    parity::conformance_checked(
        "continuous-learning-parity",
        &module,
        source,
        steps,
        expected,
    );
}

#[test]
fn compiled_continuous_service_recovers_durable_training_and_serves_predictions() {
    use std::{fs, process::Command};
    let root = std::path::Path::new(env!("CARGO_MANIFEST_DIR"));
    let dir = root.join("build/continuous-durable-service");
    fs::create_dir_all(&dir).unwrap();
    let module = CheckedModule::from_source(
        verified_language::modules::load(root.join("examples/continuous-learning.ink"))
            .unwrap()
            .program,
    )
    .unwrap();
    let mut rt = Runtime::from_checked(&module).unwrap();
    let observation = json!({"input":1.,"target":1.,"rate":0.1});
    for id in 1..=4 {
        assert!(
            rt.invoke_json("enqueue", &json!([id, observation]))
                .unwrap()
                .committed
        );
    }
    assert!(rt.invoke_json("begin", &json!([])).unwrap().committed);
    assert!(rt.invoke_json("work", &json!([1, 1])).unwrap().committed);
    fs::write(
        dir.join("queued.snapshot"),
        rt.checkpoint_portable().unwrap(),
    )
    .unwrap();
    for name in ["first", "complete"] {
        assert!(rt.invoke_json("pump", &json!([])).unwrap().committed);
        fs::write(
            dir.join(format!("{name}.snapshot")),
            rt.checkpoint_portable().unwrap(),
        )
        .unwrap();
    }
    let trace = training::Trace {
        schema: 1,
        epochs: 1,
        observations: (1..=4)
            .map(|id| training::Observation {
                call: "enqueue".into(),
                args: json!([id, observation]),
            })
            .chain([
                training::Observation {
                    call: "begin".into(),
                    args: json!([]),
                },
                training::Observation {
                    call: "work".into(),
                    args: json!([1, 1]),
                },
            ])
            .collect(),
    };
    let trace_path = dir.join("offline-trace.json");
    fs::write(&trace_path, serde_json::to_vec(&trace).unwrap()).unwrap();
    let offline = Command::new(env!("CARGO_BIN_EXE_ink"))
        .current_dir(root)
        .args(["train", "examples/continuous-learning.ink"])
        .arg(&trace_path)
        .arg("-o")
        .arg(dir.join("offline.snapshot"))
        .output()
        .unwrap();
    assert!(
        offline.status.success(),
        "{}",
        String::from_utf8_lossy(&offline.stderr)
    );
    assert_eq!(
        fs::read(dir.join("offline.snapshot")).unwrap(),
        fs::read(dir.join("queued.snapshot")).unwrap()
    );
    let program = dir.join("program.mjs");
    let built = Command::new(env!("CARGO_BIN_EXE_ink"))
        .current_dir(root)
        .args([
            "build",
            "examples/continuous-learning.ink",
            "--target",
            "javascript",
            "-o",
        ])
        .arg(&program)
        .output()
        .unwrap();
    assert!(
        built.status.success(),
        "{}",
        String::from_utf8_lossy(&built.stderr)
    );
    let hosts = dir.join("hosts");
    let emitted = Command::new(env!("CARGO_BIN_EXE_ink"))
        .current_dir(root)
        .args([
            "build",
            "examples/continuous-learning.ink",
            "--target",
            "rust",
            "-o",
        ])
        .arg(&hosts)
        .output()
        .unwrap();
    assert!(
        emitted.status.success(),
        "{}",
        String::from_utf8_lossy(&emitted.stderr)
    );
    let output = Command::new("node")
        .arg(root.join("tests/fixtures/continuous-learning.mjs"))
        .arg(&program)
        .arg(&dir)
        .output()
        .unwrap();
    fs::write(
        dir.join("service.log"),
        [output.stdout.as_slice(), output.stderr.as_slice()].concat(),
    )
    .unwrap();
    assert!(
        output.status.success(),
        "{}\n{}",
        String::from_utf8_lossy(&output.stdout),
        String::from_utf8_lossy(&output.stderr)
    );
    println!("{}", String::from_utf8_lossy(&output.stdout));
}

#[test]
fn queued_learning_rejects_forged_shapes_and_counter_exhaustion() {
    use std::fs;
    let source=format!("{}\n{}",include_str!("../examples/continuous-learning.ink"),r#"
fn invalid_sessions()->Result<List<Bool>,String> {
 let settings=session.Settings{capacity:2,budget:1,publish_every:1,paused:false,overflow:session.Overflow.Reject};
 let o=Observation{input:1.0,target:1.0,rate:0.1};
 let empty=session.create<Model,Observation>(Model{weight:0.0,updates:0},o,settings)?;
 let enqueued=session.enqueue<Model,Observation>(empty,1,o)?;
 let filled=enqueued.session;
 let item=session.Item<Observation>{id:1,observation:o};
 return Ok([
  session.shape<Model,Observation>(filled),
  !session.shape<Model,Observation>(session.Session<Model,Observation>{..filled,processed:2}),
  !session.shape<Model,Observation>(session.Session<Model,Observation>{..filled,processed:1}),
  !session.shape<Model,Observation>(session.Session<Model,Observation>{..filled,base:1}),
  !session.shape<Model,Observation>(session.Session<Model,Observation>{..filled,next:0}),
  !session.shape<Model,Observation>(session.Session<Model,Observation>{..filled,queue:[item,item]}),
  !session.shape<Model,Observation>(session.Session<Model,Observation>{..filled,queue:[session.Item<Observation>{id:0,observation:o}]}),
  !session.shape<Model,Observation>(session.Session<Model,Observation>{..filled,published_through:1}),
  !session.shape<Model,Observation>(session.Session<Model,Observation>{..filled,settings:session.Settings{..settings,budget:0}}),
  readable(Ok(session.Session<Model,Observation>{..filled,serving:Model{weight:9.0,updates:0}})).fold(fn(s)=>false,fn(error)=>true),
  session.enqueue<Model,Observation>(session.Session<Model,Observation>{..empty,next:4294967295},4294967295,o).fold(fn(s)=>false,fn(error)=>true),
  session.begin<Model,Observation>(session.Session<Model,Observation>{..filled,ticket:4294967295}).fold(fn(s)=>false,fn(error)=>true),
  session.discard<Model,Observation>(session.Session<Model,Observation>{..filled,dropped:4294967295},1).fold(fn(s)=>false,fn(error)=>true),
  replaced(session.Session<Model,Observation>{..filled,version:4294967295},Model{weight:0.0,updates:0}).fold(fn(s)=>false,fn(error)=>true),
  promoted(session.Session<Model,Observation>{..filled,version:4294967295,base:4294967295,ticket:1,active:true,processed:1},1,true).fold(fn(s)=>false,fn(error)=>true)
 ]);
}
"#);
    let dir=std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("build/continuous-session-domains");
    fs::create_dir_all(&dir).unwrap();fs::write(dir.join("source.ink"),&source).unwrap();
    let module=CheckedModule::from_source(verified_language::modules::load(dir.join("source.ink")).unwrap().program).unwrap();
    let rt=Runtime::from_checked(&module).unwrap();
    let snapshot=rt.checkpoint_portable().unwrap();
    let value=verified_language::eval::call(module.program(),"invalid_sessions",vec![],&mut 100_000_000).unwrap().json();
    assert_eq!(value,json!({"Ok":vec![true;15]}));
    parity::conformance_checked("continuous-session-domains",&module,&source,
        vec![json!({"pure":"invalid_sessions","args":[]}),json!({"pure":"batch","args":[[2.,-0.25]],"expect_gpu":true})],
        vec![json!({"reply":{"value":value},"snapshot":snapshot}),json!({"reply":{"value":[4.5,0.5625]},"snapshot":snapshot})]);
}
