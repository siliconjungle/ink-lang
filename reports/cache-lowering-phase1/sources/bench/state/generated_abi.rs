// App-specific benchmark ABI. All program behaviour calls generated methods.
#[no_mangle] pub extern "C" fn st_new(rows:u64)->*mut State {
    let mut state=State::new();
    for key in 0..rows {assert!(state.invoke_l_create(key,(key%10) as u32).unwrap().result.is_ok());}
    Box::into_raw(Box::new(state))
}
#[no_mangle] pub unsafe extern "C" fn st_free(s:*mut State){drop(Box::from_raw(s));}
#[no_mangle] pub unsafe extern "C" fn st_apply(s:*mut State,op:u32,key:u64,value:u32)->u32{
    let s=&mut *s;
    let out=match op {0=>s.invoke_l_create(key,value),1=>s.invoke_l_restock(key,value),2=>s.invoke_l_remove(key),3=>s.invoke_l_fail(key),_=>std::process::abort()}.unwrap();
    match out.result {Ok(())=>0,Err(l_Error::l_Missing)=>1,Err(l_Error::l_Exists)=>2,Err(l_Error::l_Overflow)=>3}
}
#[no_mangle] pub unsafe extern "C" fn st_stock(s:*mut State,key:u64,found:*mut u32)->u32{
    match (&mut *s).invoke_l_stock_of(key).unwrap().result {Some(v)=>{*found=1;v},None=>{*found=0;0}}
}
#[no_mangle] pub unsafe extern "C" fn st_total(s:*mut State,lo:*mut u64,hi:*mut u64){
    #[cfg(feature="bounded-abi")] {let words=(*s).query_words_l_total();*lo=words.0;*hi=words.1;}
    #[cfg(not(feature="bounded-abi"))] {
    let total=(&mut *s).invoke_l_total().unwrap().result;
    let (sign,digits)=total.to_u64_digits();assert!(sign!=num_bigint::Sign::Minus && digits.len()<=2);
    *lo=digits.first().copied().unwrap_or(0);*hi=digits.get(1).copied().unwrap_or(0);
    }
}
#[no_mangle] pub unsafe extern "C" fn st_version(s:*mut State)->u64{(*s).version()}
#[no_mangle] pub unsafe extern "C" fn st_event_count(s:*mut State)->u64{(*s).outbox().len() as u64}
#[no_mangle] pub unsafe extern "C" fn st_event_hash(s:*mut State)->u64{
    let mut hash=0u64;
    for e in (*s).outbox(){let EventData::l_updated(v)=&e.data;
        for x in [e.commit,e.position,v.l_key,v.l_before as u64,v.l_after as u64]{hash=hash.wrapping_mul(1099511628211)^x;}
    }hash
}
