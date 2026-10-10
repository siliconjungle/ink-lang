use compiled_state::State;
use serde_json::json;
use std::{hint::black_box, time::Instant};
#[cfg(feature = "allocation-probe")]
mod probe {
    use std::alloc::{GlobalAlloc, Layout, System};
    use std::sync::atomic::{AtomicU64, Ordering::Relaxed};
    static CALLS: AtomicU64 = AtomicU64::new(0);
    static BYTES: AtomicU64 = AtomicU64::new(0);
    static LIVE: AtomicU64 = AtomicU64::new(0);
    static PEAK: AtomicU64 = AtomicU64::new(0);
    struct Probe;
    fn add(n: usize) {
        CALLS.fetch_add(1, Relaxed);
        BYTES.fetch_add(n as u64, Relaxed);
        PEAK.fetch_max(LIVE.fetch_add(n as u64, Relaxed) + n as u64, Relaxed);
    }
    unsafe impl GlobalAlloc for Probe {
        unsafe fn alloc(&self, l: Layout) -> *mut u8 {
            let p = System.alloc(l);
            if !p.is_null() {
                add(l.size());
            }
            p
        }
        unsafe fn alloc_zeroed(&self, l: Layout) -> *mut u8 {
            let p = System.alloc_zeroed(l);
            if !p.is_null() {
                add(l.size());
            }
            p
        }
        unsafe fn dealloc(&self, p: *mut u8, l: Layout) {
            LIVE.fetch_sub(l.size() as u64, Relaxed);
            System.dealloc(p, l);
        }
        unsafe fn realloc(&self, p: *mut u8, l: Layout, n: usize) -> *mut u8 {
            let q = System.realloc(p, l, n);
            if !q.is_null() {
                LIVE.fetch_sub(l.size() as u64, Relaxed);
                add(n);
            }
            q
        }
    }
    #[global_allocator]
    static ALLOCATOR: Probe = Probe;
    pub fn reset() {
        CALLS.store(0, Relaxed);
        BYTES.store(0, Relaxed);
        PEAK.store(LIVE.load(Relaxed), Relaxed);
    }
    pub fn stats() -> [u64; 4] {
        [
            CALLS.load(Relaxed),
            BYTES.load(Relaxed),
            PEAK.load(Relaxed),
            LIVE.load(Relaxed),
        ]
    }
}
fn main() {
    let args: Vec<String> = std::env::args().collect();
    let n: u32 = args[1].parse().unwrap();
    let calls: u64 = args[2].parse().unwrap();
    let lifecycle = args[3] == "lifecycle";
    let inputs = json!([3]);
    let function = format!("accumulate_{n}");
    let expected = (u64::from(n) * u64::from(n.saturating_sub(1)) / 2 + 3) as u32;
    let mut state = State::new();
    assert_eq!(
        state.call_json(&function, &inputs).unwrap(),
        json!(expected)
    );
    #[cfg(feature = "allocation-probe")]
    probe::reset();
    let begin = Instant::now();
    for _ in 0..calls {
        if lifecycle {
            let mut s = State::new();
            let result = s
                .call_json(black_box(function.as_str()), black_box(&inputs))
                .unwrap();
            assert_eq!(black_box(result), json!(expected));
        } else {
            let result = state
                .call_json(black_box(function.as_str()), black_box(&inputs))
                .unwrap();
            assert_eq!(black_box(result), json!(expected));
        }
    }
    let elapsed = begin.elapsed().as_secs_f64() * 1000.0;
    #[cfg(feature = "allocation-probe")]
    let stats = Some(probe::stats());
    #[cfg(not(feature = "allocation-probe"))]
    let stats: Option<[u64; 4]> = None;
    println!(
        "{}",
        json!({"elapsed_ms":elapsed,"calls":calls,"result":expected,"allocations_requested_peak_live":stats})
    );
}
