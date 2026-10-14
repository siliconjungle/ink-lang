use serde_json::{json, Value as Json};
use verified_language::{check, core, eval, state_native, syntax::parse};
fn program() -> verified_language::syntax::Program {
    let p = parse(include_str!("../examples/particles.ink")).unwrap();
    check::check(&p).unwrap();
    p
}
fn run(p: &verified_language::syntax::Program, name: &str, args: Json) -> Json {
    let f = p.functions.iter().find(|f| f.name == name).unwrap();
    let a = args
        .as_array()
        .unwrap()
        .iter()
        .zip(&f.params)
        .map(|(v, (_, t))| eval::Value::from_program_json(v, t, p).unwrap())
        .collect();
    eval::call(p, name, a, &mut 1000000).unwrap().json()
}
#[test]
fn signed_words_safe_reads_loops_vectors_records_and_ordered_floats() {
    let p = program();
    assert_eq!(
        run(&p, "gather", json!([[5, -7], [1, 0, 2, 4294967295u32]])),
        json!([-7, 5, -99, -99])
    );
    assert_eq!(
        run(&p, "indexed", json!([[-2147483648i64, 2147483647, 3, -9]])),
        json!([0, -2147483642i64, -6, -2])
    );
    assert_eq!(run(&p, "iterate", json!([[1, -1]])), json!([9841, -3281]));
    assert_eq!(
        run(&p, "kick", json!([[[1, 2, 3]], 0.5, [0, -2, 0]])),
        json!([[1.0, 1.0, 3.0]])
    );
    assert_eq!(
        run(
            &p,
            "particles",
            json!([[{"position":[1,2,3],"velocity":[2,-2,1],"mass":5}],0.5])
        ),
        json!([{"position":[2.0,1.0,3.5],"velocity":[2.0,-2.0,1.0],"mass":5.0}])
    );
    assert_eq!(
        run(&p, "prefix", json!([[2147483647, 1, -2]])),
        json!([2147483647, -2147483648i64, 2147483646])
    );
    assert_eq!(
        run(&p, "ordered", json!([[3, -1, 3, -2147483648i64]])),
        json!([-2147483648i64, -1, 3, 3])
    );
    assert_eq!(
        run(&p, "ordered_sum", json!([[16777216.0, 1.0, -16777216.0]])),
        json!(0.0)
    );
    for name in ["indexed", "iterate", "prefix", "ordered"] {
        assert_eq!(run(&p, name, json!([[]])), json!([]));
    }
}
#[test]
fn compute_contract_is_versioned_and_rejects_false_tags_and_unsafe_types() {
    let p = program();
    let m = core::CheckedModule::from_source(p).unwrap();
    assert_eq!(m.semantics(), core::CANONICAL_FLOAT_SEMANTICS);
    assert_eq!(
        m.identity().unwrap(),
        core::CheckedModule::from_bytes(&m.bytes().unwrap())
            .unwrap()
            .identity()
            .unwrap()
    );
    let mut wire: Json = serde_json::from_slice(&m.bytes().unwrap()).unwrap();
    wire["semantics"] = json!(core::SEMANTICS);
    assert!(core::CheckedModule::from_bytes(&serde_json::to_vec(&wire).unwrap()).is_err());
    for src in [
        "fn f(x:f32)->i32{return x;}",
        "fn f()->i32{return 2147483648;}",
        "fn f()->f32{return 16777217;}",
        "fn f(x:Vec2<u64>)->Vec2<u64>{return x;}",
        "fn f()->i32{return repeat(65537,0,fn(i)=>fn(a)=>a);}",
        "fn f(n:u32)->u32{return repeat(n,0,fn(i)=>fn(a)=>a);}",
    ] {
        let p = parse(&format!("module Bad;{src}")).unwrap();
        assert!(check::check(&p).is_err(), "{src}");
    }
    let p = parse("module State;query q(x:f32)->f32 {return x;}").unwrap();
    assert!(check::check(&p).is_ok());
    let p=parse("module State;fn generate(xs:List<u32>)->List<f32>{return xs.map(fn(x)=>0.0);}query q(xs:List<u32>)->Int{return count(generate(xs));}").unwrap();
    assert!(check::check(&p).is_ok());
}
#[test]
fn decimal_lexing_exact_minimum_and_total_integer_division() {
    let p=parse("module Numbers;fn f()->f32{return 1e-3+2.5e+1;}fn g(x:i32,y:i32)->i32{return quot_or(x,y,-3);}fn h()->i32{return -2147483648;}fn u(x:u32)->u32{return -x;}").unwrap();
    check::check(&p).unwrap();
    assert_eq!(run(&p, "h", json!([])), json!(-2147483648i64));
    assert_eq!(run(&p, "g", json!([-2147483648i64, -1])), json!(-3));
    assert_eq!(run(&p, "g", json!([7, 0])), json!(-3));
    assert_eq!(run(&p, "g", json!([-7, 2])), json!(-3));
    assert_eq!(run(&p, "u", json!([1])), json!(4294967295u32));
    assert_eq!(run(&p, "f", json!([])), json!(25.001f32));
}


