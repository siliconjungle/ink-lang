use serde_json::{json, Value};
use verified_language::{eval, stateful::Runtime, syntax};
#[path = "support/parity.rs"]
mod parity;
#[test]
fn knowledge_math_algorithms_and_bounded_approximations_have_portable_execution() {
    let source = include_str!("../knowledge/libraries/math.ink")
        .replace("module ink.knowledge.math;", "module math_library;");
    let p = syntax::parse(&source).unwrap();
    let rt = Runtime::new(p.clone()).unwrap();
    let mut steps = vec![];
    let mut expected = vec![];
    let mut add = |name: &str, args: Value| {
        let f = p.functions.iter().find(|f| f.name == name).unwrap();
        let values = args
            .as_array()
            .unwrap()
            .iter()
            .zip(&f.params)
            .map(|(v, (_, t))| eval::Value::from_program_json(v, t, &p).unwrap())
            .collect();
        let output = eval::call(&p, name, values, &mut 1_000_000).unwrap().json();
        steps.push(json!({"pure":name,"args":args,"cpu_only":true}));
        expected
            .push(json!({"reply":{"value":output},"snapshot":rt.checkpoint_portable().unwrap()}));
    };
    for b in [
        0u32, 0x80000000, 1, 0x007fffff, 0x7f7fffff, 0x7f800000, 0xff800000, 0x7fa12345,
    ] {
        add("abs_f32", json!([{"F32Bits":b}]));
        for c in [0u32, 0x80000000, 0x7fa54321] {
            add("min_f32", json!([{"F32Bits":b},{"F32Bits":c}]));
            add("max_f32", json!([{"F32Bits":b},{"F32Bits":c}]));
        }
    }
    for v in [
        json!([0.0, 0.0, 0.0]),
        json!([3.0, 4.0, 0.0]),
        json!([1.0, 2.0, 3.0]),
        json!([{"F32Bits":1},{"F32Bits":2},{"F32Bits":3}]),
        json!([{"F32Bits":0x7f7fffffu32},0.0,0.0]),
        json!([{"F32Bits":0x7f800000u32},0.0,0.0]),
        json!([{"F32Bits":0x7fa12345u32},0.0,0.0]),
    ] {
        add("length3", json!([v]));
        add("normalise3", json!([v]));
    }
    for x in [
        -3.1415927410125732,
        -1.5,
        -0.0,
        0.0,
        0.5,
        1.5,
        3.1415927410125732,
        4.0,
        f64::from(f32::MAX),
    ] {
        for name in [
            "sin_approx",
            "cos_approx",
            "exp_approx",
            "exp2_approx",
            "log_approx",
            "log2_approx",
        ] {
            add(name, json!([x]));
        }
    }
    for b in [
        1u32, 0x7fffff, 0x800000, 0x7f7fffff, 0x7f800000, 0xff800000, 0x7fa12345,
    ] {
        for name in ["sin_approx", "cos_approx", "exp_approx", "log_approx"] {
            add(name, json!([{"F32Bits":b}]));
        }
    }
    drop(add);
    parity::conformance(
        "generated-parity-knowledge-math",
        p,
        &source,
        steps,
        expected,
    );
}
#[test]
fn approximation_error_targets_are_checked_against_independent_double_functions() {
    let p = syntax::parse(include_str!("../knowledge/libraries/math.ink")).unwrap();
    let mut report = vec![];
    for name in [
        "sin_approx",
        "cos_approx",
        "exp_approx",
        "log_approx",
        "exp2_approx",
        "log2_approx",
    ] {
        let mut maximum = 0f64;
        let mut at = 0f32;
        for i in 0..=4096 {
            let x = match name {
                "sin_approx" | "cos_approx" => {
                    (-std::f64::consts::PI + i as f64 * 2.0 * std::f64::consts::PI / 4096.0) as f32
                }
                "exp_approx" => (-80.0 + i as f64 * 160.0 / 4096.0) as f32,
                "exp2_approx" => (-100.0 + i as f64 * 200.0 / 4096.0) as f32,
                _ => 2f64.powf(-149.0 + i as f64 * 276.0 / 4096.0) as f32,
            };
            let output = eval::call(&p, name, vec![eval::Value::F32(x.to_bits())], &mut 100_000)
                .unwrap()
                .json();
            let y = output["Some"].as_f64().unwrap();
            let x64 = x as f64;
            let wanted = match name {
                "sin_approx" => x64.sin(),
                "cos_approx" => x64.cos(),
                "exp_approx" => x64.exp(),
                "exp2_approx" => x64.exp2(),
                "log_approx" => x64.ln(),
                _ => x64.log2(),
            };
            let error = if name.starts_with("exp") {
                (y / wanted - 1.0).abs()
            } else {
                (y - wanted).abs()
            };
            if error > maximum {
                maximum = error;
                at = x;
            }
        }
        let bound = if name == "log2_approx" {
            0.00003
        } else if name.contains("log") || name.starts_with("exp") {
            0.00002
        } else {
            0.00001
        };
        assert!(maximum <= bound, "{name} {maximum} at {at}");
        report.push(json!({"function":name,"samples":4097,"maximum_error":maximum,"input":at,"tested_bound":bound,"metric":if name.starts_with("exp"){"relative"}else{"absolute"}}));
    }
    std::fs::create_dir_all("build/numeric-text-primitives").unwrap();
    std::fs::write(
        "build/numeric-text-primitives/accuracy.json",
        serde_json::to_vec_pretty(&report).unwrap(),
    )
    .unwrap();
}
#[test]
fn math_and_text_are_importable_database_libraries() {
    let root = std::path::Path::new("build/numeric-text-primitives");
    std::fs::create_dir_all(root).unwrap();
    let path = root.join("imports.ink");
    std::fs::write(&path,"module caller;import \"std:math\" as math;import \"std:text\" as text;pub fn magnitude(v:Vec3<f32>)->f32{return math.length3(v);}pub fn edit(s:String,i:u32,value:String)->Option<String>{return text.insert(text.from_string(s),i,value).map(fn(t)=>text.flatten(t));}").unwrap();
    let p = verified_language::modules::load(&path).unwrap().program;
    let v = eval::call(
        &p,
        "magnitude",
        vec![eval::Value::Vector(vec![
            eval::Value::F32(3f32.to_bits()),
            eval::Value::F32(4f32.to_bits()),
            eval::Value::F32(0),
        ])],
        &mut 100000,
    )
    .unwrap()
    .json();
    assert_eq!(v, json!(5.0));
    let f = p.functions.iter().find(|f| f.name == "edit").unwrap();
    let args = json!(["aé😀", 3, "!"]);
    let args = args
        .as_array()
        .unwrap()
        .iter()
        .zip(&f.params)
        .map(|(v, (_, t))| eval::Value::from_program_json(v, t, &p).unwrap())
        .collect();
    assert_eq!(
        eval::call(&p, "edit", args, &mut 100000).unwrap().json(),
        json!({"Some":"aé!😀"})
    );
}
