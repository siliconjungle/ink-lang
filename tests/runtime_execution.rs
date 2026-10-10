use ink_core::{
    core::CheckedModule,
    eval,
    source_routing::{self, Package, Stage, ValueRef},
    syntax,
};
use serde_json::{json, Value};
use std::collections::BTreeMap;
use verified_language::runtime::execution::{self, Adapter, Backend};
struct Cpu(ink_core::syntax::Program);
impl Adapter for Cpu {
    fn call(&mut self, n: &str, args: &[Value]) -> Result<Value, String> {
        let f = self.0.functions.iter().find(|f| f.name == n).unwrap();
        let args = args
            .iter()
            .zip(&f.params)
            .map(|(v, (_, t))| eval::Value::from_program_json(v, t, &self.0))
            .collect::<Result<Vec<_>, _>>()?;
        eval::call(&self.0, n, args, &mut 10000).map(|v| v.json())
    }
}
struct Lost;
impl Adapter for Lost {
    fn call(&mut self, _: &str, _: &[Value]) -> Result<Value, String> {
        Err("device lost".into())
    }
}
#[test]
fn opaque_domains_compose_and_unavailable_targets_fall_back_on_pure_calls() {
    let module=CheckedModule::from_source(syntax::parse("module graph;fn first(x:u32)->u32{return x+1;}fn second(x:u32)->u32{return x*2;}fn entry(x:u32)->u32{return second(first(x));}").unwrap()).unwrap();
    let package = Package {
        schema: 1,
        semantics: source_routing::SEMANTICS.into(),
        input_core_sha256: module.identity().unwrap(),
        entry: "entry".into(),
        stages: vec![
            Stage {
                id: "a".into(),
                function: "first".into(),
                backend: "accelerator".into(),
                domain: "device".into(),
                arguments: vec![ValueRef::Input(0)],
            },
            Stage {
                id: "b".into(),
                function: "second".into(),
                backend: "cpu".into(),
                domain: "process".into(),
                arguments: vec![ValueRef::Stage("a".into())],
            },
        ],
        output: ValueRef::Stage("b".into()),
    };
    let route = source_routing::check(&module, &package).unwrap();
    let fallback = Backend {
        package: "cpu".into(),
        domain: "process".into(),
    };
    let mut adapters: BTreeMap<Backend, Box<dyn Adapter>> = BTreeMap::from([
        (
            fallback.clone(),
            Box::new(Cpu(module.program().clone())) as Box<dyn Adapter>,
        ),
        (
            Backend {
                package: "accelerator".into(),
                domain: "device".into(),
            },
            Box::new(Lost) as Box<dyn Adapter>,
        ),
    ]);
    let outcome = execution::execute(&route, &[json!(21)], &mut adapters, &fallback).unwrap();
    assert_eq!(outcome.value, json!(44));
    assert_eq!(
        outcome.placements[0].fallback_reason.as_deref(),
        Some("device lost")
    );
    assert!(execution::execute(&route, &[json!(-1)], &mut adapters, &fallback).is_err());
}
