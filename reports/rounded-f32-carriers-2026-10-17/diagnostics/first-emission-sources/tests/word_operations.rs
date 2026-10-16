//! Native 32-bit operators and direct BigInt forms for fixed word operations
//! must agree with the reference evaluator on every width, edge and count.
use ink_core::{core::CheckedModule, eval, syntax::parse};
use serde_json::{json, Value};
use std::{fs, process::Command};

const OPS: [&str; 8] = [
    "word_not",
    "word_and",
    "word_or",
    "word_xor",
    "wrapping_shl",
    "wrapping_shr",
    "rotate_left",
    "rotate_right",
];

fn source(stateful: bool) -> String {
    let mut s = String::from("module words;\n");
    if stateful {
        s.push_str("state Seen:Table<u32,u32> = Table.empty();\n");
    }
    for (ty, short) in [("u32", "u"), ("i32", "i"), ("u64", "w")] {
        for op in OPS {
            let counted = matches!(op, "wrapping_shl" | "wrapping_shr" | "rotate_left" | "rotate_right");
            let second = if counted { "u32" } else { ty };
            let call = if op == "word_not" { format!("{op}(x)") } else { format!("{op}(x,y)") };
            let kind = if stateful { "query" } else { "fn" };
            let params = if op == "word_not" { format!("x:{ty}") } else { format!("x:{ty},y:{second}") };
            s.push_str(&format!("{kind} {op}_{short}({params})->{ty}{{return {call};}}\n"));
        }
    }
    s
}

fn cases() -> Vec<(String, Value, Value)> {
    let words: Vec<u64> = vec![0, 1, 2, 31, 32, 33, 63, 64, 65, 0x7fff_ffff, 0x8000_0000, 0xffff_fffe, 0xffff_ffff];
    let wides: Vec<u64> = vec![0, 1, 63, 64, 0x8000_0000_0000_0000, 0x7fff_ffff_ffff_ffff, u64::MAX, 9007199254740993];
    let mut seed = 0x9e37_79b9_7f4a_7c15u64;
    let mut next = || {
        seed ^= seed << 13;
        seed ^= seed >> 7;
        seed ^= seed << 17;
        seed
    };
    let mut out = vec![];
    for op in OPS {
        let counted = matches!(op, "wrapping_shl" | "wrapping_shr" | "rotate_left" | "rotate_right");
        let mut pairs: Vec<(u64, u64)> = vec![];
        for &x in &words {
            for &y in &words {
                pairs.push((x, y));
            }
        }
        for _ in 0..64 {
            pairs.push((next(), next()));
        }
        for &(x, y) in &pairs {
            let count = y as u32;
            let y32 = if counted { json!(count) } else { json!(y as u32) };
            out.push((format!("{op}_u"), json!(x as u32), y32));
            let yi = if counted { json!(count) } else { json!(y as u32 as i32) };
            out.push((format!("{op}_i"), json!(x as u32 as i32), yi));
        }
        let mut wide_pairs: Vec<(u64, u64)> = vec![];
        for &x in &wides {
            for &y in &words {
                wide_pairs.push((x, y));
            }
            for &y in &wides {
                wide_pairs.push((x, y));
            }
        }
        for _ in 0..64 {
            wide_pairs.push((next(), next()));
        }
        for (x, y) in wide_pairs {
            let y = if counted { json!(y as u32) } else { json!(y) };
            out.push((format!("{op}_w"), json!(x), y));
        }
    }
    out
}

