use std::{
    fs,
    path::{Path, PathBuf},
    sync::atomic::{AtomicUsize, Ordering},
};
use verified_language::{
    check,
    eval::{self, Value},
    implementation::{self, Package},
    native, syntax,
};
static NEXT: AtomicUsize = AtomicUsize::new(0);
struct Fixture(PathBuf);
impl Fixture {
    fn new() -> Self {
        let p = std::env::temp_dir().join(format!(
            "lang-implementation-{}-{}",
            std::process::id(),
            NEXT.fetch_add(1, Ordering::Relaxed)
        ));
        fs::create_dir_all(p.join("objects")).unwrap();
        let root = Path::new(env!("CARGO_MANIFEST_DIR")).join("knowledge/collections");
        fs::copy(root.join("lock.json"), p.join("lock.json")).unwrap();
        for entry in fs::read_dir(root.join("objects")).unwrap() {
            let entry = entry.unwrap();
            fs::copy(entry.path(), p.join("objects").join(entry.file_name())).unwrap();
        }
        Self(p)
    }
    fn package(&self, p: &Package) -> PathBuf {
        let path = self.0.join("proposal.json");
        fs::write(&path, serde_json::to_vec(p).unwrap()).unwrap();
        path
    }
}
impl Drop for Fixture {
    fn drop(&mut self) {
        fs::remove_dir_all(&self.0).unwrap();
    }
}
fn original() -> syntax::Program {
    syntax::parse(include_str!("../knowledge/collections/kernels.lang")).unwrap()
}
fn package() -> Package {
    serde_json::from_str(include_str!("../knowledge/collections/proposal.json")).unwrap()
}
#[test]
fn checked_database_candidates_preserve_modular_values_and_lexical_captures() {
    let fixture = Fixture::new();
    let before = original();
    let mut after = before.clone();
    let evidence = implementation::apply(&mut after, &fixture.package(&package())).unwrap();
    assert_eq!(evidence.checked_proposals.len(), 4);
    assert_eq!(evidence.library_closure.len(), 21);
    let old_c = native::emit(&before).unwrap();
    let new_c = native::emit(&after).unwrap();
    assert!(old_c.matches("= lang_allocate(").count() >= 8);
    assert!(!new_c.contains("= lang_allocate("));
    let mut seed = 517u64;
    for i in 0..256 {
        let mut next = || {
            seed ^= seed << 13;
            seed ^= seed >> 7;
            seed ^= seed << 17;
            seed
        };
        let scale = next();
        let bias = next();
        let xs = if i == 0 {
            vec![]
        } else if i == 1 {
            vec![0, 1, u64::MAX, 1 << 63]
        } else {
            (0..i % 31).map(|_| next()).collect()
        };
        for name in ["two_maps", "three_maps", "shadow_maps", "mapped_count"] {
            let args = vec![
                Value::List(xs.iter().copied().map(Value::U64).collect()),
                Value::U64(scale),
                Value::U64(bias),
            ];
            let a = eval::call(&before, name, args.clone(), &mut 100_000).unwrap();
            let b = eval::call(&after, name, args, &mut 100_000).unwrap();
            let expected = xs.iter().fold(0u64, |s, &x| {
                s.wrapping_add(match name {
                    "two_maps" => x.wrapping_mul(scale).wrapping_add(bias),
                    "three_maps" => x.wrapping_mul(scale).wrapping_add(bias).wrapping_sub(bias),
                    "shadow_maps" => x.wrapping_add(bias).wrapping_mul(scale),
                    _ => 1,
                })
            });
            assert_eq!(a, Value::U64(expected));
            assert_eq!(b, a);
        }
    }
}
#[test]
fn stale_wrong_model_forged_proof_and_partial_failure_leave_program_unchanged() {
    let fixture = Fixture::new();
    let original = original();
    let initial = serde_json::to_vec(&original).unwrap();
    let good = package();
    for case in 0..7 {
        let mut p = good.clone();
        match case {
            0 => p.proposals[1].from = syntax::Expr::Num(0),
            1 => p.proposals[1].to = syntax::Expr::Num(0),
            2 => p.proposals[1].from_definitions[0] = p.proposals[0].from_definitions[1].clone(),
            3 => {
                p.proposals[1].proof =
                    verified_language::logic::Proof::Refl(verified_language::logic::Term::U64(0))
            }
            4 => {
                let extra = p.proposals[0].from_definitions[0].clone();
                p.proposals[1].from_definitions.push(extra);
            }
            5 => p.proposals[1].to = syntax::Expr::Bool(false),
            _ => p.proposals[1].function = p.proposals[0].function.clone(),
        }
        let mut candidate = original.clone();
        let result = implementation::apply(&mut candidate, &fixture.package(&p));
        assert!(result.is_err(), "accepted corruption {case}");
        assert_eq!(serde_json::to_vec(&candidate).unwrap(), initial);
    }
    let mut p = good;
    p.library = "../lock.json".into();
    assert!(implementation::apply(&mut original.clone(), &fixture.package(&p)).is_err());
}
#[test]
fn foldr_order_initial_and_shadowing_are_actual_language_semantics() {
    let p=syntax::parse("module t; fn ordered(xs: List<u64>, z: u64)->u64 {return foldr(xs,z,fn(x)=>fn(rest)=>x-rest);} fn shadow(xs:List<u64>)->u64{return foldr(xs,7,fn(x)=>fn(x)=>x+1);}").unwrap();
    check::check(&p).unwrap();
    let xs = Value::List(vec![Value::U64(2), Value::U64(3), Value::U64(5)]);
    assert_eq!(
        eval::call(&p, "ordered", vec![xs.clone(), Value::U64(11)], &mut 1000).unwrap(),
        Value::U64(2u64.wrapping_sub(3u64.wrapping_sub(5u64.wrapping_sub(11))))
    );
    assert_eq!(
        eval::call(&p, "shadow", vec![xs], &mut 1000).unwrap(),
        Value::U64(10)
    );
    for s in [
        "foldr(xs,true,fn(x)=>fn(y)=>x+y)",
        "foldr(xs,0,fn(x)=>x)",
        "foldr(xs,0,fn(x)=>fn(y)=>true)",
    ] {
        assert!(check::check(
            &syntax::parse(&format!("module t; fn f(xs:List<u64>)->u64{{return {s};}}")).unwrap()
        )
        .is_err());
    }
}

