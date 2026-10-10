use std::{path::Path, process::Command};
use verified_language::{
    core::CheckedModule,
    logic::Term,
    registry::{Bundle, CheckedBundle},
    syntax::parse,
    transaction,
    transaction_model::{BoundChange, Description},
};

fn fixture() -> serde_json::Value {
    // Rehash and publish every control. Membership is authentic in each fresh
    // store; only semantic checking can distinguish the false protocol/proof.
    let script = r#"
import copy,json,tempfile
from pathlib import Path
from ink_knowledge import Store,identity
from ink_knowledge.store import operations
s=Store('.'); names=json.loads(Path('store/names.json').read_text())
prefix='transaction-boundary/'
decision=names[prefix+'ChangeDecision']; finish=names[prefix+'finish_change']
roots=[i for n,i in names.items() if n.startswith(prefix)]
base=s.bundle([finish]); original=base['objects'][finish]
body=original['payload']['declaration']['Function']['body']
bad_bodies=[]
bad_bodies.append(body['If']['on_false'])
bad_bodies.append(body['If']['on_true']['If']['on_false'])
increment=copy.deepcopy(body)
increment['If']['on_true']['If']['on_false']['Construct']['arguments'][0]['Binary']['right']['U64']=2
bad_bodies.append(increment)
early_limit=copy.deepcopy(body)
early_limit['If']['on_true']['If']['condition']['Binary']['right']['U64']-=1
bad_bodies.append(early_limit)
bad_bodies.append({'If':{'condition':body['If']['on_true']['If']['condition'],
 'on_true':body['If']['on_true']['If']['on_true'],
 'on_false':{'If':{'condition':{'Var':'succeeded'},'on_true':body['If']['on_true']['If']['on_false'],
                  'on_false':body['If']['on_false']}}}})
reversed=copy.deepcopy(body)
reversed['If']['condition']={'Binary':{'op':'==','left':{'Var':'succeeded'},'right':{'Bool':False}}}
bad_bodies.append(reversed)
controls=[]
for bad_body in bad_bodies:
 obj=copy.deepcopy(original);obj['payload']['declaration']['Function']['body']=bad_body
 obj['interface']['operations']=operations(obj['payload'])
 with tempfile.TemporaryDirectory() as d:
  fresh=Store.publish(d,[base['objects'][decision],obj])
  controls.append({'bundle':fresh.bundle([identity(obj)]),'finish':identity(obj)})
old=names[prefix+'domain_error_precedes_exhaustion']; small=s.bundle([old])
false=copy.deepcopy(small['objects'][old])
false['payload']['declaration']['Theorem']['to']['Construct']['constructor']=2
with tempfile.TemporaryDirectory() as d:
 fresh=Store.publish(d,[false if i==old else o for i,o in small['objects'].items()])
 false_proof=fresh.bundle([identity(false)])
print(json.dumps({'accepted':s.bundle(roots),'decision':decision,'finish':finish,
                  'controls':controls,'false_proof':false_proof}))
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

fn module() -> CheckedModule {
    CheckedModule::from_source(parse(include_str!("../examples/inventory.lang")).unwrap()).unwrap()
}

fn description(value: &serde_json::Value) -> Description {
    Description {
        schema: 1,
        semantics: transaction::SEMANTICS.into(),
        decision: value["decision"].as_str().unwrap().into(),
        finish: value["finish"].as_str().unwrap().into(),
    }
}

#[test]
fn canonical_proofs_bind_to_the_real_change_boundary_at_word_limits() {
    let fixture = fixture();
    let bundle: Bundle = serde_json::from_value(fixture["accepted"].clone()).unwrap();
    assert_eq!(bundle.objects.len(), 6);
    let module = module();
    let bound = BoundChange::bind(&module, "restock", &bundle, &description(&fixture)).unwrap();
    assert_eq!(bound.module_identity(), module.identity().unwrap());
    assert_eq!(bound.action(), "restock");
    let mut versions = vec![0, 1, 1 << 63, u64::MAX - 1, u64::MAX];
    let mut word = 0x73f8_dbd7_aa31_9645u64;
    for _ in 0..256 {
        word ^= word << 13;
        word ^= word >> 7;
        word ^= word << 17;
        versions.push(word);
    }
    for version in versions {
        for succeeded in [false, true] {
            assert_eq!(
                bound
                    .context()
                    .evaluate(
                        &[],
                        &bound.finish_call(Term::U64(version), Term::Bool(succeeded))
                    )
                    .unwrap(),
                bound.encode_decision(transaction::decide(version, succeeded)),
            );
        }
    }
    // The version/error laws also pass the normal common admission route.
    assert_eq!(
        CheckedBundle::check(&bundle)
            .unwrap()
            .verify(module.program())
            .unwrap()
            .len(),
        6
    );
}

#[test]
fn valid_math_about_a_different_boundary_never_binds_to_ink() {
    let fixture = fixture();
    let module = module();
    for control in fixture["controls"].as_array().unwrap() {
        let bundle: Bundle = serde_json::from_value(control["bundle"].clone()).unwrap();
        CheckedBundle::check(&bundle)
            .unwrap()
            .first_order_context()
            .unwrap();
        let mut description = description(&fixture);
        description.finish = control["finish"].as_str().unwrap().into();
        assert!(BoundChange::bind(&module, "restock", &bundle, &description).is_err());
    }
    let bundle: Bundle = serde_json::from_value(fixture["accepted"].clone()).unwrap();
    let description = description(&fixture);
    assert!(BoundChange::bind(&module, "total", &bundle, &description).is_err());
    assert!(BoundChange::bind(&module, "missing", &bundle, &description).is_err());
    let mut incompatible = description.clone();
    incompatible.semantics = "producer-defined semantics".into();
    assert!(BoundChange::bind(&module, "restock", &bundle, &incompatible).is_err());
    incompatible = description.clone();
    incompatible.schema = 2;
    assert!(BoundChange::bind(&module, "restock", &bundle, &incompatible).is_err());
    incompatible = description;
    std::mem::swap(&mut incompatible.finish, &mut incompatible.decision);
    assert!(BoundChange::bind(&module, "restock", &bundle, &incompatible).is_err());
    let false_proof: Bundle = serde_json::from_value(fixture["false_proof"].clone()).unwrap();
    let authenticated = CheckedBundle::check(&false_proof).unwrap();
    assert!(authenticated.first_order_context().is_err());
    assert!(authenticated.verify(module.program()).is_err());
}
