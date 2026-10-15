use serde_json::json;
use std::collections::BTreeMap;
use verified_language::{
    core::CheckedModule,
    laws::{Catalogue, Law},
    optimisation::{self, Site},
    registry,
    semantic::{self as s, Node},
    stateful::Runtime,
    syntax,
};
#[path = "support/parity.rs"]
mod parity;
#[test]
fn proved_bound_erases_runtime_work_on_all_targets() {
    let source="module bounds;fn bounded(xs:List<u32>)->Bool{let selected:Int=count(xs.filter(fn(x)=>x>3));let original:Int=count(xs);return selected<=original;}";
    let input = CheckedModule::from_source(syntax::parse(source).unwrap()).unwrap();
    let f = &input.program().functions[0];
    let actual = s::elaborate(
        &f.body,
        &verified_language::check::params_env(&f.params).unwrap(),
        input.program(),
        &f.result,
    )
    .unwrap();
    let mut pending = vec![&actual];
    let mut filter = None;
    while let Some(t) = pending.pop() {
        if let Node::Op(n, args) = &t.node {
            if n == "method:filter" {
                filter = Some(args.clone());
                break;
            }
        }
        pending.extend(s::children(t));
    }
    let filter = filter.unwrap();
    let laws: Vec<Law> =
        serde_json::from_str(include_str!("../core/tests/fixtures/refinement-laws.json")).unwrap();
    let law = laws
        .into_iter()
        .find(|l| {
            l.params.get("xs") == Some(&s::value(syntax::Type::List(Box::new(syntax::Type::U32))))
                && l.params.contains_key("p")
        })
        .unwrap();
    let bound_id = registry::identity(&registry::Entry::from_law(&law).unwrap()).unwrap();
    let arguments = BTreeMap::from([
        ("xs".into(), filter[0].clone()),
        ("p".into(), filter[1].clone()),
    ]);
    let middle = s::substitute(&law.from, &arguments, &mut s::Budget::new()).unwrap();
    // General beta/conversion followed by the database inequality; no compiler
    // guard recogniser or erased runtime requires/ensures assumption.
    let wrapper = Law {
        types: vec![],
        assumptions: vec![],
        schema: 1,
        semantics: verified_language::laws::SEMANTICS.into(),
        params: BTreeMap::from([("xs".into(), filter[0].sort.clone())]),
        conditions: vec![],
        from: actual.clone(),
        to: law.to.clone(),
        proof: verified_language::laws::Proof::Trans {
            middle,
            left: Box::new(verified_language::laws::Proof::Normalize),
            right: Box::new(verified_language::laws::Proof::Use {
                law: bound_id.clone(),
                types: BTreeMap::new(),
                assumptions: vec![],
                arguments,
                premises: vec![],
            }),
        },
        dependencies: vec![bound_id.clone()],
        definition_context: None,
    };
    let id = registry::identity(&registry::Entry::from_law(&wrapper).unwrap()).unwrap();
    let catalogue = Catalogue {
        schema: 1,
        semantics: verified_language::laws::SEMANTICS.into(),
        roots: vec![id.clone()],
        objects: BTreeMap::from([(bound_id, law), (id.clone(), wrapper)]),
    };
    let packet = optimisation::Package {
        schema: 1,
        semantics: optimisation::SEMANTICS.into(),
        input_core_sha256: input.identity().unwrap(),
        knowledge: registry::from_catalogue(&catalogue).unwrap(),
        applications: vec![Site {
            function: "bounded".into(),
            path: vec![],
            law: id,
            arguments: BTreeMap::from([("xs".into(), filter[0].clone())]),
            premises: vec![],
        }],
        action_replacement: None,
        contract_refinement: None,
    };
    let selected = optimisation::check(&input, &packet).unwrap();
    assert_eq!(
        selected.module().program().functions[0].body,
        syntax::Expr::Bool(true)
    );
    let reference = Runtime::new_selected(&selected).unwrap();
    let snapshot = reference.checkpoint_portable().unwrap();
    let inputs = [
        json!([]),
        json!([0, 1, 3]),
        json!([4, 5, u32::MAX]),
        json!([4, 0, 4, 0]),
    ];
    let mut steps = vec![];
    let mut expected = vec![];
    for xs in inputs {
        steps.push(json!({"pure":"bounded","args":[xs],"cpu_only":true}));
        expected.push(json!({"reply":{"value":true},"snapshot":snapshot}));
    }
    parity::conformance_selected(
        "proved-refinement-parity",
        &selected,
        source,
        steps,
        expected,
    );
}