#[test]
fn filtered_candidates_preserve_values_and_validate_called_function_bodies() {
    let fixture = Fixture::new();
    let root = Path::new(env!("CARGO_MANIFEST_DIR")).join("knowledge/filtered");
    fs::copy(root.join("lock.json"), fixture.0.join("lock.json")).unwrap();
    for entry in fs::read_dir(root.join("objects")).unwrap() {
        let entry = entry.unwrap();
        fs::copy(
            entry.path(),
            fixture.0.join("objects").join(entry.file_name()),
        )
        .unwrap();
    }
    let package: Package =
        serde_json::from_str(include_str!("../knowledge/filtered/proposal.json")).unwrap();
    let path = fixture.package(&package);
    let original = syntax::parse(include_str!("../knowledge/filtered/kernels.lang")).unwrap();
    let mut candidate = original.clone();
    implementation::apply(&mut candidate, &path).unwrap();
    let mut seed = 7712u64;
    for i in 0..256 {
        let mut next = || {
            seed ^= seed << 13;
            seed ^= seed >> 7;
            seed ^= seed << 17;
            seed
        };
        let scale = next();
        let bias = next();
        let limit = match i % 4 {
            0 => 0,
            1 => u64::MAX,
            2 => 512,
            _ => next(),
        };
        let xs: Vec<u64> = if i == 0 {
            vec![]
        } else if i == 1 {
            vec![0, 1, u64::MAX, 1 << 63]
        } else {
            (0..i % 31)
                .map(|_| if i % 2 == 0 { next() } else { next() & 1023 })
                .collect()
        };
        for name in [
            "mapped_filter_sum",
            "filter_map_sum",
            "mapped_filter_count",
            "constant_filter_sum",
        ] {
            let args = vec![
                Value::List(xs.iter().copied().map(Value::U64).collect()),
                Value::U64(scale),
                Value::U64(bias),
                Value::U64(limit),
            ];
            let a = eval::call(&original, name, args.clone(), &mut 100_000).unwrap();
            let b = eval::call(&candidate, name, args, &mut 100_000).unwrap();
            let expected = xs.iter().fold(0u64, |s, &x| {
                let y = x.wrapping_mul(scale).wrapping_add(bias);
                s.wrapping_add(match name {
                    "mapped_filter_sum" => {
                        if y < limit {
                            y
                        } else {
                            0
                        }
                    }
                    "filter_map_sum" => {
                        if x < limit {
                            y
                        } else {
                            0
                        }
                    }
                    "mapped_filter_count" => u64::from(y < limit),
                    _ => {
                        if bias < limit {
                            bias
                        } else {
                            0
                        }
                    }
                })
            });
            assert_eq!(a, Value::U64(expected));
            assert_eq!(b, a);
        }
    }
    let mut changed = original.clone();
    changed
        .functions
        .iter_mut()
        .find(|f| f.name == "project")
        .unwrap()
        .body = syntax::Expr::Num(0);
    let before = serde_json::to_vec(&changed).unwrap();
    assert!(implementation::apply(&mut changed, &path).is_err());
    assert_eq!(serde_json::to_vec(&changed).unwrap(), before);
    let mut changed = original.clone();
    changed
        .functions
        .iter_mut()
        .find(|f| f.name == "under")
        .unwrap()
        .body = syntax::Expr::Bool(true);
    assert!(implementation::apply(&mut changed, &path).is_err());
    let mut forged = package;
    forged.proposals[0].to = syntax::Expr::Call(
        "mapped_filter_sum".into(),
        original
            .functions
            .iter()
            .find(|f| f.name == "mapped_filter_sum")
            .unwrap()
            .params
            .iter()
            .map(|(n, _)| syntax::Expr::Var(n.clone()))
            .collect(),
    );
    assert!(implementation::apply(&mut original.clone(), &fixture.package(&forged)).is_err());
}

