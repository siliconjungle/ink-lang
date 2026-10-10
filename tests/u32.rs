use verified_language::{
    check,
    eval::{self, Value},
    native,
    syntax::parse,
};
fn program() -> verified_language::syntax::Program {
    let p=parse(r#"module words;
fn square(x:u32)->u32{return x*x;}
fn total(xs:List<u32>,scale:u32)->u32{return sum(xs.map(fn(x)=>square(x+1)*scale).filter(fn(x)=>x<100));}
fn constant(xs:List<u32>)->u32{return sum(xs.map(fn(x)=>1));}
fn folded(xs:List<u32>)->u32{return foldr(xs,0,fn(x)=>fn(rest)=>x-rest);}
fn count32(xs:List<u32>)->u64{return count(xs);}
fn literal()->u32{return (4294967295+1)*4294967295;}
fn compare(x:u32)->Bool{return 1+2 < x;}
fn select(x:u32,b:Bool)->u32{return choose(b,1,x+2);}
fn wide(x:u64)->u64{return (x+1)*18446744073709551615;}
"#).unwrap();
    check::check(&p).unwrap();
    p
}
#[test]
fn contextual_literals_empty_lists_and_modular_intermediates() {
    let p = program();
    let run = |n, args| eval::call(&p, n, args, &mut 100000).unwrap();
    assert_eq!(
        run(
            "total",
            vec![
                Value::List(vec![Value::U32(u32::MAX), Value::U32(1), Value::U32(2)]),
                Value::U32(3)
            ]
        ),
        Value::U32(39)
    );
    assert_eq!(run("constant", vec![Value::List(vec![])]), Value::U32(0));
    assert_eq!(
        run(
            "constant",
            vec![Value::List(vec![Value::U32(0), Value::U32(5)])]
        ),
        Value::U32(2)
    );
    assert_eq!(
        run(
            "folded",
            vec![Value::List(vec![
                Value::U32(1),
                Value::U32(2),
                Value::U32(3)
            ])]
        ),
        Value::U32(2)
    );
    assert_eq!(run("count32", vec![Value::List(vec![])]), Value::U64(0));
    assert_eq!(run("literal", vec![]), Value::U32(0));
    assert_eq!(run("compare", vec![Value::U32(4)]), Value::Bool(true));
    assert_eq!(
        run("select", vec![Value::U32(u32::MAX), Value::Bool(false)]),
        Value::U32(1)
    );
    assert_eq!(run("wide", vec![Value::U64(u64::MAX)]), Value::U64(0));
}
#[test]
fn narrowing_and_cross_width_values_are_rejected() {
    for s in [
        "fn f()->u32{return 4294967296;}",
        "fn f(x:u32)->u32{return x+4294967296;}",
        "fn f(x:u32,y:u64)->u32{return x+y;}",
        "fn f(x:u64)->u32{return x;}",
        "fn f(xs:List<u32>)->u32{return count(xs);}",
        "fn f(x:u32)->Bool{return x<4294967296;}",
    ] {
        let p = parse(&format!("module t;{s}")).unwrap();
        assert!(check::check(&p).is_err(), "{s}");
    }
    assert!(Value::from_json(
        &serde_json::json!(4294967296u64),
        &verified_language::syntax::Type::U32
    )
    .is_err());
}
#[test]
fn compiled_c_matches_wrapping_oracle() {
    use std::{fs, process::Command};
    let p = program();
    let mut c = native::emit(&p).unwrap();
    c.push_str(r#"#include <stdio.h>
int main(void){uint32_t a[]={UINT32_MAX,1,2};printf("%u %u %u %llu %u %u\n",lang_fn_total(a,3,3),lang_fn_constant(a,3),lang_fn_folded(a,3),(unsigned long long)lang_fn_count32(a,3),lang_fn_literal(),lang_fn_compare(4));}
"#);
    let dir = std::path::Path::new("build/u32-c-test");
    fs::create_dir_all(dir).unwrap();
    fs::write(dir.join("test.c"), c).unwrap();
    let compile = Command::new("clang")
        .args(["-O2", "-std=c11", "-Wall", "-Wextra", "-Werror"])
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
    let output = Command::new(dir.join("test")).output().unwrap();
    assert!(output.status.success());
    assert_eq!(
        String::from_utf8(output.stdout).unwrap().trim(),
        "39 3 0 3 0 1"
    );
}
#[test]
fn stateful_reference_and_rust_share_pure_word_semantics() {
    use std::{fs, process::Command};
    use verified_language::{state_native, stateful::Runtime};
    let p = parse(
        r#"module t;
fn nested(x:u32)->u32{return (1+2)*(x+1);}
fn choice(x:u32,b:Bool)->u32{return choose(b,1,nested(x));}
fn tally(xs:List<u32>)->u64{return count(xs.map(fn(x)=>1));}
fn fold(xs:List<u32>)->u32{return foldr(xs,0,fn(x)=>fn(rest)=>x-rest);}
record Label { text: String, }
fn exact(x:Int)->Int{return x;}
fn word_with_text(x:String)->u32{return 4294967295+1;}
query carried_word(x:String)->u32{return word_with_text(x);}
fn text(x:String)->String{return x;}
fn flags(xs:List<Bool>)->u32{return sum(xs.filter(fn(x)=>x).map(fn(x)=>1));}
fn labels(xs:List<Label>)->List<Label>{return xs.filter(fn(x)=>true);}
fn make_label(x:String)->Label{let y:String=x;return Label{text:y};}
fn read_label(x:Label)->String{return x.text;}
query constructed(x:String)->String{return read_label(make_label(x));}
query echo_exact(x:Int)->Int{return exact(x);}
query echo_text(x:String)->String{return text(x);}
query bool_words(xs:List<Bool>)->u32{return flags(xs);}
query record_words(xs:List<Label>)->List<Label>{return labels(xs);}
query first(x:u32,b:Bool)->u32{return choice(x,b);}
query count_words(xs:List<u32>)->u64{return tally(xs);}
query ordered(xs:List<u32>)->u32{return fold(xs);}
"#,
    )
    .unwrap();
    check::check(&p).unwrap();
    let script = serde_json::json!([{ "call":"echo_exact","args":[{"Int":"18446744073709551616000"}]},{"call":"echo_text","args":["hello"]},{"call":"bool_words","args":[[true,false,true]]},{"call":"record_words","args":[[{"text":"one"},{"text":"two"}]]},{"call":"first","args":[4294967295u32,false]},{"call":"first","args":[4294967295u32,true]},{"call":"count_words","args":[[]]},{"call":"count_words","args":[[1,2,3]]},{"call":"ordered","args":[[1,2,3]]},{"call":"carried_word","args":["opaque parameter"]},{"call":"constructed","args":["new label"]}]);
    let mut rt = Runtime::new(p.clone()).unwrap();
    let expected: Vec<_> = script
        .as_array()
        .unwrap()
        .iter()
        .map(|s| {
            rt.invoke_json(s["call"].as_str().unwrap(), &s["args"])
                .unwrap()
                .json()
        })
        .collect();
    assert_eq!(
        expected[0]["result"],
        serde_json::json!({"Int":"18446744073709551616000"})
    );
    assert_eq!(expected[1]["result"], serde_json::json!("hello"));
    assert_eq!(expected[2]["result"], serde_json::json!(2));
    assert_eq!(expected[9]["result"], serde_json::json!(0));
    assert_eq!(expected[10]["result"], serde_json::json!("new label"));
    assert_eq!(
        expected[3]["result"],
        serde_json::json!([{"text":"one"},{"text":"two"}])
    );
    let dir = std::path::Path::new("build/u32-state-test");
    fs::create_dir_all(dir.join("src")).unwrap();
    fs::write(
        dir.join("src/lib.rs"),
        state_native::emit(&p, None).unwrap(),
    )
    .unwrap();
    fs::write(
        dir.join("src/main.rs"),
        verified_language::runtime::STATE_RUNNER,
    )
    .unwrap();
    fs::write(dir.join("Cargo.toml"),"[package]\nname=\"compiled-state\"\nversion=\"0.1.0\"\nedition=\"2021\"\n[dependencies]\nnum-bigint=\"=0.4.8\"\nsha2=\"=0.10.9\"\nserde_json=\"=1.0.151\"\n").unwrap();
    fs::write(dir.join("script.json"), script.to_string()).unwrap();
    let run = Command::new(env!("CARGO"))
        .args(["run", "--quiet", "--offline", "--manifest-path"])
        .arg(dir.join("Cargo.toml"))
        .arg("--")
        .arg(dir.join("script.json"))
        .output()
        .unwrap();
    assert!(
        run.status.success(),
        "{}",
        String::from_utf8_lossy(&run.stderr)
    );
    let observed: serde_json::Value = serde_json::from_slice(&run.stdout).unwrap();
    assert_eq!(observed, serde_json::json!(expected));
}
