module checked_trees;
import "../../../knowledge/libraries/checked-trees.ink" as trees;
import "../../../knowledge/libraries/invariant-values.ink" as checked;

fn copy(tree:trees.Tree<String>)->trees.Tree<String> {return tree;}
fn payload(tree:trees.Tree<String>)->List<String> {return trees.payload_items<String>(tree);}
fn children(tree:trees.Tree<String>)->List<trees.Tree<String>> {return trees.children<String>(tree);}
fn node(payload:checked.Unique<String>,children:List<trees.Tree<String>>)->trees.Tree<String> {
 return trees.node<String>(payload,children);
}
fn replace(tree:trees.Tree<String>,payload:checked.Unique<String>)->trees.Tree<String> {
 return trees.with_payload<String>(tree,payload);
}
fn prune(tree:trees.Tree<String>)->trees.Tree<String> {
 let empty:List<trees.Tree<String>>=[];
 return trees.with_children<String>(tree,empty);
}
fn numeric(xs:List<u32>)->List<u32> {return xs.map(fn(x)=>x+1);}
fn word_copy(tree:trees.Tree<u32>)->trees.Tree<u32> {return tree;}
record Item { name:String, weights:List<u32>, }
fn record_copy(tree:trees.Tree<Item>)->trees.Tree<Item> {return tree;}
