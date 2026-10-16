use ink_core::{core::CheckedModule,physical,planning,sum_codec,syntax::parse};
use std::{fs,process::Command};
#[path="support/record_codec.rs"] mod record_codec;
#[path="support/sum_codec.rs"] mod checked_sums;
use checked_sums::layout;

#[test]
fn sum_layouts_preserve_boundaries_transactions_and_exact_wire_resources() {
    let module =
        CheckedModule::from_source(parse(include_str!("fixtures/sum_runtime.ink")).unwrap())
            .unwrap();
    let layouts = sum_codec::source_types(&module)
        .unwrap()
        .iter()
        .filter(|ty| sum_codec::schema(&module, ty).is_ok())
        .map(|ty| layout(&module, ty))
        .collect::<Vec<_>>();
    assert!(layouts.len() >= 3);
    let directory = std::env::temp_dir().join(format!("ink-sum-spines-{}", std::process::id()));
    fs::create_dir_all(&directory).unwrap();
    let ordinary = ink_lowering_js::lower(&module).unwrap();
    fs::write(directory.join("runtime-ordinary.mjs"), &ordinary.javascript).unwrap();
    let choices = layouts
        .iter()
        .cloned()
        .map(|layout| vec![layout])
        .chain(std::iter::once(layouts.clone()));
    for (index, choice) in choices.enumerate() {
        let physical:physical::Plan=serde_json::from_value(serde_json::json!({
            "schema":1,"semantics":physical::SEMANTICS,"input_core_sha256":module.identity().unwrap(),"sum_spines":choice
        })).unwrap();
        let plan = planning::check(
            &module,
            &planning::Package {
                schema: 1,
                semantics: planning::SEMANTICS.into(),
                input_core_sha256: module.identity().unwrap(),
                steps: vec![planning::Step::Physical(physical)],
            },
        )
        .unwrap();
        assert!(plan
            .require_source_layout_capabilities(true, false)
            .is_err());
        let selected = ink_lowering_js::lower_planned(&plan).unwrap();
        assert_eq!(selected.manifest["wire"], ordinary.manifest["wire"]);
        let filename = if index == layouts.len() {
            "runtime-flat.mjs".into()
        } else {
            format!("runtime-one-{index}.mjs")
        };
        fs::write(directory.join(filename), selected.javascript).unwrap();
    }
    let elisions=module.program().records.keys()
        .filter(|name| ink_core::record_codec::schema(&module,name).is_ok())
        .map(|name|record_codec::layout(&module,name)).collect::<Vec<_>>();
    let physical:physical::Plan=serde_json::from_value(serde_json::json!({
        "schema":1,"semantics":physical::SEMANTICS,"input_core_sha256":module.identity().unwrap(),
        "sum_spines":layouts,"record_elisions":elisions
    })).unwrap();
    let composed=planning::check(&module,&planning::Package{
        schema:1,semantics:planning::SEMANTICS.into(),input_core_sha256:module.identity().unwrap(),
        steps:vec![planning::Step::Physical(physical)]
    }).unwrap();
    let code=ink_lowering_js::lower_planned(&composed).unwrap().javascript;
    fs::write(directory.join("runtime-composed.mjs"),code).unwrap();
    fs::write(
        directory.join("run.mjs"),
        include_str!("fixtures/sum_runtime.mjs"),
    )
    .unwrap();
    let result = Command::new("node")
        .arg(directory.join("run.mjs"))
        .output()
        .unwrap();
    fs::remove_dir_all(directory).unwrap();
    assert!(
        result.status.success(),
        "{}",
        String::from_utf8_lossy(&result.stderr)
    );
}
