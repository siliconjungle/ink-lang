module weighted_examples;
import "../../knowledge/libraries/weighted_sequence.ink" as sequence;
record Item{value:u32,extent:u32,weight:u32,}
record Hit{value:u32,offset:u32,}
record Work{tree:sequence.Tree<u32>,out:Buffer<Hit>,}
fn looked_up(w:Work,position:u32,visible:Bool)->Work{
 let p=sequence.seek<u32>(w.tree,position,visible);let n=p.tree.nodes.at_or(p.node,sequence.nil<u32>(0));let hit=Hit{value:n.value,offset:p.offset};
 return Work{tree:p.tree,out:w.out.push(hit)};
}
fn built(items:List<Item>)->sequence.Tree<u32>{
 var tree:sequence.Tree<u32>=sequence.empty<u32>(0);
 for i in items{tree=sequence.insert_before<u32>(tree,0,i.value,i.extent,i.weight);}
 return tree;
}
fn lookup(items:List<Item>,positions:List<u32>,visible:Bool)->List<Hit>{
 var w:Work=Work{tree:built(items),out:Buffer.empty()};
 for position in positions{w=looked_up(w,position,visible);}
 return w.out.freeze();
}
