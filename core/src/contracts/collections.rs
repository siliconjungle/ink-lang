//! Finite multiset observations lower to ordinary, exact list computations.
//! Each input is evaluated once. Element identity uses structural list equality
//! (including floating-point bits); multiplicities use exact Int arithmetic.
use super::*;
/// Resolve collection syntax in its declaring module before templates/imports
/// are combined. These source-only markers disappear during elaboration; they
/// carry no theorem authority and cannot occur in checked executable code.
pub(crate) fn resolve(p: &mut Program) -> LangResult<()> {
    let declarations: BTreeSet<_> = p.functions.iter().map(|f|f.name.clone())
        .chain(p.actions.iter().map(|a|a.name.clone())).collect();
    fn expr(e:&mut Expr,declared:&BTreeSet<String>,locals:&BTreeSet<String>,depth:usize)->LangResult<()> {
        if depth>128{return Err("collection syntax resolution depth".into())}
        match e {
            Expr::Call(name,args)=>{
                if ["unique","unique_ids","unique_by","multiset","singleton"].contains(&name.as_str())
                    && !declared.contains(name) && !locals.contains(name) {
                    *name=format!("@{name}");
                }
                for a in args {expr(a,declared,locals,depth+1)?;}
            }
            Expr::Let(name,_,initial,body)=>{
                expr(initial,declared,locals,depth+1)?;
                let mut inner=locals.clone();inner.insert(name.clone());expr(body,declared,&inner,depth+1)?;
            }
            Expr::Lambda(name,body)=>{
                let mut inner=locals.clone();inner.insert(name.clone());expr(body,declared,&inner,depth+1)?;
            }
            Expr::Binary(_,a,b)=>{expr(a,declared,locals,depth+1)?;expr(b,declared,locals,depth+1)?;}
            Expr::Neg(x)|Expr::Try(x)|Expr::Field(x,_)=>expr(x,declared,locals,depth+1)?,
            Expr::Method(x,_,args)=>{expr(x,declared,locals,depth+1)?;for a in args{expr(a,declared,locals,depth+1)?;}}
            Expr::Record(_,fields)=>for (_,value) in fields{expr(value,declared,locals,depth+1)?;},
            _=>(),
        }
        Ok(())
    }
    fn block(body:&mut [Statement],declared:&BTreeSet<String>,mut locals:BTreeSet<String>,depth:usize)->LangResult<()> {
        if depth>128{return Err("collection statement resolution depth".into())}
        for statement in body {match statement {
            Statement::Let(name,_,value)=>{expr(value,declared,&locals,depth+1)?;locals.insert(name.clone());}
            Statement::Return(value)|Statement::Expr(value)|Statement::Emit(_,value)=>expr(value,declared,&locals,depth+1)?,
            Statement::If(value,a,b)=>{expr(value,declared,&locals,depth+1)?;block(a,declared,locals.clone(),depth+1)?;block(b,declared,locals.clone(),depth+1)?;}
        }}
        Ok(())
    }
    for f in &mut p.functions {expr(&mut f.body,&declarations,&f.params.iter().map(|(n,_)|n.clone()).collect(),0)?;}
    for a in &mut p.actions {block(&mut a.body,&declarations,a.params.iter().map(|(n,_)|n.clone()).collect(),0)?;}
    for d in p.states.iter_mut().chain(&mut p.keeps) {expr(&mut d.value,&declarations,&BTreeSet::new(),0)?;}
    for r in &mut p.rules {
        let locals=r.params.iter().map(|(n,_)|n.clone()).collect();
        expr(&mut r.from,&declarations,&locals,0)?;expr(&mut r.to,&declarations,&locals,0)?;
    }
    for spec in &mut p.contracts.specifications {
        let mut locals:BTreeSet<_>=spec.params.iter().map(|(n,_)|n.clone()).collect();
        for predicate in &mut spec.requires {expr(predicate,&declarations,&locals,0)?;}
        locals.insert("result".into());
        for predicate in &mut spec.ensures {expr(predicate,&declarations,&locals,0)?;}
    }
    for predicate in &mut p.contracts.invariants {expr(predicate,&declarations,&BTreeSet::new(),0)?;}
    for predicate in p.contracts.value_invariants.values_mut() {expr(predicate,&declarations,&BTreeSet::from(["value".into()]),0)?;}
    Ok(())
}
fn v(n: &str) -> Expr {
    Expr::Var(n.into())
}
fn call(n: &str, x: Vec<Expr>) -> Expr {
    Expr::Call(n.into(), x)
}
fn bin(n: &str, a: Expr, b: Expr) -> Expr {
    Expr::Binary(n.into(), Box::new(a), Box::new(b))
}
fn lambda(n: &str, b: Expr) -> Expr {
    Expr::Lambda(n.into(), Box::new(b))
}
fn all(xs: Expr, x: &str, predicate: Expr) -> Expr {
    bin(
        "==",
        call(
            "count",
            vec![Expr::Method(
                Box::new(xs),
                "filter".into(),
                vec![lambda(x, bin("==", predicate, Expr::Bool(false)))],
            )],
        ),
        int(0),
    )
}
fn int(n: u64) -> Expr {
    Expr::Num(n)
}
fn same(a: Expr, b: Expr) -> Expr {
    bin("==", call("list", vec![a]), call("list", vec![b]))
}
fn count(xs: Expr, item: Expr, prefix: &str) -> Expr {
    let x = format!("{prefix}_item");
    call(
        "count",
        vec![Expr::Method(
            Box::new(xs),
            "filter".into(),
            vec![lambda(&x, same(v(&x), item))],
        )],
    )
}
fn bag(e: &Expr) -> LangResult<Expr> {
    match e {
        Expr::Call(n, args) if n == "@multiset" && args.len() == 1 => Ok(args[0].clone()),
        Expr::Call(n, args) if n == "@singleton" && args.len() == 1 => {
            Ok(call("list", args.clone()))
        }
        Expr::Binary(n, a, b) if n == "+" => Ok(Expr::Method(
            Box::new(bag(a)?),
            "concat".into(),
            vec![bag(b)?],
        )),
        _ => Err(
            "multiset expressions require multiset(list), singleton(value), or bag addition".into(),
        ),
    }
}
fn is_bag(e: &Expr) -> bool {
    match e {
        Expr::Call(n, _) => n == "@multiset" || n == "@singleton",
        Expr::Binary(n, a, b) => n == "+" && (is_bag(a) || is_bag(b)),
        _ => false,
    }
}
pub(crate) fn lower(e: &Expr, prefix: &str) -> LangResult<Option<Expr>> {
    let left = format!("{prefix}_left");
    let right = format!("{prefix}_right");
    let item = format!("{prefix}_item");
    if let Expr::Binary(op, a, b) = e {
        if (op == "==" || op == "!=") && (is_bag(a) || is_bag(b)) {
            let predicate = bin(
                "==",
                count(v(&left), v(&item), &format!("{prefix}_l")),
                count(v(&right), v(&item), &format!("{prefix}_r")),
            );
            let mut body = bin(
                "&&",
                all(v(&left), &item, predicate.clone()),
                all(v(&right), &item, predicate),
            );
            if op == "!=" {
                body = bin("==", body, Expr::Bool(false));
            }
            return Ok(Some(Expr::Let(
                left,
                None,
                Box::new(bag(a)?),
                Box::new(Expr::Let(right, None, Box::new(bag(b)?), Box::new(body))),
            )));
        }
    }
    if let Expr::Call(n, args) = e {
        if ["@unique", "@unique_ids", "@unique_by"].contains(&n.as_str()) {
            if args.len() != if n == "@unique_by" { 2 } else { 1 } {
                return Err("uniqueness predicate arity".into());
            }
            let input = if n == "@unique_ids" {
                Expr::Method(
                    Box::new(args[0].clone()),
                    "map".into(),
                    vec![lambda(&item, Expr::Field(Box::new(v(&item)), "id".into()))],
                )
            } else if n == "@unique_by" {
                Expr::Method(
                    Box::new(args[0].clone()),
                    "map".into(),
                    vec![args[1].clone()],
                )
            } else {
                args[0].clone()
            };
            let body = all(
                v(&left),
                &item,
                bin(
                    "==",
                    count(v(&left), v(&item), &format!("{prefix}_unique")),
                    int(1),
                ),
            );
            return Ok(Some(Expr::Let(left, None, Box::new(input), Box::new(body))));
        }
    }
    Ok(None)
}
