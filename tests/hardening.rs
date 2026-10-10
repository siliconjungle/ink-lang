//! Hardening of every checker and loader that consumes untrusted bytes:
//! proof objects, lockfiles, certificates, snapshots, core modules and
//! interpreter arguments. Malformed or adversarial input must produce `Err`,
//! never a panic, stack overflow, hang or unbounded allocation.
//!
//! Regression tests replay a minimised input for each defect found. The
//! deterministic mutation fuzzer has no dependency: a tiny xorshift generator
//! mutates real inputs taken from this repository and the pinned `knowledge`
//! checkout, or produced through public APIs. Each case runs on a fresh
//! small-stack thread under `catch_unwind`, with a per-thread allocation cap,
//! so a panic, a stack overflow (process abort), runaway allocation or a very
//! slow case all fail.
//!
//! Environment:
//!   INK_FUZZ_ITERS=N    mutated cases per target (default: small, per target)
//!   INK_FUZZ_SEED=N     base seed (default fixed; every case is reproducible)
//!   INK_FUZZ_ONLY=T[:C] run only target T, optionally only case C
//!   INK_FUZZ_VERBOSE=1  print each case before it runs and per-target summaries
//!   INK_FUZZ_FULL=1     use the complete knowledge corpus even for short runs
//!
//! Long run, for example:
//!   INK_FUZZ_ITERS=20000 cargo test --release --test hardening -- --nocapture
use serde_json::{json, Value as Json};
use sha2::{Digest, Sha256};
use std::{
    alloc::{GlobalAlloc, Layout as AllocLayout, System},
    cell::Cell,
    collections::{BTreeMap, BTreeSet},
    fs,
    panic::{self, AssertUnwindSafe},
    path::{Path, PathBuf},
    sync::{
        atomic::{AtomicUsize, Ordering},
        mpsc,
    },
    thread,
    time::{Duration, Instant},
};
use verified_language::{
    aggregate, bitproof,
    core::CheckedModule,
    equality, eval, knowledge, library,
    logic::{Context, Declaration, Equation, Proof},
    row_model, snapshot,
    snapshot_wire::{self, Limits, Logical, Schema},
    stateful::Runtime,
    syntax::{self, Expr, Type},
};

// ---------------------------------------------------------------------------
// Allocation accounting: a global cap protects the host, a per-case cap turns
// a memory bomb into an immediate abort, and the per-case peak is reported.

struct Accounting;
static GLOBAL_LIVE: AtomicUsize = AtomicUsize::new(0);
const GLOBAL_LIMIT: usize = 3 << 30;
/// A case that holds more than this aborts the process (allocation failure).
const CASE_LIMIT: usize = 1 << 30;
/// A case whose live heap peaks above this is reported as a finding.
const CASE_REPORT: usize = 384 << 20;
thread_local! {
    static LIVE: Cell<usize> = const { Cell::new(0) };
    static PEAK: Cell<usize> = const { Cell::new(0) };
    static LIMIT: Cell<usize> = const { Cell::new(usize::MAX) };
    /// Case label, kept without allocation so an allocation failure names it.
    static LABEL: Cell<[u8; 48]> = const { Cell::new([0; 48]) };
    static REPORTED: Cell<bool> = const { Cell::new(false) };
}
/// Name the case before the allocation failure aborts the process. Writing
/// to unbuffered stderr from a fixed buffer does not allocate.
fn report_over_limit(cap: &[u8]) {
    use std::io::Write;
    if REPORTED.try_with(|r| r.replace(true)).unwrap_or(true) {
        return;
    }
    let label = LABEL.try_with(Cell::get).unwrap_or([0; 48]);
    let end = label.iter().position(|&b| b == 0).unwrap_or(label.len());
    let mut err = std::io::stderr();
    let _ = err.write_all(b"\nfuzz case ");
    let _ = err.write_all(&label[..end]);
    let _ = err.write_all(b" exceeded the ");
    let _ = err.write_all(cap);
    let _ = err.write_all(b" allocation cap (memory bomb)\n");
}
fn reserve(n: usize) -> bool {
    if GLOBAL_LIVE
        .fetch_add(n, Ordering::Relaxed)
        .saturating_add(n)
        > GLOBAL_LIMIT
    {
        GLOBAL_LIVE.fetch_sub(n, Ordering::Relaxed);
        report_over_limit(b"host-wide");
        return false;
    }
    let ok = LIVE
        .try_with(|live| {
            let now = live.get().saturating_add(n);
            if now > LIMIT.try_with(Cell::get).unwrap_or(usize::MAX) {
                return false;
            }
            live.set(now);
            let _ = PEAK.try_with(|peak| {
                if now > peak.get() {
                    peak.set(now)
                }
            });
            true
        })
        .unwrap_or(true);
    if !ok {
        GLOBAL_LIVE.fetch_sub(n, Ordering::Relaxed);
        report_over_limit(b"per-case");
    }
    ok
}
fn release(n: usize) {
    GLOBAL_LIVE.fetch_sub(n, Ordering::Relaxed);
    let _ = LIVE.try_with(|live| live.set(live.get().saturating_sub(n)));
}
unsafe impl GlobalAlloc for Accounting {
    unsafe fn alloc(&self, layout: AllocLayout) -> *mut u8 {
        if !reserve(layout.size()) {
            return std::ptr::null_mut();
        }
        let p = System.alloc(layout);
        if p.is_null() {
            release(layout.size());
        }
        p
    }
    unsafe fn alloc_zeroed(&self, layout: AllocLayout) -> *mut u8 {
        if !reserve(layout.size()) {
            return std::ptr::null_mut();
        }
        let p = System.alloc_zeroed(layout);
        if p.is_null() {
            release(layout.size());
        }
        p
    }
    unsafe fn dealloc(&self, p: *mut u8, layout: AllocLayout) {
        System.dealloc(p, layout);
        release(layout.size());
    }
    unsafe fn realloc(&self, p: *mut u8, layout: AllocLayout, size: usize) -> *mut u8 {
        let old = layout.size();
        if size > old && !reserve(size - old) {
            return std::ptr::null_mut();
        }
        let q = System.realloc(p, layout, size);
        if q.is_null() {
            if size > old {
                release(size - old);
            }
        } else if size < old {
            release(old - size);
        }
        q
    }
}
#[global_allocator]
static ALLOCATOR: Accounting = Accounting;

// ---------------------------------------------------------------------------
// Case execution.

/// Spawned threads default to 2 MiB; unoptimised frames are several times
/// larger than optimised ones, so release runs use a smaller stack.
fn stack_size() -> usize {
    if cfg!(debug_assertions) {
        2 << 20
    } else {
        512 << 10
    }
}
struct Run {
    outcome: Result<Result<(), String>, String>,
    elapsed: Duration,
    peak: usize,
}
fn panic_message(payload: Box<dyn std::any::Any + Send>) -> String {
    if let Some(s) = payload.downcast_ref::<&str>() {
        (*s).to_owned()
    } else if let Some(s) = payload.downcast_ref::<String>() {
        s.clone()
    } else {
        "non-string panic payload".into()
    }
}
/// Run one case on its own small-stack thread. A stack overflow aborts the
/// process with this thread's name, which identifies the reproducible case.
fn execute(label: &str, f: &(dyn Fn() -> Result<(), String> + Sync)) -> Run {
    let (tx, rx) = mpsc::channel();
    thread::scope(|scope| {
        thread::Builder::new()
            .name(label.to_owned())
            .stack_size(stack_size())
            .spawn_scoped(scope, move || {
                let mut name = [0u8; 48];
                let n = label.len().min(name.len());
                name[..n].copy_from_slice(&label.as_bytes()[..n]);
                LABEL.with(|l| l.set(name));
                LIVE.with(|l| l.set(0));
                PEAK.with(|p| p.set(0));
                LIMIT.with(|l| l.set(CASE_LIMIT));
                let start = Instant::now();
                let outcome = panic::catch_unwind(AssertUnwindSafe(f)).map_err(panic_message);
                let elapsed = start.elapsed();
                LIMIT.with(|l| l.set(usize::MAX));
                let peak = PEAK.with(Cell::get);
                let _ = tx.send(Run {
                    outcome,
                    elapsed,
                    peak,
                });
            })
            .expect("spawn fuzz case");
        let mut waited = Duration::ZERO;
        loop {
            match rx.recv_timeout(Duration::from_secs(30)) {
                Ok(run) => return run,
                Err(mpsc::RecvTimeoutError::Timeout) => {
                    waited += Duration::from_secs(30);
                    eprintln!("{label}: still running after {waited:?}");
                }
                Err(mpsc::RecvTimeoutError::Disconnected) => {
                    panic!("{label}: case thread vanished")
                }
            }
        }
    })
}

// ---------------------------------------------------------------------------
// Regressions: a minimised input for each defect found by the audit or the
// fuzzer. Each runs with the same small stack and allocation cap as a fuzz
// case and must finish promptly with a modest heap.

fn bounded(label: &str, seconds: u64, f: impl Fn() -> Result<(), String> + Sync) {
    let run = execute(label, &f);
    match run.outcome {
        Ok(Ok(())) => {}
        Ok(Err(e)) => panic!("{label}: {e}"),
        Err(message) => panic!("{label}: panicked: {message}"),
    }
    let limit = Duration::from_secs(seconds * if cfg!(debug_assertions) { 4 } else { 1 });
    assert!(run.elapsed < limit, "{label}: took {:?}", run.elapsed);
    assert!(
        run.peak < CASE_REPORT,
        "{label}: peak heap {} bytes",
        run.peak
    );
}
fn u64_list(n: u64) -> verified_language::eval::Value {
    verified_language::eval::Value::List((0..n).map(verified_language::eval::Value::U64).collect())
}

