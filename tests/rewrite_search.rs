use std::{fs, path::Path, process::Command};
use verified_language::{
    core::CheckedModule,
    eval::{self, Value},
    implementation, native, syntax,
};

#[test]
fn external_arithmetic_search_proves_scalars_and_mapped_sums_with_lexical_shadowing() {
    let root = Path::new(env!("CARGO_MANIFEST_DIR")).join("knowledge/research/rewrite-search");
    let original = syntax::parse(&fs::read_to_string(root.join("kernels.ink")).unwrap()).unwrap();
    let mut selected = original.clone();
    let evidence =
        implementation::apply_replacement(&mut selected, &root.join("replacement.json")).unwrap();
    assert_eq!(evidence.equality.checked_proposals.len(), 4);
    assert_ne!(
        native::emit(&original).unwrap(),
        native::emit(&selected).unwrap()
    );
    let unproved = |p: &syntax::Program| {
        p.functions
            .iter()
            .find(|f| f.name == "factored")
            .unwrap()
            .body
            .clone()
    };
    assert_eq!(unproved(&original), unproved(&selected));
    let mut seed = 134541u64;
    for i in 0..128 {
        let mut next = || {
            seed ^= seed << 13;
            seed ^= seed >> 7;
            seed ^= seed << 17;
            seed
        };
        let x = if i == 0 { u64::MAX } else { next() };
        let y = next();
        let xs = if i == 0 {
            vec![]
        } else if i == 1 {
            vec![u64::MAX, 1, 1 << 63]
        } else {
            (0..i % 31).map(|_| next()).collect::<Vec<_>>()
        };
        let list = Value::List(xs.iter().copied().map(Value::U64).collect());
        let cases = [
            ("scalar", vec![Value::U64(x), Value::U64(y)], x),
            ("zeros", vec![Value::U64(x)], 0),
            (
                "mapped",
                vec![list.clone(), Value::U64(y)],
                xs.iter().fold(0u64, |s, x| s.wrapping_add(*x)),
            ),
            ("shadow", vec![list, Value::U64(x)], 0),
            (
                "factored",
                vec![Value::U64(x)],
                x.wrapping_add(3).wrapping_mul(x.wrapping_add(3)),
            ),
        ];
        for (name, args, expected) in cases {
            assert_eq!(
                eval::call(&original, name, args.clone(), &mut 100000).unwrap(),
                Value::U64(expected)
            );
            assert_eq!(
                eval::call(&selected, name, args, &mut 100000).unwrap(),
                Value::U64(expected)
            );
        }
    }
}

#[test]
fn exhausted_external_search_keeps_original_program_and_reproduces_without_solver() {
    let root = Path::new(env!("CARGO_MANIFEST_DIR"));
    let temp = std::env::temp_dir().join(format!("ink-rewrite-search-{}", std::process::id()));
    fs::create_dir_all(&temp).unwrap();
    let original = syntax::parse(
        &fs::read_to_string(root.join("knowledge/research/rewrite-search/kernels.ink")).unwrap(),
    )
    .unwrap();
    for budget in [0, 1, 10000] {
        let out = temp.join(format!("budget-{budget}"));
        let result = Command::new("python3")
            .arg(root.join("planner/research/rewrite_search.py"))
            .arg(root.join("knowledge/research/rewrite-search/kernels.ink"))
            .args(["--compiler", env!("CARGO_BIN_EXE_ink"), "--rules"])
            .arg(root.join("knowledge/research/bitvector/rewrite-index.json"))
            .args(["--budget", &budget.to_string(), "--output-dir"])
            .arg(&out)
            .output()
            .unwrap();
        assert!(
            result.status.success(),
            "{}",
            String::from_utf8_lossy(&result.stderr)
        );
        let mut selected = original.clone();
        let evidence =
            implementation::apply_replacement(&mut selected, &out.join("replacement.json"))
                .unwrap();
        if budget < 2 {
            assert!(evidence.equality.checked_proposals.is_empty());
            assert_eq!(
                CheckedModule::from_source(selected)
                    .unwrap()
                    .identity()
                    .unwrap(),
                CheckedModule::from_source(original.clone())
                    .unwrap()
                    .identity()
                    .unwrap()
            );
        } else {
            assert_eq!(evidence.equality.checked_proposals.len(), 4);
            for name in ["lock.json", "replacement.json"] {
                assert_eq!(
                    fs::read(out.join(name)).unwrap(),
                    fs::read(root.join("knowledge/research/rewrite-search").join(name)).unwrap()
                );
            }
        }
    }
    fs::remove_dir_all(temp).unwrap();
}

