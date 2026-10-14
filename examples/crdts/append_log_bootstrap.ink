module append_log_bootstrap;
import "owned_text_document.ink" as ordinary;
import "../../knowledge/libraries/endpoint_index_span_graph.ink" as spans;
import "../../knowledge/libraries/endpoint_batch_state_codec.ink" as codec;
import "../../knowledge/libraries/batched_event_graph.ink" as batches;
import "../../knowledge/libraries/interval_index.ink" as intervals;
import "../../knowledge/libraries/sorted_interval_builder.ink" as sorted;
import "../../knowledge/libraries/bulk_measure_sequence.ink" as bulk;
import "../../knowledge/libraries/view_pair_causal_workspace.ink" as causal;
import "../../knowledge/libraries/ragged_buffer.ink" as ragged;
import "../../knowledge/libraries/text_crdts.ink" as text;
// Standalone constructor for a retained append-only prefix. It keeps one causal
// node/target per original change, so old frontier endpoints remain addressable.
// This new representation still requires a complete preservation proof.
record Build{items:Buffer<bulk.Item<u32>>,entries:Buffer<sorted.Entry>,spans:Buffer<spans.Span>,payload:Buffer<u32>,graph:Buffer<causal.Node>,marks:Buffer<causal.Mark>,targets:Buffer<spans.Target>,ranges:Buffer<ragged.Range>,last:u64,eligible:Bool,}
fn step(s:Build,c:batches.Change)->Build{
 if !s.eligible{return s;}
 let count=length(c.text);let first=s.last==0;
 let follows=choose(first,length(c.parents)==0 && (c.id & 4294967295)==1,length(c.parents)==1 && c.parents.at_or(0,0)==s.last && c.id==s.last+1);
 let codes=foldl(c.text,true,fn(value,ok)=>ok && value<1114112 && !(value>=55296 && value<57344));
 if !batches.valid(c) || !follows || !codes || c.remove!=0 || c.position!=s.payload.len(){return Build{..s,eligible:false};}
 let slot=s.spans.len();let previous=slot-1;let end=c.id+word_widen_u32_to_u64(count);
 let span=spans.Span{interval_slot:slot,next_fragment:0,id:c.id,left:s.last,right:0,left_hint:previous,right_hint:0,length:count,payload:c.position,active:true,deletes:0,deleted:false};
 let target=spans.Target{slot:slot,id:c.id,length:count,insert:true};
 return Build{items:s.items.push(bulk.Item<u32>{value:slot,extent:count,weight:count,weight2:0}),entries:s.entries.push(sorted.Entry{start:c.id,end:end,value:slot}),spans:s.spans.push(span),payload:s.payload.append(buffer(c.text)),graph:s.graph.push(causal.Node{base:1,parent:previous,second:0,frontier:0}),marks:s.marks.push(causal.unmarked()),targets:s.targets.push(target),ranges:s.ranges.push(ragged.Range{start:previous,end:slot}),last:end-1,eligible:true};
}
fn materialize(history:List<batches.Change>)->Result<ordinary.Document,text.Error>{
 let s=foldl(history,Build{items:Buffer.empty(),entries:Buffer.empty(),spans:buffer([spans.nil()]),payload:Buffer.empty(),graph:buffer([causal.nil()]),marks:buffer([causal.unmarked()]),targets:Buffer.empty(),ranges:Buffer.empty(),last:0,eligible:true},fn(c,s)=>step(s,c));
 if !s.eligible{return ordinary.merge(ordinary.empty(),history);}
 let items=s.items.freeze();let entries=s.entries.freeze();
 let ids=sorted.build(entries);let identities=sorted.build(entries);
 let tree=bulk.build<u32>(items,0);
 let graph=causal.Graph{nodes:s.graph,frontiers:buffer([[]]),marks:s.marks,queue:Buffer.empty(),removed:Buffer.empty(),added:Buffer.empty(),generation:0,valid:true};
 let w=spans.Walker{identity_hint:length(entries),engine:spans.Engine{insert_hint:length(entries),tree:tree,spans:s.spans,payload:s.payload,ids:ids,error:0},graph:graph,identities:identities,applied:ragged.Rows<spans.Target>{values:s.targets,ranges:s.ranges},last:s.last,error:0};
 return Ok(ordinary.Document{engine:codec.stored(w),history:history});
}
