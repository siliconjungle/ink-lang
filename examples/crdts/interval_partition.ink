module interval_partition_examples;
import "../../knowledge/libraries/interval_index.ink" as base;
import "../../knowledge/libraries/interval_fused.ink" as fused;
import "../../knowledge/libraries/interval_partition.ink" as refined;
record Entry{start:u64,end:u64,value:u32,}
record Cut{start:u64,end:u64,boundary:u64,value:u32,suffix:u32,hint:u32,}
record Image{nodes:List<base.Node>,root:u32,valid:Bool,}
fn built(entries:List<Entry>,cuts:List<Cut>,fast:Bool)->base.Index{
 var index:base.Index=base.empty();for e in entries{index=fused.insert(index,e.start,e.end,e.value);}
 for c in cuts{index=choose(fast,refined.partition(index,c.start,c.end,c.boundary,c.value,c.suffix,c.hint),fused.insert(base.changed_end(index,c.start,c.boundary),c.boundary,c.end,c.suffix));}
 return index;
}
fn image(entries:List<Entry>,cuts:List<Cut>,fast:Bool)->Image{
 let index=built(entries,cuts,fast);return Image{nodes:index.nodes.freeze(),root:index.root,valid:index.valid};
}
record Reading{index:base.Index,values:Buffer<u32>,}
fn values(entries:List<Entry>,cuts:List<Cut>,keys:List<u64>,fast:Bool)->List<u32>{
 var r:Reading=Reading{index:built(entries,cuts,fast),values:Buffer.empty()};
 for key in keys{let f=base.locate(r.index,key);r=Reading{index:f.index,values:r.values.push(f.value)};}
 return r.values.freeze();
}
