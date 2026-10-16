//! Independent audit of bit-proof certificates.
//!
//! Every hinted-RUP refutation that Ink's checker accepts while loading the
//! pinned knowledge catalogue is replayed through independent checkers:
//! drat-trim (DRAT, searches its own propagation), lrat-check (LRAT, uses the
//! same hints) and the formally verified cake_lpr (LRAT/LPR). Point the test at
//! the binaries with INK_DRAT_TRIM, INK_LRAT_CHECK and INK_CAKE_LPR; without
//! them it still exports and self-checks every refutation and skips the
//! external replay. The audit hook is observation only: it records accepted
//! refutations and never influences acceptance.
//!
//! This checks the refutation of the CNF Ink actually checked. Whether that CNF
//! encodes the source equation is a separate, trusted encoding step, exercised
//! by the circuit-evaluation unit tests in src/bitproof.rs and
//! tools/check_bitvector_semantics.py.
use std::{
    collections::BTreeMap,
    fmt::Write as _,
    fs,
    path::{Path, PathBuf},
    process::Command,
};
use verified_language::{bitproof, library};

fn locks(dir: &Path, out: &mut Vec<PathBuf>) {
    let Ok(entries) = fs::read_dir(dir) else {
        return;
    };
    let mut entries: Vec<_> = entries.flatten().map(|e| e.path()).collect();
    entries.sort();
    for path in entries {
        if path.is_dir() {
            locks(&path, out);
        } else if path.file_name().is_some_and(|n| n == "lock.json") {
            out.push(path);
        }
    }
}

fn dimacs(r: &bitproof::AcceptedRefutation, clauses: &[Vec<i32>]) -> String {
    let mut s = format!("p cnf {} {}\n", r.variables, clauses.len());
    for c in clauses {
        for l in c {
            write!(s, "{l} ").unwrap();
        }
        s.push_str("0\n");
    }
    s
}
fn drat(r: &bitproof::AcceptedRefutation) -> String {
    let mut s = String::new();
    for step in &r.steps {
        for l in &step.clause {
            write!(s, "{l} ").unwrap();
        }
        s.push_str("0\n");
    }
    s
}
/// Independent transport decoder for an already accepted audit record. Keep it
/// separate from core's streaming decoder so LRAT exports retain every hint.
fn hint_indices(step: &bitproof::Step) -> Vec<usize> {
    let Some(text) = &step.hint_deltas_v1 else {
        return step.hints.clone();
    };
    assert!(step.hints.is_empty());
    assert!(!text.is_empty() && text.len() <= 400_000);
    let alphabet = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
    let (mut value, mut shift, mut previous) = (0i64, 0, 0i64);
    let mut result = Vec::new();
    for byte in text.bytes() {
        let digit = alphabet.iter().position(|b| *b == byte).unwrap();
        value += ((digit & 31) as i64) << shift;
        if digit & 32 != 0 {
            shift += 5;
            assert!(shift < 20);
        } else {
            assert!(shift == 0 || digit != 0);
            previous += if value % 2 == 0 {
                value / 2
            } else {
                -(value / 2) - 1
            };
            assert!((0..320_000).contains(&previous));
            result.push(previous as usize);
            assert!(result.len() <= 100_000);
            value = 0;
            shift = 0;
        }
    }
    assert_eq!(shift, 0);
    result
}

#[test]
fn packed_audit_exports_the_same_lrat_references() {
    let mut r = bitproof::AcceptedRefutation {
        problem_sha256: "transport-fixture".into(),
        variables: 1,
        clauses: vec![vec![1], vec![-1]],
        steps: vec![bitproof::Step {
            clause: vec![],
            hints: vec![0, 1],
            hint_deltas_v1: None,
        }],
    };
    let original = lrat(&r);
    assert_eq!(original, "3 0 1 2 0\n");
    r.steps[0].hints.clear();
    r.steps[0].hint_deltas_v1 = Some("AC".into());
    assert_eq!(lrat(&r), original);
    r.steps[0].hint_deltas_v1 = Some("AC8BC-9BC-_9BC-_wR9_wT".into());
    assert_eq!(
        hint_indices(&r.steps[0]),
        vec![0, 1, 31, 32, 1023, 1024, 32767, 32768, 319999, 0]
    );
}

