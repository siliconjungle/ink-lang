module ProofRecipe;
pub fn pipeline38_right_padded_zip_u32(xs:List<u32>,ys:List<u32>,seed:u32,k:u32)->List<u32>{return xs.map_indexed(fn(i)=>fn(x)=>left_word(i,x,seed,k)).zip(xs.map_indexed(fn(i)=>fn(x)=>right_word(i,x,seed,k)).concat(ys),fn(a)=>fn(b)=>pair_word(a,b,seed,k));}
fn left_word(i:u32,x:u32,seed:u32,k:u32)->u32{return choose(i<seed,x+k,x-seed);}
fn right_word(i:u32,x:u32,seed:u32,k:u32)->u32{return choose(rem_or(i,3,0)==0,x*k,x+seed);}
fn pair_word(a:u32,b:u32,seed:u32,k:u32)->u32{return choose(a<b,a+b*k,a-b+seed);}