fn run(stateful: bool) {
    // The reference result comes from the pure program; the stateful module
    // emits the same expressions through the state lowering.
    let reference = parse(&source(false)).unwrap();
    let p = parse(&source(stateful)).unwrap();
    let module = CheckedModule::from_source(p.clone()).unwrap();
    let emitted = ink_lowering_js::lower(&module).unwrap();
    assert!(!emitted.javascript.contains("__word(\"word_xor\""), "32-bit words use native operators");
    let mut rows = vec![];
    for (name, x, y) in cases() {
        let f = reference.functions.iter().find(|f| f.name == name).unwrap();
        let args = if name.starts_with("word_not") { vec![x.clone()] } else { vec![x.clone(), y.clone()] };
        let values = args
            .iter()
            .zip(&f.params)
            .map(|(v, (_, t))| eval::Value::from_program_json(v, t, &reference).unwrap())
            .collect::<Vec<_>>();
        let expected = eval::call(&reference, &name, values, &mut 1_000_000).unwrap().json();
        let wide = |v: &Value, t: &ink_core::syntax::Type| {
            if *t == ink_core::syntax::Type::U64 { json!(v.as_u64().unwrap().to_string()) } else { v.clone() }
        };
        let shown: Vec<Value> = args.iter().zip(&f.params).map(|(v, (_, t))| wide(v, t)).collect();
        rows.push(json!({"name":name,"args":shown,"wide":f.params.iter().map(|(_, t)|*t==ink_core::syntax::Type::U64).collect::<Vec<_>>(),"expected":wide(&expected,&f.result)}));
    }
    let dir = std::env::temp_dir().join(format!("ink-js-words-{}-{stateful}", std::process::id()));
    fs::create_dir_all(&dir).unwrap();
    fs::write(dir.join("program.mjs"), &emitted.javascript).unwrap();
    fs::write(dir.join("cases.json"), serde_json::to_vec(&rows).unwrap()).unwrap();
    fs::write(
        dir.join("test.mjs"),
        r#"
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as program from './program.mjs';
const cases=JSON.parse(readFileSync(new URL('./cases.json',import.meta.url)));
const state=process.argv[2]==='state'?program.createState():null;
const show=v=>typeof v==='bigint'?v.toString():v;
for (const {name,args,wide,expected} of cases) {
  const values=args.map((v,i)=>wide[i]?BigInt(v):v);
  const actual=state?state.invoke(name,values).result:program.functions[name](...values);
  assert.equal(show(actual),expected,`${name}(${args.join(',')})`);
}
console.log(`${cases.length} word operations agree with the reference evaluator`);
"#,
    )
    .unwrap();
    let output = Command::new("node").arg(dir.join("test.mjs")).arg(if stateful { "state" } else { "pure" }).output().expect("Node.js required");
    assert!(
        output.status.success(),
        "{}{}",
        String::from_utf8_lossy(&output.stdout),
        String::from_utf8_lossy(&output.stderr)
    );
    println!("{}", String::from_utf8_lossy(&output.stdout));
    fs::remove_dir_all(dir).unwrap();
}

#[test]
fn pure_word_operations_match_the_reference_evaluator() {
    run(false);
}

#[test]
fn stateful_word_operations_match_the_reference_evaluator() {
    run(true);
}

/// Loop-carried internal state is held as one local per field. Results must
/// match the reference evaluator for nested loops, early exits and whole-state
/// uses after the loop.
#[test]
fn split_loop_state_matches_the_reference_evaluator() {
    let source = "module loops;
record Pair{a:u32,b:u32,}
fn mix(n:u32)->u32{var x:u32=2166136261;var j:u32=0;while j<n limit 4096{var i:u32=0;while i<17 limit 64{x=(x ^ 2654435769) * 16777619;x=x ^ wrapping_shr(x,13);i=i+1;}j=j+1;}return x;}
fn early(n:u32)->u32{var total:u32=0;var k:u32=0;while k<n && total<1000 limit 4096{total=total+k*k;k=k+1;}return total+k;}
fn swap(n:u32)->Pair{var a:u32=1;var b:u32=2;for i in 0..9{let t=a;a=b+i;b=t;}return Pair{a:a,b:b+n};}
";
    let p = parse(source).unwrap();
    let module = CheckedModule::from_source(p.clone()).unwrap();
    let emitted = ink_lowering_js::lower(&module).unwrap();
    let mut rows = vec![];
    for (name, n) in [("mix", 0u32), ("mix", 1), ("mix", 300), ("early", 0), ("early", 5), ("early", 4000), ("swap", 7)] {
        let f = p.functions.iter().find(|f| f.name == name).unwrap();
        let expected = eval::call(&p, name, vec![eval::Value::from_program_json(&json!(n), &f.params[0].1, &p).unwrap()], &mut 10_000_000)
            .unwrap()
            .json();
        rows.push(json!({"name":name,"n":n,"expected":expected}));
    }
    let dir = std::env::temp_dir().join(format!("ink-js-loops-{}", std::process::id()));
    fs::create_dir_all(&dir).unwrap();
    fs::write(dir.join("program.mjs"), &emitted.javascript).unwrap();
    fs::write(dir.join("cases.json"), serde_json::to_vec(&rows).unwrap()).unwrap();
    fs::write(
        dir.join("test.mjs"),
        r#"
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {functions} from './program.mjs';
for (const {name,n,expected} of JSON.parse(readFileSync(new URL('./cases.json',import.meta.url)))) {
  assert.deepEqual(functions[name](n),expected,`${name}(${n})`);
}
console.log('split loop states agree with the reference evaluator');
"#,
    )
    .unwrap();
    let output = Command::new("node").arg(dir.join("test.mjs")).output().expect("Node.js required");
    assert!(output.status.success(), "{}{}", String::from_utf8_lossy(&output.stdout), String::from_utf8_lossy(&output.stderr));
    // No loop-state object is allocated per iteration of `mix`.
    let mix = emitted.javascript.split("function ").find(|f| f.contains("2654435769")).unwrap();
    // The inner loop body ends at its own closing line.
    let inner = mix.split("for(").nth(2).unwrap().split("\n}\n").next().unwrap();
    assert!(!inner.contains("[\"x\"]:"), "loop state rebuilt inside the loop:\n{inner}");
    fs::remove_dir_all(dir).unwrap();
}
