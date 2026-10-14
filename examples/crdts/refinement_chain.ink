module refinement_chain_examples;
import "../../knowledge/libraries/refined_span_graph.ink" as spans;
record Building{engine:spans.Engine,}
fn built(cuts:List<u32>)->spans.Engine{
 let zero:u32=0;let values=buffer_fill(64,zero).freeze();
 var e:spans.Engine=spans.inserted(spans.empty_engine(),4294967297,0,values);
 for cut in cuts{
  let r=spans.fragment_location(e,4294967297+word_widen_u32_to_u64(cut),1);
  e=spans.split(r.engine,r.slot,r.offset);
 }
 return e;
}
fn links(cuts:List<u32>)->List<u32>{
 let e=built(cuts);var values:Buffer<u32>=Buffer.empty();
 for span in e.spans.freeze(){values=values.append(buffer([word_narrow_u64_to_u32(span.id),span.length,span.next_fragment,span.payload]));}
 return values.freeze();
}
fn replay(cuts:List<u32>)->List<u32>{
 let e=built(cuts);let e=spans.toggle(e,spans.Target{slot:1,id:4294967297,length:64,insert:true},false);
 let e=spans.toggle(e,spans.Target{slot:1,id:4294967297,length:64,insert:true},true);
 var values:Buffer<u32>=Buffer.empty();
 for span in e.spans.freeze(){values=values.append(buffer([choose(span.active,1,0),span.deletes,span.next_fragment]));}
 return values.freeze();
}
