//! Typed word/Boolean source equalities connected to the existing RUP checker.
//! This reconstructs fixed primitive meanings only. It contains no solver or
//! rewrite patterns; unsupported carriers, calls and binders fail closed.
use crate::{bitproof, core::{Program, Type}, laws::Equation, logic,
    semantic::{self as s, Budget, Env, Node, Sort, Term}, LangResult};
use std::collections::{BTreeMap, BTreeSet};

fn binary(name: &str, a: logic::Term, b: logic::Term) -> logic::Term {
    logic::Term::Binary { op: name.into(), left: Box::new(a), right: Box::new(b) }
}
fn mask(t: &Type, value: logic::Term) -> logic::Term {
    if *t == Type::U32 { binary("&", value, logic::Term::U64(u32::MAX as u64)) } else { value }
}
fn copy(value: &logic::Term, budget: &mut Budget) -> LangResult<logic::Term> {
    // Nested bitwise definitions must not expand exponentially outside the
    // shared proof budget. Charge the complete image before allocating a copy.
    let mut pending = vec![value];
    while let Some(term) = pending.pop() {
        budget.step(0)?;
        match term {
            logic::Term::Binary { left, right, .. } => pending.extend([left.as_ref(), right.as_ref()]),
            logic::Term::If { condition, on_true, on_false } => pending.extend([condition.as_ref(), on_true.as_ref(), on_false.as_ref()]),
            _ => {}
        }
    }
    Ok(value.clone())
}
struct Image {
    names: BTreeMap<String, String>,
    params: BTreeMap<String, logic::Sort>,
}
impl Image {
    fn term(&mut self, value: &Term, budget: &mut Budget, depth: usize) -> LangResult<logic::Term> {
        budget.step(depth)?;
        let ty = match &value.sort {
            Sort::Value(t @ (Type::U32 | Type::U64 | Type::Bool)) => t,
            _ => return Err("word equality requires unsigned words or Bool".into()),
        };
        let result = match &value.node {
            Node::Free(name) => {
                // Canonical names retain sharing but permit uniform alpha
                // renaming when a premise is opened under a callback binder.
                let next = format!("word_input_{}", self.names.len());
                let canonical = self.names.entry(name.clone()).or_insert(next).clone();
                self.params.insert(canonical.clone(), if *ty == Type::Bool { logic::Sort::Bool } else { logic::Sort::U64 });
                logic::Term::Var(canonical)
            }
            Node::Word(n) => logic::Term::U64(*n),
            Node::Bool(v) => logic::Term::Bool(*v),
            Node::Op(name, args) if name == "call:choose" && args.len() == 3 => logic::Term::If {
                condition: Box::new(self.term(&args[0], budget, depth + 1)?),
                on_true: Box::new(self.term(&args[1], budget, depth + 1)?),
                on_false: Box::new(self.term(&args[2], budget, depth + 1)?),
            },
            Node::Op(name, args) if args.len() == 2 => {
                let a = self.term(&args[0], budget, depth + 1)?;
                let b = self.term(&args[1], budget, depth + 1)?;
                match name.as_str() {
                    "binary:+" | "binary:-" | "binary:*" | "binary:&" |
                    "binary:==" | "binary:!=" | "binary:<" | "binary:>" |
                    "binary:<=" | "binary:>=" | "binary:&&" | "binary:||" => binary(&name[7..], a, b),
                    "call:word_and" => binary("&", a, b),
                    // Fixed finite-word definitions, not discovered identities.
                    // Arithmetic is modulo the result width, including U32.
                    "call:word_or" => binary("-", binary("+", copy(&a, budget)?, copy(&b, budget)?), binary("&", a, b)),
                    "call:word_xor" => binary("-", binary("+", copy(&a, budget)?, copy(&b, budget)?),
                        binary("*", logic::Term::U64(2), binary("&", a, b))),
                    _ => return Err("unsupported word equality operation".into()),
                }
            }
            _ => return Err("word equality requires closed first-order scalar expressions".into()),
        };
        Ok(mask(ty, result))
    }
    fn equation(&mut self, eq: &Equation, budget: &mut Budget) -> LangResult<logic::Equation> {
        if eq.from.sort != eq.to.sort { return Err("word equality endpoint sort mismatch".into()); }
        Ok(logic::Equation { from: self.term(&eq.from, budget, 0)?, to: self.term(&eq.to, budget, 0)? })
    }
}

