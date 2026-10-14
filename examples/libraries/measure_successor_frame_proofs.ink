module measure_successor_frame_proofs;
import "../../knowledge/libraries/blocked_measure_sequence.ink" as sequence;
import "../../knowledge/libraries/measure_successor.ink" as successor;
fn successor_tree(tree:sequence.Tree<u32>,slot:u32,measure:u32)->sequence.Tree<u32>{return successor.after<u32>(tree,slot,measure).tree;}
fn ranked_tree(tree:sequence.Tree<u32>,slot:u32,measure:u32)->sequence.Tree<u32>{return sequence.rank_measure<u32>(tree,slot,measure).tree;}
fn sought_tree(tree:sequence.Tree<u32>,position:u32,measure:u32)->sequence.Tree<u32>{return sequence.seek_measure<u32>(tree,position,measure).tree;}
