module leaf_indexed_observers;
import "../../knowledge/libraries/blocked_measure_sequence.ink" as base;
import "../../knowledge/libraries/leaf_indexed_sequence.ink" as reduced;
fn original(tree:base.Tree<u32>,block:u32)->base.Tree<u32>{return base.indexed<u32>(tree,block);}
fn narrowed(tree:base.Tree<u32>,block:u32)->base.Tree<u32>{return reduced.indexed<u32>(tree,block);}
