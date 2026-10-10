use std::{path::Path, process::Command};
use verified_language::{
    action_ir::CheckedActions,
    core::CheckedModule,
    effect_model::{BoundEffects, Description},
    effects::{CheckedEffects, Exit, Path as EffectPath, ValueShape},
    registry::{Bundle, CheckedBundle},
    syntax::parse,
};
fn fixture() -> serde_json::Value {
    let script = r#"
import json,copy,tempfile
from pathlib import Path
from ink_knowledge import Store,identity
from ink_knowledge.store import operations
s=Store('.'); names=json.loads(Path('store/names.json').read_text()); n={k.split('/')[-1]:v for k,v in names.items() if k.startswith('effect-composition/')}
base=s.bundle([n[x] for x in ['ValueShape','BodyExit','EffectPath','prefix_or','follow_effect_path']]);roles={k:n[k] for k in ['ValueShape','BodyExit','EffectPath','prefix_or','follow_effect_path']};follow=base['objects'][n['follow_effect_path']]
controls=[]
for change in range(3):
 obj=copy.deepcopy(follow);body=obj['payload']['declaration']['Function']['body']
 if change==0:obj['payload']['declaration']['Function']['body']={'Var':'left'}
 if change==1:body['Match']['branches'][0]['body']['Match']['branches'][1]['body']=copy.deepcopy(body['Match']['branches'][0]['body']['Match']['branches'][0]['body'])
 if change==2:body['Match']['branches'][0]['body']['Match']['branches'][0]['body']['Match']['branches'][0]['body']['Construct']['arguments'][0]={'Bool':False}
 obj['interface']['operations']=operations(obj['payload'])
 with tempfile.TemporaryDirectory() as d:
  fresh=Store.publish(d,[obj if i==n['follow_effect_path'] else v for i,v in base['objects'].items()])
  controls.append({'bundle':fresh.bundle([identity(obj)]),'follow':identity(obj)})
false=s.bundle([n['return_suppresses_suffix']]);old=n['return_suppresses_suffix'];obj=copy.deepcopy(false['objects'][old]);obj['payload']['declaration']['Theorem']['to']={'Var':'suffix'};obj['interface']['operations']=operations(obj['payload'])
with tempfile.TemporaryDirectory() as d:
 fresh=Store.publish(d,[obj if i==old else v for i,v in false['objects'].items()]);falseproof=fresh.bundle([identity(obj)])
print(json.dumps({'roles':roles,'accepted':s.bundle(list(n.values())),'controls':controls,'falseproof':falseproof}))
"#;
    let output = Command::new("python3")
        .args(["-c", script])
        .current_dir(Path::new(env!("CARGO_MANIFEST_DIR")).join("knowledge"))
        .output()
        .unwrap();
    assert!(
        output.status.success(),
        "{}",
        String::from_utf8_lossy(&output.stderr)
    );
    serde_json::from_slice(&output.stdout).unwrap()
}
fn effects() -> CheckedEffects {
    let module =
        CheckedModule::from_source(parse(include_str!("../examples/action-control.ink")).unwrap())
            .unwrap();
    CheckedEffects::derive(&CheckedActions::elaborate(&module).unwrap()).unwrap()
}
fn description(v: &serde_json::Value) -> Description {
    let r = &v["roles"];
    Description {
        schema: 1,
        semantics: verified_language::effects::SEMANTICS.into(),
        value_shape: r["ValueShape"].as_str().unwrap().into(),
        exit: r["BodyExit"].as_str().unwrap().into(),
        path: r["EffectPath"].as_str().unwrap().into(),
        prefix_or: r["prefix_or"].as_str().unwrap().into(),
        follow: r["follow_effect_path"].as_str().unwrap().into(),
    }
}
#[test]
fn database_sequencing_matches_the_actual_finite_prefix_algebra() {
    let v = fixture();
    let bundle: Bundle = serde_json::from_value(v["accepted"].clone()).unwrap();
    assert_eq!(bundle.objects.len(), 11);
    let effects = effects();
    let d = description(&v);
    let bound = BoundEffects::bind(&effects, &bundle, &d).unwrap();
    assert_eq!(bound.effects_identity(), effects.identity().unwrap());
    let mut paths = vec![];
    for written in [false, true] {
        for emitted in [false, true] {
            for exit in [Exit::Next, Exit::Return, Exit::Abort, Exit::Host] {
                for value in [
                    ValueShape::Other,
                    ValueShape::False,
                    ValueShape::True,
                    ValueShape::None,
                    ValueShape::Some,
                    ValueShape::Ok,
                    ValueShape::Err,
                ] {
                    paths.push(EffectPath {
                        written,
                        emitted,
                        exit,
                        value,
                    });
                }
            }
        }
    }
    assert_eq!(paths.len(), 112);
    for &a in &paths {
        for &b in &paths {
            assert_eq!(
                bound
                    .context()
                    .evaluate(&[], &bound.follow_call(bound.encode(a), bound.encode(b)))
                    .unwrap(),
                bound.encode(a.follow(b))
            );
        }
    }
}
#[test]
fn authenticated_wrong_models_and_false_laws_do_not_establish_correspondence() {
    let v = fixture();
    let effects = effects();
    let d = description(&v);
    for control in v["controls"].as_array().unwrap() {
        let bundle: Bundle = serde_json::from_value(control["bundle"].clone()).unwrap();
        CheckedBundle::check(&bundle)
            .unwrap()
            .first_order_context()
            .unwrap();
        let mut changed = d.clone();
        changed.follow = control["follow"].as_str().unwrap().into();
        assert!(BoundEffects::bind(&effects, &bundle, &changed).is_err());
    }
    let falseproof: Bundle = serde_json::from_value(v["falseproof"].clone()).unwrap();
    assert!(CheckedBundle::check(&falseproof)
        .unwrap()
        .first_order_context()
        .is_err());
    let bundle: Bundle = serde_json::from_value(v["accepted"].clone()).unwrap();
    let mut changed = d;
    changed.semantics = "fake".into();
    assert!(BoundEffects::bind(&effects, &bundle, &changed).is_err());
}
