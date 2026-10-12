use serde_json::{json, Value};
use verified_language::{
    core::CheckedModule,
    eval,
    optimisation::{self, Package},
    stateful::Runtime,
    syntax,
};
#[path = "support/parity.rs"]
mod parity;
#[test]
fn ordinary_template_selected_float_sum_retains_rounding_order_and_exceptional_values() {
    let source="module template_correspondence; pub fn run(xs:List<f32>)->f32{return sum(xs.map(fn(x)=>x*1.25));}";
    let module = CheckedModule::from_source(syntax::parse(source).unwrap()).unwrap();
    let package: Package =
        serde_json::from_str(include_str!("fixtures/float-sum-map-selection.json")).unwrap();
    let selected = optimisation::check(&module, &package).unwrap();
    let mut cases: Vec<Vec<u32>> = vec![
        vec![],
        vec![0],
        vec![0x80000000],
        vec![0x4b000001, 0xcb000001],
        vec![0x3f800001, 0xbf800000],
        vec![1, 0x80000001],
        vec![0x7f800000, 0xff800000],
        vec![0x7fc12345],
        vec![0xff812345],
    ];
    for bits in [
        0x3f800000, 0x3f800001, 0x7f7fffff, 0x00800001, 0x00000001, 0x80000001, 0xff7fffff,
    ] {
        cases.push(vec![bits, bits ^ 0x80000000, 0x3f000000]);
    }
    let runtime = Runtime::new(module.program().clone()).unwrap();
    let mut steps = vec![];
    let mut expected = vec![];
    for bits in cases {
        let values = vec![eval::Value::List(
            bits.iter().copied().map(eval::Value::F32).collect(),
        )];
        let value = eval::call(module.program(), "run", values.clone(), &mut 100_000)
            .unwrap()
            .json();
        assert_eq!(
            eval::call_selected(&selected, "run", values, &mut 100_000)
                .unwrap()
                .json(),
            value
        );
        let args = json!([bits
            .iter()
            .map(|b| json!({"F32Bits":b}))
            .collect::<Vec<Value>>()]);
        steps.push(json!({"pure":"run","args":args}));
        expected.push(
            json!({"reply":{"value":value},"snapshot":runtime.checkpoint_portable().unwrap()}),
        );
    }
    parity::conformance_selected(
        "float-template-proof-parity",
        &selected,
        source,
        steps,
        expected,
    );
}