#[test]
fn v8_database_laws_preserve_modular_counts_and_branch_values_on_cpu_targets() {
    use std::process::Command;
    // The producer matches ordinary database laws to this independently named
    // source. No V8 recogniser is linked into core or the literal backends.
    let root = std::path::Path::new(env!("CARGO_MANIFEST_DIR"));
    let output = root.join("build/v8-word-parity-input");
    std::fs::create_dir_all(&output).unwrap();
    let source = "module v8_word_parity;
        record Acc{value:u32,items:List<u32>,}
        fn distribute(a:u32,b:u32,k:u32)->u32{return word_or(wrapping_shl(a,k),wrapping_shl(b,k));}
        fn rounded(a:u64,k:u32)->u64{return wrapping_shl(wrapping_shr(a,k),k);}
        fn cancel(a:u64,b:u64,offset:u64)->Bool{return (a+offset)==(b+offset);}
        fn nested(c:Bool,a:u32,b:u32,z:u32)->u32{return choose(c,choose(c,a,b),z);}
        fn counted(a:u64,k:u32)->u64{return wrapping_shr(a,word_and(k,127));}
        fn fields(a:u32)->Bool{return (word_and(a,15)==3)&&(word_and(a,240)==32);}
        fn low_sum(a:u64,b:u64)->u32{return word_narrow_u64_to_u32(a+b);}
        fn converted(a:u64)->u64{return word_widen_u32_to_u64(word_narrow_u64_to_u32(a));}
        fn expanded(seed:u32,extra:u32)->u32{return repeat(4,seed,fn(i)=>fn(a)=>a+extra+i);}
        fn expanded_list(seed:List<u32>)->List<u32>{return repeat(2,seed,fn(i)=>fn(a)=>a.concat([i]));}
        fn expanded_record(seed:Acc,extra:u32)->Acc{return repeat(4,seed,fn(i)=>fn(a)=>Acc{value:a.value+extra+i,items:a.items.concat([i])});}
        fn expanded_nested(xs:List<u32>,seed:u32)->List<u32>{return xs.map(fn(extra)=>repeat(2,seed,fn(i)=>fn(a)=>a+extra+i));}
        fn shared_scalar(x:u64)->u64{return (x*7)+(x*7);}
        fn shared_scan(xs:List<u32>)->u32{return foldl(xs,0,fn(x)=>fn(a)=>a+x*x)+foldl(xs,0,fn(x)=>fn(a)=>a+x*x);}
        fn shared_nested(xs:List<u32>,outer:u32)->List<u32>{return xs.map(fn(x)=>(x+outer)*(x+outer));}
        fn shared_float(x:f32)->f32{return (x*2.0)+(x*2.0);}
        fn shared_guarded(c:Bool,x:u64)->u64{return choose(c,(x*7)+(x*7),0);}
        fn rotate32(a:u32,k:u32)->u32{return word_or(wrapping_shl(a,k),wrapping_shr(a,32-k));}
        fn rotate64(a:u64,k:u32)->u64{return word_or(wrapping_shr(a,k),wrapping_shl(a,64-k));}
        fn xor32(a:u32,k:u32)->u32{return choose(word_and(k,31)!=0,word_xor(wrapping_shl(a,k),wrapping_shr(a,32-k)),0);}
        fn xor64(a:u64,k:u32)->u64{return choose(word_and(k,63)!=0,word_xor(wrapping_shr(a,k),wrapping_shl(a,64-k)),0);}
        fn combined32(a:u32,k:u32,j:u32)->u32{return choose(word_and(k,31)+word_and(j,31)<32,wrapping_shl(wrapping_shl(a,k),j),0);}
        fn widened(a:u32,b:u32)->Bool{return word_widen_u32_to_u64(a)<word_widen_u32_to_u64(b);}
        fn low_product(a:u64,b:u64)->u32{return word_narrow_u64_to_u32(a*b);}";
    let input = CheckedModule::from_source(syntax::parse(source).unwrap()).unwrap();
    std::fs::write(output.join("source.ink"), source).unwrap();
    let result = Command::new("python3")
        .args(["-c", r#"
import json,sys,subprocess
from producers.frozen_laws import read
from pathlib import Path
from ink_knowledge import Store,canonical,identity,semantic_entry
from ink_planner.semantic_search import match,positions
compiler,d=Path(sys.argv[1]),Path(sys.argv[2])
for args in [('emit-core',d/'source.ink','-o',d/'core.json'),('emit-semantic',d/'core.json','--core','-o',d/'semantic.json')]:
    subprocess.run([str(compiler),*map(str,args)],check=True,capture_output=True)
subject=json.loads((d/'semantic.json').read_bytes())
rows={r['name']:r['law'] for r in read(Path('knowledge/producers/data/v8-word-laws'))}
requests={'distribute':'u32/shift_left_or','rounded':'u64/right_left_mask','cancel':'u64/equal_same_add','nested':'u32/nested_true_branch','counted':'u64/shift_right_count_mask','fields':'u32/bitfield_checks','low_sum':'conversion/narrow_add','converted':'conversion/widen_narrow_mask','rotate32':'u32/rotate_left_or','rotate64':'u64/rotate_right_or','widened':'conversion/widen_lt','low_product':'conversion/narrow_mul'}
objects=[];applications=[]
for function,name in requests.items():
    law=rows[name];arguments={}
    assert match(law['from'],subject['functions'][function],law['params'],arguments),(function,subject['functions'][function])
    obj=semantic_entry(law);objects.append(obj)
    applications.append(dict(function=function,path=[],law=identity(obj),arguments=arguments,premises=['Normalize']*len(law['conditions'])))
for function,name in {'xor32':'u32/rotate_left_xor','xor64':'u64/rotate_right_xor','combined32':'u32/shift_left_combine'}.items():
    law=rows[name];obj=semantic_entry(law);objects.append(obj);found=0
    for path,body in positions(subject['functions'][function]):
        arguments={}
        if match(law['from'],body,law['params'],arguments):
            applications.append(dict(function=function,path=list(path),law=identity(obj),arguments=arguments,premises=['Normalize']*len(law['conditions'])))
            found+=1
    assert found==1,(function,found)
from producers.literal_loop_laws import specialize
from producers.definition_context28 import bind
model=json.loads((d/'core.json').read_bytes())
for label,raw in specialize(subject,model):
    law=bind(raw,model,subject)
    obj=semantic_entry(law);objects.append(obj)
    for function,body in subject['functions'].items():
        for path,t in positions(body):
            arguments={}
            if match(law['from'],t,law['params'],arguments):
                applications.append(dict(function=function,path=list(path),law=identity(obj),arguments=arguments,premises=[]))
from producers.common_subexpressions import specialize as sharing
shared_subject=dict(subject,functions={n:b for n,b in subject['functions'].items() if n.startswith('shared_')})
shared_functions=set()
for label,raw in sharing(shared_subject,model):
    function=label.split('/')[1]
    if function in shared_functions:continue
    shared_functions.add(function)
    law=bind(raw,model,subject);obj=semantic_entry(law);objects.append(obj)
    applications.append(dict(function=function,path=[],law=identity(obj),arguments={n:dict(sort=s,node={'Free':n})for n,s in law['params'].items()},premises=[]))
assert shared_functions=={'shared_scalar','shared_scan','shared_nested','shared_float','shared_guarded'}
store=Store.publish(d/'knowledge',objects)
packet=dict(schema=1,semantics='ink-evidence-v1',input_core_sha256=subject['input_core_sha256'],knowledge=store.bundle([identity(o) for o in objects]),applications=applications)
(d/'selection.json').write_bytes(canonical(packet))
"#])
        .arg(env!("CARGO_BIN_EXE_ink"))
        .arg(&output)
        .env("PYTHONPATH", std::env::join_paths([root.join("knowledge"), root.join("planner")]).unwrap())
        .current_dir(root)
        .output().unwrap();
    assert!(result.status.success(), "{}", String::from_utf8_lossy(&result.stderr));
    let packet: optimisation::Package = serde_json::from_slice(&std::fs::read(output.join("selection.json")).unwrap()).unwrap();
    let selected = optimisation::check(&input, &packet).unwrap();
    let snapshot = Runtime::new_selected(&selected).unwrap().checkpoint_portable().unwrap();
    let mut steps=vec![];
    let mut expected=vec![];
    let mut push = |function: &str, args: Vec<verified_language::eval::Value>| {
        let value=verified_language::eval::call(input.program(), function, args.clone(), &mut 1_000_000).unwrap();
        steps.push(json!({"pure":function,"args":args.iter().map(|v|v.json()).collect::<Vec<_>>(),"cpu_only":true}));
        expected.push(json!({"reply":{"value":value.json()},"snapshot":snapshot}));
    };
    use verified_language::eval::Value::{U32,U64,F32,Bool,List,Record};
    for k in [0,1,7,31,32,33,63,64,65,127,u32::MAX] {
        for (a,b) in [(0,0),(1,32),(u32::MAX,u32::MAX-1)] {
            push("distribute",vec![U32(a),U32(b),U32(k)]);
            push("rounded",vec![U64((a as u64)<<32 | b as u64),U32(k)]);
            push("counted",vec![U64(u64::MAX-a as u64),U32(k)]);
            push("rotate32",vec![U32(a),U32(k)]);
            push("rotate64",vec![U64(u64::MAX-a as u64),U32(k)]);
            push("xor32",vec![U32(a),U32(k)]);
            push("xor64",vec![U64(u64::MAX-a as u64),U32(k)]);
            push("combined32",vec![U32(a),U32(k),U32(7)]);
        }
    }
    for offset in [0,1,u64::MAX] {
        for (a,b) in [(0,0),(u64::MAX,0),(u64::MAX,u64::MAX)] {
            push("cancel",vec![U64(a),U64(b),U64(offset)]);
        }
    }
    for c in [false,true] {
        push("nested",vec![Bool(c),U32(u32::MAX),U32(0),U32(7)]);
    }
    for a in [0,3,32,35,51,255,u32::MAX] {push("fields",vec![U32(a)]);}
    for (a,b) in [(0,0),(1,u64::MAX),(u64::MAX,u64::MAX),(1<<32,(1<<32)+7)] {
        push("low_sum",vec![U64(a),U64(b)]);
        push("low_product",vec![U64(a),U64(b)]);
        push("widened",vec![U32(a as u32),U32(b as u32)]);
        push("converted",vec![U64(a)]);
        push("expanded",vec![U32(a as u32),U32(b as u32)]);
        push("expanded_list",vec![List(vec![U32(a as u32)])]);
        push("expanded_record",vec![Record("Acc".into(),BTreeMap::from([("value".into(),U32(a as u32)),("items".into(),List(vec![U32(7)]))])),U32(b as u32)]);
        push("expanded_nested",vec![List(vec![U32(0),U32(1),U32(u32::MAX)]),U32(a as u32)]);
    }
    for x in [0,1,u64::MAX] {
        push("shared_scalar",vec![U64(x)]);
        for c in [false,true] {push("shared_guarded",vec![Bool(c),U64(x)]);}
    }
    for xs in [vec![],vec![U32(0),U32(1),U32(u32::MAX)]] {
        push("shared_scan",vec![List(xs.clone())]);
        push("shared_nested",vec![List(xs),U32(u32::MAX)]);
    }
    for bits in [0,0x8000_0000,0x3fa0_0000,0x7f80_0000,0xff80_0000,0x7fc0_1234] {
        push("shared_float",vec![F32(bits)]);
    }
    parity::conformance_selected("v8-word-parity", &selected, source, steps, expected);
}

#[path = "support/parameter_cache.rs"]
mod parameter_cache;
