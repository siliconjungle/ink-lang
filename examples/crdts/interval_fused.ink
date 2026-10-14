module interval_fused_examples;
import "../../knowledge/libraries/interval_index.ink" as base;
import "../../knowledge/libraries/interval_fused.ink" as fused;
record Entry{start:u64,end:u64,value:u32,}
record Reading{index:base.Index,values:Buffer<u32>,}
record Image{nodes:List<base.Node>,root:u32,valid:Bool,}
fn built(entries:List<Entry>,fast:Bool)->base.Index{
 var index:base.Index=base.empty();for e in entries{index=choose(fast,fused.insert(index,e.start,e.end,e.value),base.insert(index,e.start,e.end,e.value));}return index;
}
fn image(entries:List<Entry>,fast:Bool)->Image{
 let index=built(entries,fast);return Image{nodes:index.nodes.freeze(),root:index.root,valid:index.valid};
}
fn values(entries:List<Entry>,keys:List<u64>,fast:Bool)->List<u32>{
 var r:Reading=Reading{index:built(entries,fast),values:Buffer.empty()};
 for key in keys{let f=base.locate(r.index,key);r=Reading{index:f.index,values:r.values.push(f.value)};}
 return r.values.freeze();
}
