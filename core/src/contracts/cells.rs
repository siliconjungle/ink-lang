//! Private value state elaborates to a single-key ordinary transactional table.
//! Reads use the declared initial value until the first write. No new runtime.
use super::*;
fn method(receiver:Expr,name:&str,args:Vec<Expr>)->Expr{Expr::Method(Box::new(receiver),name.into(),args)}
pub(crate) fn lower(p:&mut Program)->LangResult<()> {
    let cells=p.states.iter().filter(|d|!matches!(d.ty,Type::Table(..))).map(|d|(d.name.clone(),(d.ty.clone(),d.value.clone()))).collect::<BTreeMap<_,_>>();
    if cells.is_empty(){return Ok(());}
    for (n,(_,e)) in &cells {
        let mut refers=false;
        crate::analysis::walk(e,|e|{refers|=matches!(e,Expr::Var(n)if p.states.iter().chain(&p.keeps).any(|s|&s.name==n));});
        if refers{return Err(format!("value-state initializer {n} must be independent of state"));}
    }
    fn expression(e:&mut Expr,cells:&BTreeMap<String,(Type,Expr)>,depth:usize)->LangResult<()> {
        if depth>128{return Err("state value elaboration depth".into());}
        if let Expr::Call(n,args)=e {
            if n=="__ink_state_assign" {
                if args.len()!=2{return Err("invalid state assignment".into());}
                let Expr::Var(root)=&args[0] else{return Err("state assignment root".into());};
                if !cells.contains_key(root){return Err("table roots use table operations, not assignment".into());}
                let root=root.clone();let mut value=args[1].clone();expression(&mut value,cells,depth+1)?;
                *e=method(Expr::Var(root),"put",vec![Expr::Num(0),value]);return Ok(());
            }
        }
        if let Expr::Var(n)=e {
            if let Some((_,initial))=cells.get(n){*e=method(method(Expr::Var(n.clone()),"get",vec![Expr::Num(0)]),"unwrap_or",vec![initial.clone()]);return Ok(());}
        }
        match e {
            Expr::Lambda(n,_)|Expr::Let(n,_,_,_) if cells.contains_key(n)=>return Err("local binding shadows value state".into()),
            _=>(),
        }
        match e {
            Expr::Neg(x)|Expr::Try(x)|Expr::Field(x,_)|Expr::Lambda(_,x)=>expression(x,cells,depth+1)?,
            Expr::Binary(_,a,b)|Expr::Let(_,_,a,b)=>{expression(a,cells,depth+1)?;expression(b,cells,depth+1)?;},
            Expr::Method(x,_,args)=>{expression(x,cells,depth+1)?;for a in args{expression(a,cells,depth+1)?;}},
            Expr::Call(_,args)=>for a in args{expression(a,cells,depth+1)?;},
            Expr::Record(_,fields)=>for (_,a) in fields{expression(a,cells,depth+1)?;},
            _=>(),
        }
        Ok(())
    }
    fn block(body:&mut[Statement],cells:&BTreeMap<String,(Type,Expr)>,depth:usize)->LangResult<()> {
        if depth>128{return Err("state block elaboration depth".into());}
        for s in body{match s{
            Statement::Let(n,_,_)if cells.contains_key(n)=>return Err("local binding shadows value state".into()),
            Statement::Let(_,_,e)|Statement::Return(e)|Statement::Emit(_,e)|Statement::Expr(e)=>expression(e,cells,0)?,
            Statement::If(e,a,b)=>{expression(e,cells,0)?;block(a,cells,depth+1)?;block(b,cells,depth+1)?;},
        }}Ok(())
    }
    for a in &mut p.actions {
        if a.params.iter().any(|(n,_)|cells.contains_key(n)){return Err("parameter shadows value state".into());}
        block(&mut a.body,&cells,0)?;
    }
    for k in &mut p.keeps{expression(&mut k.value,&cells,0)?;}
    for spec in &mut p.contracts.specifications{for e in spec.requires.iter_mut().chain(&mut spec.ensures){expression(e,&cells,0)?;}}
    for invariant in &mut p.contracts.invariants{expression(invariant,&cells,0)?;}
    for d in &mut p.states{if let Some((ty,_))=cells.get(&d.name){d.ty=Type::Table(Box::new(Type::U32),Box::new(ty.clone()));d.value=method(Expr::Var("Table".into()),"empty",vec![]);}}
    Ok(())
}
