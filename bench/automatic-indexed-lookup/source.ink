module indexed_batch;
fn membership(keys:List<u32>,queries:List<u32>)->List<Bool>{
 return queries.map(fn(key)=>foldr(keys,false,fn(item)=>fn(found)=>key==item||found));
}
fn filtered(keys:List<u64>,queries:List<u64>)->List<u64>{
 return queries.filter(fn(key)=>foldr(keys,false,fn(item)=>fn(found)=>key==item||found));
}
