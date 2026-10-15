//! Source-derived execution capabilities. Proposals select machinery; the
//! checker regenerates all structural facts from the checked action tree.
//! No name, profile or source hash supplies algebraic replacement authority.
use crate::{action_ir::{CheckedActions, Body, Instruction, Kind, NodeId}, core::CheckedModule, syntax::*, LangResult};
use serde::{Deserialize, Serialize};
use std::collections::{BTreeSet,BTreeMap};
pub const SEMANTICS: &str = "ink-state-protocol-v1";
#[derive(Clone, Copy, Debug, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all="snake_case")]
pub enum Execution { Preflight, Transactional }
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ActionChoice {pub action:String, pub execution:Execution}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ColumnPrefix {
    pub table:String, pub capacity:u32, pub codec:crate::column_codec::Layout,
    /// Exact integer compression: each cell falls back to BigInt above 2^53-1.
    #[serde(default)] pub exact_numbers:bool,
    #[serde(default)] pub guards:BTreeMap<String,crate::bitproof::Certificate>,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Plan {
    pub schema:u32, pub semantics:String, pub input_core_sha256:String,
    #[serde(default)] pub actions:Vec<ActionChoice>,
    #[serde(default)] pub direct_reads:Vec<String>,
    #[serde(default)] pub output_publication:bool,
    #[serde(default)] pub snapshot_rows:bool,
    /// Trusted ordered event retention layout; no event is omitted.
    #[serde(default)] pub event_columns:bool,
    /// Retain contiguous commit metadata as a base and exact offsets, with
    /// literal commit columns after any discontinuity or repeated commit.
    #[serde(default)] pub event_runs:bool,
    #[serde(default)] pub inline_maintenance:bool,
    /// Exact Number commit metadata, widening before the 53-bit bound.
    #[serde(default,skip_serializing_if="Option::is_none")] pub compact_commits:Option<crate::bitproof::Certificate>,
    #[serde(default)] pub columns:Vec<ColumnPrefix>,
}
#[derive(Clone, Debug)]
pub struct CheckedProtocol {plan:Plan}
impl CheckedProtocol {pub fn plan(&self)->&Plan {&self.plan}}
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Capability {pub action:String, pub preflight:bool, pub direct_keep:Option<usize>}
fn scalar(p:&Program,t:&Type)->bool {
    matches!(t,Type::U64|Type::U32|Type::I32|Type::Bool|Type::Unit|Type::String|Type::Int|Type::F32)
        || matches!(t,Type::Named(n) if p.ids.contains(n)||p.enums.contains_key(n))
}
/// Bounded literal actions can stage a single write and event in lexical locals.
/// Reads after a possible write are conservatively excluded. The source return
/// or exception is evaluated before committing; fallibility need not be guessed.
fn preflight(b:&Body)->bool {
    struct Walk {writes:usize, events:usize, work:usize}
    impl Walk {
        fn expr(&mut self,b:&Body,id:NodeId,depth:usize)->bool {
            self.work+=1; if self.work>100_000||depth>128{return false;}
            let Some(n)=b.nodes.get(id)else{return false;};
            match &n.kind {
                Kind::Number(_)|Kind::Float(_)|Kind::Bool(_)|Kind::String(_)|Kind::Unit|Kind::None|Kind::Local(_)|Kind::Enum{..}=>true,
                Kind::Keep(_)|Kind::State(_)|Kind::PureCall{..}|Kind::QueryCall{..}|Kind::ChangeCall{..}=>false,
                Kind::Neg{value}|Kind::Try{value}|Kind::Field{receiver:value,..}|Kind::VectorField{receiver:value,..}=>self.expr(b,*value,depth+1),
                Kind::Record{fields,..}=>fields.iter().all(|(_,i)|self.expr(b,*i,depth+1)),
                Kind::Binary{op,left,right}=>["+","-","*","==","!=","<",">","<=",">="].contains(&op.as_str())&&self.expr(b,*left,depth+1)&&self.expr(b,*right,depth+1),
                Kind::And{left,right}|Kind::Or{left,right}=>self.expr(b,*left,depth+1)&&self.expr(b,*right,depth+1),
                Kind::Builtin{name,arguments}=>["Ok","Err","Some","choose","checked_add","checked_sub","checked_mul","vec2","vec3","vec4","Int"].contains(&name.as_str())&&arguments.iter().all(|i|self.expr(b,*i,depth+1)),
                Kind::Table{method,arguments,..}=>{
                    if !arguments.iter().all(|i|self.expr(b,*i,depth+1)){return false;}
                    if ["put","insert","replace","remove"].contains(&method.as_str()) {self.writes+=1;self.writes<=1}
                    else {self.writes==0&&["get","contains"].contains(&method.as_str())}
                }
                Kind::Bind{value,body,..}=>self.expr(b,*value,depth+1)&&self.expr(b,*body,depth+1),
                // Callbacks are finite Option/Result branches; collection loops
                // and arbitrary pure calls retain their ordinary budget protocol.
                Kind::Lambda{body,..}=>self.expr(b,*body,depth+1),
                Kind::Method{receiver,method,arguments}=>["unwrap_or","ok_or","fold","map","map_err"].contains(&method.as_str())
                    && matches!(b.nodes[*receiver].ty,crate::action_ir::ExprType::Value(Type::Option(_)|Type::Result(..)))
                    &&self.expr(b,*receiver,depth+1)&&arguments.iter().all(|i|self.expr(b,*i,depth+1)),
            }
        }
        fn block(&mut self,b:&Body,code:&[Instruction])->bool {
            for i in code {
                match i {
                    Instruction::Let{value,..}|Instruction::Return(value)|Instruction::Eval(value)=>if !self.expr(b,*value,0){return false;},
                    Instruction::Emit{value,..}=>{self.events+=1;if self.events>1||!self.expr(b,*value,0){return false;}},
                    Instruction::If{condition,on_true,on_false}=>{
                        if !self.expr(b,*condition,0){return false;}
                        let (writes,events)=(self.writes,self.events);
                        if !self.block(b,on_true){return false;}
                        let (aw,ae)=(self.writes,self.events);
                        self.writes=writes;self.events=events;
                        if !self.block(b,on_false){return false;}
                        self.writes=self.writes.max(aw);self.events=self.events.max(ae);
                    }
                }
            }
            true
        }
    }
    Walk{writes:0,events:0,work:0}.block(b,&b.instructions)
}
pub fn capabilities(module:&CheckedModule)->LangResult<Vec<Capability>> {
    let p=module.program();let ir=CheckedActions::elaborate(module)?;
    p.actions.iter().enumerate().map(|(i,a)|{
        let b=ir.action(i).ok_or("missing action")?;
        let direct_keep=if a.kind==ActionKind::Query&&a.params.is_empty()&&scalar(p,&a.result)&&!p.contracts.precondition_checks.contains_key(&a.name) {
            match b.instructions.as_slice(){[Instruction::Return(id)]=>match b.nodes[*id].kind{Kind::Keep(k)=>Some(k),_=>None},_=>None}
        }else{None};
        Ok(Capability{action:a.name.clone(),preflight:a.kind==ActionKind::Change&&!p.contracts.precondition_checks.contains_key(&a.name)&&preflight(b),direct_keep})
    }).collect()
}
pub fn check_source(module:&CheckedModule)->LangResult<()> {
    if module.program().contracts.action_protocols.is_empty(){return Ok(());}
    let facts=capabilities(module)?;
    for (name,execution) in &module.program().contracts.action_protocols {
        let fact=facts.iter().find(|f|&f.action==name).ok_or("protocol names an absent action")?;
        if module.program().actions.iter().find(|a|&a.name==name).unwrap().kind!=ActionKind::Change{return Err("execution protocol requires a change".into());}
        if *execution==Execution::Preflight&&!fact.preflight{return Err(format!("{name}: preflight protocol requires bounded staging without reads after writes"));}
    }
    Ok(())
}
pub fn check(module:&CheckedModule,plan:&Plan,views:Option<&crate::maintained::CheckedViews>)->LangResult<CheckedProtocol>{
    if plan.schema!=1||plan.semantics!=SEMANTICS||plan.input_core_sha256!=module.identity()?{return Err("state protocol source/semantics mismatch".into());}
    let facts=capabilities(module)?;let p=module.program();let mut seen=BTreeSet::new();
    if plan.inline_maintenance&&views.is_none(){return Err("inline maintenance requires checked views".into());}
    if let Some(guard)=&plan.compact_commits {
        let (params,hyp,goal)=crate::column_codec::guarded_word_goal(53)?;
        let problem=crate::logic::Context::default().bitvector_problem(&params,&hyp,&goal.from,&goal.to)?;
        crate::bitproof::verify(&problem,guard)?;
    }
    if plan.event_columns&&p.events.is_empty(){return Err("event columns require source events".into());}
    if plan.event_runs&&!plan.event_columns{return Err("event runs require event columns".into());}
    for c in &plan.actions {
        if !seen.insert(&c.action){return Err("duplicate protocol action".into());}
        let f=facts.iter().find(|f|f.action==c.action).ok_or("protocol action missing")?;
        if p.actions.iter().find(|a|a.name==c.action).unwrap().kind!=ActionKind::Change{return Err("protocol action must be a change".into());}
        if p.contracts.action_protocols.get(&c.action).is_some_and(|e|*e!=c.execution){return Err("protocol choice conflicts with source declaration".into());}
        if c.execution==Execution::Preflight&&(!f.preflight||p.contracts.action_protocols.get(&c.action)==Some(&Execution::Transactional)){return Err("preflight capability is not established".into());}
    }
    let mut seen=BTreeSet::new();
    for name in &plan.direct_reads {
        if !seen.insert(name){return Err("duplicate direct read".into());}
        let k=facts.iter().find(|f|&f.action==name).and_then(|f|f.direct_keep).ok_or("direct read capability missing")?;
        if !views.is_some_and(|v|v.package().views.iter().any(|v|v.keep==p.keeps[k].name&&v.group.is_none())){return Err("direct read requires a checked maintained value".into());}
    }
    let mut seen=BTreeSet::new();
    for c in &plan.columns {
        if !seen.insert(&c.table)||c.capacity==0||c.capacity>1_048_576{return Err("invalid column prefix capacity or duplicate".into());}
        let root=p.states.iter().find(|s|s.name==c.table).ok_or("column table missing")?;
        let Type::Table(key,row)=&root.ty else{return Err("column table type".into());};
        if !matches!(**key,Type::U64|Type::U32)||**row!=Type::Named(c.codec.record.clone()) {return Err("column prefix source shape mismatch".into());}
        let fields=p.records.get(&c.codec.record).ok_or("column record missing")?;
        if !fields.iter().all(|(_,t)|matches!(t,Type::U64|Type::U32|Type::I32|Type::Bool|Type::F32)){return Err("column prefix requires fixed scalar lanes".into());}
        if !c.codec.packing.is_empty(){return Err("column prefix codec cannot select physical packing".into());}
        for (field,guard) in &c.guards {
            if !c.exact_numbers||!fields.iter().any(|(n,t)|n==field&&*t==Type::U64){return Err("exact guard requires a U64 lane".into());}
            let (params,hyp,goal)=crate::column_codec::guarded_word_goal(53)?;
            let problem=crate::logic::Context::default().bitvector_problem(&params,&hyp,&goal.from,&goal.to)?;
            crate::bitproof::verify(&problem,guard)?;
        }
        if c.exact_numbers&&fields.iter().any(|(n,t)|*t==Type::U64&&!c.guards.contains_key(n)){return Err("exact number lanes require a checked 53-bit guard certificate".into());}
        crate::column_codec::check(p,&c.codec)?;
    }
    Ok(CheckedProtocol{plan:plan.clone()})
}

