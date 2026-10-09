use std::slice;
unsafe fn run(p:*const u64,n:usize,a:u64,b:u64,k:u8)->u64 {
    let xs=slice::from_raw_parts(p,n);
    #[cfg(combined)] {
        if k==3 {return n as u64;}
        xs.iter().rev().fold(0u64,|s,&x|{
            let mut v=if k==2 {x.wrapping_add(b).wrapping_mul(a)}else{x.wrapping_mul(a).wrapping_add(b)};
            if k==1{v=v.wrapping_sub(b);}s.wrapping_add(v)
        })
    }
    #[cfg(not(combined))] {
        let first:Vec<u64>=xs.iter().map(|&x|if k==2{x.wrapping_add(b)}else{x.wrapping_mul(a)}).collect();
        if k==3{return first.len() as u64;}
        let mut second:Vec<u64>=first.iter().map(|&v|if k==2{v.wrapping_mul(a)}else{v.wrapping_add(b)}).collect();
        drop(first);
        if k==1{let third:Vec<u64>=second.iter().map(|&v|v.wrapping_sub(b)).collect();second=third;}
        second.iter().rev().fold(0u64,|s,&v|s.wrapping_add(v))
    }
}
macro_rules! wrapper{($name:ident,$k:expr)=>{#[no_mangle]pub unsafe extern "C" fn $name(p:*const u64,n:usize,a:u64,b:u64)->u64{run(p,n,a,b,$k)}};}
wrapper!(lang_fn_two_maps,0);wrapper!(lang_fn_three_maps,1);wrapper!(lang_fn_shadow_maps,2);wrapper!(lang_fn_mapped_count,3);
