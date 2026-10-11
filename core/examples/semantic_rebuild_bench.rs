//! Reproduce old whole-parent cloning versus the current generic substitution.
//! Run with: cargo run --release --example semantic_rebuild_bench
use ink_core::{
    core::Type,
    semantic::{self as s, Budget, Node, Term},
};
use std::{
    alloc::{GlobalAlloc, Layout, System},
    collections::BTreeMap,
    hint::black_box,
    sync::atomic::{AtomicUsize, Ordering},
    time::Instant,
};
struct Counted;
static ALLOCATIONS: AtomicUsize = AtomicUsize::new(0);
unsafe impl GlobalAlloc for Counted {
    unsafe fn alloc(&self, l: Layout) -> *mut u8 {
        ALLOCATIONS.fetch_add(1, Ordering::Relaxed);
        System.alloc(l)
    }
    unsafe fn dealloc(&self, p: *mut u8, l: Layout) {
        System.dealloc(p, l)
    }
    unsafe fn realloc(&self, p: *mut u8, l: Layout, n: usize) -> *mut u8 {
        ALLOCATIONS.fetch_add(1, Ordering::Relaxed);
        System.realloc(p, l, n)
    }
}
#[global_allocator]
static ALLOCATOR: Counted = Counted;
fn old(t: &Term, b: &mut Budget) -> Term {
    b.step(0).unwrap();
    let mut out = t.clone();
    for (i, c) in s::children(t).into_iter().enumerate() {
        out = s::replace_child(&out, i, old(c, b)).unwrap();
    }
    out
}
fn measure(t: &Term, new: bool) -> (u128, usize, usize) {
    let args = BTreeMap::new();
    let mut b = Budget::new();
    let before = ALLOCATIONS.load(Ordering::Relaxed);
    let start = Instant::now();
    let result = if new {
        s::substitute(t, &args, &mut b).unwrap()
    } else {
        old(t, &mut b)
    };
    let elapsed = start.elapsed().as_nanos();
    let allocations = ALLOCATIONS.load(Ordering::Relaxed) - before;
    assert_eq!(black_box(&result), t);
    (elapsed, allocations, 500000 - b.remaining)
}
fn main() {
    for width in [32, 64, 128] {
        let branch = (0..16).fold(s::word(Type::U32, 0), |acc, i| {
            s::op(
                s::value(Type::U32),
                "binary:+",
                vec![acc, s::word(Type::U32, i)],
            )
        });
        let tree = s::term(
            s::value(Type::U32),
            Node::Op("call:wide".into(), vec![branch; width]),
        );
        let mut baseline = vec![];
        let mut current = vec![];
        for _ in 0..9 {
            baseline.push(measure(&tree, false));
            current.push(measure(&tree, true));
        }
        assert_eq!(baseline[0].2, current[0].2);
        baseline.sort();
        current.sort();
        println!(
            "{}",
            serde_json::json!({"width":width,"branch_depth":16,"samples":9,"baseline_median_ns":baseline[4].0,"single_pass_median_ns":current[4].0,"baseline_allocations":baseline[4].1,"single_pass_allocations":current[4].1,"proof_work":current[4].2})
        );
    }
}
