use sha2::{Digest, Sha256};
use std::{
    collections::BTreeMap,
    fs,
    path::{Path, PathBuf},
    process::Command,
    sync::atomic::{AtomicUsize, Ordering},
};
use verified_language::{
    definition_native,
    knowledge::Lock,
    library::{self, Bundle, Object},
    logic::{Branch, Constructor, Declaration, Proof, Sort, Term},
};

static NEXT: AtomicUsize = AtomicUsize::new(0);
struct Scratch(PathBuf);
impl Scratch {
    fn new() -> Self {
        let p = std::env::temp_dir().join(format!(
            "ink-definition-{}-{}",
            std::process::id(),
            NEXT.fetch_add(1, Ordering::Relaxed)
        ));
        fs::create_dir(&p).unwrap();
        Self(p)
    }
}
impl Drop for Scratch {
    fn drop(&mut self) {
        let _ = fs::remove_dir_all(&self.0);
    }
}
fn fixture(name: &str) -> (Bundle, BTreeMap<String, String>) {
    let p = Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("knowledge")
        .join(name);
    (
        library::bundle(&p.join("lock.json")).unwrap(),
        serde_json::from_slice(&fs::read(p.join("names.json")).unwrap()).unwrap(),
    )
}
fn empty() -> Bundle {
    Bundle {
        lock: Lock {
            schema: 1,
            semantics: library::SEMANTICS.into(),
            objects: vec![],
        },
        objects: BTreeMap::new(),
    }
}
fn add(b: &mut Bundle, declaration: Declaration, deps: Vec<String>) -> String {
    let o = Object {
        schema: 1,
        semantics: library::SEMANTICS.into(),
        name: "database_definition".into(),
        dependencies: deps,
        declaration,
    };
    let raw = serde_json::to_string(&o).unwrap();
    let id = format!("{:x}", Sha256::digest(raw.as_bytes()));
    b.lock.objects.push(id.clone());
    b.objects.insert(id.clone(), raw);
    id
}
fn function(params: Vec<(String, Sort)>, result: Sort, body: Term) -> Declaration {
    Declaration::Function {
        params,
        result,
        body,
        recursive: None,
    }
}
fn var(n: &str) -> Term {
    Term::Var(n.into())
}
fn ctor(id: &str, tag: usize, args: Vec<Term>) -> Term {
    Term::Construct {
        datatype: id.into(),
        constructor: tag,
        arguments: args,
    }
}
fn call(id: &str, args: Vec<Term>) -> Term {
    Term::Call {
        function: id.into(),
        arguments: args,
    }
}
fn value(t: &Term) -> String {
    match t {
        Term::Bool(b) => format!("Value::Bool({b})"), Term::U64(n) => format!("Value::U64({n}u64)"),
        Term::Construct { datatype, constructor, arguments } => format!("Value::Data {{ datatype: \"{datatype}\".into(), constructor: {constructor}, arguments: vec![{}] }}", arguments.iter().map(value).collect::<Vec<_>>().join(",")),
        _ => panic!("native test input must be ground"),
    }
}
fn assertion(id: &str, args: &[Term], expected: &Term) -> String {
    format!(
        "assert_eq!(invoke(\"{id}\", &[{}]).unwrap(), {});\n",
        args.iter().map(value).collect::<Vec<_>>().join(","),
        value(expected)
    )
}
fn native(
    label: &str,
    bundle: &Bundle,
    exports: &[String],
    driver: &str,
) -> definition_native::Receipt {
    native_selected(label, bundle, exports, driver, None)
}
fn native_selected(
    label: &str,
    bundle: &Bundle,
    exports: &[String],
    driver: &str,
    selection: Option<&definition_native::SelectionPackage>,
) -> definition_native::Receipt {
    let emitted = definition_native::emit_selected(bundle, exports, selection).unwrap();
    let again = definition_native::emit_selected(bundle, exports, selection).unwrap();
    assert_eq!(emitted.source, again.source);
    assert_eq!(
        emitted.receipt.source_sha256,
        format!("{:x}", Sha256::digest(emitted.source.as_bytes()))
    );
    let tmp = Scratch::new();
    fs::write(tmp.0.join("definition.rs"), &emitted.source).unwrap();
    fs::write(
        tmp.0.join("main.rs"),
        format!("mod definition; use definition::{{Value,invoke}}; fn main() {{ {driver} }}"),
    )
    .unwrap();
    let out = Command::new("rustc")
        .args([
            "--edition=2021",
            "-O",
            "--deny",
            "warnings",
            "main.rs",
            "-o",
            "run",
        ])
        .current_dir(&tmp.0)
        .output()
        .unwrap();
    assert!(
        out.status.success(),
        "{}",
        String::from_utf8_lossy(&out.stderr)
    );
    let out = Command::new(tmp.0.join("run")).output().unwrap();
    assert!(
        out.status.success(),
        "{}",
        String::from_utf8_lossy(&out.stderr)
    );
    let wasm = std::env::var_os("INK_DEFINITION_WASM").is_some();
    if wasm {
        fs::write(tmp.0.join("wasm.rs"), format!("mod definition; use definition::{{Value,invoke}}; #[no_mangle] pub extern \"C\" fn run_checks() -> u32 {{ {driver} 1 }}")).unwrap();
        let out = Command::new("rustc")
            .args([
                "--edition=2021",
                "-O",
                "--deny",
                "warnings",
                "--target",
                "wasm32-unknown-unknown",
                "--crate-type",
                "cdylib",
                "-C",
                "panic=abort",
                "wasm.rs",
                "-o",
                "program.wasm",
            ])
            .current_dir(&tmp.0)
            .output()
            .unwrap();
        assert!(
            out.status.success(),
            "{}",
            String::from_utf8_lossy(&out.stderr)
        );
        fs::write(tmp.0.join("check.cjs"), "const fs=require('node:fs'); WebAssembly.instantiate(fs.readFileSync('program.wasm'),{}).then(({instance})=>{if(instance.exports.run_checks()!==1)throw Error('wrong result');}).catch(e=>{console.error(e);process.exitCode=1;});").unwrap();
        let out = Command::new("node")
            .arg("check.cjs")
            .current_dir(&tmp.0)
            .output()
            .unwrap();
        assert!(
            out.status.success(),
            "{}",
            String::from_utf8_lossy(&out.stderr)
        );
    }
    if let Some(root) = std::env::var_os("INK_DEFINITION_REPORT_DIR") {
        let root = PathBuf::from(root).join(label);
        fs::create_dir_all(root.parent().unwrap()).unwrap();
        fs::create_dir(&root).expect("definition report must be fresh");
        for name in [
            "definition.rs",
            "main.rs",
            "wasm.rs",
            "check.cjs",
            "program.wasm",
        ] {
            let p = tmp.0.join(name);
            if p.exists() {
                fs::copy(p, root.join(name)).unwrap();
            }
        }
        fs::write(
            root.join("bundle.json"),
            serde_json::to_vec(bundle).unwrap(),
        )
        .unwrap();
        fs::write(
            root.join("receipt.json"),
            serde_json::to_vec_pretty(&emitted.receipt).unwrap(),
        )
        .unwrap();
        if let Some(selection) = selection {
            fs::write(
                root.join("selection.json"),
                serde_json::to_vec_pretty(selection).unwrap(),
            )
            .unwrap();
        }
        let version = Command::new("rustc").arg("-Vv").output().unwrap();
        fs::write(root.join("checks.json"), serde_json::to_vec_pretty(&serde_json::json!({"native":"passed","wasm":if wasm {"passed"}else{"not requested"},"rustc":String::from_utf8_lossy(&version.stdout),"scope":"checked definition execution and malformed-value rejection; no performance or source transaction claim"})).unwrap()).unwrap();
    }
    emitted.receipt
}

