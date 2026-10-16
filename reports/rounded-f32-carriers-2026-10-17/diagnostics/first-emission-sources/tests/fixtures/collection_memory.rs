use ink_core::{
    core::CheckedModule,
    eval,
    syntax::{parse, Program, Type},
};
fn fixture() -> Program {
    let mut s = String::from("module memory;");
    for t in ["u32", "i32", "u64", "f32"] {
        s.push_str(&format!("fn make_{t}(xs:List<{t}>,z:{t})->List<{t}>{{return xs.map(fn(x)=>x+z);}}fn id_{t}(xs:List<{t}>)->List<{t}>{{return xs;}}fn peek_{t}(xs:List<{t}>,x:{t})->{t}{{return xs.at_or(0,x)+x;}}"));
        if t != "f32" {
            s.push_str(&format!("fn scan_{t}(xs:List<{t}>,ys:List<{t}>,z:{t},k:{t})->List<{t}>{{return make_{t}(xs,z).scan().map(fn(x)=>x*k);}}"));
        }
        for (name, body) in [
            ("compact", format!("return make_{t}(xs,z).filter(fn(x)=>x>z);")),
            ("compact_chain", format!("return make_{t}(xs,z).filter(fn(x)=>x>z).map(fn(x)=>x*k);")),
            ("compact_shared", format!("let a=make_{t}(xs,z);return a.filter(fn(x)=>x>z).concat(a);")),
            ("compact_capture", format!("return make_{t}(xs,z).filter(fn(x)=>peek_{t}(xs,x)>z);")),
            (
                "chain",
                format!("return make_{t}(xs,z).map_indexed(fn(i)=>fn(x)=>x*k);"),
            ),
            (
                "branch",
                format!("return choose(z<k,make_{t}(xs,z),make_{t}(ys,z)).map(fn(x)=>x*k);"),
            ),
            ("borrowed", format!("return id_{t}(xs).map(fn(x)=>x+z);")),
            (
                "capture",
                format!("return make_{t}(xs,z).map(fn(x)=>peek_{t}(xs,x));"),
            ),
            (
                "shared",
                format!("let a=make_{t}(xs,z);return a.zip(a.map(fn(x)=>x-k),fn(a)=>fn(b)=>a+b);"),
            ),
            ("alias", format!("let a=make_{t}(xs,z);let b=a;return b;")),
            (
                "observed",
                format!("let a=make_{t}(xs,z);let n:u64=count(a);return a.map(fn(x)=>x+k);"),
            ),
            (
                "shadow",
                format!("return make_{t}(xs,z).map(fn(xs)=>xs+k);"),
            ),
        ] {
            s.push_str(&format!(
                "fn {name}_{t}(xs:List<{t}>,ys:List<{t}>,z:{t},k:{t})->List<{t}>{{{body}}}"
            ));
        }
    }
    let p = parse(&s).unwrap();
    CheckedModule::from_source(p.clone()).unwrap();
    p
}
fn number(t: &Type, n: u64) -> eval::Value {
    match t {
        Type::U32 => eval::Value::U32(n as u32),
        Type::I32 => eval::Value::I32(n as u32 as i32),
        Type::U64 => eval::Value::U64(n),
        Type::F32 => eval::Value::F32(n as u32),
        _ => panic!(),
    }
}
fn rows(p: &Program) -> Vec<(String, Vec<eval::Value>, eval::Value)> {
    let mut rows = vec![];
    for (tag, t) in [
        ("u32", Type::U32),
        ("i32", Type::I32),
        ("u64", Type::U64),
        ("f32", Type::F32),
    ] {
        let raw = if t == Type::F32 {
            vec![
                0x4b800000, 0x3f800000, 0xcb800000, 0x80000000, 0x7fc12345, 1,
            ]
        } else {
            vec![0, u64::MAX, 1, 0x80000000, 0x100000000, 7]
        };
        for i in 0..7 {
            let xs = eval::Value::List(raw.iter().take(i).map(|n| number(&t, *n)).collect());
            let ys = eval::Value::List(
                raw.iter()
                    .take(6 - i.min(6))
                    .rev()
                    .map(|n| number(&t, *n))
                    .collect(),
            );
            let z = number(
                &t,
                if t == Type::F32 {
                    if i % 2 == 0 {
                        0x3f800000
                    } else {
                        0xbf800000
                    }
                } else {
                    if i % 2 == 0 {
                        7
                    } else {
                        u64::MAX
                    }
                },
            );
            let k = number(&t, if t == Type::F32 { 0x3f000000 } else { 3 });
            for family in [
                "chain", "branch", "borrowed", "capture", "shared", "alias", "observed", "shadow",
                "compact", "compact_chain", "compact_shared", "compact_capture",
            ] {
                let name = format!("{family}_{tag}");
                let args = vec![xs.clone(), ys.clone(), z.clone(), k.clone()];
                let result = eval::call(p, &name, args.clone(), &mut 1_000_000).unwrap();
                rows.push((name, args, result));
            }
            if t != Type::F32 {
                let name = format!("scan_{tag}");
                let args = vec![xs.clone(), ys.clone(), z.clone(), k.clone()];
                let result = eval::call(p, &name, args.clone(), &mut 1_000_000).unwrap();
                rows.push((name, args, result));
            }
        }
    }
    rows
}
fn directory(tag: &str) -> std::path::PathBuf {
    let p = std::env::temp_dir().join(format!(
        "ink-collection-memory39-{tag}-{}",
        std::process::id()
    ));
    std::fs::create_dir_all(&p).unwrap();
    p
}
