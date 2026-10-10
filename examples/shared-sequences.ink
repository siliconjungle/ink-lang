module SharedSequences;
fn counted(xs:List<u32>)->u64{return count(xs.map(fn(x)=>x*x+17));}
fn counted_flags(xs:List<u32>,limit:u32)->u64{return count(xs.map(fn(x)=>x<limit));}
fn project_first(xs:List<u32>)->List<u32>{return xs.zip(xs,fn(a)=>fn(b)=>a);}
fn project_second(xs:List<u32>)->List<u32>{return xs.zip(xs,fn(a)=>fn(b)=>b);}
fn self_sum(xs:List<u32>)->List<u32>{return xs.zip(xs,fn(a)=>fn(b)=>a+b);}
fn left_product(xs:List<u32>,scale:u32)->List<u32>{return xs.map(fn(x)=>x*scale+3).zip(xs,fn(a)=>fn(b)=>a*b);}
fn right_difference(xs:List<u32>,offset:u32)->List<u32>{return xs.zip(xs.map(fn(x)=>x*5+offset),fn(a)=>fn(b)=>a-b);}
fn pair_values(xs:List<u32>)->List<u32>{return xs.map(fn(x)=>x*17+3).zip(xs.map(fn(x)=>x*5+1),fn(a)=>fn(b)=>a*b);}
fn pair_total(xs:List<u32>)->u32{return sum(xs.map(fn(x)=>x*17+3).zip(xs.map(fn(x)=>x*5+1),fn(a)=>fn(b)=>a*b));}
fn wide_pair(xs:List<u64>)->List<u64>{return xs.map(fn(x)=>x*17+3).zip(xs.map(fn(x)=>x*5+1),fn(a)=>fn(b)=>a-b);}
fn signed_pair(xs:List<i32>)->List<i32>{return xs.map(fn(x)=>x*17+3).zip(xs.map(fn(x)=>x*5+1),fn(a)=>fn(b)=>a-b);}
fn float_pair(xs:List<f32>,scale:f32,offset:f32)->List<f32>{return xs.map(fn(x)=>x*scale+offset).zip(xs.map(fn(x)=>x+1.0),fn(a)=>fn(b)=>a*b);}
fn float_first(xs:List<f32>)->List<f32>{return xs.zip(xs,fn(a)=>fn(b)=>a);}
fn unrelated(xs:List<u32>,ys:List<u32>)->List<u32>{return xs.map(fn(x)=>x*17+3).zip(ys.map(fn(x)=>x*5+1),fn(a)=>fn(b)=>a*b);}
fn captured(xs:List<u32>,weights:List<u32>)->List<u32>{
    return xs.map(fn(k)=>sum(weights.map(fn(w)=>w+k).zip(weights.map(fn(w)=>w-k),fn(a)=>fn(b)=>a*b)));
}