#[test]
fn arbitrary_primitive_definitions_keywords_and_owned_matches_execute_exactly() {
    let mut b = empty();
    let mut roots = Vec::new();
    let mut driver = String::new();
    let mut checks = 0;
    let words = [
        0u64,
        1,
        2,
        u64::MAX,
        u64::MAX - 1,
        1 << 63,
        0xa6d3_79e5_1248_bc01,
    ];
    for op in ["+", "-", "*", "==", "!=", "<", "<=", ">", ">="] {
        let result = if ["+", "-", "*"].contains(&op) {
            Sort::U64
        } else {
            Sort::Bool
        };
        let id = add(
            &mut b,
            function(
                vec![("type".into(), Sort::U64), ("match".into(), Sort::U64)],
                result,
                Term::Binary {
                    op: op.into(),
                    left: Box::new(var("type")),
                    right: Box::new(var("match")),
                },
            ),
            vec![],
        );
        roots.push(id.clone());
        for a in words {
            for c in words {
                let result = match op {
                    "+" => Term::U64(a.wrapping_add(c)),
                    "-" => Term::U64(a.wrapping_sub(c)),
                    "*" => Term::U64(a.wrapping_mul(c)),
                    "==" => Term::Bool(a == c),
                    "!=" => Term::Bool(a != c),
                    "<" => Term::Bool(a < c),
                    "<=" => Term::Bool(a <= c),
                    ">" => Term::Bool(a > c),
                    _ => Term::Bool(a >= c),
                };
                driver.push_str(&assertion(&id, &[Term::U64(a), Term::U64(c)], &result));
                checks += 1;
            }
        }
    }
    for op in ["&&", "||", "==", "!="] {
        let id = add(
            &mut b,
            function(
                vec![("mod".into(), Sort::Bool), ("self".into(), Sort::Bool)],
                Sort::Bool,
                Term::Binary {
                    op: op.into(),
                    left: Box::new(var("mod")),
                    right: Box::new(var("self")),
                },
            ),
            vec![],
        );
        roots.push(id.clone());
        for a in [false, true] {
            for c in [false, true] {
                let result = match op {
                    "&&" => a && c,
                    "||" => a || c,
                    "==" => a == c,
                    _ => a != c,
                };
                driver.push_str(&assertion(
                    &id,
                    &[Term::Bool(a), Term::Bool(c)],
                    &Term::Bool(result),
                ));
                checks += 1;
            }
        }
    }
    let data = add(
        &mut b,
        Declaration::Datatype {
            constructors: vec![Constructor {
                name: "struct".into(),
                fields: vec![Sort::U64, Sort::Bool],
            }],
        },
        vec![],
    );
    let body = Term::Match {
        scrutinee: Box::new(ctor(&data, 0, vec![var("impl"), var("where")])),
        branches: vec![Branch {
            bindings: vec!["enum".into(), "pub".into()],
            body: Term::If {
                condition: Box::new(var("pub")),
                on_true: Box::new(var("enum")),
                on_false: Box::new(Term::U64(9)),
            },
        }],
    };
    let id = add(
        &mut b,
        function(
            vec![("impl".into(), Sort::U64), ("where".into(), Sort::Bool)],
            Sort::U64,
            body,
        ),
        vec![data],
    );
    roots.push(id.clone());
    for a in words {
        for c in [false, true] {
            driver.push_str(&assertion(
                &id,
                &[Term::U64(a), Term::Bool(c)],
                &Term::U64(if c { a } else { 9 }),
            ));
            checks += 1;
        }
    }
    native("primitives", &b, &roots, &driver);
    println!("primitive native comparisons: {checks}");
}

