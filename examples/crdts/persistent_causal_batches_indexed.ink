module persistent_causal_batches_indexed;
import "../../knowledge/libraries/whole_target_span_graph.ink" as spans;
import "../../knowledge/libraries/causal_batch_state_codec.ink" as codec;
import "../../knowledge/libraries/batched_event_graph.ink" as batches;
import "../../knowledge/libraries/text_crdts.ink" as text;
import "../../knowledge/libraries/interval_index.ink" as intervals;
private state Engine:codec.Stored=codec.empty();
private state History:List<batches.Change>=[];
record Merged{engine:codec.Stored,history:List<batches.Change>,}
fn accepted(stored:codec.Stored,history:List<batches.Change>,incoming:List<batches.Change>)->Result<Merged,text.Error>{
 var w:spans.Walker=codec.loaded(stored);var history:List<batches.Change>=history;
 for c in incoming{
  let found=intervals.locate(w.identities,c.id);let slot=found.value;let start=found.start;w=spans.Walker{..w,identities:found.index};
  let duplicate=slot!=0 && start==c.id && slot<=length(history) && history.at_or(slot-1,c)==c;
  if !duplicate{w=spans.apply(w,c);history=history.concat([c]);}
 }
 if w.error!=0 || w.engine.error!=0 || !w.graph.valid || !w.engine.ids.valid || !w.identities.valid{return Err(text.Error.InvalidOperation);}
 return Ok(Merged{engine:codec.stored(w),history:history});
}
change merge(changes:List<batches.Change>)->Result<Unit,text.Error> reads(Engine,History) writes(Engine,History){let m=accepted(Engine,History,changes)?;Engine=m.engine;History=m.history;return Ok(());}
fn visible_value(stored:codec.Stored)->Result<List<u32>,text.Error>{
 let w=codec.loaded(stored);let first=w.engine.tree.first;let bound=w.engine.spans.len();
 let out=repeat_until(bound,spans.Output{engine:w.engine,slot:first,values:Buffer.empty()},fn(o)=>o.slot==0,fn(i,o)=>spans.output_span(o));return Ok(out.values.freeze());
}
query visible()->Result<List<u32>,text.Error> reads(Engine){return visible_value(Engine);}
query history()->List<batches.Change> reads(History){return History;}
