//! Conservative lexical final-use facts for literal ownership lowering.
//! No algebraic rewrite or workload-specific strategy is selected here.
use crate::core::Expr;
use std::collections::{BTreeMap, BTreeSet};

/// Sites refer to this borrowed expression tree only; they are never proof IDs.
#[derive(Default)]
pub struct LastUses {
    sites: BTreeSet<usize>,
    fields: BTreeSet<usize>,
}
impl LastUses {
    /// Reuse enclosing lexical facts only for a direct callback that executes
    /// at most once. Repeated or escaping closures must keep captures shared.
    pub fn inherit_once(&mut self, enclosing: &Self) {
        self.sites.extend(&enclosing.sites);
        self.fields.extend(&enclosing.fields);
    }
    pub fn contains(&self, expression: &Expr) -> bool {
        self.sites.contains(&(expression as *const Expr as usize))
    }
    /// A projection is final when no later read overlaps its record path.
    pub fn contains_field(&self, expression: &Expr) -> bool {
        self.fields.contains(&(expression as *const Expr as usize))
    }
}

/// Captured bindings remain shared inside callbacks, which may run repeatedly.
/// Direct callbacks of fixed synchronous loops end their loans on return.
/// Shadowing uses fresh binding identities.
/// Excessive depth/node count fails closed to ordinary copying.
pub fn analyse<'a>(body: &'a Expr, parameters: impl IntoIterator<Item = &'a str>) -> LastUses {
    struct Walk {
        next: usize,
        nodes: usize,
        finals: BTreeMap<usize, BTreeSet<usize>>,
        finished: Vec<(usize, BTreeSet<usize>)>,
        captured: BTreeSet<usize>,
    }
    fn visit(e: &Expr, env: &BTreeMap<String, usize>, w: &mut Walk, depth: usize) -> Option<()> {
        w.nodes += 1;
        if depth > 256 || w.nodes > 1_000_000 {
            return None;
        }
        match e {
            Expr::Var(n) => {
                if let Some(id) = env.get(n) {
                    w.finals.insert(*id, [e as *const Expr as usize].into_iter().collect());
                }
            }
            Expr::Let(n, _, a, b) => {
                visit(a, env, w, depth + 1)?;
                let mut local = env.clone();
                let id=w.next;
                local.insert(n.clone(), id);
                w.next += 1;
                visit(b, &local, w, depth + 1)?;
                if let Some(sites)=w.finals.remove(&id){w.finished.push((id,sites));}
            }
            Expr::Lambda(n, b) => {
                for name in crate::analysis::free_variables(e) {
                    if let Some(id) = env.get(&name) {
                        w.captured.insert(*id);
                    }
                }
                let mut local = env.clone();
                let id=w.next;
                local.insert(n.clone(), id);
                w.next += 1;
                visit(b, &local, w, depth + 1)?;
                if let Some(sites)=w.finals.remove(&id){w.finished.push((id,sites));}
            }
            Expr::Call(name,args) if finite_callbacks(name,args).is_some()=>{
                let before=w.captured.clone();
                for arg in args{visit(arg,env,w,depth+1)?;}
                // Callback body sites never move captures. Keep the loan
                // active across all sibling arguments until the call ends.
                for id in w.captured.difference(&before).copied().collect::<Vec<_>>(){w.finals.remove(&id);}
                w.captured=before;
            }
            Expr::Call(name,args) if name=="choose" && args.len()==3 => {
                visit(&args[0],env,w,depth+1)?;
                let before=w.finals.clone();
                visit(&args[1],env,w,depth+1)?;
                let yes=std::mem::replace(&mut w.finals,before.clone());
                visit(&args[2],env,w,depth+1)?;
                let no=std::mem::take(&mut w.finals);
                for id in yes.keys().chain(no.keys()).copied().collect::<BTreeSet<_>>() {
                    let prior=before.get(&id).cloned().unwrap_or_default();
                    let left=yes.get(&id).cloned().unwrap_or_default();
                    let right=no.get(&id).cloned().unwrap_or_default();
                    // A site before the branch executes on both paths. It is
                    // final only if neither path subsequently uses its binding.
                    // Sites inside an arm execute only on that arm's path.
                    let mut sites:BTreeSet<_>=left.union(&right).filter(|s|!prior.contains(s)).copied().collect();
                    sites.extend(prior.into_iter().filter(|s|left.contains(s)&&right.contains(s)));
                    if !sites.is_empty(){w.finals.insert(id,sites);}
                }
            }
            Expr::Method(receiver,name,args) if name=="fold" && args.len()==2
                && args.iter().all(|arg|matches!(arg,Expr::Lambda(..))) => {
                // Checked variant folds select exactly one direct branch.
                // Unlike an ordinary closure, its captures cannot escape or
                // be invoked repeatedly. Analyse each arm as a lexical branch.
                visit(receiver,env,w,depth+1)?;
                let before=w.finals.clone();
                let mut arms=Vec::new();
                for arg in args {
                    let Expr::Lambda(name,body)=arg else{unreachable!()};
                    let id=w.next;w.next+=1;let mut local=env.clone();local.insert(name.clone(),id);
                    visit(body,&local,w,depth+1)?;
                    if let Some(sites)=w.finals.remove(&id){w.finished.push((id,sites));}
                    arms.push(std::mem::replace(&mut w.finals,before.clone()));
                }
                w.finals.clear();let yes=&arms[0];let no=&arms[1];
                for id in yes.keys().chain(no.keys()).copied().collect::<BTreeSet<_>>() {
                    let prior=before.get(&id).cloned().unwrap_or_default();
                    let left=yes.get(&id).cloned().unwrap_or_default();let right=no.get(&id).cloned().unwrap_or_default();
                    let mut sites:BTreeSet<_>=left.union(&right).filter(|s|!prior.contains(s)).copied().collect();
                    sites.extend(prior.into_iter().filter(|s|left.contains(s)&&right.contains(s)));
                    if !sites.is_empty(){w.finals.insert(id,sites);}
                }
            }
            _ => {
                for child in crate::analysis::children(e) {
                    visit(child, env, w, depth + 1)?;
                }
            }
        }
        Some(())
    }
    let parameters:Vec<_>=parameters.into_iter().collect();
    let fields=analyse_fields(body,parameters.iter().copied());
    let env: BTreeMap<_, _> = parameters
        .into_iter()
        .enumerate()
        .map(|(i, n)| (n.to_owned(), i))
        .collect();
    let mut w = Walk {
        next: env.len(),
        nodes: 0,
        finals: BTreeMap::new(),
        finished: vec![],
        captured: BTreeSet::new(),
    };
    if visit(body, &env, &mut w, 0).is_none() {
        return LastUses::default();
    }
    let sites=w.finished.into_iter().chain(w.finals)
        .filter(|(id,_)|!w.captured.contains(id)).flat_map(|(_,sites)|sites).collect();
    LastUses { sites, fields }
}

