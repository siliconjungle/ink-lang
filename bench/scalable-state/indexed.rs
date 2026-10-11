include!("../../native-support/src/indexed-table.rs.txt");
use std::alloc::{GlobalAlloc, Layout, System};
use std::sync::atomic::{AtomicUsize, Ordering};
use std::{collections::BTreeMap, hint::black_box, time::Instant};
struct CountAlloc;
static LIVE: AtomicUsize = AtomicUsize::new(0);
static PEAK: AtomicUsize = AtomicUsize::new(0);
unsafe impl GlobalAlloc for CountAlloc {
    unsafe fn alloc(&self, l: Layout) -> *mut u8 {
        let p = System.alloc(l);
        if !p.is_null() {
            let n = LIVE.fetch_add(l.size(), Ordering::Relaxed) + l.size();
            PEAK.fetch_max(n, Ordering::Relaxed);
        }
        p
    }
    unsafe fn dealloc(&self, p: *mut u8, l: Layout) {
        System.dealloc(p, l);
        LIVE.fetch_sub(l.size(), Ordering::Relaxed);
    }
    unsafe fn realloc(&self, p: *mut u8, l: Layout, n: usize) -> *mut u8 {
        let out = System.realloc(p, l, n);
        if !out.is_null() {
            let live = if n >= l.size() {
                LIVE.fetch_add(n - l.size(), Ordering::Relaxed) + n - l.size()
            } else {
                LIVE.fetch_sub(l.size() - n, Ordering::Relaxed) - (l.size() - n)
            };
            PEAK.fetch_max(live, Ordering::Relaxed);
        }
        out
    }
}
#[cfg(feature = "allocation_profile")]
#[global_allocator]
static ALLOCATOR: CountAlloc = CountAlloc;
fn elapsed(f: impl FnOnce()) -> u128 {
    let t = Instant::now();
    f();
    t.elapsed().as_nanos()
}
fn run<const W: usize>(n: u64) {
    let mut tree = BTreeMap::new();
    let mut slots = InkTable::new();
    let tbase = LIVE.load(Ordering::Relaxed);
    PEAK.store(tbase, Ordering::Relaxed);
    let tc = elapsed(|| {
        for k in 0..n {
            tree.insert(k, [k; W]);
        }
    });
    let tbytes = LIVE.load(Ordering::Relaxed) - tbase;
    let tpeak = PEAK.load(Ordering::Relaxed) - tbase;
    let sbase = LIVE.load(Ordering::Relaxed);
    PEAK.store(sbase, Ordering::Relaxed);
    let sc = elapsed(|| {
        for k in 0..n {
            slots.insert(k, [k; W]);
        }
    });
    let sbytes = LIVE.load(Ordering::Relaxed) - sbase;
    let speak = PEAK.load(Ordering::Relaxed) - sbase;
    let tm = elapsed(|| {
        for k in 0..10000 {
            let key = (k * 7919) % n;
            black_box(tree.insert(key, [k; W]));
        }
    });
    let sm = elapsed(|| {
        for k in 0..10000 {
            let key = (k * 7919) % n;
            black_box(slots.insert(key, [k; W]));
        }
    });
    let ts = elapsed(|| {
        for _ in 0..20 {
            black_box(tree.values().map(|v| v[0]).fold(0u64, u64::wrapping_add));
        }
    });
    let ss = elapsed(|| {
        for _ in 0..20 {
            black_box(slots.values().map(|v| v[0]).fold(0u64, u64::wrapping_add));
        }
    });
    let ds = elapsed(|| {
        for _ in 0..20 {
            black_box(
                slots
                    .dense_values()
                    .map(|v| v[0])
                    .fold(0u64, u64::wrapping_add),
            );
        }
    });
    let tr = elapsed(|| {
        for k in 0..10000 {
            let key = (k * 7919) % n;
            let old = tree.remove(&key).unwrap();
            tree.insert(key, old);
        }
    });
    let sr = elapsed(|| {
        for k in 0..10000 {
            let key = (k * 7919) % n;
            let old = slots.remove(&key).unwrap();
            slots.insert(key, old);
        }
    });
    assert!(tree.iter().eq(slots.iter()));
    let bytes = |n: usize| {
        if cfg!(feature = "allocation_profile") {
            n.to_string()
        } else {
            "null".into()
        }
    };
    let (tbytes, tpeak, sbytes, speak) = (bytes(tbytes), bytes(tpeak), bytes(sbytes), bytes(speak));
    let profile = cfg!(feature = "allocation_profile");
    println!("{{\"allocation_profile\":{profile},\"rows\":{n},\"payload_words\":{W},\"tree\":{{\"retained_bytes\":{tbytes},\"construct_peak_bytes\":{tpeak},\"construct_ns\":{tc},\"replace_ns\":{tm},\"ordered_scan_ns\":{ts},\"churn_ns\":{tr}}},\"slots\":{{\"retained_bytes\":{sbytes},\"construct_peak_bytes\":{speak},\"construct_ns\":{sc},\"replace_ns\":{sm},\"ordered_scan_ns\":{ss},\"dense_scan_ns\":{ds},\"churn_ns\":{sr}}}}} ");
}
fn main() {
    for _ in 0..5 {
        for n in [1024, 100000] {
            run::<1>(n);
            run::<32>(n);
        }
    }
}
