module retained_run_append_log_bootstrap;
import "uniform_run_append_log_bootstrap.ink" as fallback;
import "owned_text_document_uniform_runs.ink" as ordinary;
import "../../knowledge/libraries/endpoint_index_span_graph_uniform_runs.ink" as spans;
import "../../knowledge/libraries/endpoint_batch_state_codec_uniform_runs.ink" as codec;
import "../../knowledge/libraries/batched_event_graph.ink" as batches;
import "../../knowledge/libraries/interval_index.ink" as intervals;
import "../../knowledge/libraries/blocked_measure_sequence.ink" as sequence;
import "../../knowledge/libraries/run_causal_workspace.ink" as causal;
import "../../knowledge/libraries/ragged_buffer.ink" as ragged;
import "../../knowledge/libraries/streamed_gap_sequence.ink" as gap;
import "../../knowledge/libraries/text_crdts.ink" as text;
// The caller maintains the uniform append-prefix predicate while accepting
// changes. Transfer that already validated gap allocation into the run engine.
// Full reachable-state preservation of the tracked predicate remains unproved.
fn materialize(history:List<batches.Change>,data:gap.Gap<u32>,uniform:Bool,first:u64,width:u32,last:u64)->Result<ordinary.Document,text.Error>{
 let count=length(history);let extent=data.start;
 if !uniform || count==0 || width==0 || data.end!=data.data.len() || word_widen_u32_to_u64(extent)!=word_widen_u32_to_u64(count)*word_widen_u32_to_u64(width) || first+word_widen_u32_to_u64(extent)-1!=last{
  return fallback.materialize(history);
 }
 let payload=data.data.truncate(extent);
 let ids=intervals.insert(intervals.empty(),first,last+1,1);
 let tree=sequence.insert_before<u32>(sequence.empty<u32>(0),0,1,extent,extent,0);
 let span=spans.Span{interval_slot:1,next_fragment:0,id:first,left:0,right:0,left_hint:0,right_hint:0,length:extent,payload:0,active:true,deletes:0,deleted:false};
 let w=spans.Walker{prefix:count,prefix_id:first,prefix_width:width,identity_hint:0,engine:spans.Engine{insert_hint:1,tree:tree,spans:buffer([spans.nil(),span]),payload:payload,ids:ids,error:0},graph:causal.chain(count),identities:intervals.empty(),applied:ragged.empty<spans.Target>(),last:last,error:0};
 return Ok(ordinary.Document{engine:codec.stored(w),history:history});
}
