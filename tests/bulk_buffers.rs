use ink_core::{
    core::{CheckedModule, BULK_BUFFER_SEMANTICS, VALUE_SEMANTICS},
    eval,
    syntax::parse,
};
use serde_json::{json, Value};
const SOURCE: &str = r#"module bulk;
fn fill(xs:List<u32>,s:u32,n:u32,v:u32)->List<u32>{return buffer(xs).fill_range(s,n,v).freeze();}
fn copy(xs:List<u32>,s:u32,d:u32,n:u32)->List<u32>{return buffer(xs).copy_within(s,d,n).freeze();}
fn split(xs:List<u32>)->List<u32>{return buffer(xs).split_at(3,fn(a)=>fn(b)=>a.fill_range(1,4294967295,9).append(b.copy_within(0,1,4294967295))).freeze();}
"#;
fn run(p: &ink_core::core::Program, n: &str, args: Value) -> Value {
    let f = p.functions.iter().find(|f| f.name == n).unwrap();
    let values = args
        .as_array()
        .unwrap()
        .iter()
        .zip(&f.params)
        .map(|(v, (_, t))| eval::Value::from_program_json(v, t, p).unwrap())
        .collect();
    eval::call(p, n, values, &mut 1000000).unwrap().json()
}
#[test]
fn clipped_ranges_match_snapshot_oracle_including_overlaps_and_overflow() {
    let m = CheckedModule::from_source(parse(SOURCE).unwrap()).unwrap();
    assert_eq!(m.semantics(), BULK_BUFFER_SEMANTICS);
    for len in 0..9 {
        let xs = (0..len).collect::<Vec<u32>>();
        for s in [0, 1, 4, 8, u32::MAX] {
            for d in [0, 1, 4, 8, u32::MAX] {
                for n in [0, 1, 4, 8, u32::MAX] {
                    let mut expected = xs.clone();
                    let s = (s as usize).min(xs.len());
                    let d = (d as usize).min(xs.len());
                    let k = (n as usize).min(xs.len() - s).min(xs.len() - d);
                    expected[d..d + k].copy_from_slice(&xs[s..s + k]);
                    assert_eq!(
                        run(m.program(), "copy", json!([xs, s as u32, d as u32, n])),
                        json!(expected)
                    );
                }
            }
        }
        for s in [0, 1, 4, 8, u32::MAX] {
            for n in [0, 1, 4, 8, u32::MAX] {
                let mut expected = xs.clone();
                let start = (s as usize).min(xs.len());
                let k = (n as usize).min(xs.len() - start);
                expected[start..start + k].fill(17);
                assert_eq!(
                    run(m.program(), "fill", json!([xs, s, n, 17])),
                    json!(expected)
                );
            }
        }
    }
    assert_eq!(
        run(m.program(), "split", json!([[0, 1, 2, 3, 4, 5, 6]])),
        json!([0, 9, 9, 3, 3, 4, 5])
    );
}
#[test]
fn replay_rejects_old_version_wrong_argument_types_and_reused_owners() {
    let m = CheckedModule::from_source(parse(SOURCE).unwrap()).unwrap();
    let mut wire: Value = serde_json::from_slice(&m.bytes().unwrap()).unwrap();
    wire["semantics"] = json!(VALUE_SEMANTICS);
    assert!(CheckedModule::from_bytes(&serde_json::to_vec(&wire).unwrap()).is_err());
    for body in [
        "let b=buffer(xs);let c=b.fill_range(0,1,7);return b.freeze();",
        "return buffer(xs).fill_range(0,true,7).freeze();",
        "return buffer(xs).copy_within(0,1,false).freeze();",
        "return buffer(xs).copy_within(0,1).freeze();",
    ] {
        let source = format!("module bad;fn f(xs:List<u32>)->List<u32>{{{body}}}");
        assert!(
            CheckedModule::from_source(parse(&source).unwrap()).is_err(),
            "{body}"
        );
    }
}
#[test]
fn bulk_work_cannot_bypass_reference_budget() {
    let p = CheckedModule::from_source(parse(SOURCE).unwrap())
        .unwrap()
        .into_program();
    let xs = eval::Value::List((0..200).map(eval::Value::U32).collect());
    assert!(eval::call(
        &p,
        "fill",
        vec![
            xs,
            eval::Value::U32(0),
            eval::Value::U32(200),
            eval::Value::U32(9)
        ],
        &mut 100
    )
    .unwrap_err()
    .contains("budget"));
}

#[test]
fn executable_range_values_agree_with_kernel_definitions(){
 use ink_core::{core::{Expr,Type},laws::{Catalogue,Proof},optimisation};
 let empty=Catalogue{schema:1,semantics:ink_core::laws::SEMANTICS.into(),roots:vec![],objects:Default::default()};
 for len in 0..5u32 {let xs=(0..len).collect::<Vec<_>>();
  for source in [0,1,4,u32::MAX]{for destination in [0,1,4,u32::MAX]{for count in [0,1,4,u32::MAX]{
   let src=(source as usize).min(xs.len());let dst=(destination as usize).min(xs.len());let n=(count as usize).min(xs.len()-src).min(xs.len()-dst);let mut want=xs.clone();want[dst..dst+n].copy_from_slice(&xs[src..src+n]);
   let source_text=format!("module correspondence;fn f()->List<u32>{{let xs:List<u32> = {:?};return buffer(xs).copy_within({source},{destination},{count}).freeze();}}",xs);
   let module=CheckedModule::from_source(parse(&source_text).unwrap()).unwrap();
   let expected=Expr::Call("list".into(),want.into_iter().map(|v|Expr::Num(v as u64)).collect());
   optimisation::equivalent(&module,&empty,&[],&Type::List(Box::new(Type::U32)),&module.program().functions[0].body,&expected,&Proof::Normalize).unwrap_or_else(|e|panic!("{source_text}: {e}"));
  }}}
  for start in [0,1,4,u32::MAX]{for count in [0,1,4,u32::MAX]{
   let at=(start as usize).min(xs.len());let n=(count as usize).min(xs.len()-at);let mut want=xs.clone();want[at..at+n].fill(17);
   let source_text=format!("module correspondence;fn f()->List<u32>{{let xs:List<u32> = {:?};return buffer(xs).fill_range({start},{count},17).freeze();}}",xs);
   let module=CheckedModule::from_source(parse(&source_text).unwrap()).unwrap();let expected=Expr::Call("list".into(),want.into_iter().map(|v|Expr::Num(v as u64)).collect());
   optimisation::equivalent(&module,&empty,&[],&Type::List(Box::new(Type::U32)),&module.program().functions[0].body,&expected,&Proof::Normalize).unwrap_or_else(|e|panic!("{source_text}: {e}"));
  }}
 }
}
