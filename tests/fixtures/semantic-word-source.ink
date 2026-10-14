module semantic_words;
pub fn classify(xs:List<u32>)->List<Bool>{
 return xs.map(fn(x)=>(x>=65 && x<=90) || (x>=97 && x<=122));
}
pub fn gpu_mask(xs:List<u32>)->List<u32>{return xs.map(fn(x)=>x|32);}