/// A small nested application expands to Boolean terms whose type inference
/// previously re-walked each subtree exponentially, outside the proof budget.
#[test]
fn regression_boolean_hint_and_definition_expansion_are_bounded() {
    bounded("boolean-hint", 5, || {
        let params = vec![("a".into(), Type::Bool), ("b".into(), Type::Bool)];
        let variable = |n: &str| Expr::Var(n.into());
        let binary = |op: &str, a, b| Expr::Binary(op.into(), Box::new(a), Box::new(b));
        let mut context = equality::Context::default();
        context.define(
            "decision".into(),
            &params,
            &Type::Bool,
            &binary(
                "&&",
                variable("a"),
                binary("||", variable("a"), variable("b")),
            ),
        )?;
        let nested = (0..24).fold(variable("a"), |a, _| {
            Expr::Call("decision".into(), vec![a, variable("b")])
        });
        let error = context
            .define("bomb".into(), &params, &Type::Bool, &nested)
            .unwrap_err();
        assert!(error.contains("resource limit"), "{error}");
        // A rejected declaration must not poison the context.
        context.define(
            "small".into(),
            &params,
            &Type::Bool,
            &Expr::Call("decision".into(), vec![variable("a"), variable("b")]),
        )?;
        let env = params.into_iter().collect();
        let chain = (0..30).fold(variable("a"), |a, _| binary("&&", a, variable("b")));
        assert_eq!(
            verified_language::check::infer(&chain, &env, &syntax::Program::default())?,
            Type::Bool
        );
        let invalid = binary("&&", chain, Expr::Num(1));
        assert!(
            verified_language::check::infer(&invalid, &env, &syntax::Program::default()).is_err()
        );
        Ok(())
    });
}

/// Parser call depth does not cover left-associated or postfix AST chains.
#[test]
fn regression_parser_bounds_unparenthesised_and_postfix_chains() {
    bounded("parser-chains", 5, || {
        for expression in [
            vec!["x"; 20_000].join(" + "),
            vec!["x"; 20_000].join(" && "),
            format!("x{}", ".field".repeat(20_000)),
            format!("x{}", "?".repeat(20_000)),
        ] {
            let source = format!("module m; fn f(x: u64) -> u64 {{ return {expression}; }}");
            let error = syntax::parse(&source).unwrap_err();
            assert!(error.contains("expression tree nesting limit"), "{error}");
        }
        let source = format!(
            "module m; fn f(x: u64) -> u64 {{ return {}; }}",
            vec!["x"; 30].join(" + ")
        );
        let program = syntax::parse(&source)?;
        let module = CheckedModule::from_source(program)?;
        assert_eq!(
            eval::call(
                module.program(),
                "f",
                vec![eval::Value::U64(2)],
                &mut 10_000
            )?,
            eval::Value::U64(60)
        );
        Ok(())
    });
}

/// Collection evaluation previously copied the entire enclosing scope per
/// element, making traversal quadratic in the size of the list argument.
#[test]
fn regression_eval_scope_is_not_copied_per_element() {
    use verified_language::{eval, syntax};
    let p = syntax::parse(
        "module m;
         fn f(xs: List<u64>) -> u64 { return sum(xs.map(fn(x) => x * 3 + 1).filter(fn(y) => y > 10)); }
         fn g(xs: List<u64>) -> u64 { return foldr(xs, 0, fn(x) => fn(r) => x + r); }",
    )
    .unwrap();
    bounded("eval-scope", 20, || {
        let n = 200_000u64;
        let want: u64 = (0..n).map(|x| x * 3 + 1).filter(|y| *y > 10).sum();
        let got = eval::call(&p, "f", vec![u64_list(n)], &mut 100_000_000)?;
        assert_eq!(got, eval::Value::U64(want));
        let got = eval::call(&p, "g", vec![u64_list(n)], &mut 100_000_000)?;
        assert_eq!(got, eval::Value::U64(n * (n - 1) / 2));
        Ok(())
    });
}

/// src/eval.rs: a reference to a list copied it for one unit of fuel, so a
/// lambda that mentions its own receiver was quadratic within any budget.
#[test]
fn regression_eval_list_copies_cost_fuel() {
    use verified_language::{eval, syntax};
    let p = syntax::parse(
        "module m; fn f(xs: List<u64>) -> u64 { return sum(xs.map(fn(x) => sum(xs))); }",
    )
    .unwrap();
    bounded("eval-copies", 20, || {
        let e = eval::call(&p, "f", vec![u64_list(100_000)], &mut 100_000_000).unwrap_err();
        assert!(e.contains("budget exhausted"), "{e}");
        let got = eval::call(&p, "f", vec![u64_list(100)], &mut 100_000_000)?;
        assert_eq!(got, eval::Value::U64(100 * 4950));
        Ok(())
    });
}

/// src/eval.rs: evaluation recursed once per nested expression and call with
/// no limit. A module accepted by `CheckedModule` (120 nested calls, each
/// under 30 nested additions) overflowed an 8 MiB stack unoptimised and a
/// 1 MiB stack optimised.
#[test]
fn regression_eval_nesting_is_bounded() {
    use verified_language::{core::CheckedModule, eval, syntax};
    let nested = |inner: String| (0..30).fold(inner, |e, _| format!("({e} + 1)"));
    let mut source = format!(
        "module m;\nfn deep_0(x: u64) -> u64 {{ return {}; }}\n",
        nested("x".into())
    );
    for i in 1..120 {
        let body = nested(format!("deep_{}(x)", i - 1));
        source.push_str(&format!(
            "fn deep_{i}(x: u64) -> u64 {{ return {body}; }}\n"
        ));
    }
    bounded("eval-nesting", 20, || {
        let module = CheckedModule::from_source(syntax::parse(&source)?)?;
        let p = module.program();
        let one = vec![eval::Value::U64(1)];
        let e = eval::call(p, "deep_119", one.clone(), &mut 100_000_000).unwrap_err();
        assert!(e.contains("nesting limit"), "{e}");
        assert_eq!(
            eval::call(p, "deep_9", one, &mut 100_000_000)?,
            eval::Value::U64(301)
        );
        Ok(())
    });
}

#[test]
fn regression_eval_collection_and_float_frames_are_bounded() {
    let mut source = String::from("module frames; fn row_0(xs: List<u64>) -> u64 { return sum(xs); } fn float_0(x: f32) -> f32 { return x; }");
    for i in 1..120 {
        source.push_str(&format!(
            "fn row_{i}(xs: List<u64>) -> u64 {{ return sum(xs.map(fn(x) => row_{}(xs) + x)); }}",
            i - 1
        ));
        source.push_str(&format!(
            "fn float_{i}(x: f32) -> f32 {{ return choose(true, float_{}(x), 0.0); }}",
            i - 1
        ));
    }
    bounded("eval-frame-variants", 20, || {
        let module = CheckedModule::from_source(syntax::parse(&source)?)?;
        for (prefix, input, expected) in [
            (
                "row",
                eval::Value::List(vec![eval::Value::U64(1)]),
                eval::Value::U64(9),
            ),
            (
                "float",
                eval::Value::F32(0.5f32.to_bits()),
                eval::Value::F32(0.5f32.to_bits()),
            ),
        ] {
            let error = eval::call(
                module.program(),
                &format!("{prefix}_119"),
                vec![input.clone()],
                &mut 100_000_000,
            )
            .unwrap_err();
            assert!(error.contains("nesting limit"), "{error}");
            assert_eq!(
                eval::call(
                    module.program(),
                    &format!("{prefix}_8"),
                    vec![input],
                    &mut 100_000_000
                )?,
                expected
            );
        }
        Ok(())
    });
}

#[test]
fn regression_eval_compute_values_charge_copies_and_preserve_context() {
    let source = "module compute_copies;
        record Row { v: Vec2<f32>, }
        fn project(xs: List<Row>) -> List<f32> { return xs.map(fn(r) => r.v.x); }
        fn duplicate(xs: List<Row>) -> List<f32> { return xs.map(fn(r) => sum(xs.map(fn(q) => q.v.x))); }
        fn positives(xs: List<u32>) -> u32 { return foldr(xs, 0, fn(x) => fn(r) => choose(x > 0, r + 1, r)); }";
    bounded("eval-compute-copies", 20, || {
        let module = CheckedModule::from_source(syntax::parse(source)?)?;
        let p = module.program();
        let mut invalid = p.clone();
        invalid
            .functions
            .iter_mut()
            .find(|f| f.name == "positives")
            .unwrap()
            .result = Type::U64;
        assert!(
            CheckedModule::from_source(invalid).is_err(),
            "the current fold subset requires matching element and accumulator types"
        );
        let rows = |n| {
            eval::Value::List(
                (0..n)
                    .map(|i| {
                        eval::Value::Record(
                            "Row".into(),
                            BTreeMap::from([(
                                "v".into(),
                                eval::Value::Vector(vec![
                                    eval::Value::F32((i as f32).to_bits()),
                                    eval::Value::F32(0),
                                ]),
                            )]),
                        )
                    })
                    .collect(),
            )
        };
        let expected = eval::Value::List(
            (0..20_000)
                .map(|i| eval::Value::F32((i as f32).to_bits()))
                .collect(),
        );
        assert_eq!(
            eval::call(p, "project", vec![rows(20_000)], &mut 10_000_000)?,
            expected
        );
        let error = eval::call(p, "duplicate", vec![rows(20_000)], &mut 1_000_000).unwrap_err();
        assert!(error.contains("budget exhausted"), "{error}");
        assert_eq!(
            eval::call(p, "duplicate", vec![rows(20)], &mut 1_000_000)?,
            eval::Value::List(vec![eval::Value::F32(190.0f32.to_bits()); 20])
        );
        assert_eq!(
            eval::call(
                p,
                "positives",
                vec![eval::Value::List(vec![
                    eval::Value::U32(0),
                    eval::Value::U32(u32::MAX),
                    eval::Value::U32(1)
                ])],
                &mut 10_000
            )?,
            eval::Value::U32(2)
        );
        Ok(())
    });
}