// These fixed primitives execute their direct callbacks synchronously and do
// not return closures. Unknown calls/lambdas keep the conservative lifetime.
fn finite_callbacks(name:&str,args:&[Expr])->Option<&'static [usize]>{
    let slots:&'static [usize]=match (name,args.len()){
        ("repeat",3)|("foldl",3)|("foldr",3)|("parallel_map",3)=>&[2],
        ("repeat_until",4)|("fold_until",4)=>&[2,3],
        _=>return None,
    };
    slots.iter().all(|index|matches!(args[*index],Expr::Lambda(..))).then_some(slots)
}

// This analysis is type independent. Emission separately excludes borrowed
// roots and active loans. Overlapping whole-record/ancestor reads kill earlier
// field candidates; disjoint reads can leave independent final fields.
fn analyse_fields<'a>(body:&'a Expr,parameters:impl IntoIterator<Item=&'a str>)->BTreeSet<usize>{
    type Key=(usize,Vec<String>);
    struct Walk{next:usize,nodes:usize,finals:BTreeMap<Key,BTreeSet<usize>>,
        finished:Vec<(Key,BTreeSet<usize>)>,captured:BTreeSet<usize>}
    fn projection(e:&Expr,env:&BTreeMap<String,usize>)->Option<Key>{
        match e{
            Expr::Var(name)=>env.get(name).map(|id|(*id,vec![])),
            Expr::Field(parent,field)=>projection(parent,env).map(|(id,mut path)|{path.push(field.clone());(id,path)}),
            _=>None,
        }
    }
    fn visit(e:&Expr,env:&BTreeMap<String,usize>,w:&mut Walk,depth:usize)->Option<()>{
        w.nodes+=1;if depth>256 || w.nodes>1_000_000{return None;}
        if let Some(key)=projection(e,env){
            w.finals.retain(|(id,path),_|*id!=key.0 || !(path.starts_with(&key.1) || key.1.starts_with(path)));
            w.finals.insert(key,[e as *const Expr as usize].into_iter().collect());return Some(());
        }
        match e{
            Expr::Let(name,_,value,body)=>{
                visit(value,env,w,depth+1)?;
                let id=w.next;w.next+=1;let mut local=env.clone();local.insert(name.clone(),id);
                visit(body,&local,w,depth+1)?;
                let keys=w.finals.keys().filter(|(owner,_)|*owner==id).cloned().collect::<Vec<_>>();
                for key in keys{let sites=w.finals.remove(&key)?;w.finished.push((key,sites));}
            }
            Expr::Lambda(name,body)=>{
                for free in crate::analysis::free_variables(e){if let Some(id)=env.get(&free){w.captured.insert(*id);}}
                let id=w.next;w.next+=1;let mut local=env.clone();local.insert(name.clone(),id);
                visit(body,&local,w,depth+1)?;
                let keys=w.finals.keys().filter(|(owner,_)|*owner==id).cloned().collect::<Vec<_>>();
                for key in keys{let sites=w.finals.remove(&key)?;w.finished.push((key,sites));}
            }
            Expr::Call(name,args) if finite_callbacks(name,args).is_some()=>{
                let before=w.captured.clone();
                for arg in args{visit(arg,env,w,depth+1)?;}
                let captures=w.captured.difference(&before).copied().collect::<BTreeSet<_>>();
                w.finals.retain(|(id,_),_|!captures.contains(id));
                w.captured=before;
            }
            Expr::Call(name,args) if name=="choose" && args.len()==3=>{
                visit(&args[0],env,w,depth+1)?;let before=w.finals.clone();
                visit(&args[1],env,w,depth+1)?;let yes=std::mem::replace(&mut w.finals,before.clone());
                visit(&args[2],env,w,depth+1)?;let no=std::mem::take(&mut w.finals);
                for key in yes.keys().chain(no.keys()).cloned().collect::<BTreeSet<_>>(){
                    let prior=before.get(&key).cloned().unwrap_or_default();
                    let left=yes.get(&key).cloned().unwrap_or_default();let right=no.get(&key).cloned().unwrap_or_default();
                    let mut sites:BTreeSet<_>=left.union(&right).filter(|site|!prior.contains(site)).copied().collect();
                    sites.extend(prior.into_iter().filter(|site|left.contains(site)&&right.contains(site)));
                    if !sites.is_empty(){w.finals.insert(key,sites);}
                }
            }
            Expr::Method(receiver,name,args) if name=="fold" && args.len()==2
                && args.iter().all(|arg|matches!(arg,Expr::Lambda(..)))=>{
                visit(receiver,env,w,depth+1)?;let before=w.finals.clone();
                let mut arms=Vec::new();
                for arg in args{
                    let Expr::Lambda(name,body)=arg else{unreachable!()};
                    let id=w.next;w.next+=1;let mut local=env.clone();local.insert(name.clone(),id);
                    visit(body,&local,w,depth+1)?;
                    let keys=w.finals.keys().filter(|(owner,_)|*owner==id).cloned().collect::<Vec<_>>();
                    for key in keys{let sites=w.finals.remove(&key)?;w.finished.push((key,sites));}
                    arms.push(std::mem::replace(&mut w.finals,before.clone()));
                }
                w.finals.clear();let yes=&arms[0];let no=&arms[1];
                for key in yes.keys().chain(no.keys()).cloned().collect::<BTreeSet<_>>(){
                    let prior=before.get(&key).cloned().unwrap_or_default();
                    let left=yes.get(&key).cloned().unwrap_or_default();let right=no.get(&key).cloned().unwrap_or_default();
                    let mut sites:BTreeSet<_>=left.union(&right).filter(|site|!prior.contains(site)).copied().collect();
                    sites.extend(prior.into_iter().filter(|site|left.contains(site)&&right.contains(site)));
                    if !sites.is_empty(){w.finals.insert(key,sites);}
                }
            }
            // A short-circuit arm may be skipped. Treat it as an eager read
            // for conservative liveness; no execution-order change follows.
            _=>for child in crate::analysis::children(e){visit(child,env,w,depth+1)?;},
        }
        Some(())
    }
    let env:BTreeMap<_,_>=parameters.into_iter().enumerate().map(|(id,name)|(name.to_owned(),id)).collect();
    let mut w=Walk{next:env.len(),nodes:0,finals:BTreeMap::new(),finished:vec![],captured:BTreeSet::new()};
    if visit(body,&env,&mut w,0).is_none(){return BTreeSet::new();}
    w.finished.into_iter().chain(w.finals).filter(|((id,path),_)|!path.is_empty() && !w.captured.contains(id)).flat_map(|(_,sites)|sites).collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    fn v(n: &str) -> Expr {
        Expr::Var(n.into())
    }
    #[test]
    fn eager_arguments_and_shadowing() {
        let e = Expr::Let(
            "xs".into(),
            None,
            Box::new(v("xs")),
            Box::new(Expr::Call("pair".into(), vec![v("xs"), v("xs")])),
        );
        let facts = analyse(&e, ["xs"]);
        let Expr::Let(_, _, a, b) = &e else {
            unreachable!()
        };
        let Expr::Call(_, args) = b.as_ref() else {
            unreachable!()
        };
        assert!(facts.contains(a));
        assert!(!facts.contains(&args[0]));
        assert!(facts.contains(&args[1]));
    }
    #[test]
    fn repeated_callback_captures_never_move() {
        let e = Expr::Call(
            "pair".into(),
            vec![
                Expr::Lambda(
                    "i".into(),
                    Box::new(Expr::Call("get".into(), vec![v("xs"), v("i")])),
                ),
                v("xs"),
            ],
        );
        let facts = analyse(&e, ["xs"]);
        let Expr::Call(_, args) = &e else {
            unreachable!()
        };
        assert!(!facts.contains(&args[1]));
        let Expr::Lambda(_, b) = &args[0] else {
            unreachable!()
        };
        let Expr::Call(_, args) = b.as_ref() else {
            unreachable!()
        };
        assert!(!facts.contains(&args[0]));
        assert!(facts.contains(&args[1]));
    }
    #[test]
    fn mutually_exclusive_arms_can_each_have_a_final_use_and_depth_fails_closed() {
        let e = Expr::Call("choose".into(), vec![Expr::Bool(true), v("xs"), v("xs")]);
        let f = analyse(&e, ["xs"]);
        let Expr::Call(_, a) = &e else { unreachable!() };
        assert!(f.contains(&a[1]));
        assert!(f.contains(&a[2]));
        let mut deep = v("xs");
        for _ in 0..257 {
            deep = Expr::Neg(Box::new(deep));
        }
        assert!(analyse(&deep, ["xs"]).sites.is_empty());
    }
    #[test]
    fn condition_use_and_later_eager_use_are_not_final() {
        let branch=Expr::Call("choose".into(),vec![v("xs"),v("xs"),Expr::Unit]);
        let facts=analyse(&branch,["xs"]);
        let Expr::Call(_,a)=&branch else{unreachable!()};
        assert!(!facts.contains(&a[0]));assert!(facts.contains(&a[1]));
        let expression=Expr::Call("pair".into(),vec![branch,v("xs")]);
        let facts=analyse(&expression,["xs"]);
        let Expr::Call(_,a)=&expression else{unreachable!()};
        let Expr::Call(_,arms)=&a[0]else{unreachable!()};
        assert!(!facts.contains(&arms[0]));assert!(!facts.contains(&arms[1]));
        assert!(facts.contains(&a[1]));
    }
    #[test]
    fn nested_arms_merge_without_losing_lexical_shadowing() {
        let inner=Expr::Call("choose".into(),vec![Expr::Bool(true),v("xs"),v("xs")]);
        let e=Expr::Call("choose".into(),vec![Expr::Bool(false),inner,
            Expr::Let("xs".into(),None,Box::new(Expr::Unit),Box::new(v("xs")))]);
        let facts=analyse(&e,["xs"]);
        let Expr::Call(_,arms)=&e else{unreachable!()};
        let Expr::Call(_,nested)=&arms[1]else{unreachable!()};
        assert!(facts.contains(&nested[1]));assert!(facts.contains(&nested[2]));
        let Expr::Let(_,_,_,local)=&arms[2]else{unreachable!()};
        assert!(facts.contains(local));
    }
    fn field(root:&str,name:&str)->Expr{Expr::Field(Box::new(v(root)),name.into())}
    #[test]
    fn independent_final_fields_and_later_whole_record_reads(){
        let e=Expr::Record("Pair".into(),vec![("a".into(),field("r","a")),("b".into(),field("r","b"))]);
        let facts=analyse(&e,["r"]);let Expr::Record(_,fs)=&e else{unreachable!()};
        assert!(facts.contains_field(&fs[0].1));assert!(facts.contains_field(&fs[1].1));
        let e=Expr::Call("pair".into(),vec![field("r","a"),v("r")]);
        let facts=analyse(&e,["r"]);let Expr::Call(_,args)=&e else{unreachable!()};
        assert!(!facts.contains_field(&args[0]));
    }
    #[test]
    fn ancestor_descendant_and_repeated_fields_overlap(){
        let nested=Expr::Field(Box::new(field("r","a")),"b".into());
        let e=Expr::Call("pair".into(),vec![field("r","a"),nested,field("r","c")]);
        let facts=analyse(&e,["r"]);let Expr::Call(_,args)=&e else{unreachable!()};
        assert!(!facts.contains_field(&args[0]));assert!(facts.contains_field(&args[1]));assert!(facts.contains_field(&args[2]));
        let e=Expr::Call("pair".into(),vec![field("r","a"),field("r","a")]);
        let facts=analyse(&e,["r"]);let Expr::Call(_,args)=&e else{unreachable!()};
        assert!(!facts.contains_field(&args[0]));assert!(facts.contains_field(&args[1]));
    }
    #[test]
    fn conditional_whole_read_blocks_prior_field_and_later_sibling_is_independent(){
        let e=Expr::Call("pair".into(),vec![field("r","a"),Expr::Call("choose".into(),vec![Expr::Bool(true),v("r"),field("r","b")])]);
        let facts=analyse(&e,["r"]);let Expr::Call(_,args)=&e else{unreachable!()};
        assert!(!facts.contains_field(&args[0]));
        let e=Expr::Call("pair".into(),vec![Expr::Call("choose".into(),vec![Expr::Bool(true),field("r","a"),field("r","a")]),field("r","b")]);
        let facts=analyse(&e,["r"]);let Expr::Call(_,args)=&e else{unreachable!()};let Expr::Call(_,arms)=&args[0] else{unreachable!()};
        assert!(facts.contains_field(&arms[1]));assert!(facts.contains_field(&arms[2]));assert!(facts.contains_field(&args[1]));
    }
    #[test]
    fn captured_field_stays_shared_and_shadowed_field_can_move(){
        let e=Expr::Call("pair".into(),vec![Expr::Lambda("i".into(),Box::new(field("r","a"))),field("r","b")]);
        let facts=analyse(&e,["r"]);let Expr::Call(_,args)=&e else{unreachable!()};let Expr::Lambda(_,body)=&args[0] else{unreachable!()};
        assert!(!facts.contains_field(body));assert!(!facts.contains_field(&args[1]));
        let e=Expr::Let("r".into(),None,Box::new(field("r","a")),Box::new(field("r","b")));
        let facts=analyse(&e,["r"]);let Expr::Let(_,_,a,b)=&e else{unreachable!()};
        assert!(facts.contains_field(a));assert!(facts.contains_field(b));
    }
    fn loop_read(root:&str)->Expr{
        Expr::Call("repeat".into(),vec![Expr::Num(3),Expr::Num(0),
            Expr::Lambda("i".into(),Box::new(Expr::Lambda("acc".into(),Box::new(field(root,"a")))) )])
    }
    #[test]
    fn synchronous_callback_captures_end_before_later_field_and_whole_moves(){
        for tail in [field("r","a"),v("r")]{
            let e=Expr::Let("result".into(),None,Box::new(loop_read("r")),Box::new(tail));
            let facts=analyse(&e,["r"]);let Expr::Let(_,_,call,tail)=&e else{unreachable!()};
            let Expr::Call(_,args)=call.as_ref()else{unreachable!()};
            let Expr::Lambda(_,inner)=&args[2]else{unreachable!()};let Expr::Lambda(_,body)=inner.as_ref()else{unreachable!()};
            assert!(!facts.contains_field(body));
            assert!(facts.contains_field(tail)||facts.contains(tail));
        }
    }
    #[test]
    fn initial_reads_and_nested_capture_sites_stay_shared(){
        let nested=Expr::Call("repeat".into(),vec![Expr::Num(2),field("r","a"),
            Expr::Lambda("i".into(),Box::new(Expr::Lambda("acc".into(),Box::new(loop_read("r")))))]);
        let e=Expr::Let("result".into(),None,Box::new(nested),Box::new(field("r","b")));
        let facts=analyse(&e,["r"]);let Expr::Let(_,_,call,tail)=&e else{unreachable!()};let Expr::Call(_,args)=call.as_ref()else{unreachable!()};
        assert!(!facts.contains_field(&args[1]));assert!(facts.contains_field(tail));
        let Expr::Lambda(_,inner)=&args[2]else{unreachable!()};let Expr::Lambda(_,call)=inner.as_ref()else{unreachable!()};let Expr::Call(_,args)=call.as_ref()else{unreachable!()};
        let Expr::Lambda(_,inner)=&args[2]else{unreachable!()};let Expr::Lambda(_,body)=inner.as_ref()else{unreachable!()};assert!(!facts.contains_field(body));
    }
    #[test]
    fn unknown_closure_lifetime_is_not_released_by_a_later_loop(){
        let e=Expr::Let("closure".into(),None,Box::new(Expr::Lambda("i".into(),Box::new(field("r","a")))),
            Box::new(Expr::Let("result".into(),None,Box::new(loop_read("r")),Box::new(field("r","b")))));
        let facts=analyse(&e,["r"]);let Expr::Let(_,_,_,rest)=&e else{unreachable!()};let Expr::Let(_,_,_,tail)=rest.as_ref()else{unreachable!()};assert!(!facts.contains_field(tail));
    }
    fn variant_fold(yes:Expr,no:Expr)->Expr{
        Expr::Method(Box::new(v("result")),"fold".into(),vec![
            Expr::Lambda("value".into(),Box::new(yes)),Expr::Lambda("error".into(),Box::new(no))])
    }
    #[test]
    fn variant_branches_can_move_final_captures_but_later_uses_keep_them_shared(){
        let e=variant_fold(v("xs"),v("xs"));let facts=analyse(&e,["result","xs"]);
        let Expr::Method(_,_,arms)=&e else{unreachable!()};
        for arm in arms{let Expr::Lambda(_,body)=arm else{unreachable!()};assert!(facts.contains(body));}
        let e=Expr::Call("pair".into(),vec![variant_fold(v("xs"),v("xs")),v("xs")]);
        let facts=analyse(&e,["result","xs"]);let Expr::Call(_,args)=&e else{unreachable!()};
        let Expr::Method(_,_,arms)=&args[0]else{unreachable!()};
        for arm in arms{let Expr::Lambda(_,body)=arm else{unreachable!()};assert!(!facts.contains(body));}
        assert!(facts.contains(&args[1]));
    }
    #[test]
    fn variant_branch_field_facts_respect_siblings_and_repeated_inner_callbacks(){
        let e=Expr::Call("pair".into(),vec![variant_fold(field("r","a"),field("r","a")),field("r","b")]);
        let facts=analyse(&e,["result","r"]);let Expr::Call(_,args)=&e else{unreachable!()};
        let Expr::Method(_,_,arms)=&args[0]else{unreachable!()};
        for arm in arms{let Expr::Lambda(_,body)=arm else{unreachable!()};assert!(facts.contains_field(body));}
        assert!(facts.contains_field(&args[1]));
        let e=variant_fold(loop_read("r"),field("r","a"));let facts=analyse(&e,["result","r"]);
        let Expr::Method(_,_,arms)=&e else{unreachable!()};let Expr::Lambda(_,body)=&arms[0]else{unreachable!()};
        let Expr::Call(_,args)=body.as_ref()else{unreachable!()};let Expr::Lambda(_,inner)=&args[2]else{unreachable!()};
        let Expr::Lambda(_,body)=inner.as_ref()else{unreachable!()};assert!(!facts.contains_field(body));
    }

}
