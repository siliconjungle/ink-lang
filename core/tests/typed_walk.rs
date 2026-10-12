use ink_core::{analysis, core::CheckedModule, syntax};
use std::collections::BTreeSet;
#[test]
fn fixed_callbacks_bind_rows_accumulators_and_shadow_names() {
    let source = r#"module Typed;
record Row{key:u32,values:List<u32>,} record Acc{key:u32,}
pub fn folded(xs:List<Row>)->Acc{return foldl(xs,Acc{key:0},fn(row)=>fn(acc)=>Acc{key:row.key+acc.key});}
pub fn until(xs:List<Row>)->u32{return fold_until(xs,0,fn(row)=>fn(acc)=>row.key>acc,fn(row)=>fn(acc)=>row.key+acc);}
pub fn indexed(xs:List<Row>)->List<u32>{return xs.map_indexed(fn(i)=>fn(row)=>row.key+i);}
pub fn zipped(xs:List<Row>,ys:List<Acc>)->List<u32>{return xs.zip(ys,fn(row)=>fn(acc)=>row.key+acc.key);}
pub fn shadow(xs:List<Row>,row:Row)->u32{return foldr(xs,row.key,fn(row)=>fn(acc)=>row.key+acc);}
"#;
    let m = CheckedModule::from_source(syntax::parse(source).unwrap()).unwrap();
    for f in &m.program().functions {
        let mut fields = BTreeSet::new();
        analysis::typed_walk(m.program(), f, |e, env| {
            if let syntax::Expr::Field(_, name) = e {
                assert!(
                    ink_core::check::infer(e, env, m.program()).is_ok(),
                    "{} {e:?}",
                    f.name
                );
                fields.insert(name.clone());
            }
        })
        .unwrap();
        assert_eq!(fields, BTreeSet::from(["key".to_owned()]));
    }
}
