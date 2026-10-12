//! Finite multiset observations lower to ordinary, exact list computations.
//! Each input is evaluated once. Element identity uses structural list equality
//! (including floating-point bits); multiplicities use exact Int arithmetic.
use super::*;
fn v(n:&str)->Expr{Expr::Var(n.into())}
fn call(n:&str,x:Vec<Expr>)->Expr{Expr::Call(n.into(),x)}
fn bin(n:&str,a:Expr,b:Expr)->Expr{Expr::Binary(n.into(),Box::new(a),Box::new(b))}
fn lambda(n:&str,b:Expr)->Expr{Expr::Lambda(n.into(),Box::new(b))}
fn fold(xs:Expr,zero:Expr,x:&str,a:&str,body:Expr)->Expr{call("foldl",vec![xs,zero,lambda(x,lambda(a,body))])}
fn int(n:u64)->Expr{call("Int",vec![Expr::Num(n)])}
fn same(a:Expr,b:Expr)->Expr{bin("==",call("list",vec![a]),call("list",vec![b]))}
fn count(xs:Expr,item:Expr,prefix:&str)->Expr{
 let x=format!("{prefix}_item");let a=format!("{prefix}_count");
 fold(xs,int(0),&x,&a,bin("+",v(&a),call("choose",vec![same(v(&x),item),int(1),int(0)])))
}
fn bag(e:&Expr)->LangResult<Expr>{
 match e {
  Expr::Call(n,args) if n=="multiset"&&args.len()==1=>Ok(args[0].clone()),
  Expr::Call(n,args) if n=="singleton"&&args.len()==1=>Ok(call("list",args.clone())),
  Expr::Binary(n,a,b) if n=="+"=>Ok(Expr::Method(Box::new(bag(a)?),"concat".into(),vec![bag(b)?])),
  _=>Err("multiset expressions require multiset(list), singleton(value), or bag addition".into()),
 }
}
fn is_bag(e:&Expr)->bool{match e {Expr::Call(n,_)=>n=="multiset"||n=="singleton",Expr::Binary(n,a,b)=>n=="+"&&(is_bag(a)||is_bag(b)),_=>false}}
pub(crate) fn lower(e:&Expr,prefix:&str)->LangResult<Option<Expr>>{
 let left=format!("{prefix}_left");let right=format!("{prefix}_right");let item=format!("{prefix}_item");let acc=format!("{prefix}_all");
 if let Expr::Binary(op,a,b)=e {
  if (op=="=="||op=="!=")&&(is_bag(a)||is_bag(b)) {
   let predicate=bin("==",count(v(&left),v(&item),&format!("{prefix}_l")),count(v(&right),v(&item),&format!("{prefix}_r")));
   let union=Expr::Method(Box::new(v(&left)),"concat".into(),vec![v(&right)]);
   let mut body=fold(union,Expr::Bool(true),&item,&acc,bin("&&",v(&acc),predicate));
   if op=="!=" {body=bin("==",body,Expr::Bool(false));}
   return Ok(Some(Expr::Let(left,None,Box::new(bag(a)?),Box::new(Expr::Let(right,None,Box::new(bag(b)?),Box::new(body))))));
  }
 }
 if let Expr::Call(n,args)=e {
  if ["unique","unique_ids","unique_by"].contains(&n.as_str()) {
   if args.len()!=if n=="unique_by"{2}else{1}{return Err("uniqueness predicate arity".into());}
   let input=if n=="unique_ids"{Expr::Method(Box::new(args[0].clone()),"map".into(),vec![lambda(&item,Expr::Field(Box::new(v(&item)),"id".into()))])}else if n=="unique_by"{Expr::Method(Box::new(args[0].clone()),"map".into(),vec![args[1].clone()])}else{args[0].clone()};
   let body=fold(v(&left),Expr::Bool(true),&item,&acc,bin("&&",v(&acc),bin("==",count(v(&left),v(&item),&format!("{prefix}_unique")),int(1))));
   return Ok(Some(Expr::Let(left,None,Box::new(input),Box::new(body))));
  }
 }
 Ok(None)
}