/// src/logic.rs `substitute`: copying a bound argument into each occurrence
/// of its variable was free, so applying `f(x) = x + x + ... (8192 copies)`
/// to a 32k-node argument built 2^28 nodes (tens of GiB) within the step
/// budget, through `evaluate`, `check` or a theorem's `declare`.
#[test]
fn regression_logic_substitution_copies_are_charged() {
    use verified_language::logic::{Context, Declaration, Proof, Sort, Term};
    fn tree(leaf: &Term, depth: usize) -> Term {
        if depth == 0 {
            return leaf.clone();
        }
        Term::Binary {
            op: "+".into(),
            left: Box::new(tree(leaf, depth - 1)),
            right: Box::new(tree(leaf, depth - 1)),
        }
    }
    let apply = |argument| Term::Call {
        function: "f".into(),
        arguments: vec![argument],
    };
    bounded("logic-substitution", 20, || {
        let mut c = Context::default();
        let body = tree(&Term::Var("x".into()), 13);
        c.declare(
            "f".into(),
            &Declaration::Function {
                params: vec![("x".into(), Sort::U64)],
                result: Sort::U64,
                body,
                recursive: None,
            },
        )?;
        let params = [("y".into(), Sort::U64)];
        let big = apply(tree(&Term::Var("y".into()), 14));
        let e = c.evaluate(&params, &big).unwrap_err();
        assert!(e.contains("resource limit"), "{e}");
        let proof = Proof::Convert {
            from: big.clone(),
            to: big.clone(),
        };
        let e = c.check(&params, &[], &big, &big, &proof).unwrap_err();
        assert!(e.contains("resource limit"), "{e}");
        let theorem = Declaration::Theorem {
            params: params.to_vec(),
            conditions: vec![],
            from: big.clone(),
            to: big.clone(),
            proof,
        };
        let e = c.declare("t".into(), &theorem).unwrap_err();
        assert!(e.contains("resource limit"), "{e}");
        // Small applications still compute.
        assert_eq!(c.evaluate(&[], &apply(Term::U64(1)))?, Term::U64(8192));
        Ok(())
    });
}

fn sealed_snapshot(layout: &verified_language::snapshot_wire::Layout, payload: &[u8]) -> Vec<u8> {
    let mut bytes = b"VLSTATE\0".to_vec();
    bytes.extend(1u16.to_le_bytes());
    bytes.extend(1u16.to_le_bytes());
    bytes.extend(layout.program);
    bytes.extend(layout.schema);
    bytes.extend((payload.len() as u64).to_le_bytes());
    bytes.extend(payload);
    let digest = Sha256::digest(&bytes);
    bytes.extend(digest);
    bytes
}

/// src/snapshot_wire.rs: Int values had no size bound, and decimal
/// conversion is superlinear: one 4 MiB Int took 8 s to decode and 2 min to
/// encode optimised, and a 64 MiB snapshot may hold one 16 times larger.
#[test]
fn regression_snapshot_int_size_is_bounded() {
    use num_bigint::BigInt;
    use verified_language::snapshot_wire::{
        decode, encode, Event, Layout, Limits, Logical, Schema, MAX_INT_BYTES,
    };
    let layout = Layout {
        program: [3; 32],
        schema: [4; 32],
        roots: vec![],
        events: vec![("e".into(), Schema::Int)],
    };
    let event = |value| Logical {
        version: 1,
        tables: vec![],
        outbox: vec![Event {
            commit: 1,
            position: 0,
            channel: 0,
            value,
        }],
    };
    bounded("snapshot-int", 20, || {
        let limits = Limits::default();
        let largest: BigInt = (BigInt::from(1) << (8 * MAX_INT_BYTES)) - 1;
        for n in [-largest.clone(), largest.clone()] {
            let logical = event(json!({ "Int": n.to_string() }));
            let bytes = encode(&layout, &logical, limits)?;
            assert_eq!(decode(&layout, &bytes, limits)?, logical);
        }
        for text in [
            (largest + BigInt::from(1)).to_string(),
            "7".repeat(10_000_000),
        ] {
            let e = encode(&layout, &event(json!({ "Int": text })), limits).unwrap_err();
            assert!(e.contains("Int exceeds size limit"), "{e}");
        }
        for n in [MAX_INT_BYTES + 1, 4 << 20] {
            // version 1; one event: commit 1, position 0, channel 0, Int +n bytes.
            let mut payload = 1u64.to_le_bytes().to_vec();
            payload.extend(1u64.to_le_bytes());
            payload.extend(1u64.to_le_bytes());
            payload.extend(0u64.to_le_bytes());
            payload.extend(0u32.to_le_bytes());
            payload.push(1);
            payload.extend((n as u64).to_le_bytes());
            payload.extend(vec![0xff; n]);
            let e = decode(&layout, &sealed_snapshot(&layout, &payload), limits).unwrap_err();
            assert!(e.contains("Int exceeds size limit"), "{e}");
        }
        Ok(())
    });
}

/// src/snapshot.rs: record schemas were expanded at every use, so 26 records
/// that each hold two of the next form a valid core module whose portable
/// schema has 2^26 leaves, exhausting memory in `layout` and checkpoints.
#[test]
fn regression_snapshot_schema_expansion_is_bounded() {
    use verified_language::{core::CheckedModule, snapshot, stateful::Runtime, syntax};
    let mut source = String::from("module m;\n");
    for i in 0..25 {
        source.push_str(&format!("record R{i} {{ a: R{0}, b: R{0}, }}\n", i + 1));
    }
    source.push_str("record R25 { a: u64, }\nstate S: Table<u64, R0> = Table.empty();\n");
    bounded("snapshot-layout", 20, || {
        let p = syntax::parse(&source)?;
        CheckedModule::from_source(p.clone())?;
        let e = snapshot::layout(&p).unwrap_err();
        assert!(e.contains("schema size limit"), "{e}");
        let e = Runtime::new(p)?.checkpoint_portable().unwrap_err();
        assert!(e.contains("schema size limit"), "{e}");
        Ok(())
    });
}

// ---------------------------------------------------------------------------
// Deterministic generator and settings.

#[derive(Clone)]
struct Rng(u64);
impl Rng {
    fn new(seed: u64) -> Self {
        let mut r = Self(seed.wrapping_mul(0x9E37_79B9_7F4A_7C15) ^ 0xD1B5_4A32_D192_ED03);
        if r.0 == 0 {
            r.0 = 1;
        }
        r.next();
        r
    }
    fn next(&mut self) -> u64 {
        let mut x = self.0;
        x ^= x << 13;
        x ^= x >> 7;
        x ^= x << 17;
        self.0 = x;
        x.wrapping_mul(0x2545_F491_4F6C_DD1D)
    }
    fn below(&mut self, n: usize) -> usize {
        if n == 0 {
            0
        } else {
            (self.next() % n as u64) as usize
        }
    }
    /// True with probability 1/n.
    fn one_in(&mut self, n: usize) -> bool {
        self.below(n) == 0
    }
    fn pick<'a, T>(&mut self, xs: &'a [T]) -> &'a T {
        &xs[self.below(xs.len())]
    }
}

struct Settings {
    iters: Option<usize>,
    seed: u64,
    only: Option<(String, Option<usize>)>,
    verbose: bool,
    full: bool,
}
fn settings() -> Settings {
    let var = |n: &str| std::env::var(n).ok().filter(|v| !v.is_empty());
    Settings {
        iters: var("INK_FUZZ_ITERS").map(|v| v.parse().expect("INK_FUZZ_ITERS")),
        seed: var("INK_FUZZ_SEED").map_or(0x5EED_1A4B, |v| v.parse().expect("INK_FUZZ_SEED")),
        only: var("INK_FUZZ_ONLY").map(|v| match v.split_once(':') {
            Some((t, c)) => (t.to_owned(), Some(c.parse().expect("INK_FUZZ_ONLY case"))),
            None => (v, None),
        }),
        verbose: var("INK_FUZZ_VERBOSE").is_some(),
        full: var("INK_FUZZ_FULL").is_some()
            || var("INK_FUZZ_ITERS").is_some_and(|v| v.parse::<usize>().is_ok_and(|n| n >= 1000)),
    }
}
fn root() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).to_path_buf()
}
fn knowledge_dir() -> PathBuf {
    root().join("knowledge")
}
fn read(path: impl AsRef<Path>) -> Vec<u8> {
    let path = path.as_ref();
    fs::read(path).unwrap_or_else(|e| panic!("{}: {e}", path.display()))
}
fn sha(bytes: &[u8]) -> String {
    format!("{:x}", Sha256::digest(bytes))
}

// ---------------------------------------------------------------------------
// Fuzz loop.

fn slow_limit() -> Duration {
    Duration::from_secs(if cfg!(debug_assertions) { 90 } else { 15 })
}
struct Seed<T> {
    bytes: Vec<u8>,
    json: Option<Json>,
    data: T,
}
impl<T> Seed<T> {
    fn json(bytes: Vec<u8>, data: T) -> Self {
        let json = serde_json::from_slice(&bytes).ok();
        Self { bytes, json, data }
    }
    fn binary(bytes: Vec<u8>, data: T) -> Self {
        Self {
            bytes,
            json: None,
            data,
        }
    }
}

fn fnv(s: &str) -> u64 {
    s.bytes().fold(0xcbf2_9ce4_8422_2325, |h, b| {
        (h ^ b as u64).wrapping_mul(0x0100_0000_01b3)
    })
}

