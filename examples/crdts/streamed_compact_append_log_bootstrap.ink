module streamed_compact_append_log_bootstrap;
import "../../knowledge/libraries/list_buffer_append.ink" as copied;
import "owned_text_document_fused.ink" as ordinary;
import "../../knowledge/libraries/endpoint_index_span_graph_fused.ink" as spans;
import "../../knowledge/libraries/endpoint_batch_state_codec_fused.ink" as codec;
import "../../knowledge/libraries/batched_event_graph.ink" as batches;
import "../../knowledge/libraries/interval_index.ink" as intervals;
import "../../knowledge/libraries/sorted_interval_builder.ink" as sorted;
import "../../knowledge/libraries/blocked_measure_sequence.ink" as sequence;
import "../../knowledge/libraries/view_pair_causal_workspace.ink" as causal;
import "../../knowledge/libraries/ragged_buffer.ink" as ragged;
import "../../knowledge/libraries/text_crdts.ink" as text;
// A contiguous append prefix has one insertion run. Original causal endpoints
// and replay targets remain separate, so historical forks retain their meaning.
// This source constructor still needs a complete representation bridge.
record Build{entries:Buffer<sorted.Entry>,payload:Buffer<u32>,graph:Buffer<causal.Node>,marks:Buffer<causal.Mark>,targets:Buffer<spans.Target>,ranges:Buffer<ragged.Range>,first:u64,last:u64,eligible:Bool,}
fn step(s:Build,c:batches.Change)->Build{
 if !s.eligible{return s;}
 let count=length(c.text);let first=s.last==0;
 let follows=choose(first,length(c.parents)==0 && (c.id & 4294967295)==1,length(c.parents)==1 && c.parents.at_or(0,0)==s.last && c.id==s.last+1);
 let codes=foldl(c.text,true,fn(value,ok)=>ok && value<1114112 && !(value>=55296 && value<57344));
 if !batches.valid(c) || !follows || !codes || c.remove!=0 || c.position!=s.payload.len(){return Build{..s,eligible:false};}
 let slot=s.graph.len();let previous=slot-1;let end=c.id+word_widen_u32_to_u64(count);
 return Build{entries:s.entries.push(sorted.Entry{start:c.id,end:end,value:slot}),payload:copied.append<u32>(s.payload,c.text),graph:s.graph.push(causal.Node{base:1,parent:previous,second:0,frontier:0}),marks:s.marks.push(causal.unmarked()),targets:s.targets.push(spans.Target{slot:1,id:c.id,length:count,insert:true}),ranges:s.ranges.push(ragged.Range{start:previous,end:slot}),first:choose(first,c.id,s.first),last:end-1,eligible:true};
}
fn materialize(history:List<batches.Change>)->Result<ordinary.Document,text.Error>{
 if length(history)==0{return Ok(ordinary.empty());}
 let s=foldl(history,Build{entries:Buffer.empty(),payload:Buffer.empty(),graph:buffer([causal.nil()]),marks:buffer([causal.unmarked()]),targets:Buffer.empty(),ranges:Buffer.empty(),first:0,last:0,eligible:true},fn(c,s)=>step(s,c));
 if !s.eligible{return ordinary.merge(ordinary.empty(),history);}
 let entries=s.entries.freeze();let identities=sorted.build(entries);let count=s.payload.len();
 let ids=intervals.insert(intervals.empty(),s.first,s.last+1,1);
 let tree=sequence.insert_before<u32>(sequence.empty<u32>(0),0,1,count,count,0);
 let span=spans.Span{interval_slot:1,next_fragment:0,id:s.first,left:0,right:0,left_hint:0,right_hint:0,length:count,payload:0,active:true,deletes:0,deleted:false};
 let graph=causal.Graph{nodes:s.graph,frontiers:buffer([[]]),marks:s.marks,queue:Buffer.empty(),removed:Buffer.empty(),added:Buffer.empty(),generation:0,valid:true};
 let w=spans.Walker{identity_hint:length(entries),engine:spans.Engine{insert_hint:1,tree:tree,spans:buffer([spans.nil(),span]),payload:s.payload,ids:ids,error:0},graph:graph,identities:identities,applied:ragged.Rows<spans.Target>{values:s.targets,ranges:s.ranges},last:s.last,error:0};
 return Ok(ordinary.Document{engine:codec.stored(w),history:history});
}
