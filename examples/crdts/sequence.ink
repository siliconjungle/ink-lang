module sequence_examples;
import "../../knowledge/libraries/measured_sequence.ink" as seq;
record Edit { position:u32, value:u32, remove:Bool, }
fn edited(edits:List<Edit>)->List<u32> {
 var t:seq.Tree<u32>=seq.empty<u32>(0);
 for e in edits {
  let r=seq.seek<u32>(t,e.position,true);
  t=choose(e.remove,seq.set_weight<u32>(r.tree,r.node,0),seq.insert_before<u32>(r.tree,r.node,e.value,1));
 }
 return seq.values<u32>(t,true);
}