/// Feed every seed unchanged (each must be accepted), then `iters` mutants.
fn fuzz<T: Sync>(
    name: &str,
    default_iters: usize,
    seeds: &[Seed<T>],
    mutate: impl Fn(&mut Rng, &Seed<T>) -> Vec<u8> + Sync,
    check: impl Fn(&Seed<T>, &[u8]) -> Result<(), String> + Sync,
) {
    let s = settings();
    let only_case = match &s.only {
        Some((target, case)) if target == name => *case,
        Some(_) => return,
        None => None,
    };
    assert!(!seeds.is_empty(), "{name}: empty corpus");
    let iters = s.iters.unwrap_or(default_iters);
    let mut failures = Vec::new();
    let mut slowest_seed = Duration::ZERO;
    if only_case.is_none() {
        for (i, seed) in seeds.iter().enumerate() {
            let label = format!("{name}:seed{i}");
            if s.verbose {
                eprintln!("{label} ({} bytes)", seed.bytes.len());
            }
            let run = execute(&label, &|| check(seed, &seed.bytes));
            slowest_seed = slowest_seed.max(run.elapsed);
            assert_eq!(run.outcome, Ok(Ok(())), "{label}: valid seed not accepted");
            assert!(run.peak < CASE_REPORT, "{label}: peak heap {}", run.peak);
        }
    }
    let mut accepted = 0;
    let mut errors: BTreeMap<String, usize> = BTreeMap::new();
    let mut slowest = (Duration::ZERO, 0);
    let mut largest = (0, 0);
    let started = Instant::now();
    for case in 0..iters {
        if only_case.is_some_and(|c| c != case) {
            continue;
        }
        let mut rng =
            Rng::new(s.seed ^ fnv(name) ^ (case as u64).wrapping_mul(0xA24B_AED4_963E_E407));
        let seed = rng.pick(seeds);
        let input = mutate(&mut rng, seed);
        let label = format!("{name}:{case}");
        if s.verbose {
            eprintln!(
                "{label} ({} bytes; live heap {})",
                input.len(),
                GLOBAL_LIVE.load(Ordering::Relaxed)
            );
        }
        if only_case.is_some() {
            // Keep the exact bytes of a reproduced case, even if it aborts.
            let dir = root().join("target/hardening-failures");
            let _ = fs::create_dir_all(&dir);
            let _ = fs::write(dir.join(format!("{name}-{case}.bin")), &input);
        }
        let run = execute(&label, &|| check(seed, &input));
        slowest = slowest.max((run.elapsed, case));
        largest = largest.max((run.peak, case));
        let problem = match &run.outcome {
            Err(message) => Some(format!("panic: {message}")),
            Ok(_) if run.elapsed > slow_limit() => Some(format!("slow: {:?}", run.elapsed)),
            Ok(_) if run.peak > CASE_REPORT => Some(format!("heap peak {} bytes", run.peak)),
            Ok(Ok(())) => {
                accepted += 1;
                None
            }
            Ok(Err(e)) => {
                let key: String = e.chars().take(60).collect();
                *errors.entry(key).or_default() += 1;
                None
            }
        };
        if let Some(problem) = problem {
            let dir = root().join("target/hardening-failures");
            let _ = fs::create_dir_all(&dir);
            let path = dir.join(format!("{name}-{case}.bin"));
            let _ = fs::write(&path, &input);
            eprintln!("{label}: {problem} (input: {})", path.display());
            failures.push(format!("{label}: {problem}"));
        }
    }
    if s.verbose || !failures.is_empty() {
        eprintln!(
            "{name}: {iters} cases in {:?}; {accepted} mutants accepted; slowest seed {slowest_seed:?}; slowest case {} {:?}; largest heap case {} {} bytes",
            started.elapsed(),
            slowest.1,
            slowest.0,
            largest.1,
            largest.0
        );
        let mut common: Vec<_> = errors.into_iter().collect();
        common.sort_by(|a, b| b.1.cmp(&a.1));
        for (e, n) in common.iter().take(25) {
            eprintln!("  {n:6} {e}");
        }
    }
    assert!(
        failures.is_empty(),
        "{name}: {} findings: {failures:#?}",
        failures.len()
    );
}

// ---------------------------------------------------------------------------
// Mutators.

