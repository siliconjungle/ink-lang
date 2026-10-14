module sequence_seek_frame;
import "../../knowledge/libraries/blocked_measure_sequence.ink" as sequence;
fn seek_frame(tree:sequence.Tree<u32>,position:u32,visible:Bool)->sequence.Tree<u32>{
 let selected=sequence.seek<u32>(tree,position,visible);return selected.tree;
}
