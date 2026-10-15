use ink_core::{syntax::{parse,Expr},analysis::recursive_function_groups};
fn main(){
 let mut program=parse("module guard; fn leaf(x:u32)->u32{return x;}").unwrap();
 let template=program.functions[0].clone();
 // Direct structural API input: the source parser intentionally has a tighter
 // node budget. This guard exercises the graph work cap, not source admission.
 let count=852usize;let degree=126usize;
 program.functions=(0..count).map(|i|{
  let mut function=template.clone();function.name=format!("f{i}");
  let mut body=Expr::Var("x".into());
  for j in i.saturating_sub(degree)..i{body=Expr::Binary("+".into(),Box::new(body),Box::new(Expr::Call(format!("f{j}"),vec![Expr::Var("x".into())])));}
  function.body=body;function
 }).collect();
 let edges=(0..count).map(|i|i.min(degree)).sum::<usize>();assert!(edges+count>100000);
 for _ in 0..3{let result=recursive_function_groups(&program);assert!(result.as_ref().is_err_and(|error|error.contains("function graph")&&error.contains("limit")),"{result:?}");println!("{result:?}");}
}
