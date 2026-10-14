module crdt_examples;
import "../../knowledge/libraries/text_crdts.ink" as text;
import "../../knowledge/libraries/indexed_text_crdts.ink" as indexed;
import "../../knowledge/libraries/positional_history.ink" as positional;
fn replay(ops:List<text.Operation>,mode:u32)->Result<text.Document,text.Error> {return text.replay(ops,mode);}
fn visible_text(ops:List<text.Operation>,mode:u32)->Result<List<u32>,text.Error> {
 return text.replay(ops,mode).map(fn(doc)=>text.visible(doc));
}
fn receive(doc:text.Document,op:text.Operation,mode:u32)->Result<text.Document,text.Error> {return text.receive(doc,op,mode);}
fn indexed_replay(ops:List<text.Operation>,mode:u32)->Result<List<text.Atom>,text.Error> {return indexed.replay(ops,mode);}
fn local(edits:List<indexed.Edit>,mode:u32)->Result<List<text.Atom>,text.Error> {return indexed.local(edits,mode);}
fn linear_history(edits:List<positional.Edit>)->positional.Snapshot{return positional.build(edits);}
