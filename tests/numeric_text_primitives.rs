use serde_json::{json, Value};
use verified_language::{core::CheckedModule, eval, stateful::Runtime, syntax};
#[path = "support/parity.rs"]
mod parity;
const SOURCE: &str = r#"module capability_epoch;
record Ops { root:u32, quotient:u32, floored:u32, ceiled:u32, truncated:u32, rounded:u32, nan:Bool, finite:Bool, }
record Casts { unsigned:Option<u32>, wide:Option<u64>, signed:Option<i32>, exact:Option<Int>, }
pub fn float_ops(xs:List<Vec2<f32>>)->List<Ops>{return xs.map(fn(v)=>Ops{root:f32_bits(sqrt(v.x)),quotient:f32_bits(v.x/v.y),floored:f32_bits(floor(v.x)),ceiled:f32_bits(ceil(v.x)),truncated:f32_bits(trunc(v.x)),rounded:f32_bits(round_ties_even(v.x)),nan:is_nan(v.x),finite:is_finite(v.x)});}
pub fn casts(x:f32)->Casts{return Casts{unsigned:u32_from_f32(x),wide:u64_from_f32(x),signed:i32_from_f32(x),exact:int_from_f32(x)};}
pub fn from_wide(xs:List<u64>)->List<u32>{return xs.map(fn(x)=>f32_bits(f32_from_u64(x)));}
pub fn from_unsigned(x:u32)->u32{return f32_bits(f32_from_u32(x));}
pub fn from_signed(x:i32)->u32{return f32_bits(f32_from_i32(x));}
pub fn from_exact(x:Int)->u32{return f32_bits(f32_from_int(x));}
pub fn word_stats(xs:List<u64>)->List<Vec3<u32>>{return xs.map(fn(x)=>vec3(popcount(x),leading_zeros(x),trailing_zeros(x)));}
pub fn signed_stats(x:i32)->Vec3<u32>{return vec3(popcount(x),leading_zeros(x),trailing_zeros(x));}
pub fn word32_stats(x:u32)->Vec3<u32>{return vec3(popcount(x),leading_zeros(x),trailing_zeros(x));}
pub fn byte_len(s:String)->u32{return string_byte_len(s);}
pub fn byte(s:String,i:u32)->Option<u32>{return string_byte_at(s,i);}
pub fn substring(s:String,a:u32,b:u32)->Option<String>{return string_slice(s,a,b);}
pub fn joined(a:String,b:String)->String{return string_concat(a,b);}
pub fn locate(s:String,n:String,a:u32)->Option<u32>{return string_find(s,n,a);}
state number:f32=0.0;
event change:f32;
change update(x:f32,d:f32)->f32 writes(number) emits(change){let result:f32=sqrt(x)/d;number=result;emit change(result);return result;}
query rounded_state()->u32 reads(number){return f32_bits(round_ties_even(number));}
"#;
#[test]
fn primitives_match_reference_values_events_and_portable_snapshots_on_every_target() {
    let p = syntax::parse(SOURCE).unwrap();
    let m = CheckedModule::from_source(p.clone()).unwrap();
    let mut rt = Runtime::new(p.clone()).unwrap();
    let mut steps = vec![];
    let mut expected = vec![];
    let mut add = |name: &str, args: Value, gpu: bool| {
        let f = p.functions.iter().find(|f| f.name == name).unwrap();
        let vals = args
            .as_array()
            .unwrap()
            .iter()
            .zip(&f.params)
            .map(|(v, (_, t))| eval::Value::from_program_json(v, t, &p).unwrap())
            .collect();
        let value = eval::call(&p, name, vals, &mut 4_000_000).unwrap().json();
        steps.push(json!({"pure":name,"args":args,"expect_gpu":gpu,"cpu_only":!gpu}));
        expected
            .push(json!({"reply":{"value":value},"snapshot":rt.checkpoint_portable().unwrap()}));
    };
    let mut bits = vec![
        0, 0x80000000, 1, 0x80000001, 0x007fffff, 0x00800000, 0x00800001, 0x3effffff, 0x3f000000,
        0x3f000001, 0x3fc00000, 0x40200000, 0xbfc00000, 0xc0200000, 0x4affffff, 0x4b000000,
        0x4f000000, 0x4f800000, 0x5f800000, 0x7f7fffff, 0xff7fffff, 0x7f800000, 0xff800000,
        0x7fc12345, 0x7fa12345, 0xff812345,
    ];
    let mut seed = 0x1932u32;
    for _ in 0..384 {
        seed = seed.wrapping_mul(1664525).wrapping_add(1013904223);
        bits.push(seed);
    }
    let rows: Vec<_> = bits
        .iter()
        .enumerate()
        .map(|(i, x)| json!([{"F32Bits":x},{"F32Bits":bits[(i*17+1)%bits.len()]}]))
        .collect();
    add("float_ops", json!([rows]), true);
    for bits in bits.iter().take(26) {
        add("casts", json!([{"F32Bits":bits}]), false);
    }
    let mut words = vec![0, u64::MAX, 1, 1 << 63, (1 << 63) - 1];
    // Double-rounding traps on both sides of binary32 half-way points.
    for e in 25..64 {
        let shift = e - 23;
        let mid = (1u64 << e) + (1u64 << (shift - 1));
        words.extend([mid - 1, mid, mid + 1]);
    }
    add("from_wide", json!([words]), true);
    add("word_stats", json!([words]), true);
    for x in [0, 1, u32::MAX, 1 << 31] {
        add("from_unsigned", json!([x]), false);
        add("word32_stats", json!([x]), false);
    }
    for x in [0, 1, -1, i32::MIN, i32::MAX] {
        add("from_signed", json!([x]), false);
        add("signed_stats", json!([x]), false);
    }
    for x in [
        "0",
        "-1",
        "18446744073709551615",
        "170141183460469231731687303715884105727",
        "340282356779733661637539395458142568447",
        "340282356779733661637539395458142568448",
        "1000000000000000000000000000000000000000000",
    ] {
        add("from_exact", json!([{"Int":x}]), false);
    }
    for s in ["", "ASCII", "aé😀z", "e\u{301}", "\u{feff}a", "a\0b"] {
        add("byte_len", json!([s]), false);
        add("joined", json!([s, "é😀"]), false);
        for a in 0..=(s.len() + 1) as u32 {
            add("byte", json!([s, a]), false);
            for b in 0..=(s.len() + 1) as u32 {
                add("substring", json!([s, a, b]), false);
            }
            for n in ["", "é", "😀", "z", "absent"] {
                add("locate", json!([s, n, a]), false);
            }
        }
    }
    drop(add);
    for args in [
        json!([4.0, 2.0]),
        json!([0.0, -1.0]),
        json!([-1.0, 0.0]),
        json!([{"F32Bits":1},1.0]),
    ] {
        let reply = rt.invoke_json("update", &args).unwrap();
        let snapshot = rt.checkpoint_portable().unwrap();
        steps.push(json!({"call":"update","args":args}));
        expected.push(json!({"reply":{"outcome":reply.json()},"snapshot":snapshot}));
        steps.push(json!({"restore":snapshot}));
        rt = Runtime::restore_portable(p.clone(), &snapshot).unwrap();
        let reply = rt.invoke_json("rounded_state", &json!([])).unwrap();
        steps.push(json!({"call":"rounded_state","args":[]}));
        expected.push(
            json!({"reply":{"outcome":reply.json()},"snapshot":rt.checkpoint_portable().unwrap()}),
        );
    }
    assert_eq!(m.semantics(), "ink-executable-core-v11");
    parity::conformance(
        "generated-parity-numeric-text-primitives",
        p,
        SOURCE,
        steps,
        expected,
    );
}
