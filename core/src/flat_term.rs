//! Bounded flat transport for the existing semantic term tree. No proof rule.
use crate::{semantic::{self as s,Node,Sort,Term},LangResult};
use serde::{Deserialize,Serialize};

#[derive(Clone,Debug,Serialize,Deserialize)]
#[serde(deny_unknown_fields)]
pub struct FlatTerm{pub sort:Sort,pub node:FlatNode}
#[derive(Clone,Debug,Serialize,Deserialize)]
#[serde(deny_unknown_fields)]
pub enum FlatNode{
 Free(String),Bound(usize),Word(u64),Float(u32),Bool(bool),String(String),Unit,Nat(u64),
 Lambda(u32),Op(String,Vec<u32>),Nil,Cons(u32,u32),
}
#[derive(Clone,Debug,Serialize,Deserialize)]
#[serde(deny_unknown_fields)]
pub struct FlatTree{pub schema:u32,pub root:u32,pub nodes:Vec<FlatTerm>}
const LIMIT:usize=100_000;
impl FlatTree{
 pub fn encode(term:&Term)->LangResult<Self>{
  let mut pending=vec![(term,false,0usize)];let mut nodes=vec![];let mut roots=vec![];
  while let Some((term,exit,depth))=pending.pop(){
   if depth>128{return Err("flat term depth limit".into());}
   if !exit{
    pending.push((term,true,depth));for child in s::children(term).into_iter().rev(){pending.push((child,false,depth+1));}continue;
   }
   if nodes.len()>=LIMIT{return Err("flat term node limit".into());}
   let count=s::children(term).len();let children=roots.split_off(roots.len().checked_sub(count).ok_or("flat term encoding stack")?);
   let node=match &term.node{
    Node::Free(x)=>FlatNode::Free(x.clone()),Node::Bound(x)=>FlatNode::Bound(*x),Node::Word(x)=>FlatNode::Word(*x),Node::Float(x)=>FlatNode::Float(*x),Node::Bool(x)=>FlatNode::Bool(*x),Node::String(x)=>FlatNode::String(x.clone()),Node::Unit=>FlatNode::Unit,Node::Nat(x)=>FlatNode::Nat(*x),Node::Nil=>FlatNode::Nil,
    Node::Lambda(_)=>FlatNode::Lambda(children[0]),Node::Cons(..)=>FlatNode::Cons(children[0],children[1]),Node::Op(name,_)=>FlatNode::Op(name.clone(),children),
   };
   roots.push(nodes.len()as u32);nodes.push(FlatTerm{sort:term.sort.clone(),node});
  }
  if roots.len()!=1{return Err("flat term encoding root".into());}
  Ok(Self{schema:1,root:roots[0],nodes})
 }
 pub fn decode(&self)->LangResult<Term>{
  if self.schema!=1||self.nodes.is_empty()||self.nodes.len()>LIMIT||self.root as usize!=self.nodes.len()-1{return Err("flat term schema/root/node limit".into());}
  let mut terms:Vec<Option<Term>>=Vec::with_capacity(self.nodes.len());let mut depths:Vec<usize>=Vec::with_capacity(self.nodes.len());
  for (index,flat)in self.nodes.iter().enumerate(){
   let mut depth=0;
   let mut child=|slot:u32|->LangResult<Term>{
    let slot=slot as usize;if slot>=index{return Err("flat term forward reference or cycle".into());}
    depth=depth.max(depths[slot]+1);if depth>128{return Err("flat term depth limit".into());}
    terms[slot].take().ok_or_else(||"flat term child reused".into())
   };
   let node=match &flat.node{
    FlatNode::Free(x)=>Node::Free(x.clone()),FlatNode::Bound(x)=>Node::Bound(*x),FlatNode::Word(x)=>Node::Word(*x),FlatNode::Float(x)=>Node::Float(*x),FlatNode::Bool(x)=>Node::Bool(*x),FlatNode::String(x)=>Node::String(x.clone()),FlatNode::Unit=>Node::Unit,FlatNode::Nat(x)=>Node::Nat(*x),FlatNode::Nil=>Node::Nil,
    FlatNode::Lambda(x)=>Node::Lambda(Box::new(child(*x)?)),FlatNode::Cons(a,b)=>Node::Cons(Box::new(child(*a)?),Box::new(child(*b)?)),FlatNode::Op(name,args)=>Node::Op(name.clone(),args.iter().map(|&a|child(a)).collect::<LangResult<_>>()?),
   };
   terms.push(Some(Term{sort:flat.sort.clone(),node}));depths.push(depth);
  }
  let root=terms.last_mut().unwrap().take().unwrap();if terms.iter().any(Option::is_some){return Err("flat term unreachable node".into());}Ok(root)
 }
}
