module WebStackProofs4;
pub fn generic_left_zip(xs:List<u32>,seed:u32,k:u32)->List<u32> {
    return xs.map(fn(x)=>x*x+seed).zip(xs,fn(x)=>fn(y)=>x-y*k);
}

pub fn generic_right_zip(xs:List<u32>,seed:u32,k:u32)->List<u32> {
    return xs.zip(xs.map(fn(x)=>x*x+seed),fn(x)=>fn(y)=>x-y*k);
}

pub fn generic_both_zip(xs:List<u32>,seed:u32,k:u32)->List<u32> {
    return xs.map(fn(x)=>x*x+seed).zip(xs.map(fn(x)=>x+seed),fn(x)=>fn(y)=>x-y*k);
}

pub fn generic_self_zip(xs:List<u32>,seed:u32,k:u32)->List<u32>{return xs.zip(xs,fn(a)=>fn(b)=>a-b*k);}
pub fn zip_then_map(xs:List<u32>,seed:u32,k:u32)->List<u32>{return xs.zip(xs,fn(a)=>fn(b)=>a-b*k).map(fn(x)=>x+seed);}
pub fn conserved_total(xs:List<u32>,seed:u32,k:u32)->List<u32>{return xs.map(fn(x)=>x*k+(seed-x)*k);}