#[test]
fn recursive_trees_lists_and_private_dependencies_lower_without_recognisers() {
    let (b, n) = fixture("inductive");
    let exports = vec![
        n["composed"].clone(),
        n["copy_tree"].clone(),
        n["map_composed"].clone(),
    ];
    let checked = library::load_bundle(&b).unwrap();
    let mut driver = String::new();
    let mut checks = 0;
    for seed in [0u64, 1, 2, u64::MAX, 1 << 63, 0xa614_b25c_38e7_290f] {
        let tree = ctor(
            &n["Tree64"],
            1,
            vec![
                ctor(&n["Tree64"], 0, vec![Term::U64(seed)]),
                ctor(
                    &n["Tree64"],
                    1,
                    vec![
                        ctor(&n["Tree64"], 0, vec![Term::U64(u64::MAX)]),
                        ctor(&n["Tree64"], 0, vec![Term::U64(seed.wrapping_mul(7))]),
                    ],
                ),
            ],
        );
        let words = [seed, u64::MAX, 0, seed.wrapping_add(1)];
        let list = words
            .iter()
            .rev()
            .fold(ctor(&n["List64"], 0, vec![]), |t, x| {
                ctor(&n["List64"], 1, vec![Term::U64(*x), t])
            });
        let mapped = words
            .iter()
            .rev()
            .fold(ctor(&n["List64"], 0, vec![]), |t, x| {
                ctor(
                    &n["List64"],
                    1,
                    vec![Term::U64(x.wrapping_mul(2).wrapping_add(1)), t],
                )
            });
        for (id, args, expected) in [
            (
                &n["composed"],
                vec![Term::U64(seed)],
                Term::U64(seed.wrapping_mul(2).wrapping_add(1)),
            ),
            (&n["copy_tree"], vec![tree.clone()], tree),
            (&n["map_composed"], vec![list], mapped),
        ] {
            assert_eq!(
                checked
                    .context
                    .evaluate(&[], &call(id, args.clone()))
                    .unwrap(),
                expected
            );
            driver.push_str(&assertion(id, &args, &expected));
            checks += 1;
        }
    }
    driver.push_str(&format!(
        "assert!(invoke(\"{}\", &[Value::U64(3)]).is_err());",
        n["inc"]
    ));
    let projected = library::project(&b, &exports).unwrap();
    let e = definition_native::emit(&projected, &exports).unwrap();
    assert!(!e.source.contains(&format!("pub fn f_{}", n["inc"])));
    native("inductive", &projected, &exports, &driver);
    println!("recursive native comparisons: {checks}");
    assert!(definition_native::emit(&projected, &[n["inc"].clone()])
        .unwrap_err_string()
        .contains("public root"));
}

