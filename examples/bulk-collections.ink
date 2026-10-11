module bulk_collections;
record Item { key:u32, value:f32, }
fn collect(xs:List<u32>,suffix:List<u32>)->List<u32>{return foldr(xs,suffix,fn(x)=>fn(acc)=>buffer_fill(1,x+1).freeze().concat(acc));}
fn append(xs:List<u32>,suffix:List<u32>)->List<u32>{return foldr(xs,suffix,fn(x)=>fn(acc)=>acc.concat(buffer_fill(1,x+1).freeze()));}
fn records(xs:List<Item>,suffix:List<Item>)->List<Item>{return foldr(xs,suffix,fn(x)=>fn(acc)=>acc.concat(buffer_fill(1,x).freeze()));}
fn floats(xs:List<f32>,suffix:List<f32>)->List<f32>{return foldr(xs,suffix,fn(x)=>fn(acc)=>acc.concat(buffer_fill(1,x).freeze()));}
fn dependent(xs:List<u32>,suffix:List<u32>)->List<u32>{return foldr(xs,suffix,fn(x)=>fn(acc)=>acc.concat(buffer_fill(1,x+length(acc)).freeze()));}
query ready()->u32{return 1;}
fn gpu_map(xs:List<u32>)->List<u32>{return xs.map(fn(x)=>x+1);}
