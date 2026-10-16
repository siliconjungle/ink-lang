use ink_core::{core::CheckedModule, eval, syntax::parse};
use serde_json::json;
use std::{fs, process::Command};

#[test]
fn local_record_helpers_preserve_aliases_composites_owned_fallback_and_all_bits() {
    let mut source = include_str!("fixtures/helper_records.ink").to_owned();
    for i in 0..9 {
        source += &format!(
            "\nfn chain{i}(r:Lane)->Lane{{return {};}}",
            if i == 8 {
                "advance(r)".into()
            } else {
                format!("chain{}(r)", i + 1)
            }
        );
    }
    source += "\nfn bounded(x:f64,y:f64,n:u32)->Lane{let r=drive(x,y,0);return chain0(r);}";
    source += &format!(
        "\nfn large(r:Lane)->List<f64>{{return [{}];}}",
        vec!["r.a"; 300].join(",")
    );
    source+="\nfn fallback(x:f64,y:f64,n:u32)->List<f64>{let r=Lane{a:x,b:y,index:n,stop:false,label:\"large\",values:[x,y]};return large(r);}";
    let root = std::env::temp_dir().join(format!("ink-helper-records-{}", std::process::id()));
    fs::create_dir_all(&root).unwrap();
    let mut observations = 0;
    for carrier in ["native", "bits"] {
        let source = if carrier == "bits" {
            format!("{source}\nstate Unused:u32=0;")
        } else {
            source.clone()
        };
        let module = CheckedModule::from_source(parse(&source).unwrap()).unwrap();
        let mut cases = vec![];
        let bits = [
            0u64,
            1 << 63,
            1,
            0x8000000000000001,
            0x0010000000000000,
            0x3ff0000000000001,
            0x7fefffffffffffff,
            0xffefffffffffffff,
            0x7ff0000000000000,
            0xfff0000000000000,
            0x7ff0000000001234,
            0xfff8000000005678,
        ];
        for (i, &x) in bits.iter().enumerate() {
            for n in [0, 1, 3, 9, 10] {
                let args = json!([{"F64Bits":x.to_string()},{"F64Bits":bits[(i+3)%bits.len()].to_string()},n]);
                for name in [
                    "drive",
                    "projected",
                    "selected",
                    "nested",
                    "aliases",
                    "owned",
                    "fallible",
                    "bounded",
                    "fallback",
                ] {
                    let p = module.program();
                    let f = p.functions.iter().find(|f| f.name == name).unwrap();
                    let values = args
                        .as_array()
                        .unwrap()
                        .iter()
                        .zip(&f.params)
                        .map(|(v, (_, t))| eval::Value::from_program_json(v, t, p).unwrap())
                        .collect();
                    let expected = eval::call_checked(&module, name, values, &mut 1_000_000)
                        .unwrap()
                        .json();
                    cases.push(json!({"name":name,"args":args,"expected":expected}));
                }
            }
        }
        fs::write(
            root.join("program.mjs"),
            ink_lowering_js::lower(&module).unwrap().javascript,
        )
        .unwrap();
        fs::write(root.join("cases.json"), serde_json::to_vec(&cases).unwrap()).unwrap();
        fs::write(
            root.join("test.mjs"),
            r#"
import assert from 'node:assert/strict';import fs from 'node:fs';import * as m from './program.mjs';
const cases=JSON.parse(fs.readFileSync(new URL('cases.json',import.meta.url)));let calls=0;
for(const c of cases){
 const entry=m.compiledValues[c.name],args=c.args.map((v,i)=>entry.params[i].capture(v));
 const expected=m.valueCodecs[c.name].result.encode(c.expected);
 assert.deepEqual(entry.result.encode(m.callCompiled(c.name,args)),expected,c.name);calls++;
 for(const fixed of [[],[0],[0,1]]){
  const token=m.prepareCompiled(c.name,fixed.map(i=>[i,args[i]]));
  for(let repeat=0;repeat<2;repeat++){
   const out=m.callPreparedCompiled(token,args.filter((_,i)=>!fixed.includes(i)));
   assert.deepEqual(entry.result.encode(out),expected,c.name);calls++;
   const host=entry.result.materialize(out);if(Array.isArray(host))host.splice(0);
  }
 }
}
console.log(JSON.stringify({cases:cases.length,calls,exactTypedBytes:true}));
"#,
        )
        .unwrap();
        let output = Command::new("node")
            .arg(root.join("test.mjs"))
            .output()
            .unwrap();
        assert!(
            output.status.success(),
            "{carrier}: {}{}",
            String::from_utf8_lossy(&output.stdout),
            String::from_utf8_lossy(&output.stderr)
        );
        println!("{carrier}: {}", String::from_utf8_lossy(&output.stdout));
        if let Some(destination) = std::env::var_os("INK_HELPER_RECORD_ARTIFACTS") {
            let destination = std::path::PathBuf::from(destination).join(carrier);
            fs::create_dir_all(&destination).unwrap();
            for file in ["program.mjs", "cases.json", "test.mjs"] {
                fs::copy(root.join(file), destination.join(file)).unwrap();
            }
            fs::write(destination.join("source.ink"), &source).unwrap();
            fs::write(
                destination.join("source.core.json"),
                module.bytes().unwrap(),
            )
            .unwrap();
            fs::write(destination.join("observations.json"), &output.stdout).unwrap();
        }
        observations += cases.len();
    }
    assert_eq!(observations, 1080);
    fs::remove_dir_all(root).unwrap();
}
