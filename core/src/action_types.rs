//! Bounded structural type unification for the action elaborator. No laws.
use crate::{syntax::Type, LangResult};
#[derive(Clone)]
pub(crate) enum Ty {
    Var(usize),
    Atom(Type),
    App(u8, Vec<Ty>),
}
pub(crate) struct Solver {
    bindings: Vec<Option<Ty>>,
    remaining: usize,
}
impl Solver {
    pub fn new() -> Self {
        Self {
            bindings: vec![],
            remaining: 2_000_000,
        }
    }
    fn tick(&mut self) -> LangResult<()> {
        self.remaining = self
            .remaining
            .checked_sub(1)
            .ok_or("action type work budget")?;
        Ok(())
    }
    pub fn fresh(&mut self) -> Ty {
        let n = self.bindings.len();
        self.bindings.push(None);
        Ty::Var(n)
    }
    pub fn ty(&mut self, t: &Type) -> Ty {
        match t {
            Type::Unknown => self.fresh(),
            Type::List(a) => Ty::App(0, vec![self.ty(a)]),
            Type::Option(a) => Ty::App(1, vec![self.ty(a)]),
            Type::Result(a, b) => Ty::App(2, vec![self.ty(a), self.ty(b)]),
            Type::Table(a, b) => Ty::App(3, vec![self.ty(a), self.ty(b)]),
            _ => Ty::Atom(t.clone()),
        }
    }
    fn head(&mut self, mut t: Ty) -> LangResult<Ty> {
        let mut path = vec![];
        while let Ty::Var(i) = t {
            self.tick()?;
            let Some(next) = self.bindings[i].clone() else {
                break;
            };
            path.push(i);
            t = next;
        }
        for i in path {
            self.bindings[i] = Some(t.clone());
        }
        Ok(t)
    }
    pub fn unify(&mut self, a: Ty, b: Ty) -> LangResult<()> {
        let mut work = vec![(a, b)];
        while let Some((a, b)) = work.pop() {
            self.tick()?;
            match (self.head(a)?, self.head(b)?) {
                (Ty::Var(a), Ty::Var(b)) if a == b => (),
                (Ty::Var(i), t) | (t, Ty::Var(i)) => {
                    let mut pending = vec![t.clone()];
                    while let Some(x) = pending.pop() {
                        self.tick()?;
                        match self.head(x)? {
                            Ty::Var(j) if i == j => return Err("recursive action type".into()),
                            Ty::App(_, args) => pending.extend(args),
                            _ => (),
                        }
                    }
                    self.bindings[i] = Some(t);
                }
                (Ty::Atom(a), Ty::Atom(b)) if a == b => (),
                (Ty::App(a, x), Ty::App(b, y)) if a == b && x.len() == y.len() => {
                    work.extend(x.into_iter().zip(y))
                }
                _ => return Err("inconsistent action IR type constraint".into()),
            }
        }
        Ok(())
    }
    pub fn default_numeric(&mut self, t: Ty) -> LangResult<()> {
        if let Ty::Var(i) = self.head(t)? {
            self.bindings[i] = Some(Ty::Atom(Type::U64));
        }
        Ok(())
    }
    pub fn finish(&mut self, t: Ty, depth: usize) -> LangResult<Type> {
        self.tick()?;
        if depth > 128 {
            return Err("action type depth budget".into());
        }
        Ok(match self.head(t)? {
            Ty::Var(i) => {
                self.bindings[i] = Some(Ty::Atom(Type::Unit));
                Type::Unit
            }
            Ty::Atom(t) => t,
            Ty::App(tag, args) => {
                let mut args = args
                    .into_iter()
                    .map(|t| self.finish(t, depth + 1))
                    .collect::<LangResult<Vec<_>>>()?
                    .into_iter();
                let a = Box::new(args.next().ok_or("type constructor arity")?);
                match tag {
                    0 => Type::List(a),
                    1 => Type::Option(a),
                    2 => Type::Result(a, Box::new(args.next().ok_or("type constructor arity")?)),
                    3 => Type::Table(a, Box::new(args.next().ok_or("type constructor arity")?)),
                    _ => return Err("type constructor".into()),
                }
            }
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn contextual_types_solve_before_defaults_and_shared_holes_agree() {
        let mut s = Solver::new();
        let a = s.fresh();
        let b = s.fresh();
        s.unify(Ty::App(1, vec![a.clone()]), Ty::App(1, vec![b.clone()]))
            .unwrap();
        s.unify(b.clone(), Ty::Atom(Type::U32)).unwrap();
        s.default_numeric(a.clone()).unwrap();
        assert_eq!(s.finish(a, 0).unwrap(), Type::U32);
        assert!(s.unify(b, Ty::Atom(Type::U64)).is_err());
    }
    #[test]
    fn recursive_types_and_resource_exhaustion_fail_closed() {
        let mut s = Solver::new();
        let a = s.fresh();
        assert!(s.unify(a.clone(), Ty::App(1, vec![a])).is_err());
        let mut s = Solver::new();
        s.remaining = 1;
        let a = s.fresh();
        let b = s.fresh();
        assert!(s.unify(a, b).is_err());
        let mut s = Solver::new();
        let mut t = Ty::Atom(Type::Unit);
        for _ in 0..130 {
            t = Ty::App(1, vec![t]);
        }
        assert!(s.finish(t, 0).is_err());
    }
}
