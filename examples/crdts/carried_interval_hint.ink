module carried_interval_hint_examples;
import "../../knowledge/libraries/interval_index.ink" as base;
import "../../knowledge/libraries/interval_fused.ink" as fused;
import "../../knowledge/libraries/interval_insert_hint.ink" as hinted;
record Entry{start:u64,end:u64,value:u32,hint:u32,}
record Image{nodes:List<base.Node>,root:u32,valid:Bool,}
fn image(entries:List<Entry>,fast:Bool)->Image{var index:base.Index=base.empty();for e in entries{index=choose(fast,hinted.insert(index,e.start,e.end,e.value,e.hint),fused.insert(index,e.start,e.end,e.value));}return Image{nodes:index.nodes.freeze(),root:index.root,valid:index.valid};}

// Carry the latest successful allocation as a finger, as operation validation does.
fn carried_image(entries:List<Entry>,fast:Bool)->Image{var index:base.Index=base.empty();var hint:u32=0;for e in entries{let fresh=index.nodes.len();index=choose(fast,hinted.insert(index,e.start,e.end,e.value,hint),fused.insert(index,e.start,e.end,e.value));hint=fresh;}return Image{nodes:index.nodes.freeze(),root:index.root,valid:index.valid};}