trait ErrorString {
    fn unwrap_err_string(self) -> String;
}
impl ErrorString for Result<definition_native::Emission, String> {
    fn unwrap_err_string(self) -> String {
        match self {
            Err(e) => e,
            Ok(_) => panic!("expected rejection"),
        }
    }
}

fn inhabit(b: &Bundle, s: &Sort, seed: usize, depth: usize) -> Term {
    match s {
        Sort::Bool => Term::Bool(seed % 2 == 0),
        Sort::U64 => Term::U64(if seed % 2 == 0 { seed as u64 } else { u64::MAX }),
        Sort::Data(id) => {
            let o: Object = serde_json::from_str(&b.objects[id]).unwrap();
            let Declaration::Datatype { constructors } = o.declaration else {
                panic!()
            };
            let i = if depth == 0 {
                constructors
                    .iter()
                    .position(|c| !c.fields.contains(&Sort::SelfType))
                    .unwrap()
            } else {
                seed % constructors.len()
            };
            let args = constructors[i]
                .fields
                .iter()
                .enumerate()
                .map(|(j, s)| {
                    inhabit(
                        b,
                        &if *s == Sort::SelfType {
                            Sort::Data(id.clone())
                        } else {
                            s.clone()
                        },
                        seed + j + 1,
                        depth.saturating_sub(1),
                    )
                })
                .collect();
            ctor(id, i, args)
        }
        Sort::SelfType => panic!(),
    }
}

