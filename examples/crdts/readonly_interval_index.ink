module readonly_interval_examples;
import "../../knowledge/libraries/interval_index.ink" as base;
import "../../knowledge/libraries/readonly_interval_index.ink" as narrowed;
record Image{nodes:List<base.Node>,root:u32,valid:Bool,value:u32,start:u64,end:u64,}
fn lookup(nodes:List<base.Node>,root:u32,valid:Bool,key:u64,successor:Bool,fast:Bool)->Image{
 let index=base.Index{nodes:buffer(nodes),root:root,valid:valid};
 let found=choose(successor,choose(fast,narrowed.successor(index,key),base.successor(index,key)),choose(fast,narrowed.locate(index,key),base.locate(index,key)));
 return Image{nodes:found.index.nodes.freeze(),root:found.index.root,valid:found.index.valid,value:found.value,start:found.start,end:found.end};
}
