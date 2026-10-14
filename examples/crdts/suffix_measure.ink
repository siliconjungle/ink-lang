module suffix_measure_examples;
import "../../knowledge/libraries/suffix_measure_sequence.ink" as dual;
import "../../knowledge/libraries/weighted_sequence.ink" as plain;
import "../../knowledge/libraries/blocked_measure_sequence.ink" as original;
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
fn totals(edits:List<Edit>)->List<u32>{
 let s=built(edits);let d=s.tree.blocks.at_or(s.tree.root,dual.empty_block());let a=s.first.nodes.at_or(s.first.root,plain.nil<u32>(0));let b=s.second.nodes.at_or(s.second.root,plain.nil<u32>(0));
 return [d.size,a.size,d.live,a.live,d.second,b.live,s.tree.blocks.len()];
}
fn linked(edits:List<Edit>)->List<u32>{let s=built(edits);return dual.values<u32>(s.tree,false);}
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

fn metadata(edits:List<Edit>)->List<u32>{
 let s=built(edits);let t=s.tree;
 var values:Buffer<u32>=buffer([t.root,t.first,t.last,t.fallback]);
 for n in t.nodes.freeze(){values=values.append(buffer([n.value,n.previous,n.next,n.leaf,n.index,n.extent,n.weight,n.weight2]));}
 for b in t.blocks.freeze(){values=values.append(buffer([b.start,b.count,b.parent,b.index,choose(b.leaf,1,0),b.size,b.live,b.second]));}
 return values.append(t.children).freeze();
}
fn original_changed(t:original.Tree<u32>,e:Edit)->original.Tree<u32>{
 if e.kind==0{return original.insert_before<u32>(t,e.slot,e.value,e.extent,e.first,e.second);}
 if e.kind==1{return original.set_weight<u32>(t,e.slot,e.first);}
 if e.kind==2{return original.set_second<u32>(t,e.slot,e.second);}
 if e.kind==3{return original.set_extent<u32>(t,e.slot,e.extent,e.first,e.second);}
 return original.set_weights<u32>(t,e.slot,e.first,e.second);
}
fn original_metadata(edits:List<Edit>)->List<u32>{
 var t:original.Tree<u32>=original.empty<u32>(0);for e in edits{t=original_changed(t,e);}
 var values:Buffer<u32>=buffer([t.root,t.first,t.last,t.fallback]);
 for n in t.nodes.freeze(){values=values.append(buffer([n.value,n.previous,n.next,n.leaf,n.index,n.extent,n.weight,n.weight2]));}
 for b in t.blocks.freeze(){values=values.append(buffer([b.start,b.count,b.parent,b.index,choose(b.leaf,1,0),b.size,b.live,b.second]));}
 return values.append(t.children).freeze();
}
