//! Bounded literal emission of checked scalar definitions on native source rows.
//! This is a codec/call-lowering lane, not an algebraic rewrite recogniser.
//! Unsupported or recursive carriers retain the ordinary constructor lane.
use ink_core::{action_model::Projection, logic::{Declaration,Term}, syntax::{Program,Type}, LangResult};
use std::collections::{BTreeMap,BTreeSet};

#[derive(Clone)]
enum Value {
    Word(String,usize), // representative modulo 2^64, bounded intermediate width
    Bool(String),
    Fields(usize,Vec<Value>),
    Opaque, // unused source fields need no codec; inspecting them declines
}
impl Value {
    fn scalar(&self)->LangResult<String>{Ok(match self{
        Self::Word(s,64)|Self::Bool(s)=>s.clone(),
        Self::Word(s,_)=>format!("BigInt.asUintN(64,{s})"),
        _=>return Err("native definition result carrier".into()),
    })}
}
struct Emit<'a>{ds:&'a BTreeMap<String,Declaration>,active:BTreeSet<String>,next:usize,work:usize}
impl Emit<'_>{
    fn temp(&mut self,value:String,bits:Option<usize>,out:&mut String)->Value{
        let n=format!("n{}",self.next);self.next+=1;
        out.push_str(&format!("const {n}={value};"));
        bits.map(|b|Value::Word(n.clone(),b)).unwrap_or(Value::Bool(n))
    }
    fn expr(&mut self,t:&Term,env:&BTreeMap<String,Value>,out:&mut String,depth:usize)->LangResult<Value>{
        self.work+=1;
        if self.work>20000||depth>128{return Err("native definition emission bound".into());}
        Ok(match t{
            Term::Var(n)=>env.get(n).cloned().ok_or("native definition variable")?,
            Term::U64(n)=>Value::Word(format!("{n}n"),64),
            Term::Bool(b)=>Value::Bool(b.to_string()),
            Term::Construct{constructor,arguments,..}=>Value::Fields(*constructor,arguments.iter().map(|t|self.expr(t,env,out,depth+1)).collect::<LangResult<_>>()?),
            Term::Match{scrutinee,branches}=>{
                let Value::Fields(tag,fields)=self.expr(scrutinee,env,out,depth+1)? else{return Err("native definition dynamic carrier".into())};
                let b=branches.get(tag).ok_or("native definition constructor")?;
                if b.bindings.len()!=fields.len(){return Err("native definition fields".into());}
                let mut local=env.clone();local.extend(b.bindings.iter().cloned().zip(fields));
                self.expr(&b.body,&local,out,depth+1)?
            }
            Term::Call{function,arguments}=>{
                let args=arguments.iter().map(|t|self.expr(t,env,out,depth+1)).collect::<LangResult<Vec<_>>>()?;
                if !self.active.insert(function.clone()){return Err("native definition recursive call".into());}
                let Declaration::Function{params,body,..}=self.ds.get(function).ok_or("native definition call")? else{return Err("native definition function".into())};
                if params.len()!=args.len(){return Err("native definition arity".into());}
                let local=params.iter().map(|p|p.0.clone()).zip(args).collect();
                let v=self.expr(body,&local,out,depth+1)?;
                self.active.remove(function);v
            }
            Term::SelfCall(_)=>return Err("native definition recursion".into()),
            Term::If{condition,on_true,on_false}=>{
                let Value::Bool(c)=self.expr(condition,env,out,depth+1)? else{return Err("native definition condition".into())};
                let n=format!("n{}",self.next);self.next+=1;
                out.push_str(&format!("let {n};if({c}){{"));
                let a=self.expr(on_true,env,out,depth+1)?;out.push_str(&format!("{n}={};}}else{{",a.scalar()?));
                let b=self.expr(on_false,env,out,depth+1)?;out.push_str(&format!("{n}={};}}",b.scalar()?));
                match(a,b){(Value::Word(..),Value::Word(..))=>Value::Word(n,64),(Value::Bool(..),Value::Bool(..))=>Value::Bool(n),_=>return Err("native definition branch carrier".into())}
            }
            Term::Binary{op,left,right}=>{
                let a=self.expr(left,env,out,depth+1)?;let b=self.expr(right,env,out,depth+1)?;
                if ["+","-","*","&"].contains(&op.as_str()){
                    let(Value::Word(x,xb),Value::Word(y,yb))=(&a,&b) else{return Err("native definition word operands".into())};
                    let bits=if op=="*"{xb+yb}else if op=="&"{*xb.max(yb)}else{xb.max(yb)+1};
                    let mut value=format!("({x}){op}({y})");let mut width=bits;
                    // Addition/subtraction/multiplication/bitwise-and commute
                    // with reduction modulo 2^64. Only this arithmetic region
                    // carries noncanonical representatives. Bound their size.
                    if width>256{value=format!("BigInt.asUintN(64,{value})");width=64;}
                    self.temp(value,Some(width),out)
                }else{
                    let x=a.scalar()?;let y=b.scalar()?;
                    if op=="quot"||op=="rem"{self.temp(format!("({y}===0n?0n:({x}){}({y}))",if op=="quot"{"/"}else{"%"}),Some(64),out)}
                    else if ["==","!=","<",">","<=",">=","&&","||"].contains(&op.as_str()){
                        self.temp(format!("({x}){}({y})",match op.as_str(){"=="=>"===","!="=>"!==",x=>x}),None,out)
                    }else{return Err("native definition operator".into());}
                }
            }
        })
    }
}
fn input(p:&Program,projection:&Projection,elisions:&BTreeSet<String>,t:&Type,name:&str,depth:usize)->LangResult<Value>{
    if depth>64{return Err("native source codec depth".into());}
    Ok(match t{
        Type::U64=>Value::Word(name.into(),64),
        Type::U32=>Value::Word(format!("BigInt({name})"),64),
        Type::I32=>Value::Word(format!("BigInt.asUintN(32,BigInt({name}))"),64),
        Type::Bool=>Value::Bool(name.into()),
        Type::Unit=>Value::Fields(0,vec![]),
        Type::Named(n)if p.records.contains_key(n)&&!projection.recursive_records.contains_key(n)=>Value::Fields(0,p.records[n].iter().map(|(f,t)|input(p,projection,elisions,t,&if elisions.contains(n){name.to_string()}else{format!("({name})[{}]",super::quote(f))},depth+1)).collect::<LangResult<_>>()?),
        Type::Vector(t,n)=>Value::Fields(0,(0..*n).map(|i|input(p,projection,elisions,t,&format!("({name})[{i}]"),depth+1)).collect::<LangResult<_>>()?),
        _=>Value::Opaque,
    })
}
pub(crate) fn body(p:&Program,projection:&Projection,ds:&BTreeMap<String,Declaration>,elisions:&BTreeSet<String>,params:&[(&str,&Type)],body:&Term)->LangResult<(String,String)>{
    let mut emitter=Emit{ds,active:BTreeSet::new(),next:0,work:0};
    let mut out=String::new();
    let env=params.iter().map(|(n,t)|Ok((n.to_string(),input(p,projection,elisions,t,n,0)?))).collect::<LangResult<BTreeMap<_,_>>>()?;
    let value=emitter.expr(body,&env,&mut out,0)?;
    Ok((out,value.scalar()?))
}

