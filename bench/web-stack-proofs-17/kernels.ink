module WebProof17;
pub fn independent_left_mapped_zip_postmap_u32(xs:List<u32>,ys:List<u32>,seed:u32,k:u32)->List<u32>{return xs.map(fn(x)=>x*3+seed).zip(ys,fn(a)=>fn(b)=>a-b*k).map(fn(z)=>z+seed);}
pub fn independent_right_mapped_zip_postmap_u32(xs:List<u32>,ys:List<u32>,seed:u32,k:u32)->List<u32>{return xs.zip(ys.map(fn(y)=>y+k),fn(a)=>fn(b)=>a-b*k).map(fn(z)=>z+seed);}
pub fn independent_both_mapped_zip_postmap_u32(xs:List<u32>,ys:List<u32>,seed:u32,k:u32)->List<u32>{return xs.map(fn(x)=>x*3+seed).zip(ys.map(fn(y)=>y+k),fn(a)=>fn(b)=>a-b*k).map(fn(z)=>z+seed);}
pub fn independent_left_mapped_zip_postmap_u32_heldout(xs:List<u32>,ys:List<u32>,seed:u32,k:u32)->List<u32>{return xs.map(fn(x)=>choose(x<seed,seed-x,x-seed)).zip(ys,fn(a)=>fn(b)=>choose(a<seed,a+b*k,a-b)).map(fn(z)=>z*k+seed);}
pub fn independent_right_mapped_zip_postmap_u32_heldout(xs:List<u32>,ys:List<u32>,seed:u32,k:u32)->List<u32>{return xs.zip(ys.map(fn(y)=>y*y+k),fn(a)=>fn(b)=>choose(a<seed,a+b*k,a-b)).map(fn(z)=>z*k+seed);}
pub fn independent_both_mapped_zip_postmap_u32_heldout(xs:List<u32>,ys:List<u32>,seed:u32,k:u32)->List<u32>{return xs.map(fn(x)=>choose(x<seed,seed-x,x-seed)).zip(ys.map(fn(y)=>y*y+k),fn(a)=>fn(b)=>choose(a<seed,a+b*k,a-b)).map(fn(z)=>z*k+seed);}
pub fn mapped_arbitrary_fold_u32(xs:List<u32>,ys:List<u32>,seed:u32,k:u32)->u32{return foldr(xs.map(fn(x)=>x*3+k),seed,fn(x)=>fn(a)=>choose(x<seed,x+a*k,x-a));}
pub fn mapped_prefix_arbitrary_fold_u32(xs:List<u32>,ys:List<u32>,seed:u32,k:u32)->u32{return foldr(xs.map(fn(x)=>x*3+k).concat(ys),seed,fn(x)=>fn(a)=>choose(x<seed,x+a*k,x-a));}
pub fn mapped_concat_arbitrary_fold_u32(xs:List<u32>,ys:List<u32>,seed:u32,k:u32)->u32{return foldr(xs.map(fn(x)=>x*3+k).concat(ys.map(fn(x)=>x*3+k)),seed,fn(x)=>fn(a)=>choose(x<seed,x+a*k,x-a));}
pub fn mapped_arbitrary_fold_u32_heldout(xs:List<u32>,ys:List<u32>,seed:u32,k:u32)->u32{return foldr(xs.map(fn(x)=>choose(x<seed,seed-x,x-seed)),seed,fn(x)=>fn(a)=>choose(a<seed,x-a,x+a));}
pub fn mapped_prefix_arbitrary_fold_u32_heldout(xs:List<u32>,ys:List<u32>,seed:u32,k:u32)->u32{return foldr(xs.map(fn(x)=>choose(x<seed,seed-x,x-seed)).concat(ys),seed,fn(x)=>fn(a)=>choose(a<seed,x-a,x+a));}
pub fn mapped_concat_arbitrary_fold_u32_heldout(xs:List<u32>,ys:List<u32>,seed:u32,k:u32)->u32{return foldr(xs.map(fn(x)=>choose(x<seed,seed-x,x-seed)).concat(ys.map(fn(x)=>choose(x<seed,seed-x,x-seed))),seed,fn(x)=>fn(a)=>choose(a<seed,x-a,x+a));}