const NUMBERS: &[&str] = &[
    "0",
    "1",
    "-1",
    "2",
    "3",
    "7",
    "31",
    "32",
    "33",
    "63",
    "64",
    "65",
    "127",
    "128",
    "129",
    "255",
    "256",
    "999",
    "4096",
    "65535",
    "65536",
    "100000",
    "1000000000",
    "2147483647",
    "2147483648",
    "-2147483648",
    "-2147483649",
    "4294967295",
    "4294967296",
    "9007199254740993",
    "9223372036854775807",
    "9223372036854775808",
    "-9223372036854775808",
    "18446744073709551615",
    "18446744073709551616",
    "1e9",
    "1e300",
    "-1e300",
    "0.5",
    "-0",
];
fn number(rng: &mut Rng) -> Json {
    serde_json::from_str(rng.pick(NUMBERS)).unwrap()
}
/// Approximate in-memory size: nodes plus string bytes, so that copying a
/// long string is weighed like copying a large subtree.
fn weight(v: &Json) -> usize {
    1 + match v {
        Json::String(s) => s.len(),
        Json::Array(xs) => xs.iter().map(weight).sum(),
        Json::Object(xs) => xs.iter().map(|(k, x)| k.len() + weight(x)).sum(),
        _ => 0,
    }
}
fn depth(v: &Json) -> usize {
    1 + match v {
        Json::Array(xs) => xs.iter().map(depth).max().unwrap_or(0),
        Json::Object(xs) => xs.values().map(depth).max().unwrap_or(0),
        _ => 0,
    }
}
/// Preorder node `n`; returns None (and decrements `n`) if not in this subtree.
fn nth_mut<'a>(v: &'a mut Json, n: &mut usize) -> Option<&'a mut Json> {
    if *n == 0 {
        return Some(v);
    }
    *n -= 1;
    match v {
        Json::Array(xs) => xs.iter_mut().find_map(|x| nth_mut(x, n)),
        Json::Object(xs) => xs.values_mut().find_map(|x| nth_mut(x, n)),
        _ => None,
    }
}
fn nth(v: &Json, n: usize) -> Json {
    let mut v = v.clone();
    let mut k = n;
    nth_mut(&mut v, &mut k)
        .map(|x| x.take())
        .unwrap_or(Json::Null)
}
#[derive(Clone)]
enum Step {
    Key(String),
    Index(usize),
}
fn path_to(v: &Json, n: &mut usize, path: &mut Vec<Step>) -> bool {
    if *n == 0 {
        return true;
    }
    *n -= 1;
    match v {
        Json::Array(xs) => {
            for (i, x) in xs.iter().enumerate() {
                path.push(Step::Index(i));
                if path_to(x, n, path) {
                    return true;
                }
                path.pop();
            }
        }
        Json::Object(xs) => {
            for (k, x) in xs {
                path.push(Step::Key(k.clone()));
                if path_to(x, n, path) {
                    return true;
                }
                path.pop();
            }
        }
        _ => {}
    }
    false
}
fn at_path<'a>(v: &'a mut Json, path: &[Step]) -> &'a mut Json {
    path.iter().fold(v, |v, step| match step {
        Step::Key(k) => &mut v[k.as_str()],
        Step::Index(i) => &mut v[*i],
    })
}
fn keys(v: &Json, out: &mut BTreeSet<String>) {
    match v {
        Json::Array(xs) => xs.iter().for_each(|x| keys(x, out)),
        Json::Object(xs) => {
            for (k, x) in xs {
                out.insert(k.clone());
                keys(x, out)
            }
        }
        _ => {}
    }
}
/// Preorder (label, kind) of every node. A label is the field name the node
/// sits under (array elements extend their array's label), which mostly
/// identifies its schema type, so same-label swaps usually still deserialize.
fn shape(v: &Json, label: &str, out: &mut Vec<(String, u8)>) {
    let kind = match v {
        Json::Null | Json::Bool(_) => 0,
        Json::Number(_) => 1,
        Json::String(_) => 2,
        Json::Array(_) => 3,
        Json::Object(_) => 4,
    };
    out.push((label.to_owned(), kind));
    match v {
        Json::Array(xs) => {
            let inner = format!("{label}[]");
            xs.iter().for_each(|x| shape(x, &inner, out))
        }
        Json::Object(xs) => xs.iter().for_each(|(k, x)| shape(x, k, out)),
        _ => {}
    }
}
const COUNTS: &[u64] = &[
    0,
    1,
    2,
    3,
    31,
    32,
    63,
    64,
    65,
    127,
    128,
    129,
    255,
    999,
    4096,
    65536,
    1_000_000_000,
    u32::MAX as u64,
    1 << 32,
    i64::MAX as u64,
    u64::MAX,
];
/// One structural mutation at a random node of `root`.
fn mutate_value(rng: &mut Rng, root: &mut Json) {
    let mut nodes_shape = Vec::new();
    shape(root, "", &mut nodes_shape);
    let total = nodes_shape.len();
    let of_kind =
        |kind: u8| -> Vec<usize> { (0..total).filter(|&i| nodes_shape[i].1 == kind).collect() };
    let op = rng.below(20);
    let wanted = match op {
        0..=5 => of_kind(1),
        11..=12 | 15 => of_kind(3),
        16 => of_kind(2),
        _ => vec![],
    };
    let index = if wanted.is_empty() {
        rng.below(total)
    } else {
        *rng.pick(&wanted)
    };
    let same_label: Vec<usize> = (0..total)
        .filter(|&i| i != index && nodes_shape[i].0 == nodes_shape[index].0)
        .collect();
    let donor = if !same_label.is_empty() && op < 17 {
        nth(root, *rng.pick(&same_label))
    } else {
        nth(root, rng.below(total))
    };
    let mut tags = BTreeSet::new();
    if op >= 17 {
        keys(root, &mut tags);
    }
    let tags: Vec<_> = tags.into_iter().collect();
    let mut k = index;
    let node = nth_mut(root, &mut k).expect("node index");
    match op {
        0..=5 => {
            *node = match (node.as_u64(), node.as_i64()) {
                (Some(n), _) if rng.below(4) != 0 => json!(match rng.below(3) {
                    0 => n.wrapping_add(1),
                    1 => n.wrapping_sub(1),
                    _ => *rng.pick(COUNTS),
                }),
                (_, Some(n)) if rng.one_in(2) => json!(n.wrapping_neg()),
                _ => number(rng),
            }
        }
        6..=10 => *node = donor,
        11 | 12 => match node {
            Json::Array(xs) if !xs.is_empty() => match rng.below(6) {
                0 => {
                    xs.remove(rng.below(xs.len()));
                }
                1 => {
                    let x = xs[rng.below(xs.len())].clone();
                    xs.insert(rng.below(xs.len() + 1), x)
                }
                2 => xs.clear(),
                3 => xs.reverse(),
                4 => xs.truncate(rng.below(xs.len())),
                _ => {
                    let a = rng.below(xs.len());
                    let b = rng.below(xs.len());
                    xs.swap(a, b)
                }
            },
            _ => *node = donor,
        },
        13 | 14 => {
            // Self-similar nesting: re-embed this node inside one of its own
            // descendants, giving deep but structurally plausible input.
            let template = node.clone();
            let mut count = Vec::new();
            shape(&template, "", &mut count);
            let size = weight(&template);
            if count.len() < 2 {
                *node = json!([[[[template]]]]);
                return;
            }
            let mut d = 1 + rng.below(count.len() - 1);
            let mut path = Vec::new();
            path_to(&template, &mut d, &mut path);
            let per = path.len().max(1);
            let times = [2, 6, 20, 33, 40, 70, 129, 140, 400][rng.below(9)]
                .min((200_000 / size).max(1))
                .min(450 / per)
                .max(1);
            let mut result = template.clone();
            for _ in 0..times {
                let mut next = template.clone();
                *at_path(&mut next, &path) = result;
                result = next;
            }
            *node = result;
        }
        15 => {
            // Giant arrays of plausible elements.
            let element = match node {
                Json::Array(xs) if !xs.is_empty() => xs[rng.below(xs.len())].clone(),
                _ => donor,
            };
            let n = [129, 1000, 4097, 20_001, 100_001][rng.below(5)];
            let n = n.min(2_000_000 / weight(&element)).max(2);
            *node = Json::Array(vec![element; n]);
        }
        16 => match node {
            Json::String(s) => {
                *s = match rng.below(7) {
                    0 => String::new(),
                    1 => format!("{s}{s}"),
                    2 => s.chars().rev().collect(),
                    3 => "0".repeat(64),
                    4 => s.chars().take(s.len() / 2).collect(),
                    5 => "$b0".into(),
                    _ => format!("{s}\u{0}\u{1F30D}"),
                }
            }
            _ => *node = donor,
        },
        17 => {
            *node = match rng.below(8) {
                0 => Json::Null,
                1 => json!(rng.one_in(2)),
                2 => json!(""),
                3 => json!([]),
                4 => json!({}),
                5 => number(rng),
                6 => json!("SelfType"),
                _ => json!("a".repeat([1, 64, 65, 129, 100_000][rng.below(5)])),
            }
        }
        18 => match node {
            Json::Object(xs) if !xs.is_empty() => {
                let key = xs.keys().nth(rng.below(xs.len())).unwrap().clone();
                match rng.below(4) {
                    0 => {
                        xs.remove(&key);
                    }
                    1 => {
                        xs.insert("unexpected".into(), donor);
                    }
                    2 => {
                        let value = xs.remove(&key).unwrap();
                        let renamed = if tags.is_empty() {
                            format!("{key}_")
                        } else {
                            rng.pick(&tags).clone()
                        };
                        xs.insert(renamed, value);
                    }
                    _ => {
                        xs.insert(key, donor);
                    }
                }
            }
            _ => *node = donor,
        },
        _ => {
            let tag = if tags.is_empty() {
                "Sym".to_owned()
            } else {
                rng.pick(&tags).clone()
            };
            *node = json!({ tag: node.take() });
        }
    }
}
fn write_json(rng: &mut Rng, v: &Json, dup: usize, seen: &mut usize, out: &mut String) {
    match v {
        Json::Array(xs) => {
            out.push('[');
            for (i, x) in xs.iter().enumerate() {
                if i > 0 {
                    out.push(',');
                }
                write_json(rng, x, dup, seen, out);
            }
            out.push(']');
        }
        Json::Object(xs) => {
            let here = *seen == dup;
            *seen += 1;
            out.push('{');
            if here {
                if let Some((k, x)) = xs.iter().nth(rng.below(xs.len().max(1))) {
                    // Duplicate key, first occurrence with a different value.
                    out.push_str(&serde_json::to_string(k).unwrap());
                    out.push(':');
                    out.push_str(
                        &serde_json::to_string(&if rng.one_in(2) {
                            number(rng)
                        } else {
                            x.clone()
                        })
                        .unwrap(),
                    );
                    out.push(',');
                }
            }
            for (i, (k, x)) in xs.iter().enumerate() {
                if i > 0 {
                    out.push(',');
                }
                out.push_str(&serde_json::to_string(k).unwrap());
                out.push(':');
                write_json(rng, x, dup, seen, out);
            }
            out.push('}');
        }
        _ => out.push_str(&serde_json::to_string(v).unwrap()),
    }
}
fn objects_in(v: &Json) -> usize {
    match v {
        Json::Array(xs) => xs.iter().map(objects_in).sum(),
        Json::Object(xs) => 1 + xs.values().map(objects_in).sum::<usize>(),
        _ => 0,
    }
}
const PUNCTUATION: &[u8] = b"{}[]\",:-+.eE0123456789\\ntfa \x00\xff";
fn mutate_bytes(rng: &mut Rng, bytes: &mut Vec<u8>, rounds: usize) {
    for _ in 0..rounds {
        let len = bytes.len();
        match rng.below(9) {
            0 if len > 0 => {
                let i = rng.below(len);
                bytes[i] ^= 1 << rng.below(8)
            }
            1 if len > 0 => {
                let i = rng.below(len);
                bytes[i] = *rng.pick(PUNCTUATION)
            }
            2 if len > 0 => {
                let a = rng.below(len);
                let b = (a + 1 + rng.below(16)).min(len);
                bytes.drain(a..b);
            }
            3 if len > 0 => {
                let a = rng.below(len);
                let b = (a + 1 + rng.below(64)).min(len);
                let chunk = bytes[a..b].to_vec();
                let at = rng.below(len + 1);
                bytes.splice(at..at, chunk);
            }
            4 => bytes.truncate(rng.below(len + 1)),
            5 => {
                let at = rng.below(len + 1);
                let digits = b"99999999999999999999999".to_vec();
                bytes.splice(at..at, digits);
            }
            6 => {
                // Deep bracket nesting for parsers with or without limits.
                let at = rng.below(len + 1);
                let n = [130, 5000, 100_000][rng.below(3)];
                let mut nest = vec![b'['; n];
                nest.extend(vec![b']'; n]);
                bytes.splice(at..at, nest);
            }
            7 if len > 0 => {
                let i = rng.below(len);
                bytes[i] = rng.next() as u8
            }
            _ => {
                let at = rng.below(len + 1);
                bytes.insert(at, *rng.pick(PUNCTUATION))
            }
        }
    }
}
/// JSON mutation of a parsed seed, sometimes followed by raw byte damage.
fn mutate_json(rng: &mut Rng, value: &Json, raw: &[u8]) -> Vec<u8> {
    if rng.one_in(6) {
        let mut bytes = raw.to_vec();
        let rounds = 1 + rng.below(4);
        mutate_bytes(rng, &mut bytes, rounds);
        return bytes;
    }
    let mut v = value.clone();
    for _ in 0..1 + rng.below(3) {
        mutate_value(rng, &mut v);
        if depth(&v) > 500 {
            v = value.clone();
        }
    }
    let mut out = if rng.one_in(8) {
        let objects = objects_in(&v);
        let mut text = String::new();
        let dup = rng.below(objects.max(1));
        write_json(rng, &v, dup, &mut 0, &mut text);
        text.into_bytes()
    } else {
        serde_json::to_vec(&v).unwrap()
    };
    if rng.one_in(8) {
        mutate_bytes(rng, &mut out, 1);
    }
    out
}
/// Mutate the JSON seed while usually keeping the subtree at `protect` intact,
/// so mutations reach the parts that are not content-addressed.
fn mutate_json_protecting(rng: &mut Rng, value: &Json, raw: &[u8], protect: &[&str]) -> Vec<u8> {
    if rng.one_in(5) {
        return mutate_json(rng, value, raw);
    }
    let mut v = value.clone();
    let mut slot = &mut v;
    for key in protect {
        slot = &mut slot[*key];
    }
    let saved = slot.take();
    let mut mutated: Json =
        serde_json::from_slice(&mutate_json(rng, &v, &serde_json::to_vec(&v).unwrap()))
            .unwrap_or(Json::Null);
    let mut slot = Some(&mut mutated);
    for key in protect {
        slot = slot
            .and_then(|s| s.as_object_mut())
            .and_then(|o| o.get_mut(*key));
    }
    match slot {
        Some(slot) if slot.is_null() => *slot = saved,
        _ => {
            // The mutation moved or removed the protected field; send raw damage.
            let mut bytes = raw.to_vec();
            mutate_bytes(rng, &mut bytes, 1);
            return bytes;
        }
    }
    serde_json::to_vec(&mutated).unwrap()
}

// ---------------------------------------------------------------------------
// Corpora.

fn first_order_locks() -> Vec<PathBuf> {
    let mut locks = Vec::new();
    fn walk(dir: &Path, out: &mut Vec<PathBuf>) {
        let Ok(entries) = fs::read_dir(dir) else {
            return;
        };
        let mut entries: Vec<_> = entries.flatten().map(|e| e.path()).collect();
        entries.sort();
        for path in entries {
            if path.is_dir()
                && path
                    .file_name()
                    .is_some_and(|n| n != "objects" && n != ".git")
            {
                walk(&path, out);
            } else if path.file_name().is_some_and(|n| n == "lock.json") {
                out.push(path);
            }
        }
    }
    walk(&knowledge_dir(), &mut locks);
    locks
}
fn lock_semantics(path: &Path) -> String {
    let lock: knowledge::Lock = serde_json::from_slice(&read(path)).unwrap();
    lock.semantics
}
/// Raw bytes of every content-addressed object of the given lock semantics.
fn objects(semantics: &str) -> BTreeMap<String, Vec<u8>> {
    let mut out = BTreeMap::new();
    for lock in first_order_locks() {
        if lock_semantics(&lock) != semantics {
            continue;
        }
        let dir = lock.parent().unwrap().join("objects");
        for entry in fs::read_dir(dir).unwrap().flatten() {
            let name = entry.file_name().into_string().unwrap();
            let id = name.trim_end_matches(".json").to_owned();
            out.entry(id).or_insert_with(|| read(entry.path()));
        }
    }
    out
}