#[test]
fn shader_capabilities_cover_collection_operations_and_keep_scalar_reductions_on_cpu() {
    let p = program();
    let dir = std::path::Path::new("build/compute-emission-test");
    verified_language::runtime::emit_gpu(&p, dir).unwrap();
    let m: Json =
        serde_json::from_slice(&std::fs::read(dir.join("manifest.json")).unwrap()).unwrap();
    assert_eq!(m["schema"], 2);
    for f in m["functions"].as_array().unwrap() {
        let name = f["name"].as_str().unwrap();
        assert_eq!(
            f["shader"].is_string(),
            !["ordered_sum", "locals", "local_step"].contains(&name),
            "{name}: {}",
            f["fallback_reason"]
        );
    }
    assert!(std::fs::read_to_string(dir.join("compute-3.wgsl"))
        .unwrap()
        .contains("fn main"));
}
#[test]
fn internal_values_and_deep_calls_have_safe_compilation_boundaries() {
    use std::{fs, process::Command};
    let p=parse("module Internal;record R{x:i32,} fn local(x:i32)->i32{let v:Vec2<i32> = vec2(x,x+1);let r:R=R{x:v.y};return r.x;}fn booleans(xs:List<i32>)->u64{return count(xs.map(fn(x)=>x<0));}").unwrap();
    let root=std::path::Path::new("build/compute-internal-test");
    verified_language::runtime::emit_rust_program(&state_native::emit(&p).unwrap(),root).unwrap();
    fs::write(root.join("src/main.rs"),"fn main(){let s=compiled_state::State::new();assert_eq!(s.function_l_local(4),5);assert_eq!(s.function_l_booleans(vec![-1,2,-3]),3);}").unwrap();
    let result=Command::new("cargo").args(["run","--quiet","--manifest-path"]).arg(root.join("Cargo.toml")).output().unwrap();assert!(result.status.success(),"{}",String::from_utf8_lossy(&result.stderr));
    let mut source = "module Deep;fn helper0(x:i32)->i32{return x+1;}".to_string();
    for i in 1..100 {
        source.push_str(&format!(
            "fn helper{i}(x:i32)->i32{{return helper{}(x);}}",
            i - 1
        ));
    }
    source.push_str("fn mapped(xs:List<i32>)->List<i32>{return xs.map(fn(x)=>helper99(x));}");
    let p = parse(&source).unwrap();
    check::check(&p).unwrap();
    assert!(state_native::emit(&p).is_ok());
    let dir = std::path::Path::new("build/compute-depth-test");
    verified_language::runtime::emit_gpu(&p, dir).unwrap();
    let m: Json = serde_json::from_slice(&fs::read(dir.join("manifest.json")).unwrap()).unwrap();
    let f = m["functions"].as_array().unwrap().last().unwrap();
    assert!(f["shader"].is_null());
    assert!(f["fallback_reason"].as_str().unwrap().contains("depth"));
}
