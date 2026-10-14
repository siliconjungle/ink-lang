module cross_measure_examples;
import "../../knowledge/libraries/blocked_measure_sequence.ink" as sequence;
import "../../knowledge/libraries/cross_measure_seek.ink" as cross;
record Edit{kind:u32,slot:u32,value:u32,extent:u32,first:u32,second:u32,}
fn change(t:sequence.Tree<u32>,e:Edit)->sequence.Tree<u32>{
 if e.kind==0{return sequence.insert_before<u32>(t,e.slot,e.value,e.extent,e.first,e.second);}
 if e.kind==1{return sequence.set_weight<u32>(t,e.slot,e.first);}
 if e.kind==2{return sequence.set_second<u32>(t,e.slot,e.second);}
 if e.kind==3{return sequence.set_extent<u32>(t,e.slot,e.extent,e.first,e.second);}
 return sequence.set_weights<u32>(t,e.slot,e.first,e.second);
}
record Reading{tree:sequence.Tree<u32>,values:Buffer<u32>,}
fn built(edits:List<Edit>)->sequence.Tree<u32>{
 var t:sequence.Tree<u32>=sequence.empty<u32>(0);for e in edits{t=change(t,e);}return t;
}
fn positions(edits:List<Edit>,queries:List<u32>,selection:u32,observation:u32)->List<u32>{
 var r:Reading=Reading{tree:built(edits),values:Buffer.empty()};
 for position in queries{
  let p=cross.seek<u32>(r.tree,position,selection,observation);
  r=Reading{tree:p.tree,values:r.values.append(buffer([p.node,p.rank,p.offset]))};
 }
 return r.values.freeze();
}
