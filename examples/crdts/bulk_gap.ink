module bulk_gap_examples;
import "../../knowledge/libraries/gap_sequence.ink" as gap;
record Edit{position:u32,remove:u32,text:List<u32>,}
fn edited(g:gap.Gap<u32>,e:Edit,bulk:Bool)->gap.Gap<u32>{
 let moved=gap.erased<u32>(gap.moved<u32>(g,e.position),e.remove);
 return choose(bulk,gap.inserted_many<u32>(moved,e.text),foldl(e.text,moved,fn(value,g)=>gap.inserted<u32>(g,value)));
}
fn run(edits:List<Edit>,bulk:Bool)->List<u32>{
 var g:gap.Gap<u32>=gap.empty<u32>(0);
 for edit in edits{g=edited(g,edit,bulk);}return gap.freeze<u32>(g);
}
fn malformed(values:List<u32>,start:u32,end:u32,text:List<u32>,bulk:Bool)->List<u32>{
 let g=gap.Gap<u32>{data:buffer(values),start:start,end:end,fallback:0};
 let g=choose(bulk,gap.inserted_many<u32>(g,text),foldl(text,g,fn(value,g)=>gap.inserted<u32>(g,value)));
 return gap.freeze<u32>(g);
}