/// Checked first-order contexts, as built by the library loader: the
/// dependency context of each object and the context after declaring it.
struct LogicCorpus {
    raw: BTreeMap<String, Vec<u8>>,
    before: BTreeMap<String, Context>,
    after: BTreeMap<String, Context>,
}
impl LogicCorpus {
    fn build(&mut self, id: &str) -> Context {
        if let Some(c) = self.after.get(id) {
            return c.clone();
        }
        let object: library::Object = serde_json::from_slice(&self.raw[id]).unwrap();
        let mut context = Context::default();
        for dependency in &object.dependencies {
            let checked = self.build(dependency);
            context.import(&checked, dependency).unwrap();
        }
        self.before.insert(id.to_owned(), context.clone());
        context
            .declare(id.to_owned(), &object.declaration)
            .unwrap_or_else(|e| panic!("corpus object {id}: {e}"));
        self.after.insert(id.to_owned(), context.clone());
        context
    }
}
fn logic_corpus(full: bool) -> (LogicCorpus, Vec<String>) {
    let raw = objects(library::SEMANTICS);
    // Short runs use a representative subset that checks quickly unoptimised.
    let chosen: Vec<String> = raw
        .iter()
        .filter(|(_, bytes)| full || bytes.len() < 24_000)
        .map(|(id, _)| id.clone())
        .enumerate()
        .filter(|(i, _)| full || i % 5 == 0)
        .map(|(_, id)| id)
        .collect();
    let mut corpus = LogicCorpus {
        raw,
        before: BTreeMap::new(),
        after: BTreeMap::new(),
    };
    for id in &chosen {
        corpus.build(id);
    }
    (corpus, chosen)
}

// ---------------------------------------------------------------------------
// Targets.

/// First-order proof objects: `Context::declare`, which runs `infer`, `derive`,
/// `normal`, `bind_self` and `terminating`, plus `check`/`evaluate`.
#[test]
fn fuzz_logic_objects() {
    let s = settings();
    if s.only.as_ref().is_some_and(|(t, _)| t != "logic") {
        return;
    }
    let (corpus, chosen) = logic_corpus(s.full);
    let seeds: Vec<_> = chosen
        .iter()
        .map(|id| Seed::json(corpus.raw[id].clone(), id.clone()))
        .collect();
    fuzz(
        "logic",
        60,
        &seeds,
        |rng, seed| mutate_json(rng, seed.json.as_ref().unwrap(), &seed.bytes),
        |seed, bytes| {
            let id = &seed.data;
            let object: library::Object =
                serde_json::from_slice(bytes).map_err(|e| e.to_string())?;
            let before = &corpus.before[id];
            let after = &corpus.after[id];
            // Side queries must fail closed too, whatever the declaration does.
            let _ = after.matches_definition(id, &object.declaration);
            if let Declaration::Theorem {
                params,
                conditions,
                from,
                to,
                ..
            } = &object.declaration
            {
                let _ = before.evaluate(params, from);
                let _ = before.evaluate(params, to);
                let _ = before.bitvector_problem(params, conditions, from, to);
            }
            let mut local = before.subset(&object.dependencies)?;
            local.declare(id.clone(), &object.declaration)
        },
    );
}

/// Hinted-RUP certificates against their circuits (`bitproof::verify`).
#[test]
fn fuzz_bitproof_certificates() {
    let s = settings();
    if s.only.as_ref().is_some_and(|(t, _)| t != "bitproof") {
        return;
    }
    let raw = objects(library::SEMANTICS);
    let mut corpus = LogicCorpus {
        raw,
        before: BTreeMap::new(),
        after: BTreeMap::new(),
    };
    let mut seeds = Vec::new();
    let ids: Vec<String> = corpus.raw.keys().cloned().collect();
    for id in ids {
        let object: library::Object = serde_json::from_slice(&corpus.raw[&id]).unwrap();
        let Declaration::Theorem {
            params,
            conditions,
            proof:
                Proof::BitVector {
                    from,
                    to,
                    hypotheses,
                    certificate,
                },
            ..
        } = object.declaration
        else {
            continue;
        };
        if !s.full && corpus.raw[&id].len() > 300_000 {
            continue;
        }
        corpus.build(&id);
        let selected: Vec<Equation> = hypotheses.iter().map(|&i| conditions[i].clone()).collect();
        let problem = corpus.before[&id]
            .bitvector_problem(&params, &selected, &from, &to)
            .unwrap();
        seeds.push(Seed::binary(
            serde_json::to_vec(&certificate).unwrap(),
            (problem, certificate),
        ));
    }
    let interesting_literal = |rng: &mut Rng, variables: i64| -> i64 {
        *rng.pick(&[
            0,
            1,
            -1,
            variables,
            -variables,
            variables + 1,
            -(variables + 1),
            i32::MAX as i64,
            i32::MIN as i64,
            i32::MIN as i64 + 1,
            1 << 31,
            -(1 << 40),
        ])
    };
    fuzz(
        "bitproof",
        150,
        &seeds,
        |rng, seed| {
            let (problem, certificate) = &seed.data;
            if rng.one_in(10) {
                // Whole-document JSON mutation is costly on large certificates.
                let small = bitproof::Certificate {
                    problem_sha256: certificate.problem_sha256.clone(),
                    steps: certificate.steps.iter().take(40).cloned().collect(),
                };
                let v = serde_json::to_value(&small).unwrap();
                return mutate_json(rng, &v, &serde_json::to_vec(&v).unwrap());
            }
            let mut v = serde_json::to_value(certificate).unwrap();
            let variables = problem.variables() as i64;
            let steps = v["steps"].as_array_mut().unwrap();
            for _ in 0..1 + rng.below(3) {
                let n = steps.len();
                if n == 0 {
                    steps.push(json!({"clause": [], "hints": []}));
                    continue;
                }
                let i = rng.below(n);
                match rng.below(10) {
                    0 | 1 => {
                        let clause = steps[i]["clause"].as_array_mut().unwrap();
                        let lit = interesting_literal(rng, variables);
                        if clause.is_empty() || rng.one_in(3) {
                            clause.push(json!(lit));
                        } else {
                            let j = rng.below(clause.len());
                            clause[j] = json!(lit);
                        }
                    }
                    2 | 3 => {
                        let hints = steps[i]["hints"].as_array_mut().unwrap();
                        let total = problem.clauses().len() + i;
                        let hint = *rng.pick(&[
                            0u64,
                            1,
                            total as u64 - 1,
                            total as u64,
                            total as u64 + 1,
                            999,
                            1_000_000_000,
                            u32::MAX as u64,
                            u64::MAX,
                        ]);
                        if hints.is_empty() || rng.one_in(3) {
                            hints.push(json!(hint));
                        } else {
                            let j = rng.below(hints.len());
                            hints[j] = json!(hint);
                        }
                    }
                    4 => {
                        steps.remove(i);
                    }
                    5 => {
                        let step = steps[i].clone();
                        steps.insert(i, step);
                    }
                    6 => {
                        let j = rng.below(n);
                        steps.swap(i, j);
                    }
                    7 => {
                        let hints = steps[i]["hints"].as_array_mut().unwrap();
                        if !hints.is_empty() {
                            let j = rng.below(hints.len());
                            hints.remove(j);
                        }
                    }
                    8 => {
                        // Exceed the step limit once, but never compound growth.
                        let step = steps[i].clone();
                        let size = 1
                            + step["clause"].as_array().unwrap().len()
                            + step["hints"].as_array().unwrap().len();
                        let copies = [100, 20_001][rng.below(2)]
                            .min(40_000usize.saturating_sub(n))
                            .min(2_000_000 / size);
                        steps.extend(std::iter::repeat(step).take(copies));
                    }
                    _ => {
                        let hints = steps[i]["hints"].as_array_mut().unwrap();
                        let copy = hints.clone();
                        let times = [2, 50, 2000][rng.below(3)].min(200_000 / copy.len().max(1));
                        for _ in 0..times {
                            hints.extend(copy.iter().cloned());
                        }
                    }
                }
            }
            serde_json::to_vec(&v).unwrap()
        },
        |seed, bytes| {
            let certificate: bitproof::Certificate =
                serde_json::from_slice(bytes).map_err(|e| e.to_string())?;
            bitproof::verify(&seed.data.0, &certificate)
        },
    );
}

/// Total-scalar equality objects (`equality::Context::define`/`prove_under`).
#[test]
fn fuzz_equality_objects() {
    let s = settings();
    if s.only.as_ref().is_some_and(|(t, _)| t != "equality") {
        return;
    }
    let raw = objects(knowledge::SEMANTICS);
    // Typed partial reads: a mutated object can hold millions of nodes, and
    // a `serde_json::Value` of it would dwarf what the checker allocates.
    fn head(bytes: &[u8]) -> (bool, Vec<String>) {
        use serde::{de::IgnoredAny, Deserialize};
        #[derive(Deserialize)]
        struct Head {
            kind: Option<IgnoredAny>,
            #[serde(default)]
            dependencies: Vec<String>,
        }
        #[derive(Deserialize)]
        struct Kind {
            kind: Option<IgnoredAny>,
        }
        match serde_json::from_slice::<Head>(bytes) {
            Ok(h) => (h.kind.is_some(), h.dependencies),
            Err(_) => (
                serde_json::from_slice::<Kind>(bytes).is_ok_and(|k| k.kind.is_some()),
                vec![],
            ),
        }
    }
    fn declare(context: &mut equality::Context, id: &str, bytes: &[u8]) -> Result<(), String> {
        #[derive(serde::Deserialize)]
        struct Definition {
            params: Vec<(String, Type)>,
            result: Type,
            body: Expr,
        }
        if head(bytes).0 {
            let d: Definition = serde_json::from_slice(bytes).map_err(|e| e.to_string())?;
            context.define(id.to_owned(), &d.params, &d.result, &d.body)
        } else {
            let o: knowledge::Object = serde_json::from_slice(bytes).map_err(|e| e.to_string())?;
            let checked = context.check_under(&o.params, &o.conditions, &o.from, &o.to, &o.proof);
            let proved = context.prove_under(
                id.to_owned(),
                &o.params,
                &o.conditions,
                &o.from,
                &o.to,
                &o.proof,
            );
            if o.conditions.is_empty() {
                let _ = equality::verify(&o.params, &o.from, &o.to, &o.proof);
            }
            assert_eq!(checked.is_ok(), proved.is_ok(), "check and prove disagree");
            proved.map(|_| ())
        }
    }
    let mut before: BTreeMap<String, equality::Context> = BTreeMap::new();
    let mut after: BTreeMap<String, equality::Context> = BTreeMap::new();
    fn build(
        id: &str,
        raw: &BTreeMap<String, Vec<u8>>,
        before: &mut BTreeMap<String, equality::Context>,
        after: &mut BTreeMap<String, equality::Context>,
    ) {
        if after.contains_key(id) {
            return;
        }
        let mut context = equality::Context::default();
        for d in head(&raw[id]).1 {
            build(&d, raw, before, after);
            context.import(&after[&d], &d).unwrap();
        }
        before.insert(id.to_owned(), context.clone());
        declare(&mut context, id, &raw[id]).unwrap();
        after.insert(id.to_owned(), context);
    }
    for id in raw.keys() {
        build(id, &raw, &mut before, &mut after);
    }
    let seeds: Vec<_> = raw
        .iter()
        .map(|(id, bytes)| Seed::json(bytes.clone(), id.clone()))
        .collect();
    fuzz(
        "equality",
        400,
        &seeds,
        |rng, seed| mutate_json(rng, seed.json.as_ref().unwrap(), &seed.bytes),
        |seed, bytes| {
            let mut local = before[&seed.data].subset(&head(bytes).1)?;
            declare(&mut local, &seed.data, bytes)
        },
    );
}

