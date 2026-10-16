//! Byte coordinates and exact Unicode text must survive the native string
//! search path in pure and stateful emission. Rust str is an independent oracle.
use ink_core::{core::CheckedModule, eval, syntax};
use serde_json::json;
use std::{fs, process::Command};

#[test]
fn emitted_search_matches_rust_and_reference_at_every_utf8_boundary() {
    let pure = syntax::parse("module search;fn find(text:String,needle:String,start:u32)->Option<u32>{return string_find(text,needle,start);}").unwrap();
    let mut texts = ["", "a", "é", "😀", "aé😀z", "\u{feff}error\u{feff}", "\0error\0", "eerrorerror", "erroréerror", "𝄞é", "a\u{301}é"]
        .map(String::from).to_vec();
    let atoms = ['a', 'e', 'r', 'o', 'é', '😀', '\u{feff}', '\0', '\u{301}', '𝄞'];
    let mut seed = 0x51f2_7a19u32;
    for _ in 0..64 {
        let mut text = String::new();
        for _ in 0..12 {
            seed ^= seed << 13; seed ^= seed >> 17; seed ^= seed << 5;
            text.push(atoms[seed as usize % atoms.len()]);
        }
        texts.push(text);
    }
    let mut cases = Vec::new();
    for text in texts {
        for needle in ["", "a", "é", "😀", "\u{feff}", "\0", "error", "absent", "😀z", "e\u{301}", "\u{301}"] {
            for start in (0..=text.len() as u32 + 1).chain([u32::MAX]) {
                let expected = text.get(start as usize..)
                    .and_then(|tail| tail.find(needle).map(|at| start + at as u32));
                let want = expected.map_or_else(||json!({"None":null}), |at|json!({"Some":at}));
                let args = json!([text, needle, start]);
                let values = args.as_array().unwrap().iter().zip(&pure.functions[0].params)
                    .map(|(v,(_,t))|eval::Value::from_program_json(v,t,&pure).unwrap()).collect();
                assert_eq!(eval::call(&pure,"find",values,&mut 1000).unwrap().json(),want);
                cases.push(json!([args,want]));
            }
        }
    }
    let root=std::env::temp_dir().join(format!("ink-utf8-search-{}",std::process::id()));
    fs::create_dir_all(&root).unwrap();
    fs::write(root.join("cases.json"),serde_json::to_vec(&cases).unwrap()).unwrap();
    for stateful in [false,true] {
        let source=if stateful {
            "module search;query find(text:String,needle:String,start:u32)->Option<u32>{return string_find(text,needle,start);}"
        } else {
            "module search;fn find(text:String,needle:String,start:u32)->Option<u32>{return string_find(text,needle,start);}"
        };
        let checked=CheckedModule::from_source(syntax::parse(source).unwrap()).unwrap();
        let code=ink_lowering_js::lower(&checked).unwrap().javascript;
        fs::write(root.join("program.mjs"),code).unwrap();
        let runner=format!(r#"
import assert from 'node:assert/strict';import fs from 'node:fs';import * as m from './program.mjs';
const state={stateful}?m.createState():null;
for(const [args,want]of JSON.parse(fs.readFileSync(new URL('./cases.json',import.meta.url)))){{
 const got=state?state.invoke('find',args).result:m.functions.find(...args);
 assert.deepEqual(got,want,JSON.stringify(args));
}}
"#);
        fs::write(root.join("test.mjs"),runner).unwrap();
        let result=Command::new("node").arg(root.join("test.mjs")).output().unwrap();
        assert!(result.status.success(),"{}",String::from_utf8_lossy(&result.stderr));
    }
    fs::remove_dir_all(root).unwrap();
}

#[test]
fn emitted_byte_length_matches_rust_without_encoding_allocations() {
    let root=std::env::temp_dir().join(format!("ink-utf8-length-{}",std::process::id()));
    fs::create_dir_all(&root).unwrap();
    let mut texts=vec![String::new(),"a".repeat(65536),"é😀\u{feff}\0".repeat(4096)];
    for value in [0,0x7f,0x80,0x7ff,0x800,0xd7ff,0xe000,0xffff,0x10000,0x10ffff] {
        texts.push(char::from_u32(value).unwrap().to_string());
    }
    let mut seed=0x93f4_5678u32;
    for _ in 0..128 {
        let mut text=String::new();
        for _ in 0..128 {
            seed=seed.wrapping_mul(1664525).wrapping_add(1013904223);
            if let Some(c)=char::from_u32(seed%0x110000) {text.push(c);}
        }
        texts.push(text);
    }
    let cases:Vec<_>=texts.iter().map(|s|json!([s,s.len()])).collect();
    fs::write(root.join("cases.json"),serde_json::to_vec(&cases).unwrap()).unwrap();
    for kind in ["fn","query"] {
        let source=format!("module length;{kind} size(text:String)->u32{{return string_byte_len(text);}}");
        let checked=CheckedModule::from_source(syntax::parse(&source).unwrap()).unwrap();
        fs::write(root.join("program.mjs"),ink_lowering_js::lower(&checked).unwrap().javascript).unwrap();
        let stateful=kind=="query";
        fs::write(root.join("test.mjs"),format!(r#"
import assert from 'node:assert/strict';import fs from 'node:fs';import * as m from './program.mjs';
const state={stateful}?m.createState():null;
for(const [s,n]of JSON.parse(fs.readFileSync(new URL('./cases.json',import.meta.url)))){{
 assert.equal(state?state.invoke('size',[s]).result:m.functions.size(s),n);
}}
"#)).unwrap();
        let result=Command::new("node").arg(root.join("test.mjs")).output().unwrap();
        assert!(result.status.success(),"{}",String::from_utf8_lossy(&result.stderr));
    }
    fs::remove_dir_all(root).unwrap();
}
