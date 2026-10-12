use ink_core::{bounds, core::CheckedModule, physical, planning, registry, syntax};
const SOURCE: &str = include_str!("fixtures/physical-capabilities.ink");
fn module() -> CheckedModule {
    CheckedModule::from_source(syntax::parse(SOURCE).unwrap()).unwrap()
}
fn plan() -> physical::Plan {
    let p: planning::Package =
        serde_json::from_str(include_str!("fixtures/physical-capabilities.plan.json")).unwrap();
    let planning::Step::Physical(p) = p.steps.into_iter().next().unwrap() else {
        panic!()
    };
    p
}
fn republish(bundle: &mut registry::Bundle, old: &str, entry: registry::Entry) -> String {
    bundle.objects.remove(old);
    let id = registry::identity(&entry).unwrap();
    bundle.objects.insert(id.clone(), entry);
    for root in &mut bundle.roots {
        if root == old {
            *root = id.clone();
        }
    }
    bundle.roots.sort();
    let ids = bundle.objects.keys().cloned().collect::<Vec<_>>();
    bundle.snapshot.root =
        registry::identity(&serde_json::json!({"schema":1,"entries":ids})).unwrap();
    bundle.membership = ids
        .iter()
        .map(|i| {
            (
                i.clone(),
                registry::Membership {
                    entries: ids.clone(),
                    path: vec![],
                },
            )
        })
        .collect();
    id
}
#[test]
fn bounds_are_source_bound_and_false_rehashed_certificates_cannot_authorise_reads() {
    let m = module();
    let p = plan();
    let sealed = physical::check(&m, None, &p).unwrap();
    let goals = bounds::obligations(&m).unwrap();
    for name in ["guarded", "total", "buffer_guarded"] {
        let g = goals.iter().find(|g| g.site.function == name).unwrap();
        assert!(sealed.bounds().allows(name, &g.site.path));
    }
    for name in ["shadow", "wrap", "signed"] {
        let g = goals.iter().find(|g| g.site.function == name).unwrap();
        assert!(!sealed.bounds().allows(name, &g.site.path));
    }
    let mut stale = p.clone();
    stale.input_core_sha256 = "0".repeat(64);
    assert!(physical::check(&m, None, &stale).is_err());
    let bundle = &p.bounds.as_ref().unwrap().knowledge;
    let old = &bundle.roots[0];
    let mut entry = bundle.objects[old].clone();
    let false_goal = goals.iter().find(|g| g.site.function == "wrap").unwrap();
    entry.payload["site"] = serde_json::to_value(&false_goal.site).unwrap();
    entry.payload["obligation_sha256"] = registry::identity(false_goal).unwrap().into();
    let mut wrong = p.clone();
    republish(&mut wrong.bounds.as_mut().unwrap().knowledge, old, entry);
    assert!(physical::check(&m, None, &wrong).is_err());
    let mut entry = bundle.objects[old].clone();
    entry.payload["proof"]["steps"] = serde_json::json!([{"clause":[],"hints":[]}]);
    let mut wrong = p.clone();
    republish(&mut wrong.bounds.as_mut().unwrap().knowledge, old, entry);
    assert!(physical::check(&m, None, &wrong).is_err());
    let changed = CheckedModule::from_source(
        syntax::parse(&SOURCE.replace("xs.at_or(i,999)", "xs.at_or(i+1,999)")).unwrap(),
    )
    .unwrap();
    let mut wrong = p;
    wrong.input_core_sha256 = changed.identity().unwrap();
    assert!(physical::check(&changed, None, &wrong).is_err());
}
#[test]
fn codecs_are_fixed_to_source_shape_and_column_skips_need_real_equality() {
    let m = module();
    let p = plan();
    let checked = physical::check(&m, None, &p).unwrap();
    assert_eq!(
        checked
            .column_maps()
            .fields("particles", &[])
            .iter()
            .cloned()
            .collect::<std::collections::BTreeSet<_>>(),
        std::collections::BTreeSet::from(["active".to_string(), "velocity".to_string()])
    );
    let mut wrong = p.clone();
    wrong.columns[0].record = "missing".into();
    assert!(physical::check(&m, None, &wrong).is_err());
    let mut wrong = p.clone();
    let l = wrong
        .columns
        .iter_mut()
        .find(|l| l.record == "Particle")
        .unwrap();
    l.packing.get_mut("velocity").unwrap().bits = 1;
    assert!(physical::check(&m, None, &wrong).is_err());
    let mut wrong = p.clone();
    let l = wrong
        .columns
        .iter_mut()
        .find(|l| l.record == "Particle")
        .unwrap();
    let old = l.roundtrip.clone();
    let mut entry = l.knowledge.objects[&old].clone();
    entry.payload["declaration"]["Theorem"]["proof"] = serde_json::json!({"Refl":{"Var":"rows"}});
    l.roundtrip = republish(&mut l.knowledge, &old, entry);
    assert!(physical::check(&m, None, &wrong).is_err());
    let goals = bounds::map_obligations(&m).unwrap();
    let false_goal = goals
        .iter()
        .find(|g| g.site.function == "particles" && g.field == "position")
        .unwrap();
    let bundle = &p.column_maps.as_ref().unwrap().knowledge;
    let old = &bundle.roots[0];
    let mut entry = bundle.objects[old].clone();
    entry.payload["site"] = serde_json::to_value(&false_goal.site).unwrap();
    entry.payload["field"] = "position".into();
    entry.payload["obligation_sha256"] = registry::identity(false_goal).unwrap().into();
    let mut wrong = p.clone();
    republish(
        &mut wrong.column_maps.as_mut().unwrap().knowledge,
        old,
        entry,
    );
    assert!(physical::check(&m, None, &wrong).is_err());
}
#[test]
fn carrier_fusion_composes_before_source_bound_physical_admission() {
    let m = module();
    let package: planning::Package =
        serde_json::from_str(include_str!("fixtures/composed-capabilities.plan.json")).unwrap();
    let selected = planning::check(&m, &package).unwrap();
    assert_eq!(selected.package().steps.len(), 2);
    let f = selected
        .module()
        .program()
        .functions
        .iter()
        .find(|f| f.name == "projected")
        .unwrap();
    let syntax::Expr::Method(xs, _, _) = &f.body else {
        panic!()
    };
    assert!(matches!(xs.as_ref(), syntax::Expr::Var(_)));
    let f = selected
        .module()
        .program()
        .functions
        .iter()
        .find(|f| f.name == "reduced")
        .unwrap();
    let syntax::Expr::Call(_, xs) = &f.body else {
        panic!()
    };
    assert!(matches!(&xs[0], syntax::Expr::Var(_)));
    let mut stale = package;
    let planning::Step::Physical(p) = &mut stale.steps[1] else {
        panic!()
    };
    *p = plan();
    assert!(planning::check(&m, &stale).is_err());
}
