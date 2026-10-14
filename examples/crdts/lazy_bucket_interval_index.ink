module lazy_bucket_interval_examples;
import "../../knowledge/libraries/lazy_bucket_interval_index.ink" as forest;
import "../../knowledge/libraries/interval_index.ink" as base;
record Entry{start:u64,end:u64,value:u32,hint:u32,}
record Reading{index:forest.Index,values:Buffer<u32>,}
fn values(entries:List<Entry>,keys:List<u64>)->List<u32>{
 var index:forest.Index=forest.empty();for e in entries{index=forest.insert(index,e.start,e.end,e.value,e.hint);}
 var r:Reading=Reading{index:index,values:Buffer.empty()};for key in keys{let f=forest.locate(r.index,key,0);r=Reading{index:f.index,values:r.values.push(f.value)};}return r.values.freeze();
}
fn valid(entries:List<Entry>)->Bool{var i:forest.Index=forest.empty();for e in entries{i=forest.insert(i,e.start,e.end,e.value,e.hint);}return i.valid;}
record Refined{index:forest.Index,slot:u32,}
fn refined_values(start:u64,end:u64,cuts:List<u64>,keys:List<u64>)->List<u32>{
 let initial=forest.insert(forest.empty(),start,end,1,0);var s:Refined=Refined{index:initial,slot:1};
 for cut in cuts{let old=s.index.nodes.at_or(s.slot,base.nil());let fresh=s.index.nodes.len();s=Refined{index:forest.partition(s.index,old.start,old.end,cut,old.value,fresh,s.slot),slot:fresh};}
 var r:Reading=Reading{index:s.index,values:Buffer.empty()};for key in keys{let f=forest.locate(r.index,key,0);r=Reading{index:f.index,values:r.values.push(f.value)};}return r.values.freeze();
}
record Query{key:u64,hint:u32,}
fn hinted_values(entries:List<Entry>,queries:List<Query>)->List<u32>{
 var index:forest.Index=forest.empty();for e in entries{index=forest.insert(index,e.start,e.end,e.value,e.hint);}
 var r:Reading=Reading{index:index,values:Buffer.empty()};for q in queries{let f=forest.locate(r.index,q.key,q.hint);r=Reading{index:f.index,values:r.values.push(f.value)};}return r.values.freeze();
}
record Image{nodes:List<base.Node>,roots:List<u32>,valid:Bool,}
fn image(entries:List<Entry>,buckets:List<u64>)->Image{
 var index:forest.Index=forest.empty();for e in entries{index=forest.insert(index,e.start,e.end,e.value,e.hint);}
 var roots:Buffer<u32>=Buffer.empty();for b in buckets{roots=roots.push(index.roots.get_or(b,0));index=index;}
 return Image{nodes:index.nodes.freeze(),roots:roots.freeze(),valid:index.valid};
}
