module persistent_causal_batches_document;
import "../../knowledge/libraries/causal_log_snapshot.ink" as snapshot;
import "../../knowledge/libraries/endpoint_index_span_graph.ink" as spans;
import "../../knowledge/libraries/endpoint_batch_state_codec.ink" as codec;
import "../../knowledge/libraries/batched_event_graph.ink" as batches;
import "../../knowledge/libraries/text_crdts.ink" as text;
import "../../knowledge/libraries/interval_index.ink" as intervals;
private state Engine:codec.Stored=codec.empty();
private state History:Table<u64,batches.Change>=Table.empty();
private state Order:List<u64>=[];
record Merged{engine:codec.Stored,added:List<batches.Change>,}
fn accepted(stored:codec.Stored,known:List<Option<batches.Change>>,incoming:List<batches.Change>)->Result<Merged,text.Error>{
 var w:spans.Walker=codec.loaded(stored);
 var added:Buffer<batches.Change>=Buffer.empty();
 var seen:Map<u64,batches.Change>=Map.empty();
 var index:u32=0;
 for c in incoming{
  let found=intervals.locate(w.identities,c.id);let slot=found.value;let start=found.start;w=spans.Walker{..w,identities:found.index};
  let prior:Option<batches.Change>=known.at_or(index,None);let current:Option<batches.Change>=Some(c);
  let duplicate=slot!=0 && start==c.id && (prior==current || (seen.contains(c.id) && seen.get_or(c.id,c)==c));
  if !duplicate{w=spans.apply(w,c);added=added.push(c);seen=seen.set(c.id,c);}
  index=index+1;
 }
 if w.error!=0 || w.engine.error!=0 || !w.graph.valid || !w.engine.ids.valid || !w.identities.valid{return Err(text.Error.InvalidOperation);}
 return Ok(Merged{engine:codec.stored(w),added:added.freeze()});
}
change merge(changes:List<batches.Change>)->Result<Unit,text.Error> reads(Engine,History,Order) writes(Engine,History,Order){
 let known=changes.map(fn(c)=>History.get(c.id));
 let m=accepted(Engine,known,changes)?;
 let keys=m.added.map(fn(c)=>c.id);
 History.put_many(keys,m.added).map_err(fn(e)=>text.Error.InvalidOperation)?;
 Order=Order.concat(keys);
 Engine=m.engine;
 return Ok(());
}
fn visible_value(stored:codec.Stored)->Result<List<u32>,text.Error>{
 let w=codec.loaded(stored);let first=w.engine.tree.first;let bound=w.engine.spans.len();
 let out=repeat_until(bound,spans.Output{engine:w.engine,slot:first,values:Buffer.empty()},fn(o)=>o.slot==0,fn(i,o)=>spans.output_span(o));return Ok(out.values.freeze());
}
query visible()->Result<List<u32>,text.Error> reads(Engine){return visible_value(Engine);}
query history()->List<batches.Change> reads(History,Order){return Order.map(fn(id)=>History.get(id).unwrap_or(batches.Change{id:0,parents:[],position:0,remove:0,text:[]}));}

// Document persistence stores accepted causal operations; replay rebuilds indexes.
// The host's full application checkpoint remains the ordinary portable API.
query save()->Result<List<u32>,text.Error> reads(History,Order){return snapshot.encode(history()).map_err(fn(e)=>text.Error.InvalidOperation);}
fn absent(c:batches.Change)->Option<batches.Change>{return None;}
fn decoded_snapshot(words:List<u32>)->Result<Merged,text.Error>{
 let changes=snapshot.decode(words,1000000,268435456).map_err(fn(e)=>text.Error.InvalidOperation)?;
 let count=length(changes);let known=changes.map(fn(c)=>absent(c));
 let m=accepted(codec.empty(),known,changes)?;
 if length(m.added)!=count{return Err(text.Error.InvalidOperation);}
 return Ok(m);
}
change load(words:List<u32>)->Result<Unit,text.Error> reads(Engine,History,Order) writes(Engine,History,Order){
 let m=decoded_snapshot(words)?;
 let keys=m.added.map(fn(c)=>c.id);
 History.remove_many(Order);
 History.put_many(keys,m.added).map_err(fn(e)=>text.Error.InvalidOperation)?;
 Order=keys;Engine=m.engine;
 return Ok(());
}
