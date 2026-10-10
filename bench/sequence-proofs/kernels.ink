module SequenceProofs;
pub fn concat_count(xs:List<u32>,ys:List<u32>,seed:u32,factor:u32)->u64{return count(xs.concat(ys));}
pub fn concat_fold(xs:List<u32>,ys:List<u32>,seed:u32,factor:u32)->u32{return foldr(xs.concat(ys),seed,fn(x)=>fn(a)=>x-a);}
pub fn concat_sum(xs:List<u32>,ys:List<u32>,seed:u32,factor:u32)->u32{return sum(xs.concat(ys));}
pub fn concat_empty(xs:List<u32>,ys:List<u32>,seed:u32,factor:u32)->List<u32>{return xs.concat(ys.filter(fn(x)=>false));}
pub fn concat_map(xs:List<u32>,ys:List<u32>,seed:u32,factor:u32)->List<u32>{return xs.map(fn(x)=>x*factor).concat(ys.map(fn(x)=>x*factor));}