#[test]
fn emitted_row_column_operations_preserve_native_continued_histories_and_migration() {
    let mut total = 0;
    for folder in ["source-column-layout", "source-column-ledger"] {
        let (b, n) = fixture(folder);
        let checked = library::load_bundle(&b).unwrap();
        let roots = [
            "layout_row_step",
            "layout_column_step",
            "layout_encode",
            "layout_decode",
            "layout_row_lookup",
        ]
        .map(|s| n[s].clone());
        let row_object: Object = serde_json::from_str(&b.objects[&n["LayoutRows"]]).unwrap();
        let Declaration::Datatype { constructors } = row_object.declaration else {
            panic!()
        };
        let row_sort = &constructors[1].fields[1];
        let keys = [0u128, 1, u64::MAX as u128, 1u128 << 64, u128::MAX];
        let key = |k: u128| {
            ctor(
                &n["TableKey128"],
                0,
                vec![Term::U64((k >> 64) as u64), Term::U64(k as u64)],
            )
        };
        let optional = |v: Option<Term>| {
            ctor(
                &n["LayoutOptionalRow"],
                usize::from(v.is_some()),
                v.into_iter().collect(),
            )
        };
        let rows_from = |m: &BTreeMap<u128, Term>| {
            m.iter()
                .rev()
                .fold(ctor(&n["LayoutRows"], 0, vec![]), |tail, (k, v)| {
                    ctor(&n["LayoutRows"], 1, vec![key(*k), v.clone(), tail])
                })
        };
        let mut model = BTreeMap::new();
        let mut rows = rows_from(&model);
        let mut cols = checked
            .context
            .evaluate(&[], &call(&n["layout_encode"], vec![rows.clone()]))
            .unwrap();
        let mut driver = format!(
            "let mut rows={}; let mut columns={};\n",
            value(&rows),
            value(&cols)
        );
        for i in 0..24 {
            let k = keys[(i * 7) % keys.len()];
            let payload = if i % 4 == 3 {
                None
            } else {
                Some(inhabit(&b, row_sort, i, 3))
            };
            let write = ctor(
                &n["LayoutWrite"],
                0,
                vec![key(k), optional(payload.clone())],
            );
            if let Some(v) = payload {
                model.insert(k, v);
            } else {
                model.remove(&k);
            }
            let expected = rows_from(&model);
            rows = checked
                .context
                .evaluate(&[], &call(&n["layout_row_step"], vec![rows, write.clone()]))
                .unwrap();
            cols = checked
                .context
                .evaluate(
                    &[],
                    &call(&n["layout_column_step"], vec![cols, write.clone()]),
                )
                .unwrap();
            assert_eq!(rows, expected);
            assert_eq!(
                checked
                    .context
                    .evaluate(&[], &call(&n["layout_decode"], vec![cols.clone()]))
                    .unwrap(),
                expected
            );
            driver.push_str(&format!("let write={}; rows=invoke(\"{}\", &[rows,write.clone()]).unwrap(); columns=invoke(\"{}\", &[columns,write]).unwrap(); assert_eq!(rows,{}); assert_eq!(invoke(\"{}\", &[columns.clone()]).unwrap(),rows);\n",value(&write),n["layout_row_step"],n["layout_column_step"],value(&expected),n["layout_decode"]));
            total += 2;
            for q in keys {
                let result = optional(model.get(&q).cloned());
                driver.push_str(&format!(
                    "assert_eq!(invoke(\"{}\", &[rows.clone(),{}]).unwrap(),{});\n",
                    n["layout_row_lookup"],
                    value(&key(q)),
                    value(&result)
                ));
                total += 1;
            }
            if i == 7 || i == 15 {
                driver.push_str(&format!("columns=invoke(\"{}\", &[rows.clone()]).unwrap(); assert_eq!(invoke(\"{}\", &[columns.clone()]).unwrap(),rows);\n",n["layout_encode"],n["layout_decode"]));
                total += 1;
            }
        }
        native(folder, &b, &roots, &driver);
        let example = if folder == "source-column-layout" {
            "row"
        } else {
            "ledger"
        };
        let candidate_folder = format!("definition-candidates/{example}");
        let (candidate, _) = fixture(&candidate_folder);
        let selection: definition_native::SelectionPackage = serde_json::from_slice(
            &fs::read(
                Path::new(env!("CARGO_MANIFEST_DIR"))
                    .join("knowledge")
                    .join(&candidate_folder)
                    .join("selection.json"),
            )
            .unwrap(),
        )
        .unwrap();
        let selected = native_selected(
            &format!("selected-{example}"),
            &candidate,
            &roots,
            &driver,
            Some(&selection),
        );
        assert_eq!(selected.selections[0].1, selection.proposals[0].replacement);
    }
    println!("continued row/column native comparisons: {}", total * 2);
}

