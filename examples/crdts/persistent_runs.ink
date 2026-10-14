module persistent_run_crdt;
import "../../knowledge/libraries/run_text_crdts.ink" as runs;
import "../../knowledge/libraries/text_crdts.ink" as text;
import "../../knowledge/libraries/run_state_codec.ink" as codec;
private state Engine:codec.Stored=codec.empty();
private state Mode:u32=0;
private state Started:Bool=false;
change initialise(mode:u32)->Result<Unit,text.Error> reads(Started) writes(Mode){if Started || mode>3{return Err(text.Error.InvalidMode);}Mode=mode;return Ok(());}
fn received(engine:runs.Engine,operations:List<text.Operation>,mode:u32)->runs.Engine{var engine:runs.Engine=engine;for operation in operations{engine=runs.receive(engine,operation,mode);}return engine;}
fn merged(stored:codec.Stored,operations:List<text.Operation>,mode:u32)->Result<codec.Stored,text.Error>{
 let engine=received(codec.loaded(stored),operations,mode);
 if engine.error==1{return Err(text.Error.MissingDependency);}if engine.error==2{return Err(text.Error.ConflictingIdentity);}if engine.error==3{return Err(text.Error.InvalidMode);}if engine.error==5{return Err(text.Error.InvalidPosition);}if engine.error!=0 || !engine.ids.valid{return Err(text.Error.InvalidOperation);}
 return Ok(codec.stored(engine));
}
fn visible_value(stored:codec.Stored)->Result<List<u32>,text.Error>{return runs.finish(codec.loaded(stored)).map(fn(atoms)=>atoms.filter(fn(a)=>!a.deleted).map(fn(a)=>a.value));}
fn logical_value(stored:codec.Stored)->Result<List<text.Atom>,text.Error>{return runs.finish(codec.loaded(stored));}
change merge(operations:List<text.Operation>)->Result<Unit,text.Error> reads(Engine,Mode) writes(Engine,Started){Engine=merged(Engine,operations,Mode)?;Started=true;return Ok(());}
query visible()->Result<List<u32>,text.Error> reads(Engine){return visible_value(Engine);}
query logical()->Result<List<text.Atom>,text.Error> reads(Engine){return logical_value(Engine);}
query mode()->u32 reads(Mode){return Mode;}
