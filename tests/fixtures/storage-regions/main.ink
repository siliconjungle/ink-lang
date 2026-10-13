module storage_probe;
import "../../../knowledge/libraries/storage-regions.ink" as arena;
import "../../../knowledge/libraries/chunked-sequences.ink" as chunks;
fn arena_roundtrip(rows:List<List<u32>>,maximum:u32)->Result<List<List<u32>>,arena.StorageError>{
 return arena.pack(rows,maximum).map(fn(value)=>arena.unpack(value));
}
fn arena_words(rows:List<List<u32>>,maximum:u32)->Result<List<u32>,arena.StorageError>{
 return arena.pack(rows,maximum).map(fn(value)=>arena.words(value));
}
fn arena_lookup(value:arena.Arena,index:u32)->Option<List<u32>>{
 return arena.handle(value,index).fold(fn(handle)=>arena.read(value,handle),fn(_)=>None);
}
fn arena_read(value:arena.Arena,handle:arena.Handle)->Option<List<u32>>{return arena.read(value,handle);}
fn chunks_roundtrip(words:List<u32>,width:u32)->Result<List<u32>,chunks.ChunkError>{
 return chunks.pack(words,width).map(fn(value)=>chunks.unpack(value));
}
fn chunks_blocks(words:List<u32>,width:u32)->Result<List<List<u32>>,chunks.ChunkError>{
 return chunks.pack(words,width).map(fn(value)=>chunks.blocks(value));
}
fn chunks_unwrap(value:chunks.Chunked)->List<u32>{return chunks.unpack(value);}
fn numeric(xs:List<u32>)->List<u32>{return xs.map(fn(x)=>x+1);}
private state Current:u32=0;
event Saved:u32;
change set(value:u32)->Result<Unit,String> writes(Current) emits(Saved){Current=value;emit Saved(value);return Ok(());}
change abort(value:u32)->Result<Unit,String> writes(Current) emits(Saved){Current=value;emit Saved(value);return Err("aborted");}
query current()->u32 reads(Current){return Current;}