#[test]
fn entry_selection_uses_actual_proved_bodies_without_redirecting_internal_calls() {
    let (b, n) = fixture("definition-candidates/map");
    let selection: definition_native::SelectionPackage = serde_json::from_slice(
        &fs::read(
            Path::new(env!("CARGO_MANIFEST_DIR"))
                .join("knowledge/definition-candidates/map/selection.json"),
        )
        .unwrap(),
    )
    .unwrap();
    let original = n["map_staged"].clone();
    let mut driver = String::new();
    for seed in [0u64, 1, 2, u64::MAX, 1 << 63, 0x85fa_b371_64cd_9082] {
        let words = [seed, u64::MAX, 0, seed.wrapping_add(1)];
        let input = words
            .iter()
            .rev()
            .fold(ctor(&n["List64"], 0, vec![]), |tail, x| {
                ctor(&n["List64"], 1, vec![Term::U64(*x), tail])
            });
        let expected = words
            .iter()
            .rev()
            .fold(ctor(&n["List64"], 0, vec![]), |tail, x| {
                ctor(
                    &n["List64"],
                    1,
                    vec![Term::U64(x.wrapping_mul(2).wrapping_add(1)), tail],
                )
            });
        driver.push_str(&assertion(&original, &[input], &expected));
    }
    let emitted =
        definition_native::emit_selected(&b, &[original.clone()], Some(&selection)).unwrap();
    assert!(!emitted.receipt.executable_closure.contains(&original));
    assert!(!emitted
        .receipt
        .executable_closure
        .contains(&n["map_double"]));
    assert!(emitted
        .receipt
        .executable_closure
        .contains(&n["map_composed"]));
    native_selected(
        "selected-map",
        &b,
        &[original.clone()],
        &driver,
        Some(&selection),
    );
    for kind in 0..5 {
        let mut bad = selection.clone();
        match kind {
            0 => bad.bundle_sha256 = "0".repeat(64),
            1 => bad.proposals[0].proof = Proof::Hypothesis(0),
            2 => bad.proposals.push(bad.proposals[0].clone()),
            3 => bad.proposals[0].replacement = n["map_inc"].clone(),
            _ => bad.observations = "native-errors-and-events-v1".into(),
        }
        assert!(definition_native::emit_selected(&b, &[original.clone()], Some(&bad)).is_err());
    }
    let mut b = empty();
    let original = add(
        &mut b,
        function(
            vec![("x".into(), Sort::U64)],
            Sort::U64,
            Term::Binary {
                op: "+".into(),
                left: Box::new(var("x")),
                right: Box::new(Term::U64(1)),
            },
        ),
        vec![],
    );
    // Replacing the original definition itself here would create a cycle.
    let replacement = add(
        &mut b,
        function(
            vec![("renamed".into(), Sort::U64)],
            Sort::U64,
            call(&original, vec![var("renamed")]),
        ),
        vec![original.clone()],
    );
    let mut package = definition_native::SelectionPackage {
        schema: 1,
        semantics: definition_native::SELECTION_SEMANTICS.into(),
        observations: "first-order-total-values-v1".into(),
        bundle_sha256: definition_native::emit(&b, &[original.clone()])
            .unwrap()
            .receipt
            .bundle_sha256,
        proposals: vec![definition_native::Replacement {
            original: original.clone(),
            replacement: replacement.clone(),
            proof: Proof::Convert {
                from: call(&original, vec![var("x")]),
                to: call(&replacement, vec![var("x")]),
            },
        }],
    };
    let mut driver = String::new();
    for x in [0u64, 1, 2, u64::MAX, 1 << 63, 0x85fa_b371_64cd_9082] {
        driver.push_str(&assertion(
            &original,
            &[Term::U64(x)],
            &Term::U64(x.wrapping_add(1)),
        ));
    }
    native_selected(
        "entry-call-cycle",
        &b,
        &[original.clone()],
        &driver,
        Some(&package),
    );
    let wrong = add(
        &mut b,
        function(vec![("x".into(), Sort::Bool)], Sort::Bool, var("x")),
        vec![],
    );
    package.bundle_sha256 = definition_native::emit(&b, &[original.clone()])
        .unwrap()
        .receipt
        .bundle_sha256;
    package.proposals[0].replacement = wrong;
    assert!(
        definition_native::emit_selected(&b, &[original], Some(&package))
            .unwrap_err_string()
            .contains("signature")
    );
    println!("proved selection native comparisons: 12");
}