/// Reconstruct precisely the selected, already-established hypotheses and goal.
/// Every U32 input and intermediate wraps before its enclosing comparison.
pub fn problem(p: &Program, env: &Env, hypotheses: &[Equation], goal: &Equation,
    indices: &[usize], encoding: bitproof::Encoding, budget: &mut Budget) -> LangResult<bitproof::Problem> {
    if indices.len() > 64 || indices.iter().collect::<BTreeSet<_>>().len() != indices.len() {
        return Err("word equality hypothesis count or duplication".into());
    }
    let mut image = Image { names: BTreeMap::new(), params: BTreeMap::new() };
    let mut conditions = Vec::new();
    for index in indices {
        let eq = hypotheses.get(*index).ok_or("word equality hypothesis out of range")?;
        s::validate(&eq.from, env, p, budget)?;
        s::validate(&eq.to, env, p, budget)?;
        conditions.push(image.equation(eq, budget)?);
    }
    s::validate(&goal.from, env, p, budget)?;
    s::validate(&goal.to, env, p, budget)?;
    let goal = image.equation(goal, budget)?;
    bitproof::problem_with_encoding_and_work(&image.params, &conditions, &goal, encoding, &mut budget.remaining)
}

#[cfg(test)]
mod tests {
    use super::*;
    fn evaluate(t: &logic::Term, values: &[u64]) -> u64 {
        match t {
            logic::Term::U64(n) => *n,
            logic::Term::Var(n) => values[n.strip_prefix("word_input_").unwrap().parse::<usize>().unwrap()],
            logic::Term::Binary { op, left, right } => {
                let (a,b)=(evaluate(left,values),evaluate(right,values));
                match op.as_str(){"+"=>a.wrapping_add(b),"-"=>a.wrapping_sub(b),"*"=>a.wrapping_mul(b),"&"=>a&b,_=>panic!("unexpected word image")}
            }
            _ => panic!("unexpected word image"),
        }
    }
    #[test]
    fn reconstructed_words_agree_with_independent_native_bitwise_operations(){
        let mut values=vec![0,1,31,32,63,u32::MAX as u64,1u64<<31,1u64<<32,1u64<<63,u64::MAX];
        let mut seed=104729u64;
        for _ in 0..32{seed=seed.wrapping_mul(6364136223846793005).wrapping_add(1);values.push(seed);}
        for ty in [Type::U32,Type::U64] {
            let mask=if ty==Type::U32{u32::MAX as u64}else{u64::MAX};
            for name in ["call:word_or","call:word_xor","call:word_and","binary:+","binary:-","binary:*"]{
                let source=s::op(s::value(ty.clone()),name,vec![s::free(s::value(ty.clone()),"x"),s::free(s::value(ty.clone()),"y")]);
                let mut image=Image{names:BTreeMap::new(),params:BTreeMap::new()};
                let encoded=image.term(&source,&mut Budget::new(),0).unwrap();
                for a in &values {for b in &values {
                    let (x,y)=(a&mask,b&mask);
                    let expected=match name{"call:word_or"=>x|y,"call:word_xor"=>x^y,"call:word_and"=>x&y,"binary:+"=>x.wrapping_add(y),"binary:-"=>x.wrapping_sub(y),_=>x.wrapping_mul(y)}&mask;
                    assert_eq!(evaluate(&encoded,&[*a,*b]),expected,"{ty:?} {name} {a} {b}");
                }}
            }
        }
    }
    #[test]
    fn nested_bitwise_expansion_charges_generated_copies_before_allocation(){
        let u=s::value(Type::U32);let x=s::free(u.clone(),"x");
        let mut term=x.clone();for _ in 0..28{term=s::op(u.clone(),"call:word_or",vec![term,x.clone()]);}
        let mut image=Image{names:BTreeMap::new(),params:BTreeMap::new()};
        assert!(image.term(&term,&mut Budget{remaining:10_000},0).is_err());
    }
}