#[test]
fn retired_polynomial_commands_fail_before_writing_output() {
    let root = Path::new(env!("CARGO_MANIFEST_DIR"));
    let output = std::env::temp_dir().join(format!("ink-retired-poly-{}.c", std::process::id()));
    assert!(!output.exists());
    let result = Command::new(env!("CARGO_BIN_EXE_ink"))
        .args(["emit-c"])
        .arg(root.join("examples/kernels.lang"))
        .arg("--knowledge")
        .arg(root.join("knowledge/phase1-ring.json"))
        .arg("-o")
        .arg(&output)
        .output()
        .unwrap();
    assert!(!result.status.success());
    assert!(String::from_utf8_lossy(&result.stderr).contains("retired"));
    assert!(!output.exists());
    let result = Command::new(env!("CARGO_BIN_EXE_ink"))
        .args(["prove"])
        .arg(root.join("knowledge/research/ring.lang"))
        .arg("-o")
        .arg(&output)
        .output()
        .unwrap();
    assert!(!result.status.success());
    assert!(!output.exists());
}

#[test]
fn external_mapped_sum_fusion_is_checked_by_induction_without_new_core_rules() {
    let root = Path::new(env!("CARGO_MANIFEST_DIR"));
    let temp = std::env::temp_dir().join(format!("ink-rewrite-fusion-{}", std::process::id()));
    let result = Command::new("python3")
        .arg(root.join("planner/research/rewrite_search.py"))
        .arg(root.join("examples/kernels.lang"))
        .args(["--compiler", env!("CARGO_BIN_EXE_ink"), "--rules"])
        .arg(root.join("knowledge/research/bitvector/rewrite-index.json"))
        .args(["--fuse-mapped-sum", "--output-dir"])
        .arg(&temp)
        .output()
        .unwrap();
    assert!(
        result.status.success(),
        "{}",
        String::from_utf8_lossy(&result.stderr)
    );
    let original = syntax::parse(include_str!("../examples/kernels.lang")).unwrap();
    let mut selected = original.clone();
    let evidence =
        implementation::apply_replacement(&mut selected, &temp.join("replacement.json")).unwrap();
    assert_eq!(evidence.equality.checked_proposals.len(), 3);
    assert!(
        native::emit(&selected)
            .unwrap()
            .matches("= lang_allocate(")
            .count()
            < native::emit(&original)
                .unwrap()
                .matches("= lang_allocate(")
                .count()
    );
    for xs in [vec![], vec![0, 1, 3], vec![u64::MAX, 1 << 63, u64::MAX - 1]] {
        for name in ["affine", "squares", "expanded"] {
            let mut args = vec![Value::List(xs.iter().copied().map(Value::U64).collect())];
            if name == "affine" {
                args.extend([Value::U64(u64::MAX), Value::U64(17)]);
            }
            let expected = xs.iter().fold(0u64, |s, x| {
                s.wrapping_add(match name {
                    "affine" => x.wrapping_mul(u64::MAX).wrapping_add(17),
                    "squares" => x.wrapping_mul(*x),
                    _ => x.wrapping_add(3).wrapping_mul(x.wrapping_add(3)),
                })
            });
            for p in [&original, &selected] {
                assert_eq!(
                    eval::call(p, name, args.clone(), &mut 100000).unwrap(),
                    Value::U64(expected)
                );
            }
        }
    }
    fs::remove_dir_all(temp).unwrap();
}