#[test]
fn forged_libraries_bad_exports_and_malformed_values_are_rejected() {
    let (b, n) = fixture("inductive");
    let root = n["map_composed"].clone();
    let mut bad = b.clone();
    bad.objects.get_mut(&n["double"]).unwrap().push(' ');
    assert!(definition_native::emit(&bad, &[root.clone()])
        .unwrap_err_string()
        .contains("hash"));
    let mut bad = b.clone();
    add(
        &mut bad,
        Declaration::Theorem {
            params: vec![],
            conditions: vec![],
            from: Term::U64(1),
            to: Term::U64(2),
            proof: Proof::Refl(Term::U64(1)),
        },
        vec![],
    );
    assert!(definition_native::emit(&bad, &[root.clone()])
        .unwrap_err_string()
        .contains("different statement"));
    assert!(definition_native::emit(&b, &[root.clone(), root.clone()])
        .unwrap_err_string()
        .contains("duplicate"));
    assert!(
        definition_native::emit(&b, &[n["tree_copy_identity"].clone()])
            .unwrap_err_string()
            .contains("function")
    );
    let list = &n["List64"];
    let mut driver=format!("assert!(invoke(\"{root}\",&[]).is_err()); assert!(invoke(\"{root}\",&[Value::Bool(true)]).is_err());");
    for t in [
        ctor(&"0".repeat(64), 0, vec![]),
        ctor(list, 2, vec![]),
        ctor(list, 1, vec![]),
        ctor(list, 1, vec![Term::Bool(false), ctor(list, 0, vec![])]),
        ctor(
            list,
            1,
            vec![Term::U64(0), ctor(&n["Tree64"], 0, vec![Term::U64(0)])],
        ),
    ] {
        driver.push_str(&format!(
            "assert!(invoke(\"{root}\",&[{}]).is_err());",
            value(&t)
        ));
    }
    driver.push_str(&format!("let mut deep=Value::Data{{datatype:\"{list}\".into(),constructor:0,arguments:vec![]}};for _ in 0..66{{deep=Value::Data{{datatype:\"{list}\".into(),constructor:1,arguments:vec![Value::U64(0),deep]}};}} assert!(invoke(\"{root}\",&[deep]).is_err());"));
    native("adversarial", &b, &[root], &driver);
}

