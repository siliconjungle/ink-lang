module ordered_run_text_document;
import "ordered_retained_run_append_log_bootstrap.ink" as bootstrap;
import "owned_text_document_ordered_runs.ink" as ordinary;
import "recoverable_owned_ordered_text_document.ink" as recover;
import "../../knowledge/libraries/replayed_change_log.ink" as replay;
import "../../knowledge/libraries/batched_event_graph.ink" as batches;
import "../../knowledge/libraries/text_crdts.ink" as text;
import "../../knowledge/libraries/streamed_gap_sequence.ink" as gap;
import "../../knowledge/libraries/causal_log_snapshot.ink" as snapshot;
// Keep a sequential actor's operation log and gap buffer until a change needs
// the general causal engine. A checked uniform prefix is transferred into one
// compact retained run at the first fork. Full operation history is retained.
// An unsupported interior batch frontier uses the full positional-event replay.
// This new program still needs a complete source-preservation bridge before it
// can be installed as a planner replacement for the ordinary document.
record Document{scalar:Bool,scalar_text:List<u32>,uniform:Bool,first:u64,width:u32,state:ordinary.Document,linear:Bool,data:List<u32>,start:u32,end:u32,last:u64,}
record Attempt{uniform:Bool,first:u64,width:u32,remaining:Buffer<batches.Change>,history:Buffer<batches.Change>,data:gap.Gap<u32>,last:u64,index:u32,stop:Bool,error:Bool,}
record Search{history:Buffer<batches.Change>,low:u32,high:u32,}
record Found{history:Buffer<batches.Change>,duplicate:Bool,}
fn nil()->batches.Change{return batches.Change{id:0,parents:[],position:0,remove:0,text:[]};}
fn searched(s:Search,id:u64)->Search{
 let middle=s.low+wrapping_shr(s.high-s.low,1);let c=s.history.at_or(middle,nil());
 return choose(c.id<id,Search{..s,low:middle+1},Search{..s,high:middle});
}
fn duplicate(history:Buffer<batches.Change>,c:batches.Change)->Found{
 let count=history.len();
 let s=repeat_until(32,Search{history:history,low:0,high:count},fn(s)=>s.low>=s.high,fn(i,s)=>searched(s,c.id));
 let prior=s.history.at_or(s.low,nil());
 return Found{history:s.history,duplicate:s.low<count && prior==c};
}
fn attempted(s:Attempt,c:batches.Change)->Attempt{
 if s.error{return s;}
 if s.stop{return Attempt{..s,remaining:s.remaining.push(c)};}
 if s.last!=0 && c.id<=s.last{
  let found=duplicate(s.history,c);
  return Attempt{..s,remaining:choose(found.duplicate,s.remaining,s.remaining.push(c)),history:found.history,index:s.index+choose(found.duplicate,1,0),stop:!found.duplicate};
 }
 let follows=choose(s.last==0,length(c.parents)==0 && (c.id & 4294967295)==1,
  c.id==s.last+1 && length(c.parents)==1 && c.parents.at_or(0,0)==s.last);
 if !follows{return Attempt{..s,remaining:s.remaining.push(c),stop:true};}
 let n=s.data.data.len()-s.data.end+s.data.start;
 let codes=foldl(c.text,true,fn(value,ok)=>ok && value<1114112 && !(value>=55296 && value<57344));
 if !batches.valid(c) || !codes || c.position>n || c.remove>n-c.position{return Attempt{..s,error:true};}
 let data=gap.inserted_many<u32>(gap.erased<u32>(gap.moved<u32>(s.data,c.position),c.remove),c.text);
 return Attempt{uniform:s.uniform && c.remove==0 && c.position==n && (s.last==0 || length(c.text)==s.width),first:choose(s.last==0,c.id,s.first),width:length(c.text),remaining:s.remaining,history:s.history.push(c),data:data,last:c.id+batches.width(c)-1,index:s.index+1,stop:false,error:false};
}
fn general(state:ordinary.Document)->Document{return Document{scalar:false,scalar_text:[],uniform:false,first:0,width:0,state:state,linear:false,data:[],start:0,end:0,last:0};}
fn empty()->Document{
 let data=gap.empty<u32>(0);
 return Document{scalar:false,scalar_text:[],uniform:true,first:0,width:0,state:ordinary.empty(),linear:true,data:data.data.freeze(),start:data.start,end:data.end,last:0};
}
fn scalarized(value:replay.Rebuilt)->Document{
 let empty=ordinary.empty();
 return Document{scalar:true,scalar_text:value.visible,uniform:false,first:0,width:0,state:ordinary.Document{engine:empty.engine,history:value.history},linear:false,data:[],start:0,end:0,last:0};
}
fn recovered(attempt:recover.Attempt)->Result<Document,text.Error>{
 if attempt.valid{return Ok(general(attempt.document));}
 let value=replay.rebuilt(attempt.document.history)?;return Ok(scalarized(value));
}
fn merge(document:Document,incoming:List<batches.Change>)->Result<Document,text.Error>{
 if document.scalar{let value=replay.extended(document.state.history,incoming)?;return Ok(scalarized(value));}
 if !document.linear{return recovered(recover.attempted(document.state,incoming));}
 var attempt:Attempt=Attempt{uniform:document.uniform,first:document.first,width:document.width,remaining:Buffer.empty(),history:buffer(document.state.history),data:gap.Gap<u32>{data:buffer(document.data),start:document.start,end:document.end,fallback:0},last:document.last,index:0,stop:false,error:false};
 for c in incoming{attempt=attempted(attempt,c);}
 if attempt.error{return Err(text.Error.InvalidOperation);}
 let history=attempt.history.freeze();let remaining=attempt.remaining.freeze();
 if attempt.stop{
  let state=bootstrap.materialize(history,attempt.data,attempt.uniform,attempt.first,attempt.width,attempt.last)?;
  return recovered(recover.attempted(state,remaining));
 }
 let data=attempt.data;
 return Ok(Document{scalar:false,scalar_text:[],uniform:attempt.uniform,first:attempt.first,width:attempt.width,state:ordinary.Document{engine:document.state.engine,history:history},linear:true,data:data.data.freeze(),start:data.start,end:data.end,last:attempt.last});
}
fn visible(document:Document)->Result<List<u32>,text.Error>{
 if document.scalar{return Ok(document.scalar_text);}
 if !document.linear{return ordinary.visible(document.state);}
 return Ok(gap.freeze<u32>(gap.Gap<u32>{data:buffer(document.data),start:document.start,end:document.end,fallback:0}));
}
fn save(document:Document)->Result<List<u32>,text.Error>{return ordinary.save(document.state);}
fn load(words:List<u32>)->Result<Document,text.Error>{
 let changes=snapshot.decode(words,1000000,268435456).map_err(fn(e)=>text.Error.InvalidOperation)?;
 let count=length(changes);let document=merge(empty(),changes)?;
 if length(document.state.history)!=count{return Err(text.Error.InvalidOperation);}
 return Ok(document);
}
