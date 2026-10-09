// Separate, instrumented binaries only. Counts requested implementation bytes,
// not allocator metadata, RSS, temporary realloc overlap or host-driver memory.
mod allocation_probe {
    use std::alloc::{GlobalAlloc, Layout, System};
    use std::sync::atomic::{AtomicU64, Ordering::Relaxed};
    static CALLS: AtomicU64 = AtomicU64::new(0);
    static RESIZES: AtomicU64 = AtomicU64::new(0);
    static REQUESTED: AtomicU64 = AtomicU64::new(0);
    static LIVE: AtomicU64 = AtomicU64::new(0);
    static PEAK: AtomicU64 = AtomicU64::new(0);
    fn add(bytes: usize) {
        CALLS.fetch_add(1, Relaxed);
        REQUESTED.fetch_add(bytes as u64, Relaxed);
        let live = LIVE.fetch_add(bytes as u64, Relaxed) + bytes as u64;
        PEAK.fetch_max(live, Relaxed);
    }
    struct Probe;
    unsafe impl GlobalAlloc for Probe {
        unsafe fn alloc(&self, layout: Layout) -> *mut u8 {
            let p = System.alloc(layout);
            if !p.is_null() { add(layout.size()); }
            p
        }
        unsafe fn alloc_zeroed(&self, layout: Layout) -> *mut u8 {
            let p = System.alloc_zeroed(layout);
            if !p.is_null() { add(layout.size()); }
            p
        }
        unsafe fn dealloc(&self, p: *mut u8, layout: Layout) {
            LIVE.fetch_sub(layout.size() as u64, Relaxed);
            System.dealloc(p, layout);
        }
        unsafe fn realloc(&self, p: *mut u8, layout: Layout, size: usize) -> *mut u8 {
            let q = System.realloc(p, layout, size);
            if !q.is_null() {
                LIVE.fetch_sub(layout.size() as u64, Relaxed);
                RESIZES.fetch_add(1, Relaxed);
                add(size);
            }
            q
        }
    }
    #[global_allocator] static ALLOCATOR: Probe = Probe;
    #[repr(C)] pub struct Stats { calls: u64, resizes: u64, requested: u64, live: u64, peak: u64 }
    #[no_mangle] pub extern "C" fn st_probe_reset() {
        assert_eq!(LIVE.load(Relaxed), 0, "probe reset with live allocations");
        for counter in [&CALLS, &RESIZES, &REQUESTED, &PEAK] { counter.store(0, Relaxed); }
    }
    #[no_mangle] pub unsafe extern "C" fn st_probe_stats(out: *mut Stats) {
        *out = Stats { calls: CALLS.load(Relaxed), resizes: RESIZES.load(Relaxed),
            requested: REQUESTED.load(Relaxed), live: LIVE.load(Relaxed), peak: PEAK.load(Relaxed) };
    }
}
