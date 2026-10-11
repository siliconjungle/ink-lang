//! Compare fixed mathematical correspondence with the independent state oracle.
use serde_json::json;
use verified_language::{
    action_model::Projection,
    core::CheckedModule,
    logic::{Sort, Term},
    stateful::{Runtime, Value},
    syntax::{parse, Type},
};
fn c(d: &str, k: usize, a: Vec<Term>) -> Term {
    Term::Construct {
        datatype: d.into(),
        constructor: k,
        arguments: a,
    }
}
fn id(s: &Sort) -> &str {
    let Sort::Data(d) = s else { panic!("data") };
    d
}
fn encode(m: &Projection, t: &Type, v: &Value) -> Term {
    let d = || id(&m.types[&serde_json::to_string(t).unwrap()]);
    match (t, v) {
        (Type::U64, Value::U64(n)) => Term::U64(*n),
        (Type::F32, Value::F32(n)) => Term::U64(*n as u64),
        (Type::Bool, Value::Bool(b)) => Term::Bool(*b),
        (Type::Unit, Value::Unit) => c(d(), 0, vec![]),
        (Type::String, Value::String(s)) => s.bytes().rev().fold(c(d(), 0, vec![]), |z, b| {
            c(d(), 1, vec![Term::U64(b as u64), z])
        }),
        (Type::List(t), Value::List(xs)) => xs.iter().rev().fold(c(d(), 0, vec![]), |z, x| {
            c(d(), 1, vec![encode(m, t, x), z])
        }),
        (Type::Result(a, e), Value::Result(ok, x)) => c(
            d(),
            usize::from(!ok),
            vec![encode(m, if *ok { a } else { e }, x)],
        ),
        (Type::Int, Value::Int(n)) => {
            let nat = m
                .objects
                .iter()
                .find(|(_, e)| {
                    e.payload["declaration"]["Datatype"]["constructors"][0]["name"] == "BinaryZero"
                })
                .unwrap()
                .0;
            let bits = n.magnitude().to_radix_be(2);
            let z = bits.into_iter().fold(c(nat, 0, vec![]), |z, b| {
                c(nat, if b == 0 { 1 } else { 2 }, vec![z])
            });
            c(
                d(),
                if n == &0.into() {
                    0
                } else if n.sign() == num_bigint::Sign::Minus {
                    2
                } else {
                    1
                },
                if n == &0.into() { vec![] } else { vec![z] },
            )
        }
        _ => panic!("codec {t:?} {v:?}"),
    }
}
fn state(m: &Projection, p: &verified_language::syntax::Program, rt: &Runtime) -> Term {
    let snapshot: serde_json::Value = serde_json::from_slice(&rt.checkpoint().unwrap()).unwrap();
    c(
        &m.state,
        0,
        p.states
            .iter()
            .zip(&m.tables)
            .map(|(root, t)| {
                let xs: Vec<(Value, Value)> = serde_json::from_value(
                    snapshot["tables"]
                        .as_array()
                        .unwrap()
                        .iter()
                        .find(|x| x[0] == root.name)
                        .unwrap()[1]
                        .clone(),
                )
                .unwrap();
                xs.iter()
                    .rev()
                    .fold(c(&t.datatype, 0, vec![]), |z, (k, v)| {
                        c(
                            &t.datatype,
                            1,
                            vec![encode(m, &t.key_type, k), encode(m, &t.value_type, v), z],
                        )
                    })
            })
            .collect(),
    )
}
#[test]
fn projected_bulk_and_ordered_scans_match_reference_on_closed_histories() {
    let source = r#"module correspondence;
 state T:Table<u64,u64> = Table.empty();state F:Table<u64,f32> = Table.empty();
 change batch(ks:List<u64>,vs:List<u64>)->Result<Unit,String> writes(T){T.put_many(ks,vs)?;return Ok(());}
 change erase(ks:List<u64>)->Result<Unit,String> writes(T){T.remove_many(ks);return Ok(());}
 change fail(ks:List<u64>,vs:List<u64>)->Result<Unit,String> writes(T){T.put_many(ks,vs)?;return Err("fail");}
 change floats(ks:List<u64>,vs:List<f32>)->Result<Unit,String> writes(F){return F.put_many(ks,vs);}
 query keys()->List<u64> reads(T){return T.keys();}
 query restrict(ks:List<u64>)->List<u64> reads(T){return T.intersect_keys(ks);}
 query total(x:u64)->u64 reads(T){return T.sum_by(fn(v)=>v+x);}
 query large(x:u64)->Int reads(T){return T.count_where(fn(v)=>v>x);}
 query weight()->f32 reads(F){return F.sum_by(fn(v)=>v);}"#;
    let module = CheckedModule::from_source(parse(source).unwrap()).unwrap();
    let p = module.program();
    let m = Projection::derive(&module).unwrap();
    let context = m.context().unwrap();
    let mut rt = Runtime::new(p.clone()).unwrap();
    for (name, args) in [
        ("total", json!([3])),
        ("batch", json!([[9, 1, 9, 3], [9, 1, 19, u64::MAX]])),
        ("keys", json!([])),
        ("restrict", json!([[9, 9, 0, 1]])),
        ("total", json!([u64::MAX])),
        ("large", json!([2])),
        ("batch", json!([[0, 1], [9]])),
        ("fail", json!([[1, 9, 1], [100, 200, 300]])),
        ("erase", json!([[9, 9, 999]])),
        ("floats", json!([[3, 1, 2], [1.0, -1e20, 1e20]])),
        ("weight", json!([])),
        ("floats", json!([[0],[{"F32Bits":2143289345u32}]])),
        ("weight", json!([])),
    ] {
        let a = p.actions.iter().find(|a| a.name == name).unwrap();
        let values = a
            .params
            .iter()
            .zip(args.as_array().unwrap())
            .map(|((_, t), v)| Value::from_json(v, t, p).unwrap())
            .collect::<Vec<_>>();
        let mut terms = vec![state(&m, p, &rt), Term::U64(rt.version())];
        terms.extend(
            a.params
                .iter()
                .zip(&values)
                .map(|((_, t), v)| encode(&m, t, v)),
        );
        let actual = context
            .evaluate(
                &[],
                &Term::Call {
                    function: m.actions[name].function.clone(),
                    arguments: terms,
                },
            )
            .unwrap();
        let result = rt.invoke(name, values).unwrap();
        let expected = c(
            id(&m.actions[name].result),
            0,
            vec![
                encode(&m, &a.result, &result.result),
                Term::Bool(result.committed),
                Term::U64(result.version),
                state(&m, p, &rt),
                c(&m.events, 0, vec![]),
            ],
        );
        assert_eq!(actual, expected, "{name}");
    }
}