/// Content-addressed packages loaded from disk through their lockfiles.
/// A mutated object is re-addressed, and dependants are re-addressed in turn,
/// so mutations reach the semantic checkers rather than only the hash check.
#[test]
fn fuzz_lockfiles() {
    let s = settings();
    if s.only.as_ref().is_some_and(|(t, _)| t != "lockfile") {
        return;
    }
    let packages = [
        "boolean",
        "conditional",
        "composed",
        "inductive",
        "collections",
    ];
    fn encode(lock: &[u8], objects: &BTreeMap<String, Vec<u8>>) -> Vec<u8> {
        serde_json::to_vec(&json!({
            "lock": String::from_utf8_lossy(lock),
            "objects": objects
                .iter()
                .map(|(k, v)| (k.clone(), Json::String(String::from_utf8_lossy(v).into_owned())))
                .collect::<serde_json::Map<_, _>>(),
        }))
        .unwrap()
    }
    let seeds: Vec<_> = packages
        .iter()
        .map(|name| {
            let dir = knowledge_dir().join(name);
            let lock = read(dir.join("lock.json"));
            let objects: BTreeMap<String, Vec<u8>> = fs::read_dir(dir.join("objects"))
                .unwrap()
                .flatten()
                .map(|e| {
                    (
                        e.file_name()
                            .into_string()
                            .unwrap()
                            .trim_end_matches(".json")
                            .to_owned(),
                        read(e.path()),
                    )
                })
                .collect();
            let semantics = lock_semantics(&dir.join("lock.json"));
            let lock_json: Json = serde_json::from_slice(&lock).unwrap();
            Seed::binary(
                encode(&lock, &objects),
                (semantics, lock, lock_json, objects),
            )
        })
        .collect();
    static CASE: AtomicUsize = AtomicUsize::new(0);
    fuzz(
        "lockfile",
        120,
        &seeds,
        |rng, seed| {
            let (_, lock, lock_json, objects) = &seed.data;
            let mut lock = lock.clone();
            let mut objects = objects.clone();
            if rng.one_in(3) {
                lock = mutate_json(rng, lock_json, &lock);
            } else {
                let ids: Vec<String> = objects.keys().cloned().collect();
                let old = rng.pick(&ids).clone();
                let bytes = objects.remove(&old).unwrap();
                let mutated = match serde_json::from_slice::<Json>(&bytes) {
                    Ok(v) => mutate_json(rng, &v, &bytes),
                    Err(_) => bytes,
                };
                // Re-address the mutated object and, transitively, its dependants.
                let mut renames = vec![(old, sha(&mutated))];
                objects.insert(renames[0].1.clone(), mutated);
                while let Some((old, new)) = renames.pop() {
                    lock = String::from_utf8_lossy(&lock)
                        .replace(&old, &new)
                        .into_bytes();
                    let ids: Vec<String> = objects.keys().cloned().collect();
                    for id in ids {
                        let text = String::from_utf8_lossy(&objects[&id]).into_owned();
                        if id != new && text.contains(&old) {
                            let replaced = text.replace(&old, &new).into_bytes();
                            objects.remove(&id);
                            let next = sha(&replaced);
                            objects.insert(next.clone(), replaced);
                            renames.push((id, next));
                        }
                    }
                }
            }
            encode(&lock, &objects)
        },
        |seed, bytes| {
            let package: Json = serde_json::from_slice(bytes).unwrap();
            let dir = std::env::temp_dir().join(format!(
                "ink-hardening-{}-{}",
                std::process::id(),
                CASE.fetch_add(1, Ordering::Relaxed)
            ));
            fs::create_dir_all(dir.join("objects")).unwrap();
            fs::write(dir.join("lock.json"), package["lock"].as_str().unwrap()).unwrap();
            for (id, object) in package["objects"].as_object().unwrap() {
                fs::write(
                    dir.join("objects").join(format!("{id}.json")),
                    object.as_str().unwrap(),
                )
                .unwrap();
            }
            let lock = dir.join("lock.json");
            let result = if seed.data.0 == knowledge::SEMANTICS {
                knowledge::load(&lock).map(|_| ())
            } else {
                library::load(&lock).map(|_| ())
            };
            let _ = fs::remove_dir_all(&dir);
            result
        },
    );
}

fn certificate_seeds() -> Vec<Seed<()>> {
    let mut seeds: Vec<_> = [
        "table-maintenance/table.json",
        "table-maintenance/table-snapshot.json",
        "reversible-maintenance/reversible.json",
        "reversible-maintenance/snapshot.json",
        "delta-maintenance/delta.json",
    ]
    .iter()
    .map(|path| Seed::json(read(knowledge_dir().join(path)), ()))
    .collect();
    let legacy = aggregate::prove(
        &syntax::parse(
            &String::from_utf8(read(knowledge_dir().join("sum-maintenance.lang"))).unwrap(),
        )
        .unwrap(),
    )
    .unwrap();
    seeds.push(Seed::json(serde_json::to_vec(&legacy).unwrap(), ()));
    seeds
}

/// Database maintenance certificates (`aggregate::verify`, which runs the
/// exact and keyed-table maintenance checkers and their kernel proofs).
#[test]
fn fuzz_maintenance_certificates() {
    let s = settings();
    if s.only.as_ref().is_some_and(|(t, _)| t != "certificate") {
        return;
    }
    fuzz(
        "certificate",
        if cfg!(debug_assertions) { 25 } else { 200 },
        &certificate_seeds(),
        |rng, seed| {
            mutate_json_protecting(
                rng,
                seed.json.as_ref().unwrap(),
                &seed.bytes,
                &["evidence", "library"],
            )
        },
        |_, bytes| {
            let c: aggregate::Certificate =
                serde_json::from_slice(bytes).map_err(|e| e.to_string())?;
            aggregate::verify(&c)
        },
    );
}

/// Source row models bound to a program and maintenance certificate.
#[test]
fn fuzz_row_models() {
    let s = settings();
    if s.only.as_ref().is_some_and(|(t, _)| t != "row-model") {
        return;
    }
    let program = syntax::parse(include_str!("../examples/source-row-undo.ink")).unwrap();
    let seeds: Vec<_> = [
        ("reversible", "table.json"),
        ("snapshot", "table-snapshot.json"),
    ]
    .iter()
    .map(|(folder, cert)| {
        let c: aggregate::Certificate =
            serde_json::from_slice(&read(knowledge_dir().join("table-maintenance").join(cert)))
                .unwrap();
        Seed::json(
            read(
                knowledge_dir()
                    .join("source-row-undo")
                    .join(folder)
                    .join("source-model.json"),
            ),
            c,
        )
    })
    .collect();
    fuzz(
        "row-model",
        if cfg!(debug_assertions) { 6 } else { 100 },
        &seeds,
        |rng, seed| {
            mutate_json_protecting(rng, seed.json.as_ref().unwrap(), &seed.bytes, &["library"])
        },
        |seed, bytes| {
            let model: row_model::Model =
                serde_json::from_slice(bytes).map_err(|e| e.to_string())?;
            row_model::verify(&program, &seed.data, &model)
        },
    );
}

