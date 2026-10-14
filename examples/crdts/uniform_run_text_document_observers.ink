module uniform_run_text_document_observers;
import "uniform_run_text_document.ink" as document;
import "../../knowledge/libraries/batched_event_graph.ink" as batches;
import "../../knowledge/libraries/text_crdts.ink" as text;
record Observed{before:List<u32>,after:List<u32>,restored:List<u32>,history:List<batches.Change>,duplicate_history:List<batches.Change>,snapshot:List<u32>,}
fn exercise(initial:List<batches.Change>,incoming:List<batches.Change>)->Result<Observed,text.Error>{
 let first=document.merge(document.empty(),initial)?;
 let before=document.visible(first)?;
 let next=document.merge(first,incoming)?;
 let after=document.visible(next)?;
 let duplicate=document.merge(next,incoming)?;
 let words=document.save(next)?;
 let restored=document.load(words)?;
 let restored_text=document.visible(restored)?;
 return Ok(Observed{before:before,after:after,restored:restored_text,history:next.state.history,duplicate_history:duplicate.state.history,snapshot:words});
}

fn empty()->document.Document{return document.empty();}
fn merged(value:document.Document,incoming:List<batches.Change>)->Result<document.Document,text.Error>{return document.merge(value,incoming);}
fn visible(value:document.Document)->Result<List<u32>,text.Error>{return document.visible(value);}
fn saved(value:document.Document)->Result<List<u32>,text.Error>{return document.save(value);}
fn loaded(words:List<u32>)->Result<document.Document,text.Error>{return document.load(words);}
fn history(value:document.Document)->List<batches.Change>{return value.state.history;}
