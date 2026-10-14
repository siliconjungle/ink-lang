module recursive_trees;
import "../../../knowledge/libraries/recursive-trees.ink" as trees;
fn leaves(tree:trees.Tree<String>)->List<String> {return trees.leaves<String>(tree);}
fn leaf_count(tree:trees.Tree<String>)->u32 {return trees.leaf_count<String>(tree);}
fn mirror(tree:trees.Tree<String>)->trees.Tree<String> {return trees.mirror<String>(tree);}
fn from_words(words:List<u32>)->List<u32> {return trees.leaves<u32>(trees.Tree<u32>.Branch(words.map(fn(word)=>trees.Tree<u32>.Leaf(word))));}
fn numeric(xs:List<u32>)->List<u32> {return xs.map(fn(x)=>x+1);}
private state Words:List<String>=[];
event Seen:u32;
change store(tree:trees.Tree<String>,fail:Bool)->Result<u32,String> writes(Words) emits(Seen) {
 Words=trees.leaves<String>(tree);let size=trees.leaf_count<String>(tree);emit Seen(size);
 if fail{return Err("aborted");}return Ok(size);
}
query words()->List<String> reads(Words) {return Words;}