struct SnapshotSeed {
    layout: snapshot_wire::Layout,
    program: Option<syntax::Program>,
}
fn reseal(bytes: &mut Vec<u8>) {
    if bytes.len() < 116 {
        return;
    }
    let payload = (bytes.len() - 116) as u64;
    bytes[76..84].copy_from_slice(&payload.to_le_bytes());
    let end = bytes.len() - 32;
    let digest = Sha256::digest(&bytes[..end]);
    bytes[end..].copy_from_slice(&digest);
}
fn snapshot_seeds() -> Vec<Seed<SnapshotSeed>> {
    let mut seeds = Vec::new();
    let inventory = syntax::parse(include_str!("../examples/inventory.lang")).unwrap();
    let mut rt = Runtime::new(inventory.clone()).unwrap();
    let script: Json =
        serde_json::from_str(include_str!("../examples/inventory-script.json")).unwrap();
    for step in script.as_array().unwrap() {
        let _ = rt.invoke_json(step["call"].as_str().unwrap(), &step["args"]);
    }
    for i in 3..6 {
        let id = format!("{i:032x}");
        rt.invoke_json("create", &json!([id, "Gadget", i])).unwrap();
    }
    seeds.push(Seed::binary(
        rt.checkpoint_portable().unwrap(),
        SnapshotSeed {
            layout: snapshot::layout(&inventory).unwrap(),
            program: Some(inventory),
        },
    ));
    let rows = syntax::parse(include_str!("../examples/source-row-undo.ink")).unwrap();
    let mut rt = Runtime::new(rows.clone()).unwrap();
    for (key, active) in [(1, true), (7, false), (u64::MAX, true)] {
        let row = json!({"name":"röw","value":{"Int":"-12345678901234567890"},"detail":{"bias":{"Int":"3"},"active":active},"note":{"Some":"n"},"words":[1,2,u64::MAX],"status":"Status.Paused","marker":"0000000000000000000000000000000a","response":{"Err":"Status.Ready"},"count":7});
        rt.invoke_json("put", &json!([key, row])).unwrap();
    }
    seeds.push(Seed::binary(
        rt.checkpoint_portable().unwrap(),
        SnapshotSeed {
            layout: snapshot::layout(&rows).unwrap(),
            program: Some(rows),
        },
    ));
    let fields = vec![
        ("unit".into(), Schema::Unit),
        ("int".into(), Schema::Int),
        ("text".into(), Schema::String),
        ("id".into(), Schema::Id),
        ("choice".into(), Schema::Enum(vec!["A".into(), "B".into()])),
        (
            "nested".into(),
            Schema::List(Box::new(Schema::Option(Box::new(Schema::Result(
                Box::new(Schema::U32),
                Box::new(Schema::List(Box::new(Schema::Bool))),
            ))))),
        ),
    ];
    let layout = snapshot_wire::Layout {
        program: [1; 32],
        schema: [2; 32],
        roots: vec![
            ("A".into(), Schema::String, Schema::Record(fields)),
            ("B".into(), Schema::Id, Schema::U64),
        ],
        events: vec![
            ("e".into(), Schema::Int),
            ("f".into(), Schema::List(Box::new(Schema::Unit))),
        ],
    };
    let value = json!({"unit":null,"int":{"Int":"-340282366920938463463374607431768211456"},"text":"x","id":"0123456789abcdef0123456789abcdef","choice":"B","nested":[{"None":null},{"Some":{"Ok":5}},{"Some":{"Err":[true,false]}}]});
    let logical = Logical {
        version: 4,
        tables: vec![
            vec![(json!("a"), value.clone()), (json!("b"), value)],
            vec![(json!("000000000000000000000000000000ff"), json!(9))],
        ],
        outbox: vec![
            snapshot_wire::Event {
                commit: 1,
                position: 0,
                channel: 0,
                value: json!({"Int":"7"}),
            },
            snapshot_wire::Event {
                commit: 4,
                position: 2,
                channel: 1,
                value: json!([null, null, null]),
            },
        ],
    };
    seeds.push(Seed::binary(
        snapshot_wire::encode(&layout, &logical, Limits::default()).unwrap(),
        SnapshotSeed {
            layout,
            program: None,
        },
    ));
    seeds
}

/// Portable snapshots (`snapshot_wire::decode`, `Runtime::restore_portable`).
#[test]
fn fuzz_snapshots() {
    let s = settings();
    if s.only.as_ref().is_some_and(|(t, _)| t != "snapshot") {
        return;
    }
    let seeds = snapshot_seeds();
    fuzz(
        "snapshot",
        3000,
        &seeds,
        |rng, seed| {
            let mut bytes = seed.bytes.clone();
            for _ in 0..1 + rng.below(3) {
                let len = bytes.len();
                match rng.below(6) {
                    0 | 1 if len >= 8 => {
                        let at = 84 + rng.below(len.saturating_sub(84 + 32 + 8).max(1));
                        let at = at.min(len - 8);
                        let value = *rng.pick(&[
                            0u64,
                            1,
                            2,
                            3,
                            7,
                            255,
                            256,
                            1 << 20,
                            1 << 31,
                            u32::MAX as u64,
                            1 << 32,
                            1 << 40,
                            u64::MAX / 2,
                            u64::MAX - 1,
                            u64::MAX,
                        ]);
                        bytes[at..at + 8].copy_from_slice(&value.to_le_bytes());
                    }
                    2 if len >= 4 => {
                        let at = rng.below(len - 3);
                        let value = *rng.pick(&[0u32, 1, 2, 3, 255, 65536, u32::MAX]);
                        bytes[at..at + 4].copy_from_slice(&value.to_le_bytes());
                    }
                    3 if len > 120 => {
                        // Grow the payload with a copied chunk.
                        let a = 84 + rng.below(len - 116);
                        let b = (a + 1 + rng.below(256)).min(len - 32);
                        let chunk = bytes[a..b].repeat([1, 2, 1000][rng.below(3)]);
                        let at = 84 + rng.below(len - 116);
                        bytes.splice(at..at, chunk);
                    }
                    _ => mutate_bytes(rng, &mut bytes, 1),
                }
            }
            if !rng.one_in(6) {
                reseal(&mut bytes);
            }
            bytes
        },
        |seed, bytes| {
            let tight = Limits {
                bytes: 1 << 20,
                values: 2000,
                depth: 6,
            };
            let _ = snapshot_wire::decode(&seed.data.layout, bytes, tight);
            let decoded = snapshot_wire::decode(&seed.data.layout, bytes, Limits::default())?;
            // Accepted bytes are canonical: re-encoding reproduces them.
            assert_eq!(
                snapshot_wire::encode(&seed.data.layout, &decoded, Limits::default()).as_deref(),
                Ok(bytes),
                "decoded snapshot does not re-encode to its bytes"
            );
            if let Some(program) = &seed.data.program {
                Runtime::restore_portable(program.clone(), bytes)?;
            }
            Ok(())
        },
    );
}

fn core_programs() -> Vec<syntax::Program> {
    let mut sources = Vec::new();
    for dir in [root().join("examples"), knowledge_dir()] {
        let mut stack = vec![dir];
        while let Some(dir) = stack.pop() {
            for entry in fs::read_dir(&dir).into_iter().flatten().flatten() {
                let path = entry.path();
                if path.is_dir() && path.file_name().is_some_and(|n| n != "objects") {
                    stack.push(path);
                } else if path.extension().is_some_and(|e| e == "ink" || e == "lang") {
                    sources.push(path);
                }
            }
        }
    }
    sources.sort();
    sources
        .iter()
        .filter_map(|p| syntax::parse(&String::from_utf8(read(p)).ok()?).ok())
        .filter(|p| CheckedModule::from_source(p.clone()).is_ok())
        .collect()
}
fn arguments_for(
    params: &[(String, Type)],
    p: &syntax::Program,
    n: u64,
) -> Option<Vec<eval::Value>> {
    fn value(t: &Type, p: &syntax::Program, n: u64, depth: usize) -> Option<eval::Value> {
        if depth > 32 {
            return None;
        }
        Some(match t {
            Type::U64 => eval::Value::U64(n.wrapping_mul(7)),
            Type::U32 => eval::Value::U32((n as u32).wrapping_mul(7)),
            Type::I32 => eval::Value::I32((n as i32).wrapping_mul(-7)),
            Type::F32 => eval::Value::F32(((n as f32) * 0.25).to_bits()),
            Type::Bool => eval::Value::Bool(n % 2 == 0),
            Type::Vector(t, k) => eval::Value::Vector(
                (0..*k)
                    .map(|i| value(t, p, n.wrapping_add(i as u64), depth + 1))
                    .collect::<Option<Vec<_>>>()?,
            ),
            Type::List(t) => eval::Value::List(
                (0..n % 9)
                    .map(|i| value(t, p, i.wrapping_mul(n), depth + 1))
                    .collect::<Option<Vec<_>>>()?,
            ),
            Type::Named(name) => eval::Value::Record(
                name.clone(),
                p.records
                    .get(name)?
                    .iter()
                    .map(|(name, t)| Some((name.clone(), value(t, p, n, depth + 1)?)))
                    .collect::<Option<BTreeMap<_, _>>>()?,
            ),
            _ => return None,
        })
    }
    params.iter().map(|(_, t)| value(t, p, n, 0)).collect()
}

/// Versioned executable core modules (`CheckedModule::from_bytes`, which runs
/// structural bounds, `check`, `statecheck`), then layout and evaluation.
#[test]
fn fuzz_core_modules() {
    let s = settings();
    if s.only.as_ref().is_some_and(|(t, _)| t != "core") {
        return;
    }
    let seeds: Vec<_> = core_programs()
        .into_iter()
        .map(|p| Seed::json(CheckedModule::from_source(p).unwrap().bytes().unwrap(), ()))
        .collect();
    fuzz(
        "core",
        700,
        &seeds,
        |rng, seed| mutate_json(rng, seed.json.as_ref().unwrap(), &seed.bytes),
        |_, bytes| {
            let module = CheckedModule::from_bytes(bytes)?;
            let p = module.program();
            if !p.states.is_empty() {
                snapshot::layout(p)?;
            }
            if module.pure_program().is_ok() {
                for f in &p.functions {
                    for n in [0, 3, 1 << 40] {
                        if let Some(args) = arguments_for(&f.params, p, n) {
                            let _ = eval::call(p, &f.name, args, &mut 1_000_000);
                        }
                    }
                }
            }
            Ok(())
        },
    );
}

/// The reference interpreter on untrusted JSON arguments
/// (`eval::Value::from_json`, `eval::call`), as the `run` command uses it.
#[test]
fn fuzz_evaluation_arguments() {
    let s = settings();
    if s.only.as_ref().is_some_and(|(t, _)| t != "eval") {
        return;
    }
    let mut seeds = Vec::new();
    for p in core_programs() {
        if CheckedModule::from_source(p.clone())
            .unwrap()
            .pure_program()
            .is_err()
        {
            continue;
        }
        for f in &p.functions {
            let Some(args) = arguments_for(&f.params, &p, 5) else {
                continue;
            };
            let json = Json::Array(args.iter().map(eval::Value::json).collect());
            seeds.push(Seed::json(
                serde_json::to_vec(&json).unwrap(),
                (p.clone(), f.name.clone()),
            ));
        }
    }
    fuzz(
        "eval",
        600,
        &seeds,
        |rng, seed| mutate_json(rng, seed.json.as_ref().unwrap(), &seed.bytes),
        |seed, bytes| {
            let (p, name) = &seed.data;
            let json: Json = serde_json::from_slice(bytes).map_err(|e| e.to_string())?;
            let values = json.as_array().ok_or("arguments must be an array")?;
            let f = p.functions.iter().find(|f| &f.name == name).unwrap();
            if values.len() != f.params.len() {
                return Err("argument count mismatch".into());
            }
            let args = values
                .iter()
                .zip(&f.params)
                .map(|(v, (_, t))| eval::Value::from_program_json(v, t, p))
                .collect::<Result<Vec<_>, _>>()?;
            eval::call(p, name, args, &mut 20_000_000).map(|_| ())
        },
    );
}
