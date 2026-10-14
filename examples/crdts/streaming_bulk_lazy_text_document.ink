module streaming_bulk_lazy_text_document;
import "append_log_bootstrap.ink" as bootstrap;
import "owned_text_document.ink" as ordinary;
import "../../knowledge/libraries/batched_event_graph.ink" as batches;
import "../../knowledge/libraries/text_crdts.ink" as text;
import "../../knowledge/libraries/bulk_copy_gap_sequence.ink" as gap;
import "../../knowledge/libraries/causal_log_snapshot.ink" as snapshot;
// Keep a sequential actor's operation log and gap buffer until a change needs
// the general causal engine. Materialisation replays every retained operation;
// a late fork pays that cost in its merge. No history is discarded.
// This new program still needs a complete source-preservation bridge before it
// can be installed as a planner replacement for the ordinary document.
record Document{state:ordinary.Document,linear:Bool,data:List<u32>,start:u32,end:u32,last:u64,}
record Attempt{remaining:Buffer<batches.Change>,history:Buffer<batches.Change>,data:gap.Gap<u32>,last:u64,index:u32,stop:Bool,error:Bool,}
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
 return Attempt{remaining:s.remaining,history:s.history.push(c),data:data,last:c.id+batches.width(c)-1,index:s.index+1,stop:false,error:false};
}
fn general(state:ordinary.Document)->Document{return Document{state:state,linear:false,data:[],start:0,end:0,last:0};}
fn empty()->Document{
 let data=gap.empty<u32>(0);
 return Document{state:ordinary.empty(),linear:true,data:data.data.freeze(),start:data.start,end:data.end,last:0};
}
fn merge(document:Document,incoming:List<batches.Change>)->Result<Document,text.Error>{
 if !document.linear{let state=ordinary.merge(document.state,incoming)?;return Ok(general(state));}
 var attempt:Attempt=Attempt{remaining:Buffer.empty(),history:buffer(document.state.history),data:gap.Gap<u32>{data:buffer(document.data),start:document.start,end:document.end,fallback:0},last:document.last,index:0,stop:false,error:false};
 for c in incoming{attempt=attempted(attempt,c);}
 if attempt.error{return Err(text.Error.InvalidOperation);}
 let history=attempt.history.freeze();let remaining=attempt.remaining.freeze();
 if attempt.stop{
  let state=bootstrap.materialize(history)?;
  let state=ordinary.merge(state,remaining)?;
  return Ok(general(state));
 }
 let data=attempt.data;
 return Ok(Document{state:ordinary.Document{engine:document.state.engine,history:history},linear:true,data:data.data.freeze(),start:data.start,end:data.end,last:attempt.last});
}
fn visible(document:Document)->Result<List<u32>,text.Error>{
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
