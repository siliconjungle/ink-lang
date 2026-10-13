use serde_json::json;
use std::{collections::BTreeMap, fs, path::Path, process::Command};
use verified_language::{
    abi::{
        json_value::{self, JsonCodec},
        value_wire::{Limits, Schema},
    },
    core::CheckedModule,
    eval, modules,
    stateful::Runtime,
    syntax::{self, Type},
};
#[path = "support/parity.rs"]
mod parity;
fn program() -> syntax::Program {
    modules::load("examples/json/main.ink").unwrap().program
}
fn codec(p: &syntax::Program) -> JsonCodec {
    let contract = verified_language::abi::wire_contract::source_contract(p).unwrap();
    JsonCodec::new(Schema::from_descriptor(&contract["functions"]["identity"]["result"]).unwrap())
        .unwrap()
}
#[test]
fn json_library_values_errors_and_all_cpu_lowerings_agree() {
    let p = program();
    CheckedModule::from_source(p.clone()).unwrap();
    let codec = codec(&p);
    let limits = Limits::default();
    let mut runtime = Runtime::new(p.clone()).unwrap();
    let mut steps = vec![];
    let mut expected = vec![];
    for text in [
        "null",
        "true",
        "false",
        "-0",
        "1.2300e+1000",
        "123456789012345678901234567890",
        "\"雪\\u0000😀\"",
        "[]",
        "{}",
        "{\"title\":null,\"unknown\":[1,{\"x\":false}],\"__proto__\":\"safe\"}",
    ] {
        let input = codec.parse(text, limits).unwrap();
        let bytes = codec.parse_binary(text, limits).unwrap();
        codec.validate_binary(&bytes, limits).unwrap();
        assert_eq!(codec.stringify_binary(&bytes, limits).unwrap(), text);
        for name in ["identity", "mark_received", "title", "visible"] {
            let f = p.functions.iter().find(|f| f.name == name).unwrap();
            let args = vec![eval::Value::from_program_json(&input, &f.params[0].1, &p).unwrap()];
            let output = eval::call(&p, name, args, &mut 1_000_000).unwrap().json();
            if name == "identity" {
                assert_eq!(output, input);
            }
            if name == "mark_received" && text.starts_with('{') {
                let doc = &output["Ok"];
                let rendered = codec.stringify(doc, limits).unwrap();
                assert!(rendered.starts_with("{\"received\":true"));
                if text.contains("unknown") {
                    assert!(rendered.contains("\"unknown\":[1,{\"x\":false}]"));
                }
            }
            steps.push(json!({"pure":name,"args":[input]}));
            expected.push(
                json!({"reply":{"value":output},"snapshot":runtime.checkpoint_portable().unwrap()}),
            );
        }
    }
    for (name, args) in [
        (
            "save",
            json!([
                "doc",
                codec
                    .parse("{\"title\":null,\"unknown\":[1,2]}", limits)
                    .unwrap()
            ]),
        ),
        ("load", json!(["doc"])),
        ("load", json!(["missing"])),
    ] {
        let outcome = runtime.invoke_json(name, &args).unwrap();
        steps.push(json!({"call":name,"args":args}));
        expected.push(json!({"reply":{"outcome":outcome.json()},"snapshot":runtime.checkpoint_portable().unwrap()}));
    }
    parity::conformance(
        "json-tooling-parity",
        p,
        include_str!("../examples/json/main.ink"),
        steps,
        expected,
    );
}
#[test]
fn json_parser_and_binary_ingress_reject_adversarial_inputs() {
    let p = program();
    let codec = codec(&p);
    let l = Limits::default();
    for text in [
        "{\"x\":0,\"x\":1}",
        "{\"x\":0,\"\\u0078\":1}",
        "[1,]",
        "{\"x\":1,}",
        "01",
        "+1",
        "1.",
        "1e",
        "NaN",
        "Infinity",
        "\"\\ud800\"",
        "\"\\udfff\"",
        "true false",
        "null\u{b}",
        "\"a\nb\"",
    ] {
        assert!(codec.parse(text, l).is_err(), "{text}");
    }
    assert!(codec.parse("[[0]]", Limits { depth: 1, ..l }).is_err());
    assert!(codec.parse("[0,1]", Limits { nodes: 2, ..l }).is_err());
    assert!(codec.parse("\"雪\"", Limits { bytes: 4, ..l }).is_err());
    let good = codec.parse_binary("{\"x\":1}", l).unwrap();
    for n in 0..good.len() {
        assert!(
            codec.validate_binary(&good[..n], l).is_err(),
            "truncation {n}"
        );
    }
    let mut bad = good.clone();
    bad.push(0);
    assert!(codec.validate_binary(&bad, l).is_err());
    bad = good.clone();
    bad[8] ^= 1;
    assert!(codec.validate_binary(&bad, l).is_err());
    bad = good.clone();
    bad[40..44].copy_from_slice(&u32::MAX.to_le_bytes());
    assert!(codec.validate_binary(&bad, l).is_err());
    let invalid = json_value::Json::Number("01".into()).to_ink();
    let bytes = codec.schema().encode(&invalid, l).unwrap();
    assert!(codec.validate_binary(&bytes, l).is_err());
    let dup = json_value::Json::Object(vec![
        ("x".into(), json_value::Json::Null),
        ("x".into(), json_value::Json::Null),
    ])
    .to_ink();
    let bytes = codec.schema().encode(&dup, l).unwrap();
    assert!(codec.validate_binary(&bytes, l).is_err());
}
#[test]
fn portable_schemas_ignore_unrelated_code_and_reject_collision() {
    let schema = |source: &str| {
        let p = syntax::parse(source).unwrap();
        let t = &p.functions[0].result;
        let root = verified_language::abi::describe(t, &p.records, &p.enums, &p.ids).unwrap();
        let named = p
            .records
            .keys()
            .map(|n| {
                (
                    n.clone(),
                    verified_language::abi::describe(
                        &Type::Named(n.clone()),
                        &p.records,
                        &p.enums,
                        &p.ids,
                    )
                    .unwrap(),
                )
            })
            .collect::<BTreeMap<_, _>>();
        Schema::new(root, named).unwrap()
    };
    let a = schema(
        "module stable; enum Value{Empty,Number(u32),} fn value()->Value{return Value.Number(1);}",
    );
    let b=schema("module stable; enum Value{Empty,Number(u32),} fn value()->Value{return Value.Number(99);} fn other()->Bool{return true;}");
    assert_eq!(a.identity(), b.identity());
    assert!(Schema::new(json!({"kind":"record","name":"R","fields":[{"name":"x","type":{"kind":"u32"}},{"name":"x","type":{"kind":"u32"}}]}),BTreeMap::new()).is_err());
}
#[test]
fn javascript_and_rust_codecs_and_compiled_binary_calls_agree() {
    let p = program();
    let c = codec(&p);
    let l = Limits::default();
    let root = Path::new(env!("CARGO_MANIFEST_DIR")).join("build/json-wire-conformance");
    fs::create_dir_all(&root).unwrap();
    let module = CheckedModule::from_source(p.clone()).unwrap();
    let emitted = verified_language::javascript::lower(&module).unwrap();
    fs::write(root.join("module.mjs"), emitted.javascript).unwrap();
    let mut cases = vec![];
    for text in [
        "null",
        "-0",
        "1e10000",
        "123456789012345678901234567890",
        "{\"title\":null,\"unknown\":[true,\"雪😀\"]}",
    ] {
        cases.push(json!({"text":text,"value":c.parse(text,l).unwrap(),"bytes":c.parse_binary(text,l).unwrap()}));
    }
    let typed=[("u64","18446744073709551615"),("u32","4.00e2"),("i32","-2147483648"),("int","123456789012345678901234567890"),("int","-1.20e2"),("f32","-0"),("f32","0.1"),("string","\"雪\""),("bool","false"),("unit","null")].into_iter().map(|(kind,text)|{
        let schema=Schema::new(json!({"kind":kind}),BTreeMap::new()).unwrap();
        let codec=verified_language::abi::typed_json::TypedJsonCodec::new(schema.clone());
        json!({"text":text,"schema":schema.descriptor(),"bytes":codec.parse_binary(text,l).unwrap()})
    }).collect::<Vec<_>>();
    fs::write(
        root.join("fixtures.json"),
        json!({"schema":c.schema().descriptor(),"cases":cases,"typed":typed}).to_string(),
    )
    .unwrap();
    // The lowering manifest wraps interface metadata; generated metadata carries
    // the exact same schema from the target-neutral ABI.
    let contract = verified_language::abi::wire_contract::source_contract(&p).unwrap();
    let input =
        Schema::from_descriptor(&contract["functions"]["mark_received"]["arguments"]).unwrap();
    let output =
        Schema::from_descriptor(&contract["functions"]["mark_received"]["result"]).unwrap();
    let document = c
        .parse("{\"title\":\"hello\",\"unknown\":1e10000}", l)
        .unwrap();
    let request = input.encode(&json!({"document":document}), l).unwrap();
    fs::write(root.join("request.bin"), request).unwrap();
    fs::write(root.join("check.mjs"),r#"
import assert from 'node:assert/strict';import fs from 'node:fs';
import {ValueCodec,JsonCodec,parseJson,stringifyJson,callBinary,valueCodecs,metadata,createValueCodec,TypedJsonCodec} from './module.mjs';
const f=JSON.parse(fs.readFileSync(new URL('./fixtures.json',import.meta.url)));
const values=new ValueCodec(f.schema),json=new JsonCodec(values);
const computed=await createValueCodec(f.schema.root,f.schema.named);assert.equal(computed.descriptor.identity,f.schema.identity);
for(const c of f.cases){const bytes=json.parseBinary(c.text);assert.deepEqual(Array.from(bytes),c.bytes);assert.deepEqual(values.decode(bytes),c.value);assert.equal(json.stringifyBinary(bytes),c.text);assert.equal(values.validate(bytes),true);assert.equal(json.validateBinary(bytes),true);for(let n=0;n<bytes.length;n++)assert.throws(()=>values.validate(bytes.subarray(0,n)));}
for(const text of ['{"x":0,"x":1}','{"x":0,"\\u0078":1}','[1,]','01','+1','1.','1e','NaN','"\\ud800"','true false'])assert.throws(()=>parseJson(text));
assert.throws(()=>parseJson('[[0]]',{depth:1}));assert.throws(()=>parseJson('[0,1]',{nodes:2}));assert.throws(()=>parseJson('"雪"',{bytes:4}));
for(const c of f.typed){const values=new ValueCodec(c.schema),typed=new TypedJsonCodec(values);const bytes=typed.parseBinary(c.text);assert.deepEqual(Array.from(bytes),c.bytes);assert.deepEqual(Array.from(typed.parseBinary(typed.stringifyBinary(bytes))),c.bytes);}
assert.throws(()=>parseJson('null',{nodes:Infinity}));assert.throws(()=>values.validate(new Uint8Array(new SharedArrayBuffer(100))));
const invalid=values.encode({payload:{Err:{Err:{Ok:{item0:'01'}}}}});assert.throws(()=>json.validateBinary(invalid));
const duplicate=values.encode({payload:{Err:{Err:{Err:{Err:{Err:{item0:[{key:'x',value:parseJson('null')},{key:'x',value:parseJson('null')}]}}}}}}});assert.throws(()=>json.validateBinary(duplicate));
const reply=callBinary('mark_received',new Uint8Array(fs.readFileSync(new URL('./request.bin',import.meta.url))));
fs.writeFileSync(new URL('./reply.bin',import.meta.url),reply);
assert.equal(stringifyJson(valueCodecs.mark_received.result.decode(reply).Ok),'{"received":true,"title":"hello","unknown":1e10000}');
console.log('JSON and binary cross-language conformance passed');
"#).unwrap();
    let run = Command::new("node")
        .arg(root.join("check.mjs"))
        .output()
        .unwrap();
    assert!(
        run.status.success(),
        "{}",
        String::from_utf8_lossy(&run.stderr)
    );
    let reply = output
        .decode(&fs::read(root.join("reply.bin")).unwrap(), l)
        .unwrap();
    assert_eq!(
        c.stringify(&reply["Ok"], l).unwrap(),
        "{\"received\":true,\"title\":\"hello\",\"unknown\":1e10000}"
    );
    // Compile the literal C and Rust native implementations and exercise their
    // binary APIs on the very same request and expected reply bytes.
    for target in ["c", "rust"] {
        let dir = root.join(target);
        if target == "c" {
            verified_language::runtime::emit_c_program(&module, &dir).unwrap();
        } else {
            let code = verified_language::state_native::emit(&p).unwrap();
            verified_language::runtime::emit_rust_program(&code, &dir).unwrap();
        }
        fs::write(dir.join("src/main.rs"),r#"use compiled_state::{State,ValueWireLimits};fn main(){let request=std::fs::read(std::env::args().nth(1).unwrap()).unwrap();let mut state=State::new();let reply=state.call_binary("mark_received",&request,ValueWireLimits::default()).unwrap();std::fs::write(std::env::args().nth(2).unwrap(),reply).unwrap();}"#).unwrap();
        let build = Command::new(env!("CARGO"))
            .args(["build", "--offline", "--quiet", "--manifest-path"])
            .arg(dir.join("Cargo.toml"))
            .arg("--target-dir")
            .arg(dir.join("target"))
            .output()
            .unwrap();
        assert!(
            build.status.success(),
            "{target}: {}",
            String::from_utf8_lossy(&build.stderr)
        );
        let reply_path = dir.join("reply.bin");
        let run = Command::new(dir.join("target/debug/compiled-state"))
            .arg(root.join("request.bin"))
            .arg(&reply_path)
            .output()
            .unwrap();
        assert!(
            run.status.success(),
            "{target}: {}",
            String::from_utf8_lossy(&run.stderr)
        );
        assert_eq!(
            fs::read(reply_path).unwrap(),
            fs::read(root.join("reply.bin")).unwrap()
        );
        if let Ok(zig) = std::env::var("INK_TEST_ZIG") {
            let mut command = Command::new(env!("CARGO"));
            command
                .args([
                    "build",
                    "--offline",
                    "--quiet",
                    "--lib",
                    "--target",
                    "wasm32-unknown-unknown",
                    "--manifest-path",
                ])
                .arg(dir.join("Cargo.toml"))
                .arg("--target-dir")
                .arg(dir.join("target"));
            if target == "c" {
                for (name, operation) in [("zig-cc", "cc"), ("zig-ar", "ar")] {
                    let path = dir.join(name);
                    fs::write(
                        &path,
                        format!(
                            "#!/bin/sh\nexec '{}' {operation} \"$@\"\n",
                            zig.replace('\'', "'\"'\"'")
                        ),
                    )
                    .unwrap();
                    use std::os::unix::fs::PermissionsExt;
                    fs::set_permissions(&path, fs::Permissions::from_mode(0o755)).unwrap();
                }
                command
                    .env("INK_CC", dir.join("zig-cc"))
                    .env("INK_AR", dir.join("zig-ar"))
                    .env("INK_CC_KIND", "zig");
            }
            let built = command.output().unwrap();
            assert!(
                built.status.success(),
                "{target} binary Wasm: {}",
                String::from_utf8_lossy(&built.stderr)
            );
        }
    }
    if std::env::var_os("INK_TEST_ZIG").is_some() {
        fs::write(
            root.join("state-wasm.mjs"),
            verified_language::runtime::STATE_WASM_HOST,
        )
        .unwrap();
        fs::write(root.join("binary-wasm.mjs"),r#"
import fs from 'node:fs';import assert from 'node:assert/strict';import {StatefulModule} from './state-wasm.mjs';import {metadata} from './module.mjs';
const index=Object.keys(metadata.wire.functions).filter(n=>!metadata.wire.functions[n].unsupported).sort().indexOf('mark_received');
const request=new Uint8Array(fs.readFileSync(new URL('./request.bin',import.meta.url))),expected=fs.readFileSync(new URL('./reply.bin',import.meta.url));
for(const backend of ['c','rust']){const module=await StatefulModule.instantiate(new Uint8Array(fs.readFileSync(new URL(`${backend}/target/wasm32-unknown-unknown/debug/compiled_state.wasm`,import.meta.url))));const state=module.create();const before=state.snapshot();assert.deepEqual(Buffer.from(state.pureBinary(index,request)),expected);const bad=request.slice();bad[8]^=1;assert.throws(()=>state.pureBinary(index,bad),/schema/);assert.deepEqual(state.snapshot(),before);assert.throws(()=>state.pureBinary(4294967295,request),/index/);state.dispose();console.log(`${backend} raw binary Wasm matched`);}
"#).unwrap();
        let run = Command::new("node")
            .arg(root.join("binary-wasm.mjs"))
            .output()
            .unwrap();
        assert!(
            run.status.success(),
            "{}",
            String::from_utf8_lossy(&run.stderr)
        );
        println!("{}", String::from_utf8_lossy(&run.stdout));
    }
}

#[test]
fn json_database_laws_replay_and_rehashed_false_law_rejects() {
    use verified_language::{
        laws::CheckedCatalogue,
        registry::{self, CheckedBundle, Entry},
        semantic::{self, Node},
    };
    let bundle =
        serde_json::from_slice(&fs::read("knowledge/store/json-view.json").unwrap()).unwrap();
    let mut catalogue = CheckedBundle::check(&bundle).unwrap().catalogue().unwrap();
    assert_eq!(catalogue.roots.len(), 6);
    CheckedCatalogue::check(&catalogue, &syntax::Program::default()).unwrap();
    let names: BTreeMap<String, String> =
        serde_json::from_slice(&fs::read("knowledge/store/names.json").unwrap()).unwrap();
    let old = &names["rewrite/json/lookup_string_put"];
    let mut law = catalogue.objects.remove(old).unwrap();
    law.to = semantic::term(law.params["empty"].clone(), Node::Free("empty".into()));
    let forged = registry::identity(&Entry::from_law(&law).unwrap()).unwrap();
    catalogue.objects.insert(forged.clone(), law);
    for root in &mut catalogue.roots {
        if root == old {
            *root = forged.clone();
        }
    }
    assert!(CheckedCatalogue::check(&catalogue, &syntax::Program::default()).is_err());
}
