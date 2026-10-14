module leaf_indexed_images;
import "../../knowledge/libraries/blocked_measure_sequence.ink" as base;
import "../../knowledge/libraries/leaf_indexed_sequence.ink" as reduced;
record Image{nodes:List<base.Node<u32>>,blocks:List<base.Block>,children:List<u32>,root:u32,first:u32,last:u32,fallback:u32,}
fn indexed(image:Image,block:u32,fast:Bool)->Image{
 let tree=base.Tree<u32>{nodes:buffer(image.nodes),blocks:buffer(image.blocks),children:buffer(image.children),root:image.root,first:image.first,last:image.last,fallback:image.fallback};
 let t=choose(fast,reduced.indexed<u32>(tree,block),base.indexed<u32>(tree,block));
 return Image{nodes:t.nodes.freeze(),blocks:t.blocks.freeze(),children:t.children.freeze(),root:t.root,first:t.first,last:t.last,fallback:t.fallback};
}
