module blocked_interval_examples;
import "../../knowledge/libraries/blocked_interval_index.ink" as fast;
import "../../knowledge/libraries/interval_index.ink" as base;
record Entry{start:u64,end:u64,value:u32,}
record Reading{index:fast.Index,values:Buffer<u32>,}
record BaseReading{index:base.Index,values:Buffer<u32>,}
fn values(entries:List<Entry>,keys:List<u64>,blocked:Bool)->List<u32>{
 if !blocked{var r:BaseReading=BaseReading{index:base.empty(),values:Buffer.empty()};for e in entries{r=BaseReading{..r,index:base.insert(r.index,e.start,e.end,e.value)};}for key in keys{let f=base.locate(r.index,key);r=BaseReading{index:f.index,values:r.values.push(f.value)};}return r.values.freeze();}
 var r:Reading=Reading{index:fast.empty(),values:Buffer.empty()};for e in entries{r=Reading{..r,index:fast.insert(r.index,e.start,e.end,e.value)};}for key in keys{let f=fast.locate(r.index,key);r=Reading{index:f.index,values:r.values.push(f.value)};}return r.values.freeze();
}
fn valid(entries:List<Entry>)->Bool{var index:fast.Index=fast.empty();for e in entries{index=fast.insert(index,e.start,e.end,e.value);}return index.valid;}
record Image{nodes:List<fast.Node>,blocks:List<fast.Block>,children:List<u32>,root:u32,valid:Bool,}
fn image(entries:List<Entry>)->Image{var index:fast.Index=fast.empty();for e in entries{index=fast.insert(index,e.start,e.end,e.value);}return Image{nodes:index.nodes.freeze(),blocks:index.blocks.freeze(),children:index.children.freeze(),root:index.root,valid:index.valid};}
record Cut{start:u64,end:u64,boundary:u64,value:u32,suffix:u32,hint:u32,}
fn refined_values(entries:List<Entry>,cuts:List<Cut>,keys:List<u64>,blocked:Bool)->List<u32>{
 if !blocked{var r:BaseReading=BaseReading{index:base.empty(),values:Buffer.empty()};for e in entries{r=BaseReading{..r,index:base.insert(r.index,e.start,e.end,e.value)};}for c in cuts{r=BaseReading{..r,index:base.insert(base.changed_end(r.index,c.start,c.boundary),c.boundary,c.end,c.suffix)};}for key in keys{let f=base.locate(r.index,key);r=BaseReading{index:f.index,values:r.values.push(f.value)};}return r.values.freeze();}
 var r:Reading=Reading{index:fast.empty(),values:Buffer.empty()};for e in entries{r=Reading{..r,index:fast.insert(r.index,e.start,e.end,e.value)};}for c in cuts{r=Reading{..r,index:fast.partition(r.index,c.start,c.end,c.boundary,c.value,c.suffix,c.hint)};}for key in keys{let f=fast.locate(r.index,key);r=Reading{index:f.index,values:r.values.push(f.value)};}return r.values.freeze();
}
fn resized(entries:List<Entry>,start:u64,end:u64,keys:List<u64>)->List<u32>{
 var index:fast.Index=fast.empty();for e in entries{index=fast.insert(index,e.start,e.end,e.value);}let index=fast.changed_end(index,start,end);let valid=index.valid;var r:Reading=Reading{index:index,values:buffer([choose(valid,1,0)])};for key in keys{let f=fast.locate(r.index,key);r=Reading{index:f.index,values:r.values.push(f.value)};}return r.values.freeze();
}
