module persistent_atom_crdt;
import "../../knowledge/libraries/text_crdts.ink" as text;
// Durable logical state keeps identities, origins, stamps, payloads and tombstones.
// Mode belongs to the document and cannot change after receiving operations.
private state Document:text.Document=text.empty();
private state Mode:u32=0;
private state Started:Bool=false;
change initialise(mode:u32)->Result<Unit,text.Error> reads(Started) writes(Mode){
 if Started || mode>3{return Err(text.Error.InvalidMode);}Mode=mode;return Ok(());
}
fn received(doc:text.Document,operations:List<text.Operation>,mode:u32)->Result<text.Document,text.Error>{
 var result:Result<text.Document,text.Error>=Ok(doc);
 for operation in operations{result=result.fold(fn(doc)=>text.receive(doc,operation,mode),fn(error)=>Err(error));}
 return result;
}
change merge(operations:List<text.Operation>)->Result<Unit,text.Error> reads(Document,Mode) writes(Document,Started){
 let doc=received(Document,operations,Mode)?;
 Document=doc;Started=true;return Ok(());
}
query visible()->List<u32> reads(Document){return text.visible(Document);}
query logical()->text.Document reads(Document){return Document;}
query mode()->u32 reads(Mode){return Mode;}
