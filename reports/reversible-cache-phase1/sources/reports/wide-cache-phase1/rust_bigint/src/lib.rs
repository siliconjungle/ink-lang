use std::collections::BTreeMap;
use num_bigint::BigInt;
use serde_json::json;
// Shared native ABI and input construction; JSON/decimal observations are
// outside timing. Only source-generated actions execute in the Ink variants.
use std::ffi::{c_char,CString};
#[cfg(feature="baseline")] struct HandState {rows:BTreeMap<u64,BigInt>,total:BigInt,version:u64}
#[cfg(feature="baseline")] type Application=HandState;
#[cfg(not(feature="baseline"))] type Application=State;
struct WideBench {state:Application,values:Vec<BigInt>}
fn inputs(bits:u32,wide:bool)->(BigInt,Vec<BigInt>){
    let anchor=BigInt::from(1u32)<<bits as usize;
    let values=(0..32u32).map(|i|{
        let small=BigInt::from(i*37+11);
        let value=if wide {&anchor+small} else {small};
        if i%2==0 {value} else {-value}
    }).collect();(anchor,values)
}
#[no_mangle] pub extern "C" fn wide_new(bits:u32,profile:u32)->*mut WideBench {
    assert!((1..=16384).contains(&bits)&&profile<=1);
    let(anchor,values)=inputs(bits,profile==1);
    #[cfg(feature="baseline")] let state=HandState {rows:BTreeMap::from([(0,anchor.clone()),(1,BigInt::from(0))]),total:anchor,version:2};
    #[cfg(not(feature="baseline"))] let state={
        let mut state=State::new();assert!(state.invoke_l_put(0,anchor).unwrap().result.is_ok());
        assert!(state.invoke_l_put(1,BigInt::from(0)).unwrap().result.is_ok());state
    };
    Box::into_raw(Box::new(WideBench {state,values}))
}
#[no_mangle] pub unsafe extern "C" fn wide_free(ptr:*mut WideBench){drop(Box::from_raw(ptr));}
#[no_mangle] pub unsafe extern "C" fn wide_set(ptr:*mut WideBench,index:u32)->u32 {
    let bench=&mut *ptr;let value=bench.values[index as usize%32].clone();let state=&mut bench.state;
    #[cfg(feature="baseline")] {
        let Some(version)=state.version.checked_add(1) else {return 4};
        let Some(old)=state.rows.get_mut(&1) else {return 1};
        // Handwritten baseline uses the same delta-first arithmetic, updating
        // the total in place and validating before mutation.
        state.total+=&value-&*old;*old=value;state.version=version;0
    }
    #[cfg(not(feature="baseline"))] {
        match state.invoke_l_set(value) {Ok(out)=>if out.result.is_ok(){0}else{1},Err(_)=>4}
    }
}
fn digest(value:&BigInt)->u64 {
    let(sign,digits)=value.to_u64_digits();let mut h=if sign==num_bigint::Sign::Minus {1u64}else{0};
    for n in digits {h=h.wrapping_mul(1099511628211)^n;}h
}
#[no_mangle] pub unsafe extern "C" fn wide_query(ptr:*mut WideBench)->u64 {
    let state=&mut (*ptr).state;
    #[cfg(feature="baseline")] {digest(&state.total)}
    #[cfg(not(feature="baseline"))] {digest(&state.invoke_l_total().unwrap().result)}
}
#[no_mangle] pub unsafe extern "C" fn wide_observe(ptr:*mut WideBench)->*mut c_char {
    let state=&mut (*ptr).state;
    #[cfg(feature="baseline")] let observation=json!({"version":state.version,"rows":[state.rows[&0].to_string(),state.rows[&1].to_string()],"total":state.total.to_string()});
    #[cfg(not(feature="baseline"))] let observation=json!({"version":state.version(),"rows":[state.l_Rows[&0].l_value.to_string(),state.l_Rows[&1].l_value.to_string()],"total":state.invoke_l_total().unwrap().result.to_string()});
    CString::new(observation.to_string()).unwrap().into_raw()
}
#[no_mangle] pub unsafe extern "C" fn wide_string_free(ptr:*mut c_char){drop(CString::from_raw(ptr));}
