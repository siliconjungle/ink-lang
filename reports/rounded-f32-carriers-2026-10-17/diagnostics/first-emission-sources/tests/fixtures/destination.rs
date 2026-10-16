use ink_core::{
    core::CheckedModule,
    eval,
    syntax::{parse, Program, Type},
};
fn balanced(xs: &[String]) -> String {
    if xs.len() == 1 {
        xs[0].clone()
    } else {
        let m = xs.len() / 2;
        format!("({}+{})", balanced(&xs[..m]), balanced(&xs[m..]))
    }
}
fn fixture() -> Program {
    let mut s = String::from("module destination;record Pair{key:u32,value:f32,}");
    for t in ["u32", "i32", "u64", "f32"] {
        for (name, expr) in [
            ("copy", "xs".to_owned()),
            ("map", "xs.map(fn(x)=>x+z)".into()),
            ("indexed", "xs.map_indexed(fn(i)=>fn(x)=>x+z)".into()),
            ("filter", "xs.filter(fn(x)=>x<k)".into()),
            ("zip", "xs.zip(ys,fn(x)=>fn(y)=>x+y)".into()),
            ("concat", "xs.concat(ys)".into()),
            ("scan", "xs.scan()".into()),
            (
                "chain",
                "xs.map(fn(x)=>x+z).filter(fn(x)=>x<k).map(fn(x)=>x*k)".into(),
            ),
            (
                "local",
                "{ let a:List<T> =xs.map(fn(x)=>x+z); return a; }".replace("T", t),
            ),
            (
                "choice",
                "choose(z<k,xs.map(fn(x)=>x+z),ys.filter(fn(x)=>x<k))".into(),
            ),
        ] {
            if t == "f32" && name == "scan" {
                continue;
            }
            if name == "local" {
                s.push_str(&format!(
                    "fn {name}_{t}(xs:List<{t}>,ys:List<{t}>,z:{t},k:{t})->List<{t}>{expr}"
                ));
            } else {
                s.push_str(&format!("fn {name}_{t}(xs:List<{t}>,ys:List<{t}>,z:{t},k:{t})->List<{t}>{{return {expr};}}"));
            }
        }
        s.push_str(&format!("fn named_{t}(xs:List<{t}>,ys:List<{t}>,z:{t},k:{t})->List<{t}>{{return map_{t}(xs,ys,z,k);}}"));
    }
    for (name, e) in [
        ("copy_bool", "xs"),
        ("map_bool", "xs.map(fn(x)=>choose(x,false,true))"),
        ("filter_bool", "xs.filter(fn(x)=>x)"),
        ("zip_bool", "xs.zip(ys,fn(x)=>fn(y)=>choose(x,y,false))"),
        ("concat_bool", "xs.concat(ys)"),
    ] {
        s.push_str(&format!(
            "fn {name}(xs:List<Bool>,ys:List<Bool>,z:Bool,k:Bool)->List<Bool>{{return {e};}}"
        ));
    }
    s.push_str("fn vector(xs:List<Vec3<f32>>,ys:List<Vec3<f32>>,z:u32,k:u32)->List<Vec3<f32>>{return xs.map(fn(v)=>vec3(v.z,v.x,-v.y));}fn record(xs:List<Pair>,ys:List<Pair>,z:u32,k:u32)->List<Pair>{return xs.map(fn(r)=>Pair{key:r.key+z,value:r.value});}fn record_concat(xs:List<Pair>,ys:List<Pair>,z:u32,k:u32)->List<Pair>{return xs.concat(ys);}fn sorted(xs:List<u32>,ys:List<u32>,z:u32,k:u32)->List<u32>{return xs.sort();}");
    s.push_str(&format!(
        "fn huge(xs:List<u32>)->List<u32>{{return xs.map(fn(x)=>{});}}",
        balanced(&vec!["x".into(); 1025])
    ));
    for (n, e, t) in [
        ("receiver_map", "huge(xs).map(fn(x)=>x+1)", "List<u32>"),
        (
            "receiver_filter",
            "huge(xs).filter(fn(x)=>x<k)",
            "List<u32>",
        ),
        (
            "receiver_indexed",
            "huge(xs).map_indexed(fn(i)=>fn(x)=>x+i)",
            "List<u32>",
        ),
        ("receiver_scan", "huge(xs).scan()", "List<u32>"),
        (
            "receiver_zip",
            "huge(xs).zip(huge(ys),fn(x)=>fn(y)=>x+y)",
            "List<u32>",
        ),
        ("receiver_sum", "sum(huge(xs))", "u32"),
        ("receiver_count", "count(huge(xs))", "u64"),
        (
            "receiver_fold",
            "foldr(huge(xs),z,fn(x)=>fn(a)=>x-a)",
            "u32",
        ),
        (
            "receiver_lookup",
            "huge(xs).at_or(probe_idx(k),fallback(z))",
            "u32",
        ),
    ] {
        s.push_str(&format!(
            "fn {n}(xs:List<u32>,ys:List<u32>,z:u32,k:u32)->{t}{{return {e};}}"
        ));
    }
    s.push_str("fn probe_idx(x:u32)->u32{return x;}fn fallback(x:u32)->u32{return x;}fn lazy(xs:List<u32>,ys:List<u32>,z:u32,k:u32)->List<u32>{return choose(z==0,xs,huge(ys));}");
    parse(&s).unwrap()
}
fn number(t: &Type, n: u64) -> eval::Value {
    match t {
        Type::U32 => eval::Value::U32(n as u32),
        Type::I32 => eval::Value::I32(n as i32),
        Type::U64 => eval::Value::U64(n),
        Type::F32 => eval::Value::F32(n as u32),
        Type::Bool => eval::Value::Bool(n & 1 != 0),
        _ => panic!(),
    }
}
fn rows(p: &Program) -> Vec<(String, Vec<eval::Value>, eval::Value)> {
    let mut rows = Vec::new();
    let mut state = 0x12345678abcdef01u64;
    for t in [Type::U32, Type::I32, Type::U64, Type::F32, Type::Bool] {
        let n = match t {
            Type::U32 => "u32",
            Type::I32 => "i32",
            Type::U64 => "u64",
            Type::F32 => "f32",
            _ => "bool",
        };
        for i in 0..8 {
            let raw = if i == 0 {
                vec![]
            } else if i == 1 {
                if t == Type::F32 {
                    vec![0x4b800000, 0x3f800000, 0xcb800000, 0x80000000]
                } else {
                    vec![0, u64::MAX, 1, 0x80000000, 0x100000000]
                }
            } else {
                (0..i % 5)
                    .map(|_| {
                        state = state.wrapping_mul(6364136223846793005).wrapping_add(1);
                        if t == Type::F32 {
                            (state as u32 & 0x807fffff | 0x3f000000) as u64
                        } else {
                            state
                        }
                    })
                    .collect()
            };
            let xs = eval::Value::List(raw.iter().map(|x| number(&t, *x)).collect());
            let ys = eval::Value::List(
                raw.iter()
                    .take(i % 3)
                    .rev()
                    .map(|x| number(&t, *x))
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
            let k = number(
                &t,
                if t == Type::F32 {
                    0x3f800000
                } else {
                    0x80000001
                },
            );
            let families = if t == Type::Bool {
                vec!["copy", "map", "filter", "zip", "concat"]
            } else {
                vec![
                    "copy", "map", "indexed", "filter", "zip", "concat", "scan", "chain", "local",
                    "choice", "named",
                ]
            };
            for family in families {
                if t == Type::F32 && family == "scan" {
                    continue;
                }
                let name = format!("{family}_{n}");
                let args = vec![xs.clone(), ys.clone(), z.clone(), k.clone()];
                let value = interpreted(p, &name, args.clone()).unwrap();
                rows.push((name, args, value));
            }
        }
    }
    for bits in [
        0, 0x80000000, 1, 0x7fc12345, 0xffc54321, 0x7f800000, 0xff800000,
    ] {
        let fp = eval::Value::F32(bits);
        let values = [
            ("copy_f32", fp.clone()),
            (
                "vector",
                eval::Value::Vector(vec![
                    fp.clone(),
                    eval::Value::F32(0x80000000),
                    eval::Value::F32(1),
                ]),
            ),
            (
                "record",
                eval::Value::Record(
                    "Pair".into(),
                    [
                        ("key".into(), eval::Value::U32(u32::MAX)),
                        ("value".into(), fp.clone()),
                    ]
                    .into_iter()
                    .collect(),
                ),
            ),
        ];
        for (name, item) in values {
            let f = p.functions.iter().find(|f| f.name == name).unwrap();
            let z = if f.params[2].1 == Type::F32 {
                eval::Value::F32(0)
            } else {
                eval::Value::U32(1)
            };
            let args = vec![
                eval::Value::List(vec![item.clone()]),
                eval::Value::List(vec![]),
                z.clone(),
                z,
            ];
            rows.push((
                name.into(),
                args.clone(),
                interpreted(p, name, args).unwrap(),
            ));
        }
    }
    for i in 0..3 {
        let xs = eval::Value::List((0..i).map(|i| eval::Value::U32(i as u32 + 1)).collect());
        let ys = eval::Value::List(vec![eval::Value::U32(4)]);
        for name in [
            "receiver_map",
            "receiver_filter",
            "receiver_indexed",
            "receiver_scan",
            "receiver_zip",
            "receiver_sum",
            "receiver_count",
            "receiver_fold",
            "receiver_lookup",
            "lazy",
            "sorted",
        ] {
            let args = vec![
                xs.clone(),
                ys.clone(),
                eval::Value::U32(0),
                eval::Value::U32(i as u32),
            ];
            rows.push((
                name.into(),
                args.clone(),
                interpreted(p, name, args).unwrap(),
            ));
        }
    }
    rows
}
fn directory(tag: &str) -> std::path::PathBuf {
    let p = std::env::temp_dir().join(format!("ink-destination28-{tag}-{}", std::process::id()));
    std::fs::create_dir_all(&p).unwrap();
    p
}

fn interpreted(
    p: &Program,
    name: &str,
    args: Vec<eval::Value>,
) -> ink_core::LangResult<eval::Value> {
    let mut fuel = 1_000_000;
    eval::call(p, name, args, &mut fuel)
}
