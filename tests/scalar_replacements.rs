use std::{
    fs,
    path::{Path, PathBuf},
    process::Command,
    sync::atomic::{AtomicUsize, Ordering},
};
use verified_language::{
    core::CheckedModule,
    implementation::{self, ReplacementPackage},
    logic::{Proof, Term},
    syntax,
};

static NEXT: AtomicUsize = AtomicUsize::new(0);
struct Fixture(PathBuf);
impl Fixture {
    fn new() -> Self {
        let path = std::env::temp_dir().join(format!(
            "ink-scalar-admission-{}-{}",
            std::process::id(),
            NEXT.fetch_add(1, Ordering::Relaxed)
        ));
        fs::create_dir_all(&path).unwrap();
        Self(path)
    }
    fn produce(&self) -> (syntax::Program, ReplacementPackage) {
        let root = Path::new(env!("CARGO_MANIFEST_DIR"));
        let original = syntax::parse(include_str!("../examples/conditional.lang")).unwrap();
        fs::write(
            self.0.join("input.json"),
            CheckedModule::from_source(original.clone())
                .unwrap()
                .bytes()
                .unwrap(),
        )
        .unwrap();
        let result = Command::new("python3")
            .arg(root.join("knowledge/tools/rewrite_search.py"))
            .arg(self.0.join("input.json"))
            .args(["--core", "--compiler", env!("CARGO_BIN_EXE_ink"), "--rules"])
            .arg(root.join("knowledge/scalar-logic/rewrite-index.json"))
            .arg("--output-dir")
            .arg(self.0.join("package"))
            .output()
            .unwrap();
        assert!(
            result.status.success(),
            "{}",
            String::from_utf8_lossy(&result.stderr)
        );
        let package =
            serde_json::from_slice(&fs::read(self.0.join("package/replacement.json")).unwrap())
                .unwrap();
        (original, package)
    }
    fn check_rejected_unchanged(&self, original: &syntax::Program, package: &ReplacementPackage) {
        fs::write(
            self.0.join("package/replacement.json"),
            serde_json::to_vec(package).unwrap(),
        )
        .unwrap();
        let mut input = original.clone();
        assert!(implementation::apply_replacement(
            &mut input,
            &self.0.join("package/replacement.json")
        )
        .is_err());
        assert_eq!(
            CheckedModule::from_source(input)
                .unwrap()
                .identity()
                .unwrap(),
            CheckedModule::from_source(original.clone())
                .unwrap()
                .identity()
                .unwrap()
        );
    }
}
impl Drop for Fixture {
    fn drop(&mut self) {
        fs::remove_dir_all(&self.0).unwrap();
    }
}

#[test]
fn branch_hypotheses_cannot_authorise_an_unguarded_replacement() {
    let fixture = Fixture::new();
    let (original, mut package) = fixture.produce();
    let mut input = original.clone();
    assert_eq!(
        implementation::apply_replacement(&mut input, &fixture.0.join("package/replacement.json"))
            .unwrap()
            .equality
            .checked_proposals
            .len(),
        3
    );
    assert_eq!(original.functions[2].body, input.functions[2].body);
    let root = Path::new(env!("CARGO_MANIFEST_DIR"));
    let names: serde_json::Value =
        serde_json::from_slice(&fs::read(root.join("knowledge/scalar-logic/names.json")).unwrap())
            .unwrap();
    let mut proposal = package.package.proposals[0].clone();
    proposal.function = "unguarded".into();
    proposal.from = original.functions[2].body.clone();
    proposal.to = syntax::Expr::Var("b".into());
    proposal.proof = Proof::Use {
        theorem: names["and_when_true"].as_str().unwrap().into(),
        arguments: vec![Term::Var("p0".into()), Term::Var("p1".into())],
        premises: vec![Proof::Hypothesis(0)],
    };
    package.package.proposals.push(proposal);
    fixture.check_rejected_unchanged(&original, &package);
}

#[test]
fn changing_the_actual_boolean_guard_or_dropping_a_branch_is_rejected() {
    let fixture = Fixture::new();
    let (original, package) = fixture.produce();
    fn alter(proof: &mut Proof, drop_branch: bool) -> bool {
        match proof {
            Proof::BoolSplit {
                condition,
                on_false,
                ..
            } => {
                if drop_branch {
                    *on_false = Box::new(Proof::Refl(Term::Bool(false)));
                } else {
                    *condition = Term::Bool(true);
                }
                true
            }
            Proof::Trans(a, b) => alter(a, drop_branch) || alter(b, drop_branch),
            Proof::Binary { left, right, .. } => {
                alter(left, drop_branch) || alter(right, drop_branch)
            }
            _ => false,
        }
    }
    for drop_branch in [false, true] {
        let mut forged = package.clone();
        assert!(alter(&mut forged.package.proposals[0].proof, drop_branch));
        fixture.check_rejected_unchanged(&original, &forged);
    }
}

#[test]
fn general_scalar_library_reproduces_and_legacy_search_flag_fails_closed() {
    let root = Path::new(env!("CARGO_MANIFEST_DIR"));
    let fixture = Fixture::new();
    let mut command = Command::new("python3");
    command.arg(root.join("knowledge/tools/scalar_library.py"));
    for name in ["boolean", "composed", "conditional"] {
        command
            .arg("--library")
            .arg(root.join("knowledge").join(name).join("lock.json"));
    }
    let result = command
        .args(["--compiler", env!("CARGO_BIN_EXE_ink"), "--output-dir"])
        .arg(fixture.0.join("translated"))
        .output()
        .unwrap();
    assert!(
        result.status.success(),
        "{}",
        String::from_utf8_lossy(&result.stderr)
    );
    for name in ["lock.json", "names.json", "rewrite-index.json"] {
        assert_eq!(
            fs::read(fixture.0.join("translated").join(name)).unwrap(),
            fs::read(root.join("knowledge/scalar-logic").join(name)).unwrap()
        );
    }
    for entry in fs::read_dir(root.join("knowledge/scalar-logic/objects")).unwrap() {
        let entry = entry.unwrap();
        assert_eq!(
            fs::read(entry.path()).unwrap(),
            fs::read(fixture.0.join("translated/objects").join(entry.file_name())).unwrap()
        );
    }
    let output = fixture.0.join("rejected.c");
    let result = Command::new(env!("CARGO_BIN_EXE_ink"))
        .arg("emit-c")
        .arg(root.join("examples/boolean.lang"))
        .arg("--database")
        .arg(root.join("knowledge/boolean/lock.json"))
        .arg("-o")
        .arg(&output)
        .output()
        .unwrap();
    assert!(!result.status.success());
    assert!(String::from_utf8_lossy(&result.stderr).contains("retired"));
    assert!(!output.exists());
}
