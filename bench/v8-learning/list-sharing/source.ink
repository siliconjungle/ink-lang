module list_sharing;
fn combined(xs:List<u32>,bias:u32)->u32 {
 return foldl(xs.map(fn(x)=>x*1664525+bias),0,fn(x)=>fn(a)=>a+x)
  +foldl(xs.map(fn(x)=>x*1664525+bias),0,fn(x)=>fn(a)=>word_xor(a,x));
}
fn doubled(xs:List<u32>,bias:u32)->List<u32> {
 return xs.map(fn(x)=>x*1664525+bias).concat(xs.map(fn(x)=>x*1664525+bias));
}
fn guarded(active:Bool,xs:List<u32>,bias:u32)->u32 {
 return choose(active,foldl(xs.map(fn(x)=>x*1664525+bias),0,fn(x)=>fn(a)=>a+x)
  +foldl(xs.map(fn(x)=>x*1664525+bias),0,fn(x)=>fn(a)=>word_xor(a,x)),0);
}