#[cfg(test)]
pub(crate) fn function(p:&Program,projection:&Projection,ds:&BTreeMap<String,Declaration>,elisions:&BTreeSet<String>,params:&[(&str,&Type)],term:&Term)->LangResult<String>{
    let (out,value)=body(p,projection,ds,elisions,params,term)?;
    Ok(format!("({})=>{{{out}return {value};}}",params.iter().map(|p|p.0).collect::<Vec<_>>().join(",")))
}

#[cfg(test)]
mod tests {
    use super::*;
    use ink_core::{core::CheckedModule,syntax::parse};
    use std::{fs,process::Command};
    fn bin(op:&str,a:Term,b:Term)->Term{Term::Binary{op:op.into(),left:Box::new(a),right:Box::new(b)}}
    fn v(n:&str)->Term{Term::Var(n.into())}
    #[test]
    fn modular_regions_normalize_at_comparison_division_and_output_boundaries(){
        let module=CheckedModule::from_source(parse("module native_terms; record Row{value:u64,flag:Bool,note:String,} state Rows:Table<u64,Row> = Table.empty(); query empty()->u64{return 0;}").unwrap()).unwrap();
        let projection=Projection::derive(&module).unwrap();let ds=BTreeMap::new();
        let params=[("x",&Type::U64),("y",&Type::U64)];
        let difference=bin("-",v("x"),v("y"));
        let bodies=[bin("+",difference.clone(),v("y")),bin("quot",difference.clone(),v("y")),bin("<",difference.clone(),v("x")),bin("&",difference.clone(),bin("*",v("x"),v("y")))];
        let funcs=bodies.iter().map(|b|function(module.program(),&projection,&ds,&BTreeSet::new(),&params,b).unwrap()).collect::<Vec<_>>();
        let dir=std::env::temp_dir().join(format!("ink-native-definitions-{}",std::process::id()));fs::create_dir_all(&dir).unwrap();
        fs::write(dir.join("check.mjs"),format!(r#"import assert from 'node:assert/strict';
const fs=[{}],w=x=>BigInt.asUintN(64,x);
const values=[0n,1n,2n,1n<<63n,(1n<<64n)-1n];
let seed=13n;for(let i=0;i<200;i++){{seed=w(seed*6364136223846793005n+1n);values.push(seed);}}
for(const x of values)for(const y of values){{const d=w(x-y);const expected=[x,y===0n?0n:d/y,d<x,w(d&w(x*y))];fs.forEach((f,i)=>assert.equal(f(x,y),expected[i],String([x,y,i])));}}
"#,funcs.join(","))).unwrap();
        let out=Command::new("node").arg(dir.join("check.mjs")).output().unwrap();assert!(out.status.success(),"{}",String::from_utf8_lossy(&out.stderr));
        // Recursion and operators with different primitive meanings decline.
        assert!(function(module.program(),&projection,&ds,&BTreeSet::new(),&params,&Term::SelfCall(vec![v("x")])).is_err());
        assert!(function(module.program(),&projection,&ds,&BTreeSet::new(),&params,&bin("f32:+",v("x"),v("y"))).is_err());
        let row=Type::Named("Row".into());
        let selection=Term::Match{scrutinee:Box::new(v("row")),branches:vec![ink_core::logic::Branch{bindings:vec!["value".into(),"flag".into(),"note".into()],body:v("value")}]};
        assert!(function(module.program(),&projection,&ds,&BTreeSet::new(),&[("row",&row)],&selection).is_ok());
        let string=Term::Match{scrutinee:Box::new(v("row")),branches:vec![ink_core::logic::Branch{bindings:vec!["value".into(),"flag".into(),"note".into()],body:v("note")}]};
        assert!(function(module.program(),&projection,&ds,&BTreeSet::new(),&[("row",&row)],&string).is_err());
    }
}
