use serde_json::{json, Value};
use std::{collections::BTreeMap, fs};
use verified_language::{
    core::CheckedModule,
    eval,
    laws::{Catalogue, CheckedCatalogue},
    modules, registry,
    stateful::Runtime,
};
const SOURCE: &str = include_str!("../../examples/bulk-workloads/main.ink");
fn program() -> verified_language::syntax::Program {
    modules::load("examples/bulk-workloads/main.ink")
        .unwrap()
        .program
}
fn run(p: &verified_language::syntax::Program, n: &str, args: Value) -> Value {
    let f = p.functions.iter().find(|f| f.name == n).unwrap();
    let vs = args
        .as_array()
        .unwrap()
        .iter()
        .zip(&f.params)
        .map(|(v, (_, t))| eval::Value::from_program_json(v, t, p).unwrap())
        .collect();
    eval::call(p, n, vs, &mut 10000000).unwrap().json()
}
fn error(p: &verified_language::syntax::Program, n: &str, variant: &str) -> Value {
    let f = p.functions.iter().find(|f| f.name == n).unwrap();
    let verified_language::syntax::Type::Result(_, e) = &f.result else {
        panic!()
    };
    let verified_language::syntax::Type::Named(e) = e.as_ref() else {
        panic!()
    };
    json!({"Err":format!("{e}.{variant}")})
}
#[test]
fn bulk_laws_check_universally_and_rehashed_false_length_rejects() {
    let p = program();
    let module = CheckedModule::from_source(p).unwrap();
    let bundle: registry::Bundle =
        serde_json::from_slice(&fs::read("knowledge/store/bulk-buffer-view.json").unwrap())
            .unwrap();
    let catalogue = registry::CheckedBundle::check(&bundle)
        .unwrap()
        .catalogue()
        .unwrap();
    assert_eq!(catalogue.roots.len(), 48);
    CheckedCatalogue::check(&catalogue, module.program()).unwrap();
    let names: Value =
        serde_json::from_slice(&fs::read("knowledge/store/names.json").unwrap()).unwrap();
    let key = names["rewrite/bulk-buffer/u32/fill-length-helper"]
        .as_str()
        .unwrap();
    let mut law = catalogue.objects[key].clone();
    law.to = verified_language::semantic::word(verified_language::core::Type::U32, 0);
    let id = registry::identity(&registry::Entry::from_law(&law).unwrap()).unwrap();
    let false_catalogue = Catalogue {
        schema: 1,
        semantics: verified_language::laws::SEMANTICS.into(),
        roots: vec![id.clone()],
        objects: BTreeMap::from([(id, law)]),
    };
    assert!(CheckedCatalogue::check(&false_catalogue, module.program()).is_err());
}
#[test]
fn voxel_codec_ecs_and_range_workloads_match_independent_oracles_on_all_targets() {
    let p = program();
    let mut rt = Runtime::new(p.clone()).unwrap();
    let mut cases: Vec<(&str, Value, Value)> = vec![];
    cases.extend([
        ("twice", json!([[2,0,1]]), json!({"first":[2,0,1],"second":[2,0,1]})),
        ("shadowed", json!([[2,0,1]]), json!([0,1])),
        ("captured", json!([[2,0,1]]), json!([1,2,0])),
        ("branch_reuse", json!([[2,0,1],true]), json!({"first":[0,1],"second":[2,0,1]})),
        ("branch_reuse", json!([[2,0,1],false]), json!({"first":[2],"second":[2,0,1]})),
        ("after_map", json!([[2,0,1]]), json!({"first":[3,1,2],"second":[2,0,1]})),
        ("parallel_capture", json!([[2,0,1]]), json!([1,2,0])),
    ]);
    for (w, h, d) in [(1u32, 1u32, 1u32), (3, 2, 2), (4, 3, 2)] {
        let cells = (0..w * h * d).collect::<Vec<_>>();
        for (x, y, z, nx, ny, nz) in [
            (0, 0, 0, w, h, d),
            (1, 1, 0, 2, 1, 2),
            (w - 1, h - 1, d - 1, u32::MAX, u32::MAX, u32::MAX),
            (u32::MAX, 0, 0, 1, 1, 1),
        ] {
            let mut want = cells.clone();
            for zi in 0..d {
                for yi in 0..h {
                    for xi in 0..w {
                        if xi >= x
                            && xi - x < nx
                            && yi >= y
                            && yi - y < ny
                            && zi >= z
                            && zi - z < nz
                        {
                            want[((zi * h + yi) * w + xi) as usize] = 77;
                        }
                    }
                }
            }
            cases.push((
                "paint",
                json!([cells, w, h, x, y, z, nx, ny, nz, 77]),
                json!(want),
            ));
        }
    }
    cases.push((
        "paint",
        json!([[1, 2, 3], u32::MAX, u32::MAX, 0, 0, 0, 1, 1, 1, 9]),
        json!([1, 2, 3]),
    ));
    cases.push((
        "paint",
        json!([[1, 2, 3], 0, 1, 0, 0, 0, 1, 1, 1, 9]),
        json!([1, 2, 3]),
    ));
    let mut seed = 7u32;
    for size in [0, 1, 2, 7, 32, 64] {
        let xs = (0..size)
            .map(|_| {
                seed = seed.wrapping_mul(1664525).wrapping_add(1013904223);
                (seed >> 16) % 4
            })
            .collect::<Vec<u32>>();
        let mut encoded = vec![size];
        let mut at = 0;
        while at < xs.len() {
            let v = xs[at];
            let start = at;
            while at < xs.len() && xs[at] == v {
                at += 1;
            }
            encoded.extend([(at - start) as u32, v]);
        }
        cases.push(("encode", json!([xs]), json!(encoded)));
        cases.push(("decode", json!([encoded, size]), json!({"Ok":xs})));
    }
    for words in [
        json!([]),
        json!([1]),
        json!([1, 0, 9]),
        json!([1, 2, 9]),
        json!([2, 1, 9]),
        json!([1, 1]),
        json!([0, 1, 9]),
        json!([2, 1, 9, 0, 8]),
    ] {
        cases.push((
            "decode",
            json!([words, 100]),
            error(&p, "decode", "Invalid"),
        ));
    }
    cases.push((
        "decode",
        json!([[u32::MAX, 1, 9], 64]),
        error(&p, "decode", "Limit"),
    ));
    cases.push((
        "decode",
        json!([[4, 4, u32::MAX], 4]),
        json!({"Ok":[u32::MAX,u32::MAX,u32::MAX,u32::MAX]}),
    ));
    cases.push((
        "remove",
        json!([[7, 4, 9, 2], [70, 40, 90, 20], 1, 2]),
        json!({"Ok":{"entities":[7,2],"values":[70,20]}}),
    ));
    cases.push((
        "remove",
        json!([[7], [70], 0, u32::MAX]),
        json!({"Ok":{"entities":[],"values":[]}}),
    ));
    cases.push((
        "remove",
        json!([[7], [70], u32::MAX, 2]),
        json!({"Ok":{"entities":[7],"values":[70]}}),
    ));
    cases.push((
        "remove",
        json!([[7], [], 0, 1]),
        error(&p, "remove", "Length"),
    ));
    cases.push((
        "gather",
        json!([[7, 4, 9], [70, 40, 90], [9, 2, 7, 9]]),
        json!({"Ok":[{"Some":90},{"None":null},{"Some":70},{"Some":90}]}),
    ));
    cases.push((
        "gather",
        json!([[7, 7], [70, 71], [7]]),
        error(&p, "gather", "Duplicate"),
    ));
    cases.push((
        "gather",
        json!([[7], [], [7]]),
        error(&p, "gather", "Length"),
    ));
    cases.push((
        "gather",
        json!([[], [], [0, u32::MAX]]),
        json!({"Ok":[{"None":null},{"None":null}]}),
    ));
    cases.extend([
        (
            "copy",
            json!([[0, 1, 2, 3, 4], 0, 1, 4]),
            json!([0, 0, 1, 2, 3]),
        ),
        (
            "copy",
            json!([[0, 1, 2, 3, 4], 1, 0, 4]),
            json!([1, 2, 3, 4, 4]),
        ),
        (
            "copy",
            json!([[0, 1, 2, 3, 4], u32::MAX, 0, u32::MAX]),
            json!([0, 1, 2, 3, 4]),
        ),
        (
            "fill",
            json!([[0, 1, 2, 3, 4], 3, u32::MAX, 17]),
            json!([0, 1, 2, 17, 17]),
        ),
        (
            "split",
            json!([[0, 1, 2, 3, 4, 5, 6]]),
            json!([0, 9, 9, 3, 3, 4, 5]),
        ),
        ("erase", json!([[0, 1, 2, 3, 4], 1, 2]), json!([0, 3, 4])),
        (
            "gap",
            json!([[0, 1, 2, 3], 1, 2, 9, 6]),
            json!([0, 9, 9, 1, 2, 3]),
        ),
        (
            "gap",
            json!([[0, 1, 2, 3], 1, u32::MAX, 9, 6]),
            json!([0, 1, 2, 3]),
        ),
        (
            "gap",
            json!([[0, 1, 2, 3], 1, 1, 9, 3]),
            json!([0, 1, 2, 3]),
        ),
        ("voxel_linear", json!([2, 1, 3, 8, 4]), json!(106)),
        (
            "voxel_offsets",
            json!([[0, u32::MAX, 256, 257]]),
            json!([1, 0, 257, 258]),
        ),
        (
            "copy_strings",
            json!([["alpha", "beta", "gamma"], 0, 1, 2]),
            json!(["alpha", "alpha", "beta"]),
        ),
        (
            "fill_float",
            json!([[1.0,2.0,3.0],1,u32::MAX,{"F32Bits":0x7f812345u32}]),
            json!([1.0,{"F32Bits":0x7f812345u32},{"F32Bits":0x7f812345u32}]),
        ),
    ]);
    for bytes in [
        vec![],
        vec![0],
        vec![255, 0],
        vec![1, 2, 3],
        vec![1, 2, 3, 255],
        vec![255, 1, 2, 3, 4, 5, 6, 7, 8],
    ] {
        let mut words = vec![bytes.len() as u32];
        for chunk in bytes.chunks(4) {
            let mut word = 0u32;
            for (i, b) in chunk.iter().enumerate() {
                word |= *b << (i * 8);
            }
            words.push(word);
        }
        cases.push(("pack", json!([bytes]), json!({"Ok":words})));
        cases.push(("unpack", json!([words, 64]), json!({"Ok":bytes})));
    }
    cases.push(("pack", json!([[256]]), error(&p, "pack", "Invalid")));
    cases.push((
        "unpack",
        json!([[1, 256], 64]),
        error(&p, "unpack", "Invalid"),
    ));
    cases.push(("unpack", json!([[2], 64]), error(&p, "unpack", "Invalid")));
    cases.push((
        "unpack",
        json!([[u32::MAX], 64]),
        error(&p, "unpack", "Limit"),
    ));
    let mut steps = vec![];
    let mut expected = vec![];
    for (n, args, want) in cases {
        assert_eq!(run(&p, n, args.clone()), want, "{n} {args}");
        let mut step = json!({"pure":n,"args":args});
        if n == "voxel_offsets" {
            step["expect_gpu"] = json!(true);
        }
        steps.push(step);
        expected.push(json!({"reply":{"value":want},"snapshot":rt.checkpoint_portable().unwrap()}));
    }
    for (name, args) in [
        ("put", json!([7, [0, 1, 2, 3]])),
        ("edit", json!([7, 1, 2, 9, true])),
        ("cells", json!([7])),
        ("edit", json!([7, 2, u32::MAX, 8, false])),
        ("cells", json!([7])),
        ("edit", json!([99, 0, 1, 9, false])),
    ] {
        let before = rt.checkpoint_portable().unwrap();
        let outcome = rt.invoke_json(name, &args).unwrap();
        let after = rt.checkpoint_portable().unwrap();
        if name == "edit" && args[4] == true {
            assert_eq!(before, after);
            assert_eq!(outcome.json()["events"], json!([]));
        }
        if name == "cells" {
            let want = if args[0] == 7 && rt.version() == 1 {
                json!({"Some":[0,1,2,3]})
            } else {
                json!({"Some":[0,1,8,8]})
            };
            assert_eq!(outcome.result.json(), want);
        }
        steps.push(json!({"call":name,"args":args}));
        expected.push(json!({"reply":{"outcome":outcome.json()},"snapshot":after}));
        rt = Runtime::restore_portable(p.clone(), &after).unwrap();
        steps.push(json!({"restore":after}));
    }
    super::parity::conformance("bulk-workloads-parity", p, SOURCE, steps, expected);
}
#[test]
fn bulk_database_selection_skips_unobserved_edits_and_replays_on_every_cpu_target() {
    use std::process::Command;
    use verified_language::{
        optimisation::{self, Package},
        syntax,
    };
    let source = include_str!("../../examples/bulk-workloads/optimisation.ink");
    let module = CheckedModule::from_source(syntax::parse(source).unwrap()).unwrap();
    let dir = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("build/bulk-buffer-selection");
    fs::create_dir_all(&dir).unwrap();
    fs::write(dir.join("core.json"), module.bytes().unwrap()).unwrap();
    let out = Command::new("python3")
        .args([
            "planner/plan.py",
            "--compiler",
            env!("CARGO_BIN_EXE_ink"),
            "--core",
        ])
        .arg(dir.join("core.json"))
        .args([
            "--knowledge-root",
            "knowledge",
            "--snapshot",
            "knowledge/store/snapshot.json",
            "--budget",
            "4096",
            "--rounds",
            "32",
            "-o",
        ])
        .arg(dir.join("selection.json"))
        .output()
        .unwrap();
    assert!(
        out.status.success(),
        "{}",
        String::from_utf8_lossy(&out.stderr)
    );
    let package: Package =
        serde_json::from_slice(&fs::read(dir.join("selection.json")).unwrap()).unwrap();
    let selected = optimisation::check(&module, &package).unwrap();
    for n in ["fill_length", "zero_fill", "zero_copy"] {
        assert!(
            package.applications.iter().any(|a| a.function == n),
            "missing checked selection for {n}"
        );
    }
    let mut steps = vec![];
    let mut expected = vec![];
    let snapshot = Runtime::new(module.program().clone())
        .unwrap()
        .checkpoint_portable()
        .unwrap();
    for (name, args, want) in [
        ("fill_length", json!([[1, 2, 3], 0, u32::MAX, 9]), json!(3)),
        ("fill_length", json!([[], u32::MAX, u32::MAX, 0]), json!(0)),
        (
            "zero_fill",
            json!([[1, 2, 3], u32::MAX, 0]),
            json!([1, 2, 3]),
        ),
        ("zero_copy", json!([[1, 2, 3], 0, 1]), json!([1, 2, 3])),
    ] {
        assert_eq!(run(selected.module().program(), name, args.clone()), want);
        steps.push(json!({"pure":name,"args":args}));
        expected.push(json!({"reply":{"value":want},"snapshot":snapshot}));
    }
    super::parity::conformance_selected(
        "bulk-buffer-selection",
        &selected,
        source,
        steps,
        expected,
    );
}
