module diamond_style_demo;
import "../../knowledge/libraries/batched_event_graph.ink" as batches;
import "../../knowledge/libraries/text_crdts.ink" as reference;
fn version(actor:u64,sequence:u64)->u64{return actor*4294967296+sequence;}

// The materializer is an ordinary library. This example builds an initial
// document and two concurrent edits sharing the same causal parent.
fn hello()->Result<List<u32>,reference.Error>{
 let initial=batches.Change{
  id:version(1,1),parents:[],position:0,remove:0,text:[72,105]
 };
 let alice=batches.Change{
  id:version(2,1),parents:[version(1,2)],position:2,remove:0,text:[33]
 };
 let bob=batches.Change{
  id:version(3,1),parents:[version(1,2)],position:2,remove:0,text:[63]
 };
 return batches.materialize([initial,alice,bob]);
}