/// Explicit source protocol operations for untrusted offline scheduling/costing.
/// These annotations describe the literal controller, never grant permission to
/// erase a value operation. Actual selections replay the source-derived facts.
#[derive(Clone,Debug,Serialize)]
pub struct ValueOperation {
    pub node:usize, pub allocation:&'static str, pub failure:&'static str,
    pub read_root:Option<usize>,pub write_root:Option<usize>,pub keep:Option<usize>,
}
#[derive(Clone,Debug,Serialize)]
pub struct ActionGraph {
    pub action:String,pub values:Vec<ValueOperation>,pub control:Vec<Instruction>,
    pub ingress:Vec<Type>,pub result:Type,pub protocol:Vec<&'static str>,
}
#[derive(Clone,Debug,Serialize)]
pub struct Graph {pub semantics:&'static str,pub source:String,pub actions:Vec<ActionGraph>}
pub fn graph(module:&CheckedModule)->LangResult<Graph>{
    let ir=CheckedActions::elaborate(module)?;
    let actions=module.program().actions.iter().enumerate().map(|(i,a)|{
        let body=ir.action(i).ok_or("missing action graph")?;
        let values=body.nodes.iter().enumerate().map(|(node,n)|{
            let allocation=match &n.kind {
                Kind::Record{..}=>"record",
                Kind::Builtin{name,..} if ["Some","Ok","Err","vec2","vec3","vec4","list"].contains(&name.as_str())=>"constructor",
                Kind::Table{method,..} if ["get","remove"].contains(&method.as_str())=>"option",
                Kind::Method{..}|Kind::PureCall{..}|Kind::QueryCall{..}|Kind::ChangeCall{..}=>"callee-dependent",
                _=>"none",
            };
            let failure=match &n.kind{
                Kind::Try{..}|Kind::ChangeCall{..}=>"source-error",
                Kind::Table{method,..} if ["insert","replace"].contains(&method.as_str())=>"membership",
                Kind::PureCall{..}|Kind::QueryCall{..}|Kind::Method{..}=>"callee-budget-or-error",
                _=>"none",
            };
            let read_root=match &n.kind{Kind::Table{root,..}=>Some(*root),_=>None};
            let write_root=match &n.kind{Kind::Table{root,method,..}if ["put","insert","replace","remove","put_many","remove_many"].contains(&method.as_str())=>Some(*root),_=>None};
            let keep=match n.kind{Kind::Keep(k)=>Some(k),_=>None};
            ValueOperation{node,allocation,failure,read_root,write_root,keep}
        }).collect();
        Ok(ActionGraph{action:a.name.clone(),values,control:body.instructions.clone(),ingress:a.params.iter().map(|(_,t)|t.clone()).collect(),result:a.result.clone(),protocol:if a.kind==ActionKind::Change{vec!["owned-ingress","busy-boundary","budget","precondition","stage-or-journal","source-result","owned-result","version-check","maintained-updates","commit-cells","commit-events","commit-version","publish-outputs"]}else{vec!["owned-ingress","busy-boundary","budget","precondition","evaluate-query","owned-result"]}})
    }).collect::<LangResult<_>>()?;
    Ok(Graph{semantics:"ink-state-protocol-ir-v1",source:module.identity()?,actions})
}
