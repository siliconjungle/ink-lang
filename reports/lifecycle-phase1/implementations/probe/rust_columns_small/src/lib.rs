mod ordered_storage; use ordered_storage::OrderedStorage;
#[cfg(feature="bigint")] use num_bigint::BigInt;
#[cfg(feature="bigint")] type Total=BigInt;
#[cfg(not(feature="bigint"))] type Total=u128;
struct Event {commit:u64,position:u64,key:u64,before:u32,after:u32}
pub struct State {rows:OrderedStorage<u64,u32>,events:Vec<Event>,version:u64,total:Total}
#[no_mangle] pub extern "C" fn st_new(n:u64)->*mut State {
 let mut s=State{rows:OrderedStorage::columns(Some(256)),events:vec![],version:n,total:Total::from(0u32)};
 for i in 0..n{s.rows.insert(i,(i%10) as u32);s.total+=Total::from((i%10) as u32);}
 Box::into_raw(Box::new(s))
}
#[no_mangle] pub unsafe extern "C" fn st_free(s:*mut State){drop(Box::from_raw(s));}
#[no_mangle] pub unsafe extern "C" fn st_apply(s:*mut State,op:u32,key:u64,value:u32)->u32{
 let s=&mut *s;
 if op==3{return if s.rows.contains_key(&key){3}else{1}}
 match op {
  0=>{if s.rows.contains_key(&key){return 2}s.rows.insert(key,value);s.total+=Total::from(value);},
  1=>{let Some(old)=s.rows.get_mut(&key)else{return 1};let Some(next)=old.checked_add(value)else{return 3};s.events.push(Event{commit:s.version+1,position:0,key,before:*old,after:next});*old=next;s.total+=Total::from(value);},
  2=>{if let Some(old)=s.rows.remove(&key){s.total-=Total::from(old);}},
  _=>std::process::abort()
 }s.version+=1;0
}
#[no_mangle] pub unsafe extern "C" fn st_stock(s:*mut State,key:u64,found:*mut u32)->u32{match (*s).rows.get(&key){Some(v)=>{*found=1;*v},None=>{*found=0;0}}}
#[no_mangle] pub unsafe extern "C" fn st_total(s:*mut State,lo:*mut u64,hi:*mut u64){
 #[cfg(feature="bigint")] {let(sign,digits)=(*s).total.to_u64_digits();assert!(sign!=num_bigint::Sign::Minus&&digits.len()<=2);*lo=digits.first().copied().unwrap_or(0);*hi=digits.get(1).copied().unwrap_or(0);}
 #[cfg(not(feature="bigint"))] {*lo=(*s).total as u64;*hi=((*s).total>>64) as u64;}
}
#[no_mangle] pub unsafe extern "C" fn st_version(s:*mut State)->u64{(*s).version}
#[no_mangle] pub unsafe extern "C" fn st_event_count(s:*mut State)->u64{(*s).events.len() as u64}
#[no_mangle] pub unsafe extern "C" fn st_event_hash(s:*mut State)->u64{let mut hash=0u64;for e in &(*s).events{for x in [e.commit,e.position,e.key,e.before as u64,e.after as u64]{hash=hash.wrapping_mul(1099511628211)^x;}}hash}

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
