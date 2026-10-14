module sequence_order_observers;
import "../../knowledge/libraries/blocked_measure_sequence.ink" as sequence;
import "../../knowledge/libraries/bulk_measure_sequence.ink" as bulk;
import "../../knowledge/libraries/sequence_order.ink" as order;
record Query{left:u32,left_offset:u32,right:u32,right_offset:u32,}
record Image{nodes:List<sequence.Node<u32>>,blocks:List<sequence.Block>,children:List<u32>,root:u32,first:u32,last:u32,fallback:u32,}
record Seen{order:i32,valid:Bool,}
record Batch{tree:sequence.Tree<u32>,results:Buffer<Seen>,}
record Observed{results:List<Seen>,unchanged:Bool,}
record Edit{before:u32,value:u32,}
fn stored(t:sequence.Tree<u32>)->Image{return Image{nodes:t.nodes.freeze(),blocks:t.blocks.freeze(),children:t.children.freeze(),root:t.root,first:t.first,last:t.last,fallback:t.fallback};}
fn loaded(t:Image)->sequence.Tree<u32>{return sequence.Tree<u32>{nodes:buffer(t.nodes),blocks:buffer(t.blocks),children:buffer(t.children),root:t.root,first:t.first,last:t.last,fallback:t.fallback};}
fn queried(b:Batch,q:Query)->Batch{let r=order.compare<u32>(b.tree,q.left,q.left_offset,q.right,q.right_offset);return Batch{tree:r.tree,results:b.results.push(Seen{order:r.order,valid:r.valid})};}
fn observed(tree:sequence.Tree<u32>,queries:List<Query>)->Observed{
 let before=stored(tree);var b:Batch=Batch{tree:loaded(before),results:Buffer.empty()};for q in queries{b=queried(b,q);}let after=stored(b.tree);return Observed{results:b.results.freeze(),unchanged:before==after};
}
fn probe(entries:List<bulk.Item<u32>>,queries:List<Query>)->Observed{return observed(bulk.build<u32>(entries,0),queries);}
fn edited(entries:List<bulk.Item<u32>>,edits:List<Edit>,queries:List<Query>)->Observed{
 var tree:sequence.Tree<u32>=bulk.build<u32>(entries,0);for edit in edits{tree=sequence.insert_before<u32>(tree,edit.before,edit.value,3,3,3);}return observed(tree,queries);
}
fn compared_tree(tree:sequence.Tree<u32>,left:u32,left_offset:u32,right:u32,right_offset:u32)->sequence.Tree<u32>{return order.compare<u32>(tree,left,left_offset,right,right_offset).tree;}
