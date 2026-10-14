use serde_json::json;
use verified_language::{eval, stateful::Runtime, syntax};
use super::parity;

const SOURCE: &str = r#"module projected_reads;
record Item { value:u32, label:String, raw:f32, }
record Inner { items:List<Item>, }
record Outer { inner:Inner, }
fn fallback()->Item{return Item{value:99,label:"missing",raw:0.0};}
fn size(r:Outer)->u32{return length(r.inner.items);}
fn pick(r:Outer,i:u32)->Item{return r.inner.items.at_or(i,fallback());}
fn captured(r:Outer)->List<u32>{let ids:List<u32>=[0,1,2];return ids.map(fn(i)=>r.inner.items.at_or(i,fallback()).value+length(r.inner.items));}
fn consume(r:Outer)->u32{return length(r.inner.items)-1;}
fn index_consumes(r:Outer)->Item{return r.inner.items.at_or(consume(r),fallback());}
fn fallback_consumes(r:Outer)->Item{return r.inner.items.at_or(4294967295,Item{value:consume(r),label:"consumed",raw:0.0});}
fn consume_list(xs:List<Item>)->u32{return length(xs)-1;}
fn plain_index_consumes(xs:List<Item>)->Item{return xs.at_or(consume_list(xs),fallback());}
fn identity(r:Outer)->Outer{return r;}
fn computed(r:Outer)->Item{return identity(r).inner.items.at_or(1,fallback());}
"#;

#[test]
fn projected_list_reads_preserve_nested_values_consuming_arguments_and_snapshots() {
    let program=syntax::parse(SOURCE).unwrap();
    let snapshot=Runtime::new(program.clone()).unwrap().checkpoint_portable().unwrap();
    let fallback=json!({"value":99,"label":"missing","raw":{"F32Bits":0}});
    let mut steps=vec![];let mut expected=vec![];
    let mut add=|name:&str,args:serde_json::Value,result:serde_json::Value|{
        let result_type=&program.functions.iter().find(|f|f.name==name).unwrap().result;
        let result=eval::Value::from_program_json(&result,result_type,&program).unwrap().json();
        steps.push(json!({"pure":name,"args":args,"cpu_only":true,"expect_gpu":false}));
        expected.push(json!({"reply":{"value":result},"snapshot":snapshot}));
    };
    for n in [0u32,1,2,7] {
        let items=(0..n).map(|i|json!({"value":i.wrapping_add(u32::MAX-2),"label":format!("item-{i}"),"raw":{"F32Bits":([0x80000000u32,0x7fc01234,1,0x7f800000][i as usize%4])}})).collect::<Vec<_>>();
        let record=json!({"inner":{"items":items}});
        add("size",json!([record]),json!(n));
        for i in [0u32,1,6,u32::MAX] {
            add("pick",json!([record,i]),items.get(i as usize).cloned().unwrap_or(fallback.clone()));
        }
        let values=(0..3).map(|i|items.get(i).map(|v|v["value"].as_u64().unwrap() as u32).unwrap_or(99).wrapping_add(n)).collect::<Vec<_>>();
        add("captured",json!([record]),json!(values));
        let last=items.last().cloned().unwrap_or(fallback.clone());
        add("index_consumes",json!([record]),last.clone());
        add("plain_index_consumes",json!([items]),last);
        add("fallback_consumes",json!([record]),json!({"value":n.wrapping_sub(1),"label":"consumed","raw":{"F32Bits":0}}));
        add("computed",json!([record]),items.get(1).cloned().unwrap_or(fallback.clone()));
    }
    parity::conformance("projected-list-reads",program,SOURCE,steps,expected);
}
