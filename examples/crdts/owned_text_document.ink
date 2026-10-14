module owned_text_document;
import "../../knowledge/libraries/endpoint_index_span_graph.ink" as spans;
import "../../knowledge/libraries/endpoint_batch_state_codec.ink" as codec;
import "../../knowledge/libraries/batched_event_graph.ink" as batches;
import "../../knowledge/libraries/text_crdts.ink" as text;
import "../../knowledge/libraries/interval_index.ink" as intervals;
import "../../knowledge/libraries/causal_log_snapshot.ink" as snapshot;
// A pure library value. Its caller owns persistence and transaction boundaries.
// Identity-index values identify the corresponding accepted change, so a second
// history table and a separate ordering list are unnecessary in this program.
// This is a new source program; the maintained-index correspondence to the
// transactional application is not yet a discharged representation proof.
record Document{engine:codec.Stored,history:List<batches.Change>,}
fn empty()->Document{return Document{engine:codec.empty(),history:[]};}
fn merge(document:Document,incoming:List<batches.Change>)->Result<Document,text.Error>{
 var w:spans.Walker=codec.loaded(document.engine);
 var history:Buffer<batches.Change>=buffer(document.history);
 for c in incoming{
  let found=intervals.locate(w.identities,c.id);
  let slot=found.value;let start=found.start;
  w=spans.Walker{..w,identities:found.index};
  let duplicate=slot!=0 && start==c.id && slot<=history.len() && history.at_or(slot-1,c)==c;
  if !duplicate{w=spans.apply(w,c);history=history.push(c);}
 }
 if w.error!=0 || w.engine.error!=0 || !w.graph.valid || !w.engine.ids.valid || !w.identities.valid{return Err(text.Error.InvalidOperation);}
 return Ok(Document{engine:codec.stored(w),history:history.freeze()});
}
fn visible(document:Document)->Result<List<u32>,text.Error>{
 let w=codec.loaded(document.engine);let first=w.engine.tree.first;let bound=w.engine.spans.len();
 let out=repeat_until(bound,spans.Output{engine:w.engine,slot:first,values:Buffer.empty()},fn(o)=>o.slot==0,fn(i,o)=>spans.output_span(o));
 return Ok(out.values.freeze());
}
fn save(document:Document)->Result<List<u32>,text.Error>{return snapshot.encode(document.history).map_err(fn(e)=>text.Error.InvalidOperation);}
fn load(words:List<u32>)->Result<Document,text.Error>{
 let changes=snapshot.decode(words,1000000,268435456).map_err(fn(e)=>text.Error.InvalidOperation)?;
 let count=length(changes);let document=merge(empty(),changes)?;
 if length(document.history)!=count{return Err(text.Error.InvalidOperation);}
 return Ok(document);
}