/// Ink hints index the original clauses followed by accepted steps, from 0.
/// LRAT identifies clauses from 1 in the same order.
fn lrat(r: &bitproof::AcceptedRefutation) -> String {
    let mut s = String::new();
    for (i, step) in r.steps.iter().enumerate() {
        write!(s, "{} ", r.clauses.len() + i + 1).unwrap();
        for l in &step.clause {
            write!(s, "{l} ").unwrap();
        }
        s.push('0');
        for h in hint_indices(step) {
            write!(s, " {}", h + 1).unwrap();
        }
        s.push_str(" 0\n");
    }
    s
}

#[derive(Debug, PartialEq)]
enum Verdict {
    Verified,
    Rejected(String),
}
fn run(tool: &str, args: &[&Path]) -> Verdict {
    let out = Command::new(tool).args(args).output().unwrap();
    let text =
        String::from_utf8_lossy(&out.stdout).to_string() + &String::from_utf8_lossy(&out.stderr);
    let verified = text.lines().any(|l| {
        let l = l.trim_start_matches('\r').trim();
        l == "s VERIFIED" || l == "c VERIFIED" || l == "s VERIFIED UNSAT"
    });
    assert!(
        out.status.code().is_some(),
        "checker terminated by signal: {text}"
    );
    if verified && out.status.success() {
        Verdict::Verified
    } else {
        Verdict::Rejected(text.lines().rev().take(3).collect::<Vec<_>>().join(" | "))
    }
}