#[test]
fn conditional_evaluation_is_lazy_and_constant_lambdas_compile_without_warnings() {
    let source="module t; fn f(xs:List<u64>)->u64{return choose(true,7,sum(xs.map(fn(ignored)=>11)));} fn g(xs:List<u64>)->Bool{return choose(false,sum(xs)>0,true);} fn constant(xs:List<u64>)->u64{return sum(xs.map(fn(ignored)=>11).filter(fn(also_ignored)=>true));}";
    let p = syntax::parse(source).unwrap();
    check::check(&p).unwrap();
    let list = Value::List((0..1000).map(|_| Value::U64(9)).collect());
    assert_eq!(
        eval::call(&p, "f", vec![list.clone()], &mut 8).unwrap(),
        Value::U64(7)
    );
    assert_eq!(
        eval::call(&p, "g", vec![list], &mut 8).unwrap(),
        Value::Bool(true)
    );
    let fixture = Fixture::new();
    let c = fixture.0.join("constant.c");
    let exe = fixture.0.join("constant");
    let mut code = native::emit(&p).unwrap();
    code.push_str("\nint main(void){uint64_t x[3]={0,1,UINT64_MAX};return lang_fn_f(x,3)!=7 || !lang_fn_g(x,3) || lang_fn_constant(x,3)!=33;}\n");
    fs::write(&c, code).unwrap();
    assert!(std::process::Command::new("clang")
        .args(["-O3", "-std=c11", "-Wall", "-Wextra", "-Werror"])
        .arg(&c)
        .arg("-o")
        .arg(&exe)
        .status()
        .unwrap()
        .success());
    assert!(std::process::Command::new(&exe).status().unwrap().success());
    for expression in [
        "choose(1,2,3)",
        "choose(true,1,false)",
        "choose(true,xs,xs)",
        "choose(true,1)",
    ] {
        assert!(check::check(
            &syntax::parse(&format!(
                "module t; fn f(xs:List<u64>)->u64{{return {expression};}}"
            ))
            .unwrap()
        )
        .is_err());
    }
}
