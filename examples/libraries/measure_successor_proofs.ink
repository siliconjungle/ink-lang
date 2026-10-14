module measure_successor_proofs;
import "../../knowledge/libraries/blocked_measure_sequence.ink" as sequence;
import "../../knowledge/libraries/measure_successor.ink" as successor;
record Image{nodes:List<sequence.Node<u32>>,blocks:List<sequence.Block>,children:List<u32>,root:u32,first:u32,last:u32,fallback:u32,}
record Input{image:Image,node:u32,}
fn stored(t:sequence.Tree<u32>)->Image{return Image{nodes:t.nodes.freeze(),blocks:t.blocks.freeze(),children:t.children.freeze(),root:t.root,first:t.first,last:t.last,fallback:t.fallback};}
fn loaded(t:Image)->sequence.Tree<u32>{return sequence.Tree<u32>{nodes:buffer(t.nodes),blocks:buffer(t.blocks),children:buffer(t.children),root:t.root,first:t.first,last:t.last,fallback:t.fallback};}
fn advanced_image(value:Input)->Image{return stored(successor.advanced<u32>(successor.Located<u32>{tree:loaded(value.image),node:value.node}).tree);}
fn original_image(value:Input)->Image{return value.image;}
