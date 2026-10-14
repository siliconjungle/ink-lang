module storage_generic;
import "../../../knowledge/libraries/storage-regions.ink" as arena;
import "../../../knowledge/libraries/chunked-sequences.ink" as chunks;
record Sample { name:String, values:List<u32>, }
fn text_rows(rows:List<List<String>>,maximum:u32)->Result<List<List<String>>,arena.StorageError>{
 return arena.pack<String>(rows,maximum).map(fn(value)=>arena.unpack<String>(value));
}
fn text_chunks(items:List<String>,width:u32)->Result<List<List<String>>,chunks.ChunkError>{
 return chunks.pack<String>(items,width).map(fn(value)=>chunks.blocks<String>(value));
}
fn record_rows(rows:List<List<Sample>>,maximum:u32)->Result<List<List<Sample>>,arena.StorageError>{
 return arena.pack<Sample>(rows,maximum).map(fn(value)=>arena.unpack<Sample>(value));
}
fn record_chunks(items:List<Sample>,width:u32)->Result<List<Sample>,chunks.ChunkError>{
 return chunks.pack<Sample>(items,width).map(fn(value)=>chunks.unpack<Sample>(value));
}
fn nested_rows(rows:List<List<List<u32>>>,maximum:u32)->Result<List<List<List<u32>>>,arena.StorageError>{
 return arena.pack<List<u32>>(rows,maximum).map(fn(value)=>arena.unpack<List<u32>>(value));
}
fn text_read(value:arena.Arena<String>,handle:arena.Handle<String>)->Option<List<String>>{
 return arena.read<String>(value,handle);
}
fn numeric(xs:List<u32>)->List<u32>{return xs.map(fn(x)=>x+1);}