#[test]
fn accepted_bit_proofs_replay_in_independent_checkers() {
    let root = Path::new(env!("CARGO_MANIFEST_DIR"));
    let mut paths = vec![];
    locks(&root.join("knowledge/research"), &mut paths);
    if let Some(path) = std::env::var_os("INK_RUP_EXTRA_LOCK") {
        paths.push(PathBuf::from(path));
    }
    assert!(
        !paths.is_empty(),
        "initialise the pinned knowledge submodule"
    );
    let mut accepted: BTreeMap<String, bitproof::AcceptedRefutation> = BTreeMap::new();
    let mut libraries = 0;
    for path in &paths {
        let (loaded, recorded) = bitproof::audit_accepted(|| library::load(path));
        if loaded.is_ok() {
            libraries += 1;
        }
        for r in recorded {
            let key = format!(
                "{}:{}",
                r.problem_sha256,
                serde_json::to_string(&r.steps).unwrap()
            );
            accepted.entry(key).or_insert(r);
        }
    }
    assert!(libraries > 0);
    assert!(
        !accepted.is_empty(),
        "the catalogue should contain bit proofs"
    );

    let tools: Vec<(&str, Option<String>)> = vec![
        ("drat-trim", std::env::var("INK_DRAT_TRIM").ok()),
        ("lrat-check", std::env::var("INK_LRAT_CHECK").ok()),
        ("cake_lpr", std::env::var("INK_CAKE_LPR").ok()),
    ];
    let external = tools.iter().any(|(_, path)| path.is_some());
    // Separate directories as well as filenames: clearing an export-only run
    // must not delete a previously completed external replay.
    let out =
        root.join("build/rup-crosscheck")
            .join(if external { "external" } else { "export-only" });
    let _ = fs::remove_dir_all(&out);
    fs::create_dir_all(&out).unwrap();
    let mut report = vec![];
    for (n, r) in accepted.values().enumerate() {
        // The recorder only yields refutations accepted by Ink; additionally
        // check the terminal step before serialising the exported proof.
        assert!(r.steps.last().unwrap().clause.is_empty());
        let stem = format!("{n:03}-{}", &r.problem_sha256[..12]);
        let cnf = out.join(format!("{stem}.cnf"));
        let drat_path = out.join(format!("{stem}.drat"));
        let lrat_path = out.join(format!("{stem}.lrat"));
        fs::write(&cnf, dimacs(r, &r.clauses)).unwrap();
        fs::write(&drat_path, drat(r)).unwrap();
        fs::write(&lrat_path, lrat(r)).unwrap();
        // Control: without the clause asserting that the endpoints differ, the
        // formula is satisfiable, so no checker may accept the same proof.
        let weakened: Vec<Vec<i32>> = r.clauses[..r.clauses.len() - 1].to_vec();
        let control = out.join(format!("{stem}.without-goal.cnf"));
        fs::write(&control, dimacs(r, &weakened)).unwrap();
        let mut verdicts = BTreeMap::new();
        for (tool, path) in &tools {
            let Some(path) = path else { continue };
            let (proof, cake) = match *tool {
                "drat-trim" => (&drat_path, false),
                _ => (&lrat_path, *tool == "cake_lpr"),
            };
            let args: Vec<&Path> = vec![cnf.as_path(), proof.as_path()];
            let verdict = if cake {
                let out = Command::new(path)
                    .args(["--CML_HEAP_SIZE=2048", "--CML_STACK_SIZE=1024"])
                    .args(&args)
                    .output()
                    .unwrap();
                let text = String::from_utf8_lossy(&out.stdout);
                assert!(out.status.code().is_some(), "cake_lpr terminated by signal");
                if out.status.success() && text.lines().any(|l| l.trim() == "s VERIFIED UNSAT") {
                    Verdict::Verified
                } else {
                    Verdict::Rejected(text.trim().to_string())
                }
            } else {
                run(path, &args)
            };
            assert_eq!(
                verdict,
                Verdict::Verified,
                "{tool} rejected Ink-accepted refutation {stem}"
            );
            // The weakened control must not verify with the original proof.
            let control_verdict = if cake {
                let out = Command::new(path)
                    .args(["--CML_HEAP_SIZE=2048", "--CML_STACK_SIZE=1024"])
                    .args([control.as_path(), proof.as_path()])
                    .output()
                    .unwrap();
                let text = String::from_utf8_lossy(&out.stdout);
                assert!(
                    out.status.code().is_some(),
                    "cake_lpr control terminated by signal"
                );
                if out.status.success() && text.lines().any(|l| l.trim() == "s VERIFIED UNSAT") {
                    Verdict::Verified
                } else {
                    Verdict::Rejected(String::new())
                }
            } else {
                run(path, &[control.as_path(), proof.as_path()])
            };
            assert_ne!(
                control_verdict,
                Verdict::Verified,
                "{tool} accepted {stem} without its goal clause"
            );
            verdicts.insert(tool.to_string(), "verified; goal-free control rejected");
        }
        report.push(serde_json::json!({
            "problem_sha256": r.problem_sha256,
            "variables": r.variables,
            "clauses": r.clauses.len(),
            "lemmas": r.steps.len(),
            "hints": r.steps.iter().map(|s| hint_indices(s).len()).sum::<usize>(),
            "external": verdicts,
        }));
    }
    let summary = serde_json::json!({
        "libraries_loaded": libraries,
        "lockfiles": paths.len(),
        "distinct_accepted_refutations": report.len(),
        "checkers": tools.iter().filter(|(_, p)| p.is_some()).map(|(t, _)| *t).collect::<Vec<_>>(),
        "refutations": report,
    });
    fs::write(
        out.join(if external {
            "report-external.json"
        } else {
            "report-export-only.json"
        }),
        serde_json::to_string_pretty(&summary).unwrap(),
    )
    .unwrap();
    eprintln!(
        "rup crosscheck: {} refutations from {libraries} libraries; external checkers: {:?}",
        summary["distinct_accepted_refutations"], summary["checkers"]
    );
}
