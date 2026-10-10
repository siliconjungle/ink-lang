use serde_json::{json, Value as Json};
use verified_language::{check, core, eval, native, syntax::parse};
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
    assert_eq!(m.semantics(), core::COMPUTE_SEMANTICS);
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
    let recursive = parse("module Recursive;record R{x:R,} fn f(x:R)->R{return x;}").unwrap();
    assert!(native::emit(&recursive).unwrap_err().contains("recursive"));
    let p = parse("module State;query q(x:f32)->f32 {return x;}").unwrap();
    assert!(check::check(&p).is_err());
    let p=parse("module State;fn generate(xs:List<u32>)->List<f32>{return xs.map(fn(x)=>0.0);}query q(xs:List<u32>)->Int{return count(generate(xs));}").unwrap();
    assert!(check::check(&p).is_err());
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
fn generated_c_array_abi_is_checked_with_sanitizers() {
    use std::{fs, process::Command};
    let p = program();
    let mut c = native::emit(&p).unwrap();
    c.push_str(r#"
#include <assert.h>
int main(void){
 for(int trial=0;trial<20;trial++){
 int32_t a[]={INT32_MIN,INT32_MAX,3,-9}; ink_l_int32 xs={a,4};
 ink_l_int32 y=lang_fn_indexed(xs);assert(y.len==4&&y.data[0]==0&&y.data[1]==-2147483642&&y.data[2]==-6&&y.data[3]==-2);
 uint32_t indices[]={0,4,UINT32_MAX};ink_l_uint32 ix={indices,3}; y=lang_fn_gather(xs,ix);assert(y.len==3&&y.data[0]==INT32_MIN&&y.data[1]==-99&&y.data[2]==-99);
 int32_t loop[]={1,-1};ink_l_int32 ls={loop,2};y=lang_fn_iterate(ls);assert(y.data[0]==9841&&y.data[1]==-3281);
 ink_v3_float v[]={{1,2,3},{4,5,6}};ink_l_ink_v3_float vs={v,2};ink_l_ink_v3_float r=lang_fn_kick(vs,0.5f,(ink_v3_float){0,-2,0});assert(r.len==2&&r.data[0].y==1&&r.data[1].y==4);
 ink_r_Particle particle[]={{.ink_f_position={1,2,3},.ink_f_velocity={2,-2,1},.ink_f_mass=5}};ink_l_ink_r_Particle ps={particle,1};ink_l_ink_r_Particle pr=lang_fn_particles(ps,0.5f);assert(pr.data[0].ink_f_position.z==3.5f&&pr.data[0].ink_f_mass==5);
 float floats[]={16777216.0f,1.0f,-16777216.0f};assert(lang_fn_ordered_sum((ink_l_float){floats,3})==0.0f);
 ink_compute_reset(); }
 ink_l_int32 empty={0,0};assert(lang_fn_indexed(empty).len==0);ink_compute_reset();return 0;
}
"#);
    let dir = std::path::Path::new("build/compute-c-test");
    fs::create_dir_all(dir).unwrap();
    fs::write(dir.join("test.c"), c).unwrap();
    let compile = Command::new("clang")
        .args([
            "-O2",
            "-std=c11",
            "-Wall",
            "-Wextra",
            "-Werror",
            "-fsanitize=address,undefined",
            "-ffp-contract=off",
        ])
        .arg(dir.join("test.c"))
        .arg("-o")
        .arg(dir.join("test"))
        .output()
        .unwrap();
    assert!(
        compile.status.success(),
        "{}",
        String::from_utf8_lossy(&compile.stderr)
    );
    let result = Command::new(dir.join("test")).output().unwrap();
    assert!(
        result.status.success(),
        "{}",
        String::from_utf8_lossy(&result.stderr)
    );
}
#[test]
fn shader_capabilities_leave_ordered_reductions_and_missing_primitives_on_cpu() {
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
            !["ordered_sum", "prefix", "ordered", "locals", "local_step"].contains(&name),
            "{name}: {}",
            f["fallback_reason"]
        );
    }
    assert!(std::fs::read_to_string(dir.join("compute-3.wgsl"))
        .unwrap()
        .contains("if ("));
}
#[test]
fn internal_values_and_deep_calls_have_safe_compilation_boundaries() {
    use std::{fs, process::Command};
    let p=parse("module Internal;record R{x:i32,} fn local(x:i32)->i32{let v:Vec2<i32> = vec2(x,x+1);let r:R=R{x:v.y};return r.x;}fn booleans(xs:List<i32>)->u64{return count(xs.map(fn(x)=>x<0));}").unwrap();
    let mut c = native::emit(&p).unwrap();
    c.push_str("int main(void){int32_t a[]={-1,2,-3};return !(lang_fn_local(4)==5 && lang_fn_booleans((ink_l_int32){a,3})==3);}");
    let dir = std::path::Path::new("build/compute-internal-test");
    fs::create_dir_all(dir).unwrap();
    fs::write(dir.join("test.c"), c).unwrap();
    let r = Command::new("clang")
        .args(["-O2", "-std=c11", "-Wall", "-Wextra", "-Werror"])
        .arg(dir.join("test.c"))
        .arg("-o")
        .arg(dir.join("test"))
        .output()
        .unwrap();
    assert!(r.status.success(), "{}", String::from_utf8_lossy(&r.stderr));
    assert!(Command::new(dir.join("test")).status().unwrap().success());
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
    assert!(native::emit(&p).is_ok());
    let dir = std::path::Path::new("build/compute-depth-test");
    verified_language::runtime::emit_gpu(&p, dir).unwrap();
    let m: Json = serde_json::from_slice(&fs::read(dir.join("manifest.json")).unwrap()).unwrap();
    let f = m["functions"].as_array().unwrap().last().unwrap();
    assert!(f["shader"].is_null());
    assert!(f["fallback_reason"].as_str().unwrap().contains("depth"));
}
