module run_text_examples;
import "../../knowledge/libraries/run_text_crdts.ink" as runs;
import "../../knowledge/libraries/text_crdts.ink" as reference;
fn replay(operations:List<reference.Operation>,mode:u32)->Result<List<reference.Atom>,reference.Error>{return runs.replay(operations,mode);}
fn run_count(operations:List<reference.Operation>,mode:u32)->u32{var e:runs.Engine=runs.empty();for op in operations{e=runs.receive(e,op,mode);}return e.spans.len()-1;}

fn local(edits:List<runs.Edit>,mode:u32)->Result<List<reference.Atom>,reference.Error>{return runs.local(edits,mode);}

fn local_text(edits:List<runs.Edit>,mode:u32)->Result<List<u32>,reference.Error>{return runs.local_text(edits,mode);}
