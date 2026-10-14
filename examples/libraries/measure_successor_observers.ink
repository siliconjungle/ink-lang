module measure_successor_observers;
import "../../knowledge/libraries/blocked_measure_sequence.ink" as sequence;
import "../../knowledge/libraries/bulk_measure_sequence.ink" as bulk;
import "../../knowledge/libraries/measure_successor.ink" as successor;
record Query{slot:u32,measure:u32,}
record Image{nodes:List<sequence.Node<u32>>,blocks:List<sequence.Block>,children:List<u32>,root:u32,first:u32,last:u32,fallback:u32,}
record Batch{tree:sequence.Tree<u32>,nodes:Buffer<u32>,}
record Observed{nodes:List<u32>,unchanged:Bool,}
fn stored(t:sequence.Tree<u32>)->Image{return Image{nodes:t.nodes.freeze(),blocks:t.blocks.freeze(),children:t.children.freeze(),root:t.root,first:t.first,last:t.last,fallback:t.fallback};}
fn loaded(t:Image)->sequence.Tree<u32>{return sequence.Tree<u32>{nodes:buffer(t.nodes),blocks:buffer(t.blocks),children:buffer(t.children),root:t.root,first:t.first,last:t.last,fallback:t.fallback};}
fn queried(b:Batch,q:Query)->Batch{
 let r=successor.after<u32>(b.tree,q.slot,q.measure);return Batch{tree:r.tree,nodes:b.nodes.push(r.node)};
}
fn probe(entries:List<bulk.Item<u32>>,queries:List<Query>)->Observed{
 let tree=bulk.build<u32>(entries,0);let before=stored(tree);
 var b:Batch=Batch{tree:loaded(before),nodes:Buffer.empty()};for q in queries{b=queried(b,q);}
 let after=stored(b.tree);return Observed{nodes:b.nodes.freeze(),unchanged:before==after};
}
fn advanced_tree(value:successor.Located<u32>)->sequence.Tree<u32>{return successor.advanced<u32>(value).tree;}
