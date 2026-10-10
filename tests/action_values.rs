use serde_json::{json, Value as Json};
use std::{
    io::Write,
    path::Path,
    process::{Command, Stdio},
};
use verified_language::{
    action_ir::CheckedActions,
    action_values::{ActionValues, Roles},
    core::CheckedModule,
    logic::Term,
    registry::{Bundle, CheckedBundle},
    source_syntax,
    source_values::Limits,
    stateful::{Runtime, Value},
    syntax::{parse, Type},
};
const APP: &str = r#"module values;
id Other; id Key;
enum Error{Missing,Overflow,}
record Chain{next:Option<Chain>,n:u64,}
record Row{label:String,count:u32,value:Int,next:Option<Chain>,}
state Rows:Table<Key,Row> = Table.empty();
event seen:Row;
change put(id:Key,row:Row)->Result<Unit,Error> writes(Rows) emits(seen){
 if Rows.contains(id){Rows.replace(id,row);}else{Rows.insert(id,row);} emit seen(row);return Ok(());
}
change fail(id:Key)->Result<Unit,Error> writes(Rows){Rows.remove(id);return Err(Error.Missing);}
query get(id:Key)->Option<Row> reads(Rows){return Rows.get(id);}
query echo(xs:List<Row>)->List<Row>{return xs;}
query width(x:u64)->u64{return x;}
"#;
fn actions() -> CheckedActions {
    CheckedActions::elaborate(&CheckedModule::from_source(parse(APP).unwrap()).unwrap()).unwrap()
}
fn limits() -> Limits {
    Limits {
        nodes: 100_000,
        depth: 128,
        bytes: 16_777_216,
    }
}
fn fixture(ir: &CheckedActions, cases: &[(Type, Value)]) -> Json {
    let script = r#"
import copy,json,sys,tempfile
from producers.action_values import publish,encode
from ink_knowledge import Store,identity
module,actions,cases=json.load(sys.stdin)
with tempfile.TemporaryDirectory() as d:
 syntax,roles,view=publish(module,actions,d)
 encoded=[encode(syntax,roles,module['program'],ty,value) for ty,value in cases]
 changed=copy.deepcopy(view['objects'][roles['node']]);changed['payload']['declaration']['Datatype']['constructors'][2]['name']='AnyWord'
 with tempfile.TemporaryDirectory() as other:
  objects=list(view['objects'].values())+[changed]
  store=Store.publish(other,objects);wrong=copy.deepcopy(roles);wrong['node']=identity(changed)
  print(json.dumps(dict(syntax=syntax,roles=roles,view=view,encoded=encoded,wrong_roles=wrong,wrong_view=store.bundle([syntax['program'],wrong['value'],wrong['node']]))))
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
        serde_json::from_slice::<Json>(&ir.module().bytes().unwrap()).unwrap(),
        serde_json::from_slice::<Json>(&ir.bytes().unwrap()).unwrap(),
        cases
            .iter()
            .map(|(t, v)| json!([t, v.json()]))
            .collect::<Vec<_>>()
    ]);
    child
        .stdin
        .take()
        .unwrap()
        .write_all(&serde_json::to_vec(&input).unwrap())
        .unwrap();
    let out = child.wait_with_output().unwrap();
    assert!(
        out.status.success(),
        "{}",
        String::from_utf8_lossy(&out.stderr)
    );
    serde_json::from_slice(&out.stdout).unwrap()
}
fn bind(ir: &CheckedActions, f: &Json) -> ActionValues {
    ActionValues::bind(
        ir,
        &serde_json::from_value::<Bundle>(f["view"].clone()).unwrap(),
        &serde_json::from_value::<source_syntax::Roles>(f["syntax"].clone()).unwrap(),
        &serde_json::from_value::<Roles>(f["roles"].clone()).unwrap(),
    )
    .unwrap()
}
#[test]
fn independent_encoder_matches_complete_value_domain_and_real_action_observations() {
    let ir = actions();
    let mut runtime = Runtime::new(ir.module().program().clone()).unwrap();
    let mut cases = vec![
        (Type::Unit, Value::Unit),
        (Type::Bool, Value::Bool(true)),
        (Type::String, Value::String("é🙂\u{0}".into())),
    ];
    for v in [0, 1, u32::MAX] {
        cases.push((Type::U32, Value::U32(v)));
    }
    for v in [0, 1, 1 << 63, u64::MAX] {
        cases.push((Type::U64, Value::U64(v)));
    }
    for v in [
        "0".into(),
        "-1".into(),
        format!("{}", (num_bigint::BigInt::from(1) << 4095usize) + 17),
    ] {
        cases.push((Type::Int, Value::Int(v.parse().unwrap())));
    }
    for n in ["Key", "Other"] {
        cases.push((Type::Named(n.into()), Value::Id(n.into(), u128::MAX)));
    }
    cases.push((
        Type::Named("ArithmeticError".into()),
        Value::Enum("ArithmeticError".into(), "Overflow".into()),
    ));
    let row = json!({"label":"🙂\u{0}","count":u32::MAX,"value":{"Int":"-99999999999999999999999999999999999999"},"next":{"Some":{"n":u64::MAX,"next":{"None":null}}}});
    let mut observations = vec![];
    let mut requests = vec![
        (
            "put",
            json!(["ffffffffffffffffffffffffffffffff", row.clone()]),
        ),
        ("get", json!(["ffffffffffffffffffffffffffffffff"])),
        ("fail", json!(["ffffffffffffffffffffffffffffffff"])),
        ("get", json!(["ffffffffffffffffffffffffffffffff"])),
        ("width", json!([u64::MAX])),
        ("echo", json!([[row.clone(), row]])),
    ];
    for (name, args) in requests.drain(..) {
        let action = ir
            .module()
            .program()
            .actions
            .iter()
            .find(|a| a.name == name)
            .unwrap();
        let mut actual_args = vec![];
        for ((_, ty), raw) in action.params.iter().zip(args.as_array().unwrap()) {
            actual_args.push(Value::from_json(raw, ty, ir.module().program()).unwrap());
            cases.push((
                ty.clone(),
                Value::from_json(raw, ty, ir.module().program()).unwrap(),
            ));
        }
        let outcome = runtime.invoke_json(name, &args).unwrap();
        observations.push((name, actual_args, outcome.result.clone()));
        cases.push((action.result.clone(), outcome.result));
        for e in outcome.events {
            cases.push((ir.module().program().events[&e.channel].clone(), e.value));
        }
    }
    let f = fixture(&ir, &cases);
    let codec = bind(&ir, &f);
    assert_eq!(codec.source().actions_identity(), ir.identity().unwrap());
    for ((ty, value), expected) in cases.iter().zip(f["encoded"].as_array().unwrap()) {
        let t = codec.encode(ty, value, limits()).unwrap();
        assert_eq!(serde_json::to_value(&t).unwrap(), *expected);
        assert_eq!(codec.decode(ty, &t, limits()).unwrap(), *value);
        assert_eq!(codec.source().context().evaluate(&[], &t).unwrap(), t);
    }
    for (name, args, result) in observations {
        let terms = codec.encode_arguments(name, &args, limits()).unwrap();
        assert_eq!(
            codec.decode_arguments(name, &terms, limits()).unwrap(),
            args
        );
        let term = codec.encode_result(name, &result, limits()).unwrap();
        assert_eq!(codec.decode_result(name, &term, limits()).unwrap(), result);
    }
    assert!(codec.encode_arguments("absent", &[], limits()).is_err());
    assert!(codec.encode_arguments("width", &[], limits()).is_err());
    assert!(codec
        .encode_arguments("width", &[Value::U32(1)], limits())
        .is_err());
    assert!(codec
        .encode_result("width", &Value::Unit, limits())
        .is_err());
    assert!(codec
        .encode_arguments("get", &[Value::Id("Other".into(), 0)], limits())
        .is_err());
}
#[test]
fn authenticated_wrong_carrier_and_changed_source_cannot_forge_correspondence() {
    let ir = actions();
    let f = fixture(&ir, &[]);
    bind(&ir, &f);
    let syntax = serde_json::from_value::<source_syntax::Roles>(f["syntax"].clone()).unwrap();
    let roles = serde_json::from_value::<Roles>(f["roles"].clone()).unwrap();
    let wrong = serde_json::from_value::<Bundle>(f["wrong_view"].clone()).unwrap();
    CheckedBundle::check(&wrong)
        .unwrap()
        .first_order_context()
        .unwrap();
    assert!(ActionValues::bind(
        &ir,
        &wrong,
        &syntax,
        &serde_json::from_value(f["wrong_roles"].clone()).unwrap()
    )
    .is_err());
    let bundle = serde_json::from_value::<Bundle>(f["view"].clone()).unwrap();
    let changed = CheckedActions::elaborate(
        &CheckedModule::from_source(parse(&APP.replace("return x;", "return x+1;")).unwrap())
            .unwrap(),
    )
    .unwrap();
    assert!(ActionValues::bind(&changed, &bundle, &syntax, &roles).is_err());
    let mut hidden = bundle.clone();
    hidden.roots.retain(|id| id != &roles.value);
    assert!(ActionValues::bind(&ir, &hidden, &syntax, &roles).is_err());
    let codec = bind(&ir, &f);
    assert!(codec
        .decode(
            &Type::U32,
            &Term::Construct {
                datatype: roles.value,
                constructor: 0,
                arguments: vec![
                    Term::Construct {
                        datatype: roles.nodes,
                        constructor: 1,
                        arguments: vec![Term::Construct {
                            datatype: roles.node,
                            constructor: 2,
                            arguments: vec![Term::U64(1 << 32)],
                        }],
                    },
                    Term::U64(0)
                ]
            },
            limits()
        )
        .is_err());
}

