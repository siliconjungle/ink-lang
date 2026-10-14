#[path="../lib.rs"] mod treatment;
use treatment::{State,Wire,CHANGE_TYPE};
use diamond_types::list::ListOpLog;
use diamond_types::causalgraph::agent_assignment::remote_ids::RemoteVersion;
use serde_json::{Value,json};
use std::{collections::BTreeMap,hint::black_box,time::Instant};
CONTROL_IMPORT
// Compile this observer into a separate diagnostic build only. Normal timing
// builds have no allocator wrapper or counter branch. Counts cover requested
// allocation bytes during the call and output destruction, excluding inputs;
// they measure allocation pressure, not peak resident memory.
#[cfg(feature="allocation-probe")]
mod allocation_probe {
    use std::alloc::{GlobalAlloc,Layout,System};
    use std::sync::atomic::{AtomicBool,AtomicU64,Ordering::Relaxed};
    struct Observer;
    #[global_allocator] static ALLOCATOR:Observer=Observer;
    static ACTIVE:AtomicBool=AtomicBool::new(false);
    static COUNT:AtomicU64=AtomicU64::new(0);
    static BYTES:AtomicU64=AtomicU64::new(0);
    // Fixed counters never allocate while observation is active. Small requests
    // use eight-byte bins; larger requests use power-of-two upper bounds.
    const BINS:usize=65+usize::BITS as usize-9;
    static BIN_COUNTS:[AtomicU64;BINS]=[const{AtomicU64::new(0)};BINS];
    static BIN_BYTES:[AtomicU64;BINS]=[const{AtomicU64::new(0)};BINS];
    fn bucket(bytes:usize)->usize{
        if bytes<=512{bytes.div_ceil(8)}else{
            65+(usize::BITS-(bytes-1).leading_zeros())as usize-10
        }
    }
    fn upper_bound(index:usize)->usize{
        if index<=64{index*8}else{
            1usize.checked_shl((index-65+10)as u32).unwrap_or(usize::MAX)
        }
    }
    fn requested(bytes:usize){if ACTIVE.load(Relaxed){
        COUNT.fetch_add(1,Relaxed);BYTES.fetch_add(bytes as u64,Relaxed);
        let index=bucket(bytes);
        BIN_COUNTS[index].fetch_add(1,Relaxed);BIN_BYTES[index].fetch_add(bytes as u64,Relaxed);
    }}
    unsafe impl GlobalAlloc for Observer {
        unsafe fn alloc(&self,l:Layout)->*mut u8{requested(l.size());unsafe{System.alloc(l)}}
        unsafe fn alloc_zeroed(&self,l:Layout)->*mut u8{requested(l.size());unsafe{System.alloc_zeroed(l)}}
        unsafe fn dealloc(&self,p:*mut u8,l:Layout){unsafe{System.dealloc(p,l)}}
        unsafe fn realloc(&self,p:*mut u8,l:Layout,n:usize)->*mut u8{requested(n);unsafe{System.realloc(p,l,n)}}
    }
    pub fn measure(f:impl FnOnce()->Vec<u32>)->serde_json::Value{
        COUNT.store(0,Relaxed);BYTES.store(0,Relaxed);
        for counter in BIN_COUNTS.iter().chain(BIN_BYTES.iter()){counter.store(0,Relaxed);}
        ACTIVE.store(true,Relaxed);
        drop(std::hint::black_box(f()));ACTIVE.store(false,Relaxed);
        let sizes:Vec<_>=(0..BINS).filter_map(|i|{
            let count=BIN_COUNTS[i].load(Relaxed);
            (count!=0).then(||serde_json::json!({"size_upper_bound":upper_bound(i),
                "requests":count,"requested_bytes":BIN_BYTES[i].load(Relaxed)}))
        }).collect();
        serde_json::json!({"requests":COUNT.load(Relaxed),"requested_bytes":BYTES.load(Relaxed),"size_buckets":sizes})
    }
    #[test]
    fn requested_sizes_exclude_observer_output_and_prepared_inputs(){
        let prepared=vec![7u32;64];
        let result=measure(||{
            let mut values=Vec::with_capacity(8);
            values.push(std::hint::black_box(prepared[0]));values
        });
        assert_eq!(result["requests"],1);
        assert_eq!(result["requested_bytes"],32);
        assert_eq!(result["size_buckets"],serde_json::json!([
            {"size_upper_bound":32,"requests":1,"requested_bytes":32}]));
    }
    #[test]
    fn size_bucket_boundaries_cover_large_requests_without_overflow(){
        for size in [0,1,8,9,511,512,513,1024,1025,usize::MAX]{
            let i=bucket(size);assert!(i<BINS);assert!(upper_bound(i)>=size);
            if i>0{assert!(upper_bound(i-1)<size);}
        }
    }
}
struct Change{id:u64,parents:Vec<u64>,position:usize,remove:usize,text:String}
fn diamond(changes:&[Change])->Vec<u32>{
    let mut log=ListOpLog::new();let mut agents=BTreeMap::new();
    for c in changes {
        let actor=c.id>>32;
        let agent=*agents.entry(actor).or_insert_with(||log.get_or_create_agent_id(&format!("{actor:010}")));
        let mut parents:Vec<usize>=c.parents.iter().map(|id|{
            let name=log.get_agent_name(agents[&(id>>32)]);
            log.cg.agent_assignment.remote_to_local_version(RemoteVersion(name,((id&0xffffffff)-1)as usize))
        }).collect();
        parents.sort_unstable();
        if c.remove>0{let end=log.add_delete_at(agent,&parents,c.position..c.position+c.remove);parents=vec![end];}
        if !c.text.is_empty(){log.add_insert_at(agent,&parents,c.position,&c.text);}
    }
    log.checkout_tip().content().to_string().chars().map(|c|c as u32).collect()
}
fn main(){
    let cases:Value=serde_json::from_slice(&std::fs::read(std::env::args().nth(1).unwrap()).unwrap()).unwrap();
    let rounds:usize=std::env::var("INK_BATCH_ROUNDS").unwrap_or("11".into()).parse().unwrap();
    let state=State::new();
    CONTROL_SETUP
    for case in cases.as_array().unwrap(){
        let changes:Vec<CHANGE_TYPE>=Wire::from_json(&case["changes"]).unwrap();
        let upstream:Vec<Change>=case["changes"].as_array().unwrap().iter().map(|c|Change{
            id:c["id"].as_u64().unwrap(),
            parents:c["parents"].as_array().unwrap().iter().map(|v|v.as_u64().unwrap()).collect(),
            position:c["position"].as_u64().unwrap()as usize,
            remove:c["remove"].as_u64().unwrap()as usize,
            text:c["text"].as_array().unwrap().iter().map(|v|char::from_u32(v.as_u64().unwrap()as u32).unwrap()).collect()
        }).collect();
        let want=diamond(&upstream);
        if let Some(expected)=case["expected"].as_array(){
            assert_eq!(want,expected.iter().map(|v|v.as_u64().unwrap()as u32).collect::<Vec<_>>(),"DT {}",case["name"]);
        }
        assert_eq!(state.function_l_materialize(changes.clone()).unwrap(),want,"Ink {}",case["name"]);
        CONTROL_INPUT
        let names=VARIANT_NAMES;
        let mut samples=vec![vec![];names.len()];
        for round in 0..rounds+2{
            for i in 0..names.len(){
                let variant=(round+i)%names.len();
                let input=if variant==0{Some(changes.clone())}else{None};
                CONTROL_CLONE
                let started=Instant::now();
                let out=match variant{
                    0=>state.function_l_materialize(black_box(input.unwrap())).unwrap(),
                    CONTROL_CALL
                    _=>diamond(black_box(&upstream)),
                };
                // Include destruction of the returned document for every variant.
                drop(black_box(out));
                let ns=started.elapsed().as_nanos()as u64;
                if round>=2{samples[variant].push(ns);}
            }
        }
        #[cfg(feature="allocation-probe")]
        let probes:Vec<Value>=(0..names.len()).map(|variant|{
            let input=if variant==0{Some(changes.clone())}else{None};
            CONTROL_CLONE
            allocation_probe::measure(||match variant{
                0=>state.function_l_materialize(input.unwrap()).unwrap(),
                CONTROL_CALL
                _=>diamond(&upstream),
            })
        }).collect();
        for variant in 0..names.len(){
            #[allow(unused_mut)]
            let mut row=json!({"case":case["name"],"variant":names[variant],"changes":changes.len(),"output_codepoints":want.len(),"samples_ns":samples[variant]});
            #[cfg(feature="allocation-probe")]
            {row["allocation_requests"]=probes[variant].clone();}
            println!("{}",row);
        }
    }
}
