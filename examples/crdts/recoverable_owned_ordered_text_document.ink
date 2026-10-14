module recoverable_owned_ordered_text_document;
import "owned_text_document_ordered_runs.ink" as ordinary;
import "../../knowledge/libraries/endpoint_index_span_graph_ordered_runs.ink" as spans;
import "../../knowledge/libraries/endpoint_batch_state_codec_ordered_runs.ink" as codec;
import "../../knowledge/libraries/batched_event_graph.ink" as batches;
import "../../knowledge/libraries/interval_index.ink" as intervals;
import "../../knowledge/libraries/uniform_interval_index.ink" as uniform;
// Preserve the consumed log on failure so the caller can replay an unsupported
// batch frontier without retaining a second copy on every successful merge.
record Attempt{document:ordinary.Document,valid:Bool,}
fn attempted(document:ordinary.Document,incoming:List<batches.Change>)->Attempt{
 var w:spans.Walker=codec.loaded(document.engine);
 var history:Buffer<batches.Change>=buffer(document.history);
 for c in incoming{
  let p=uniform.locate(uniform.Prefix{start:w.prefix_id,width:w.prefix_width,count:w.prefix},c.id);
  let found=choose(p.value!=0,intervals.Found{index:w.identities,value:p.value,start:p.start,end:p.end},intervals.locate(w.identities,c.id));
  let slot=found.value;let start=found.start;
  w=spans.Walker{..w,identities:found.index};
  let duplicate=slot!=0 && start==c.id && slot<=history.len() && history.at_or(slot-1,c)==c;
  if !duplicate{w=spans.apply(w,c);history=history.push(c);}
 }
 let valid=w.error==0 && w.engine.error==0 && w.graph.valid && w.engine.ids.valid && w.identities.valid;
 return Attempt{document:ordinary.Document{engine:codec.stored(w),history:history.freeze()},valid:valid};
}