#[test]
fn cli_emits_checked_bodies_and_preserves_output_on_rejection() {
    let root = Path::new(env!("CARGO_MANIFEST_DIR"));
    let lock = root.join("knowledge/inductive/lock.json");
    let (b, n) = fixture("inductive");
    let temp = Scratch::new();
    let exports = temp.0.join("exports.json");
    let output = temp.0.join("definition.rs");
    fs::write(
        &exports,
        serde_json::to_vec(&vec![n["composed"].clone()]).unwrap(),
    )
    .unwrap();
    let invoke = |lock: &Path| {
        Command::new(env!("CARGO_BIN_EXE_ink"))
            .arg("emit-definition")
            .arg(lock)
            .arg(&exports)
            .arg("-o")
            .arg(&output)
            .output()
            .unwrap()
    };
    let emitted = invoke(&lock);
    assert!(
        emitted.status.success(),
        "{}",
        String::from_utf8_lossy(&emitted.stderr)
    );
    let receipt: serde_json::Value = serde_json::from_slice(&emitted.stdout).unwrap();
    assert_eq!(
        receipt["source_sha256"],
        format!("{:x}", Sha256::digest(fs::read(&output).unwrap()))
    );
    assert_eq!(receipt["definition_semantics"], library::SEMANTICS);
    assert_eq!(
        fs::read_to_string(&output).unwrap(),
        definition_native::emit(&b, &[n["composed"].clone()])
            .unwrap()
            .source
    );
    let original = fs::read(&output).unwrap();
    for flags in [
        vec!["--trusted", "yes"],
        vec!["--select", "a", "--select", "b"],
    ] {
        let rejected = Command::new(env!("CARGO_BIN_EXE_ink"))
            .arg("emit-definition")
            .arg(&lock)
            .arg(&exports)
            .arg("-o")
            .arg(&output)
            .args(flags)
            .output()
            .unwrap();
        assert!(!rejected.status.success());
        assert_eq!(fs::read(&output).unwrap(), original);
    }
    fs::write(
        &exports,
        serde_json::to_vec(&vec![n["tree_copy_identity"].clone()]).unwrap(),
    )
    .unwrap();
    assert!(!invoke(&lock).status.success());
    assert_eq!(fs::read(&output).unwrap(), original);
    let objects = temp.0.join("objects");
    fs::create_dir(&objects).unwrap();
    fs::write(
        temp.0.join("lock.json"),
        serde_json::to_vec(&b.lock).unwrap(),
    )
    .unwrap();
    for (id, raw) in &b.objects {
        fs::write(
            objects.join(format!("{id}.json")),
            if id == &n["double"] {
                format!("{raw} ")
            } else {
                raw.clone()
            },
        )
        .unwrap();
    }
    fs::write(
        &exports,
        serde_json::to_vec(&vec![n["composed"].clone()]).unwrap(),
    )
    .unwrap();
    let rejected = invoke(&temp.0.join("lock.json"));
    assert!(!rejected.status.success());
    assert!(String::from_utf8_lossy(&rejected.stderr).contains("hash"));
    assert_eq!(fs::read(&output).unwrap(), original);
}

#[test]
fn external_candidate_producer_reproduces_pinned_objects_and_proofs() {
    let root = Path::new(env!("CARGO_MANIFEST_DIR"));
    for example in ["map", "row", "ledger"] {
        let temp = Scratch::new();
        let out = temp.0.join("candidate");
        let result = Command::new("python3")
            .arg(root.join("knowledge/tools/definition_candidates.py"))
            .arg("--example")
            .arg(example)
            .arg("--compiler")
            .arg(env!("CARGO_BIN_EXE_ink"))
            .arg("--output-dir")
            .arg(&out)
            .output()
            .unwrap();
        assert!(
            result.status.success(),
            "{}",
            String::from_utf8_lossy(&result.stderr)
        );
        let checked: serde_json::Value = serde_json::from_slice(&result.stdout).unwrap();
        assert_eq!(checked["status"], "checked");
        let pinned = root.join("knowledge/definition-candidates").join(example);
        for name in ["lock.json", "names.json", "exports.json", "selection.json"] {
            assert_eq!(
                fs::read(out.join(name)).unwrap(),
                fs::read(pinned.join(name)).unwrap(),
                "{example}/{name}"
            );
        }
        let bundle = library::bundle(&out.join("lock.json")).unwrap();
        for id in bundle.objects.keys() {
            assert_eq!(
                fs::read(out.join("objects").join(format!("{id}.json"))).unwrap(),
                fs::read(pinned.join("objects").join(format!("{id}.json"))).unwrap()
            );
        }
    }
}
