use serde_json::{Value, json};
use std::io::Write;
use std::process::{Command, Stdio};
use verified_language::{modules, stateful::Runtime};

#[path = "support/parity.rs"]
mod parity;

const FIXTURE: &str = "tests/fixtures/binary64-decimal.ink";

#[test]
fn finite_decimal_matches_ecmascript_and_all_cpu_targets() {
    let program = modules::load(FIXTURE).unwrap().program;
    let mut reference = Runtime::new(program.clone()).unwrap();
    let mut words = vec![
        0, 1, 2, 3, 0x8000_0000_0000_0000, 0x7ff0_0000_0000_0000, 0xfff0_0000_0000_0000,
        0x7ff0_1234_5678_9abc, 0x7fef_ffff_ffff_ffff, 0x0010_0000_0000_0000,
    ];
    for n in [0.1f64, 0.3, 1e-6, 1e-7, 1e20, 1e21, 1e23, 1e-323, 1e308, 9007199254740992.0] {
        let exact = n.to_bits();
        words.extend([exact - 1, exact, exact + 1, exact | (1 << 63)]);
    }
    for exponent in (1..2047u64).step_by(17).chain([1022, 1023, 1024, 2046]) {
        let power = exponent << 52;
        words.extend([power - 1, power, power + 1]);
    }
    let mut seed = 0x9e37_79b9_7f4a_7c15u64;
    for _ in 0..384 {
        seed = seed.wrapping_mul(6364136223846793005).wrapping_add(1442695040888963407);
        words.push(seed);
    }
    let pairs: Vec<_> = words.iter().map(|&bits| [(bits >> 32) as u32, bits as u32]).collect();
    let mut node = Command::new("node")
        .args(["-e", r#"
const v = new DataView(new ArrayBuffer(8));
const bits = JSON.parse(require('node:fs').readFileSync(0, 'utf8'));
const strings = bits.map(([high,low]) => {
  v.setUint32(0, high); v.setUint32(4, low);
  const n = v.getFloat64(0);
  return Number.isFinite(n) ? {Some:String(n)} : {None:null};
});
process.stdout.write(JSON.stringify(strings));
"#])
        .stdin(Stdio::piped()).stdout(Stdio::piped()).spawn().unwrap();
    node.stdin.take().unwrap().write_all(&serde_json::to_vec(&pairs).unwrap()).unwrap();
    let oracle = node.wait_with_output().unwrap();
    assert!(oracle.status.success());
    let wanted: Vec<Value> = serde_json::from_slice(&oracle.stdout).unwrap();
    let mut steps = Vec::new();
    let mut expected = Vec::new();
    for (input, wanted) in pairs.chunks(16).zip(wanted.chunks(16)) {
        let args = json!([input]);
        let outcome = reference.invoke_json("format_bits", &args).unwrap().json();
        assert_eq!(outcome["result"], json!(wanted), "class of input {input:?}");
        steps.push(json!({"call":"format_bits", "args":args}));
        expected.push(json!({"reply":{"outcome":outcome}, "snapshot":reference.checkpoint_portable().unwrap()}));
    }
    parity::conformance("binary64-decimal-parity", program, include_str!("fixtures/binary64-decimal.ink"), steps, expected);
}
