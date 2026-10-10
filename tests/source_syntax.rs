use serde_json::{json, Value};
use std::{
    io::Write,
    path::Path,
    process::{Command, Stdio},
};
use verified_language::{
    action_ir::CheckedActions,
    core::CheckedModule,
    registry::{Bundle, CheckedBundle},
    source_syntax::{BoundSyntax, Roles},
    syntax::parse,
};

const APP: &str = include_str!("../examples/action-control.ink");
fn actions(source: &str) -> CheckedActions {
    CheckedActions::elaborate(&CheckedModule::from_source(parse(source).unwrap()).unwrap()).unwrap()
}
fn fixture(actions: &CheckedActions) -> Value {
    // The external producer independently encodes both artifacts. A counterfeit
    // uses an authentic fresh snapshot and a well-typed but wrong image root.
    let script = r#"
import copy,json,sys,tempfile
from producers.source_syntax import publish
from ink_knowledge import Store,identity
module,actions=json.load(sys.stdin)
with tempfile.TemporaryDirectory() as directory:
 roles,view=publish(module,actions,directory)
 changed=copy.deepcopy(view['objects'][roles['program']])
 changed['payload']['declaration']['Function']['body']['Construct']['arguments'][1]['U64']-=1
 with tempfile.TemporaryDirectory() as other:
  objects=[obj for id,obj in view['objects'].items() if id!=roles['program']]+[changed]
  store=Store.publish(other,objects)
  wrong=copy.deepcopy(roles);wrong['program']=identity(changed)
  print(json.dumps(dict(roles=roles,view=view,wrong_roles=wrong,wrong_view=store.bundle([wrong['program']]))))
"#;
    let mut child = Command::new("python3")
        .args(["-c", script])
        .current_dir(Path::new(env!("CARGO_MANIFEST_DIR")).join("knowledge"))
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .unwrap();
    let input = json!([
        serde_json::from_slice::<Value>(&actions.module().bytes().unwrap()).unwrap(),
        serde_json::from_slice::<Value>(&actions.bytes().unwrap()).unwrap()
    ]);
    child
        .stdin
        .take()
        .unwrap()
        .write_all(&serde_json::to_vec(&input).unwrap())
        .unwrap();
    let output = child.wait_with_output().unwrap();
    assert!(
        output.status.success(),
        "{}",
        String::from_utf8_lossy(&output.stderr)
    );
    serde_json::from_slice(&output.stdout).unwrap()
}

#[test]
fn authentic_complete_code_is_bound_and_other_code_cannot_substitute() {
    let ir = actions(APP);
    let f = fixture(&ir);
    let roles: Roles = serde_json::from_value(f["roles"].clone()).unwrap();
    let bundle: Bundle = serde_json::from_value(f["view"].clone()).unwrap();
    let bound = BoundSyntax::bind(&ir, &bundle, &roles).unwrap();
    assert_eq!(bound.source_identity(), ir.source_identity());
    assert_eq!(bound.actions_identity(), ir.identity().unwrap());
    // Helper bodies, events, row schema and execution order are all bound.
    for source in [
        APP.replace("a:a,b:b", "a:b,b:a"),
        APP.replace("emit seen(99)", "emit seen(98)"),
        APP.replace("value:u32", "value:u64"),
        APP.replace("b:advance(1)?,a:advance(2)?", "a:advance(2)?,b:advance(1)?"),
    ] {
        if let Ok(program) = parse(&source)
            .and_then(CheckedModule::from_source)
            .and_then(|m| CheckedActions::elaborate(&m))
        {
            assert!(BoundSyntax::bind(&program, &bundle, &roles).is_err());
        } else {
            assert!(source.contains("value:u64")); // This schema change is incompatible with action types.
        }
    }
    let wrong_roles: Roles = serde_json::from_value(f["wrong_roles"].clone()).unwrap();
    let wrong_view: Bundle = serde_json::from_value(f["wrong_view"].clone()).unwrap();
    // Authentic membership and general typing are deliberately insufficient.
    CheckedBundle::check(&wrong_view)
        .unwrap()
        .first_order_context()
        .unwrap();
    assert!(BoundSyntax::bind(&ir, &wrong_view, &wrong_roles).is_err());
    let mut alias = roles.clone();
    alias.fields = alias.words.clone();
    assert!(BoundSyntax::bind(&ir, &bundle, &alias).is_err());
    let mut version = roles.clone();
    version.schema = 2;
    assert!(BoundSyntax::bind(&ir, &bundle, &version).is_err());
    let mut hidden = bundle.clone();
    hidden.roots.clear();
    assert!(BoundSyntax::bind(&ir, &hidden, &roles).is_err());
}

#[test]
fn cli_replay_checks_source_and_preserves_output_on_rejection() {
    let ir = actions(APP);
    let f = fixture(&ir);
    let temp = std::env::temp_dir().join(format!("ink-code-syntax-{}", std::process::id()));
    std::fs::create_dir_all(&temp).unwrap();
    let roles = temp.join("roles.json");
    let view = temp.join("view.json");
    let out = temp.join("expected.json");
    std::fs::write(&roles, serde_json::to_vec(&f["roles"]).unwrap()).unwrap();
    std::fs::write(&view, serde_json::to_vec(&f["view"]).unwrap()).unwrap();
    let source = Path::new(env!("CARGO_MANIFEST_DIR")).join("examples/action-control.ink");
    for command in ["emit-source-syntax", "check-source-syntax"] {
        let output = Command::new(env!("CARGO_BIN_EXE_ink"))
            .arg(command)
            .arg(&source)
            .arg("--roles")
            .arg(&roles)
            .arg("--view")
            .arg(&view)
            .arg("-o")
            .arg(&out)
            .output()
            .unwrap();
        assert!(
            output.status.success(),
            "{}",
            String::from_utf8_lossy(&output.stderr)
        );
        assert!(String::from_utf8_lossy(&output.stdout).contains("no interpreter refinement"));
    }
    let expected: Value = serde_json::from_slice(&std::fs::read(&out).unwrap()).unwrap();
    assert_eq!(
        expected["program"],
        f["view"]["objects"][f["roles"]["program"].as_str().unwrap()]["payload"]["declaration"]
    );
    let bytes = std::fs::read(&out).unwrap();
    let mut invalid = f["roles"].clone();
    invalid["schema"] = json!(99);
    std::fs::write(&roles, serde_json::to_vec(&invalid).unwrap()).unwrap();
    let rejected = Command::new(env!("CARGO_BIN_EXE_ink"))
        .arg("emit-source-syntax")
        .arg(&source)
        .arg("--roles")
        .arg(&roles)
        .arg("-o")
        .arg(&out)
        .output()
        .unwrap();
    assert!(!rejected.status.success());
    assert_eq!(std::fs::read(&out).unwrap(), bytes);
    std::fs::remove_dir_all(temp).unwrap();
}
