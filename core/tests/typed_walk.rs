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
fn consume(value:u32)->u32{return value;}
pub fn argument(xs:List<Row>)->u32{return consume(foldl(xs,0,fn(row)=>fn(acc)=>row.key+acc));}
pub fn arithmetic(xs:List<Row>)->u32{return foldl(xs,0,fn(row)=>fn(acc)=>row.key+acc)+1;}
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
        if f.name != "consume" {
            assert_eq!(fields, BTreeSet::from(["key".to_owned()]));
        }
    }
}

#[test]
fn variant_and_owned_callbacks_keep_exact_lexical_carriers() {
    let source=r#"module TypedVariants;
record Row{key:u32,values:List<u32>,}
fn option(x:Option<Row>)->Option<List<u32>>{return x.map(fn(row)=>row.values.map(fn(value)=>value+row.key));}
fn result(x:Result<Row,Row>)->Result<u32,Row>{return x.map(fn(row)=>row.key);}
fn error(x:Result<u32,Row>)->Result<u32,u32>{return x.map_err(fn(row)=>row.key);}
fn branches(x:Result<Row,Row>)->u32{return x.fold(fn(row)=>row.key,fn(row)=>row.key);}
fn missing(x:Option<Row>)->u32{return x.fold(fn(row)=>row.key,fn(unit)=>0);}
fn owned(xs:List<u32>)->List<u32>{return buffer(xs).map(fn(value)=>value+1).freeze();}
"#;
    let m=CheckedModule::from_source(syntax::parse(source).unwrap()).unwrap();
    for f in &m.program().functions {
        let mut observed=0;
        analysis::typed_walk(m.program(),f,|e,env|{
            if let syntax::Expr::Field(_,_) = e {
                assert!(ink_core::check::infer(e,env,m.program()).is_ok(),"{} {e:?}",f.name);
                observed+=1;
            }
            if let syntax::Expr::Var(name)=e {
                if name=="unit" {assert_eq!(env.get(name),Some(&syntax::Type::Unit));}
                if name=="value" {assert_eq!(env.get(name),Some(&syntax::Type::U32));}
            }
        }).unwrap();
        assert!(observed>0 || f.name=="owned");
    }
}
