use std::slice;
unsafe fn run(p:*const u64,n:usize,a:u64,b:u64,limit:u64,k:u8)->u64{
    let xs=slice::from_raw_parts(p,n);
    #[cfg(combined)]{
        if k==3{return if b<limit{b.wrapping_mul(n as u64)}else{0};}
        xs.iter().rev().fold(0u64,|sum,&x|{
            let y=x.wrapping_mul(a).wrapping_add(b);
            if (if k==1{x}else{y})<limit{sum.wrapping_add(if k==2{1}else{y})}else{sum}
        })
    }
    #[cfg(not(combined))]{
        let first:Vec<u64>=if k==1{let mut values=Vec::with_capacity(n);values.extend(xs.iter().copied().filter(|&x|x<limit));values}
            else{xs.iter().map(|&x|if k==3{b}else{x.wrapping_mul(a).wrapping_add(b)}).collect()};
        let second:Vec<u64>=if k==1{first.iter().map(|&x|x.wrapping_mul(a).wrapping_add(b)).collect()}
            else{let mut values=Vec::with_capacity(first.len());values.extend(first.iter().copied().filter(|&x|x<limit));values};
        drop(first);
        if k==2{second.len() as u64}else{second.iter().rev().fold(0u64,|sum,&x|sum.wrapping_add(x))}
    }
}
macro_rules! wrapper{($name:ident,$k:expr)=>{#[no_mangle]pub unsafe extern "C" fn $name(p:*const u64,n:usize,a:u64,b:u64,limit:u64)->u64{run(p,n,a,b,limit,$k)}};}
wrapper!(lang_fn_mapped_filter_sum,0);wrapper!(lang_fn_filter_map_sum,1);wrapper!(lang_fn_mapped_filter_count,2);wrapper!(lang_fn_constant_filter_sum,3);
