module sequence_order_frame_proofs;
import "../../knowledge/libraries/blocked_measure_sequence.ink" as sequence;
import "../../knowledge/libraries/sequence_order.ink" as order;
fn twice_compared_tree(tree:sequence.Tree<u32>,left:u32,left_offset:u32,right:u32,right_offset:u32)->sequence.Tree<u32>{
 let first=order.compare<u32>(tree,left,left_offset,right,right_offset);
 return order.compare<u32>(first.tree,right,right_offset,left,left_offset).tree;
}
