use serde_json::json;
use std::{fs,path::Path,process::Command,collections::BTreeSet};
use verified_language::{analysis,check,collection_facts,core::CheckedModule,eval,physical,planning,registry,stateful::Runtime,syntax::{self,Type}};
#[path="support/parity.rs"] mod parity;

const SOURCE:&str=r#"module fold_rows;
record Row{key:u32,payload:List<u32>,}
enum Error{Rejected,}
fn observed(xs:List<Row>)->u32{return foldl(xs,0,fn(row,acc)=>acc+row.key);}
fn right(xs:List<Row>)->u32{return foldr(xs,0,fn(row,acc)=>acc*10+row.key);}
fn collected(xs:List<Row>)->List<u32>{let out:Buffer<u32>=foldl(xs,Buffer.empty(),fn(row,out)=>out.push(row.key));return out.freeze();}
fn escaped(xs:List<Row>)->List<Row>{let out:Buffer<Row>=foldl(xs,Buffer.empty(),fn(row,out)=>out.push(row));return out.freeze();}
fn whole(row:Row)->u32{return row.key+length(row.payload);}
fn called(xs:List<Row>)->u32{return foldl(xs,0,fn(row,acc)=>acc+whole(row));}
fn captured(xs:List<Row>,offsets:List<u32>)->u32{return foldl(xs,0,fn(row,acc)=>foldl(offsets,acc,fn(offset,total)=>total+offset+row.key));}
private state Saved:List<Row>=[];
event total:u32;
change save(xs:List<Row>,reject:Bool)->Result<u32,Error> writes(Saved) emits(total){
 let value=observed(xs);Saved=escaped(xs);emit total(value);
 return choose(reject,Err(Error.Rejected),Ok(value));
}
query saved()->List<Row> reads(Saved){return Saved;}
"#;

#[test]
fn read_only_fold_rows_preserve_all_cpu_values_events_errors_and_snapshots(){
    let program=syntax::parse(SOURCE).unwrap();let module=CheckedModule::from_source(program.clone()).unwrap();
    let mut reads=BTreeSet::new();
    for f in &program.functions {
        analysis::typed_walk(&program,f,|e,env|{
            if collection_facts::lexical_projection(e).is_some_and(|(root,_)|matches!(env.get(root),Some(Type::Named(_)|Type::List(_)))) && check::infer(e,env,&program).is_ok(){reads.insert(registry::identity(e).unwrap());}
        }).unwrap();
    }
    let physical=physical::Plan{schema:1,semantics:physical::SEMANTICS.into(),input_core_sha256:module.identity().unwrap(),representation:None,tables:Default::default(),buffers:physical::Buffers::Direct,bounds:None,columns:vec![],column_maps:None,borrow_reads:reads.into_iter().collect(),borrow_rows:vec![],definitions:Default::default(),packed_datatypes:vec![],memo_functions:vec![],reservations:vec![],inline_functions:vec![],record_elisions:vec![],sum_spines:vec![],dense_prefixes:vec![],dictionary_tables:vec![],boundary_readers:vec![]};
    physical::check(&module,None,&physical).unwrap();
    let plan=planning::Package{schema:1,semantics:planning::SEMANTICS.into(),input_core_sha256:module.identity().unwrap(),steps:vec![planning::Step::Physical(physical)]};
    let mut runtime=Runtime::new(program.clone()).unwrap();let mut steps=vec![];let mut expected=vec![];
    let rows=json!([{"key":1,"payload":[7,8]},{"key":2,"payload":[]},{"key":3,"payload":[9]}]);
    for xs in [json!([]),rows.clone(),json!([{"key":4294967295u32,"payload":[1]},{"key":2,"payload":[3,4]}])] {
        for name in ["observed","right","collected","escaped","called","captured"] {
            let args=if name=="captured"{json!([xs,[1,2]])}else{json!([xs])};
            let f=program.functions.iter().find(|f|f.name==name).unwrap();
            let input=args.as_array().unwrap().iter().zip(&f.params).map(|(v,(_,t))|eval::Value::from_program_json(v,t,&program).unwrap()).collect();
            let value=eval::call(&program,name,input,&mut 1_000_000).unwrap().json();
            steps.push(json!({"pure":name,"args":args}));expected.push(json!({"reply":{"value":value},"snapshot":runtime.checkpoint_portable().unwrap()}));
        }
    }
    for reject in [false,true,false] {
        let args=json!([rows,reject]);let before=runtime.checkpoint_portable().unwrap();
        let result=runtime.invoke_json("save",&args).unwrap();
        assert_eq!(result.committed,!reject);
        if reject{assert!(result.events.is_empty());assert_eq!(runtime.checkpoint_portable().unwrap(),before);}
        else{assert_eq!(result.events.len(),1);}
        steps.push(json!({"call":"save","args":args}));expected.push(json!({"reply":{"outcome":result.json()},"snapshot":runtime.checkpoint_portable().unwrap()}));
    }
    let result=runtime.invoke_json("saved",&json!([])).unwrap();
    steps.push(json!({"call":"saved","args":[]}));expected.push(json!({"reply":{"outcome":result.json()},"snapshot":runtime.checkpoint_portable().unwrap()}));
    parity::conformance("fold-row-baseline-parity",program,SOURCE,steps.clone(),expected.clone());
    let root=Path::new(env!("CARGO_MANIFEST_DIR")).join("build/fold-row-physical-parity");fs::create_dir_all(&root).unwrap();
    fs::write(root.join("source.ink"),SOURCE).unwrap();fs::write(root.join("plan.json"),registry::canonical(&plan).unwrap()).unwrap();
    fs::write(root.join("script.json"),serde_json::to_vec(&steps).unwrap()).unwrap();fs::write(root.join("expected.json"),serde_json::to_vec(&expected).unwrap()).unwrap();
    let output=Command::new("python3").arg("tools/physical_capability_conformance.py").args(["--compiler",env!("CARGO_BIN_EXE_ink"),"--root"]).arg(&root).arg("--source").arg(root.join("source.ink")).arg("--plan").arg(root.join("plan.json")).output().unwrap();
    fs::write(root.join("run.log"),[output.stdout.as_slice(),output.stderr.as_slice()].concat()).unwrap();assert!(output.status.success(),"{}",String::from_utf8_lossy(&output.stderr));
}
