module dual_measure_examples;
import "../../knowledge/libraries/dual_measure_sequence.ink" as dual;
import "../../knowledge/libraries/weighted_sequence.ink" as plain;
record Edit{kind:u32,slot:u32,value:u32,extent:u32,first:u32,second:u32,}
record State{tree:dual.Tree<u32>,first:plain.Tree<u32>,second:plain.Tree<u32>,}
fn changed(s:State,e:Edit)->State{
 if e.kind==0{return State{tree:dual.insert_before<u32>(s.tree,e.slot,e.value,e.extent,e.first,e.second),first:plain.insert_before<u32>(s.first,e.slot,e.value,e.extent,e.first),second:plain.insert_before<u32>(s.second,e.slot,e.value,e.extent,e.second)};}
 if e.kind==1{return State{..s,tree:dual.set_weight<u32>(s.tree,e.slot,e.first),first:plain.set_weight<u32>(s.first,e.slot,e.first)};}
 if e.kind==2{return State{..s,tree:dual.set_second<u32>(s.tree,e.slot,e.second),second:plain.set_weight<u32>(s.second,e.slot,e.second)};}
 if e.kind==3{return State{tree:dual.set_extent<u32>(s.tree,e.slot,e.extent,e.first,e.second),first:plain.set_extent<u32>(s.first,e.slot,e.extent,e.first),second:plain.set_extent<u32>(s.second,e.slot,e.extent,e.second)};}
 return State{tree:dual.set_weights<u32>(s.tree,e.slot,e.first,e.second),first:plain.set_weight<u32>(s.first,e.slot,e.first),second:plain.set_weight<u32>(s.second,e.slot,e.second)};
}
fn built(edits:List<Edit>)->State{var s:State=State{tree:dual.empty<u32>(0),first:plain.empty<u32>(0),second:plain.empty<u32>(0)};for e in edits{s=changed(s,e);}return s;}
fn images(edits:List<Edit>)->List<u32>{
 let s=built(edits);var values:Buffer<u32>=Buffer.empty();
 var index:u32=0;for marker in buffer_fill(s.tree.nodes.len(),0).freeze(){
  let d=s.tree.nodes.at_or(index,dual.nil<u32>(0));let a=s.first.nodes.at_or(index,plain.nil<u32>(0));let b=s.second.nodes.at_or(index,plain.nil<u32>(0));
  values=values.append(buffer([d.value,a.value,b.value,d.size,a.size,b.size,d.live,a.live,d.second,b.live,d.weight,a.weight,d.weight2,b.weight,d.left,a.left,b.left,d.right,a.right,b.right,d.parent,a.parent,b.parent,d.previous,a.previous,b.previous,d.next,a.next,b.next]));
  index=index+1;
 }
 return values.freeze();
}
record Reading{state:State,values:Buffer<u32>,}
fn positions(edits:List<Edit>,queries:List<u32>,measure:u32)->List<u32>{
 var r:Reading=Reading{state:built(edits),values:Buffer.empty()};
 for position in queries{
  let s=r.state;let d=dual.seek_measure<u32>(s.tree,position,measure);
  let a=plain.seek<u32>(s.first,position,measure==1);let b=plain.seek<u32>(s.second,position,measure==2);
  let node=choose(measure==2,b.node,a.node);let rank=choose(measure==2,b.rank,a.rank);let offset=choose(measure==2,b.offset,a.offset);
  r=Reading{state:State{tree:d.tree,first:a.tree,second:b.tree},values:r.values.append(buffer([d.node,node,d.rank,rank,d.offset,offset]))};
 }
 return r.values.freeze();
}
fn ranks(edits:List<Edit>,slots:List<u32>,measure:u32)->List<u32>{
 var r:Reading=Reading{state:built(edits),values:Buffer.empty()};
 for slot in slots{let s=r.state;let d=dual.rank_measure<u32>(s.tree,slot,measure);let a=plain.rank<u32>(s.first,slot,measure==1);let b=plain.rank<u32>(s.second,slot,measure==2);
  r=Reading{state:State{tree:d.tree,first:a.tree,second:b.tree},values:r.values.append(buffer([d.rank,choose(measure==2,b.rank,a.rank)]))};
 }return r.values.freeze();
}
