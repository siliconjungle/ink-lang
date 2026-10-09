//! Measures the reference runtime with and without checked maintenance.
//! This is NOT the native-code comparison: stateful code generation is still pending.
use num_bigint::BigInt;
use std::{env, time::Instant};
use verified_language::{
    aggregate,
    stateful::{Runtime, Value},
    syntax::parse,
};

fn id(i: u64) -> Value {
    Value::Id("ItemId".into(), i as u128)
}
fn main() {
    let args: Vec<String> = env::args().skip(1).collect();
    if args.len() != 4 {
        eprintln!("usage: state_bench scan|maintained ROWS UPDATES QUERIES_PER_UPDATE");
        std::process::exit(2);
    }
    let maintained = match args[0].as_str() {
        "scan" => false,
        "maintained" => true,
        _ => panic!("unknown mode"),
    };
    let n: u64 = args[1].parse().unwrap();
    let updates: u64 = args[2].parse().unwrap();
    let qpu: u64 = args[3].parse().unwrap();
    assert!(n > 0 && n <= 100000 && updates <= 100000 && qpu <= 1000);
    let p = parse(include_str!("../../examples/inventory.lang")).unwrap();
    let mut rt = Runtime::new(p).unwrap();
    let mut expected = BigInt::from(0);
    for i in 0..n {
        let stock = (i % 10) as u32;
        expected += stock;
        assert!(
            rt.invoke(
                "create",
                vec![id(i), Value::String("Part".into()), Value::U32(stock)]
            )
            .unwrap()
            .committed
        );
    }
    let certificate =
        aggregate::prove(&parse(include_str!("../../knowledge/sum-maintenance.lang")).unwrap())
            .unwrap();
    let install = Instant::now();
    if maintained {
        rt.enable_maintenance(certificate).unwrap();
    }
    let install_seconds = install.elapsed().as_secs_f64();
    let mut checksum = BigInt::from(0);
    let start = Instant::now();
    for i in 0..updates {
        assert!(
            rt.invoke("restock", vec![id(i % n), Value::U32(1)])
                .unwrap()
                .committed
        );
        expected += 1;
        for _ in 0..qpu {
            let result = rt.invoke("total", vec![]).unwrap();
            if let Value::Int(total) = result.result {
                assert_eq!(total, expected);
                checksum += total;
            } else {
                panic!("wrong query result")
            }
        }
    }
    let seconds = start.elapsed().as_secs_f64();
    let checkpoint_start = Instant::now();
    let snapshot = rt.checkpoint().unwrap();
    let checkpoint_seconds = checkpoint_start.elapsed().as_secs_f64();
    let restore_start = Instant::now();
    let mut restored = Runtime::restore(rt.program().clone(), &snapshot).unwrap();
    let restore_seconds = restore_start.elapsed().as_secs_f64();
    assert_eq!(
        restored.invoke("total", vec![]).unwrap().result,
        Value::Int(expected.clone())
    );
    println!(
        "{}",
        serde_json::json!({"mode":args[0],"rows":n,"updates":updates,"queries_per_update":qpu,"seconds":seconds,"installation_seconds":install_seconds,"checkpoint_seconds":checkpoint_seconds,"restore_seconds":restore_seconds,"snapshot_bytes":snapshot.len(),"checksum":checksum.to_string(),"final_total":expected.to_string(),"events":rt.outbox().len(),"runtime":"AST reference evaluator, not native state codegen"})
    );
}
