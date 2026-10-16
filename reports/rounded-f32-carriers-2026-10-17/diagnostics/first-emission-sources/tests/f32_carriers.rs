use ink_core::{core::CheckedModule, eval, syntax::parse};
use serde_json::json;
use std::{fs, process::Command};

#[test]
fn normalized_carriers_preserve_every_read_rounding_payload_and_mutable_snapshot() {
    let source = include_str!("fixtures/f32_carriers.ink");
    let root = std::env::temp_dir().join(format!("ink-f32-carriers-{}", std::process::id()));
    fs::create_dir_all(&root).unwrap();
    let mut bits = vec![
        0u32, 0x80000000, 1, 0x80000001, 0x007fffff, 0x00800000, 0x3f800001, 0x7f7fffff,
        0xff7fffff, 0x7f800000, 0xff800000, 0x7fc01234, 0x7fa01234, 0xffc05678,
    ];
    let mut seed = 0x9e3779b9u32;
    for _ in 0..128 {
        seed ^= seed << 13;
        seed ^= seed >> 17;
        seed ^= seed << 5;
        bits.push(seed);
    }
    for carrier in ["native", "bits"] {
        let source = if carrier == "bits" {
            format!("{source}\nstate Unused:u32=0;")
        } else {
            source.into()
        };
        let module = CheckedModule::from_source(parse(&source).unwrap()).unwrap();
        let p = module.program();
        let mut cases = vec![];
        for (i, &x) in bits.iter().enumerate() {
            for n in [0, 1, 9] {
                let x = json!({"F32Bits":x});
                let y = json!({"F32Bits":bits[(i+3)%bits.len()]});
                for name in [
                    "aliases",
                    "loops",
                    "records",
                    "recursive",
                    "bits",
                    "arrays",
                    "owned",
                ] {
                    let args = if matches!(name, "arrays" | "owned") {
                        json!([[x,y,{"F32Bits":0x80000000u32}],y])
                    } else {
                        json!([x, y, n])
                    };
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
            include_str!("fixtures/f32_carriers.mjs"),
        )
        .unwrap();
        let output = Command::new("node")
            .arg(root.join("test.mjs"))
            .arg(carrier)
            .output()
            .unwrap();
        assert!(
            output.status.success(),
            "{carrier}: {}{}",
            String::from_utf8_lossy(&output.stdout),
            String::from_utf8_lossy(&output.stderr)
        );
        println!("{carrier}: {}", String::from_utf8_lossy(&output.stdout));
        if let Some(destination) = std::env::var_os("INK_F32_CARRIER_ARTIFACTS") {
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
    }
    fs::remove_dir_all(root).unwrap();
}
