module storage_probe;
import "../../../knowledge/libraries/storage-regions.ink" as arena;
import "../../../knowledge/libraries/chunked-sequences.ink" as chunks;
fn arena_roundtrip(rows:List<List<u32>>,maximum:u32)->Result<List<List<u32>>,arena.StorageError>{
 return arena.pack<u32>(rows,maximum).map(fn(value)=>arena.unpack<u32>(value));
}
fn arena_words(rows:List<List<u32>>,maximum:u32)->Result<List<u32>,arena.StorageError>{
 return arena.pack<u32>(rows,maximum).map(fn(value)=>arena.items<u32>(value));
}
fn arena_lookup(value:arena.Arena<u32>,index:u32)->Option<List<u32>>{
 return arena.handle<u32>(value,index).fold(fn(handle)=>arena.read<u32>(value,handle),fn(_)=>None);
}
fn arena_read(value:arena.Arena<u32>,handle:arena.Handle<u32>)->Option<List<u32>>{return arena.read<u32>(value,handle);}
fn chunks_roundtrip(words:List<u32>,width:u32)->Result<List<u32>,chunks.ChunkError>{
 return chunks.pack<u32>(words,width).map(fn(value)=>chunks.unpack<u32>(value));
}
fn chunks_blocks(words:List<u32>,width:u32)->Result<List<List<u32>>,chunks.ChunkError>{
 return chunks.pack<u32>(words,width).map(fn(value)=>chunks.blocks<u32>(value));
}
fn chunks_unwrap(value:chunks.Chunked<u32>)->List<u32>{return chunks.unpack<u32>(value);}
fn numeric(xs:List<u32>)->List<u32>{return xs.map(fn(x)=>x+1);}
private state Current:u32=0;
event Saved:u32;
change set(value:u32)->Result<Unit,String> writes(Current) emits(Saved){Current=value;emit Saved(value);return Ok(());}
change abort(value:u32)->Result<Unit,String> writes(Current) emits(Saved){Current=value;emit Saved(value);return Err("aborted");}
query current()->u32 reads(Current){return Current;}
