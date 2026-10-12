module PipelineTemplates;
record Row{score:u32,visible:Bool,name:String,value:f32,}
record Summary{total:f32,count:u32,}
record Candidate{score:u32,value:f32,}
pub fn filtered_right(xs:List<Row>,cut:u32,seed:u32)->u32{return foldr(xs.filter(fn(x)=>x.score>=cut),seed,fn(x)=>fn(acc)=>x.score-acc);}
pub fn filtered_left(xs:List<Row>,cut:u32,seed:u32)->u32{return foldl(xs.filter(fn(x)=>x.score>=cut),seed,fn(x)=>fn(acc)=>x.score-acc);}
pub fn summary(xs:List<Row>,cut:u32,seed:f32)->Summary{return foldr(xs.filter(fn(x)=>x.visible && x.score>=cut),Summary{total:seed,count:0},fn(x)=>fn(acc)=>Summary{total:x.value-acc.total,count:acc.count+1});}
pub fn label(xs:List<Row>,needle:String)->String{return foldr(xs.filter(fn(x)=>x.name==needle),"missing",fn(x)=>fn(acc)=>x.name);}
pub fn filtered_mapped(xs:List<Row>,cut:u32,seed:u32)->u32{return foldr(xs.filter(fn(x)=>x.score>=cut).map(fn(x)=>x.score),seed,fn(x)=>fn(acc)=>x+acc);}
pub fn mapped_filtered(xs:List<Row>,cut:u32,seed:f32)->f32{return foldr(xs.map(fn(x)=>Candidate{score:x.score+1,value:x.value*2.0}).filter(fn(x)=>x.score>=cut),seed,fn(x)=>fn(acc)=>x.value-acc);}
pub fn composed_map(xs:List<Row>,needle:String)->List<Bool>{return xs.map(fn(x)=>x.name).map(fn(x)=>x==needle);}
pub fn composed_filter(xs:List<Row>,cut:u32)->List<Row>{return xs.filter(fn(x)=>x.score>=cut).filter(fn(x)=>x.visible);}
pub fn concatenated_right(xs:List<Row>,ys:List<Row>,seed:u32)->u32{return foldr(xs.concat(ys),seed,fn(x)=>fn(acc)=>x.score-acc);}
pub fn concatenated_left(xs:List<Row>,ys:List<Row>,seed:u32)->u32{return foldl(xs.concat(ys),seed,fn(x)=>fn(acc)=>x.score-acc);}
pub fn mapped_count(xs:List<Row>)->u64{return count(xs.map(fn(x)=>x.name));}
pub fn mapped_length(xs:List<Row>)->u32{return length(xs.map(fn(x)=>x.name));}
pub fn identity_rows(xs:List<Row>)->List<Row>{return xs.map(fn(x)=>x);}
pub fn numeric_filtered(xs:List<u32>,cut:u32,seed:u32)->u32{return foldr(xs.filter(fn(x)=>x>=cut),seed,fn(x)=>fn(acc)=>x-acc);}