#[test]
fn cli_and_argument_budgets_validate_before_writing_output() {
    let ir = actions();
    let f = fixture(&ir, &[]);
    let codec = bind(&ir, &f);
    let values = vec![
        Value::Id("Key".into(), 1),
        Value::from_json(
            &json!({"label":"é","count":1,"value":{"Int":"-4"},"next":{"None":null}}),
            &Type::Named("Row".into()),
            ir.module().program(),
        )
        .unwrap(),
    ];
    let terms = codec.encode_arguments("put", &values, limits()).unwrap();
    fn count(t: &Term) -> usize {
        match t {
            Term::Construct { arguments, .. } => 1 + arguments.iter().map(count).sum::<usize>(),
            _ => 1,
        }
    }
    let individual = Limits {
        nodes: terms.iter().map(count).max().unwrap(),
        ..limits()
    };
    for ((_, ty), value) in ir
        .module()
        .program()
        .actions
        .iter()
        .find(|a| a.name == "put")
        .unwrap()
        .params
        .iter()
        .zip(&values)
    {
        codec.encode(ty, value, individual).unwrap();
    }
    assert!(codec
        .encode_arguments("put", &values, individual)
        .unwrap_err()
        .contains("node budget"));
    assert!(codec
        .decode_arguments("put", &terms, individual)
        .unwrap_err()
        .contains("node budget"));
    assert!(codec.decode_arguments("get", &[], limits()).is_err());
    assert!(codec
        .decode_result(
            "width",
            &codec.encode(&Type::U32, &Value::U32(1), limits()).unwrap(),
            limits()
        )
        .is_err());
    let dir = std::env::temp_dir().join(format!("ink-action-values-{}", std::process::id()));
    std::fs::create_dir_all(&dir).unwrap();
    let source = dir.join("values.ink");
    std::fs::write(&source, APP).unwrap();
    for (name, v) in [
        ("syntax", &f["syntax"]),
        ("roles", &f["roles"]),
        ("view", &f["view"]),
        ("args", &json!([u64::MAX])),
    ] {
        std::fs::write(
            dir.join(format!("{name}.json")),
            serde_json::to_vec(v).unwrap(),
        )
        .unwrap();
    }
    let run = |command: &str| {
        Command::new(env!("CARGO_BIN_EXE_ink"))
            .args([
                command,
                source.to_str().unwrap(),
                "width",
                dir.join("args.json").to_str().unwrap(),
                "--syntax-roles",
                dir.join("syntax.json").to_str().unwrap(),
                "--value-roles",
                dir.join("roles.json").to_str().unwrap(),
                "--view",
                dir.join("view.json").to_str().unwrap(),
                "-o",
                dir.join("out.json").to_str().unwrap(),
            ])
            .output()
            .unwrap()
    };
    for command in ["check-action-values", "emit-action-values"] {
        let out = run(command);
        assert!(
            out.status.success(),
            "{}",
            String::from_utf8_lossy(&out.stderr)
        );
        assert!(String::from_utf8_lossy(&out.stdout).contains("No interpreter refinement"));
    }
    let bytes = std::fs::read(dir.join("out.json")).unwrap();
    let output: Json = serde_json::from_slice(&bytes).unwrap();
    let emitted: Vec<Term> = serde_json::from_value(output["arguments"].clone()).unwrap();
    assert_eq!(
        codec.decode_arguments("width", &emitted, limits()).unwrap(),
        vec![Value::U64(u64::MAX)]
    );
    std::fs::write(
        dir.join("roles.json"),
        serde_json::to_vec(&f["wrong_roles"]).unwrap(),
    )
    .unwrap();
    std::fs::write(
        dir.join("view.json"),
        serde_json::to_vec(&f["wrong_view"]).unwrap(),
    )
    .unwrap();
    assert!(!run("emit-action-values").status.success());
    assert_eq!(std::fs::read(dir.join("out.json")).unwrap(), bytes);
    std::fs::remove_dir_all(dir).unwrap();
}
