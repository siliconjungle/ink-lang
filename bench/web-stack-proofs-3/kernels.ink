module WebCollection3;

pub fn mapped_left_zip(xs:List<u32>,seed:u32,k:u32)->List<u32> {
    return xs.map(fn(x)=>x*k).zip(xs,fn(x)=>fn(y)=>x+y);
}

pub fn mapped_right_zip(xs:List<u32>,seed:u32,k:u32)->List<u32> {
    return xs.zip(xs.map(fn(x)=>x*k),fn(x)=>fn(y)=>x-y);
}

pub fn mapped_both_zip(xs:List<u32>,seed:u32,k:u32)->List<u32> {
    return xs.map(fn(x)=>x*k).zip(xs.map(fn(x)=>x*seed),fn(x)=>fn(y)=>x-y);
}

pub fn captured_branch_repeat(xs:List<u32>,seed:u32,k:u32)->List<u32>{return xs.map(fn(x)=>repeat(256,x,fn(i)=>fn(a)=>choose(x<seed,a+k,a-seed)));}
pub fn affine_blend_repeat(xs:List<u32>,seed:u32,k:u32)->List<u32>{return xs.map(fn(x)=>repeat(256,x,fn(i)=>fn(a)=>a*k+(a+seed)*(1-k)));}

pub fn captured_mask_repeat(xs:List<u32>,seed:u32,k:u32)->List<u32>{return xs.map(fn(x)=>repeat(256,choose(x<seed,seed,x),fn(i)=>fn(a)=>choose(x<seed,seed,a)));}
