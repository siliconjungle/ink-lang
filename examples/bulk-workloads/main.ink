module bulk_workloads;
import "../../knowledge/libraries/buffers.ink" as ranges;
import "../../knowledge/libraries/voxels.ink" as voxels;
import "../../knowledge/libraries/codecs.ink" as codecs;
import "../../knowledge/libraries/ecs.ink" as ecs;
fn paint(cells:List<u32>,width:u32,height:u32,x:u32,y:u32,z:u32,nx:u32,ny:u32,nz:u32,v:u32)->List<u32>{return voxels.paint_box<u32>(cells,width,height,x,y,z,nx,ny,nz,v);}
fn encode(xs:List<u32>)->List<u32>{return codecs.encode_runs(xs);}
fn decode(words:List<u32>,maximum:u32)->Result<List<u32>,codecs.DecodeError>{return codecs.decode_runs(words,maximum);}
fn remove(ids:List<u32>,values:List<u32>,start:u32,count:u32)->Result<ecs.Column<u32>,ecs.ColumnError>{return ecs.remove_range<u32>(ecs.Column<u32>{entities:ids,values:values},start,count);}
fn gather(ids:List<u32>,values:List<u32>,requested:List<u32>)->Result<List<Option<u32>>,ecs.ColumnError>{return ecs.gather<u32>(ecs.Column<u32>{entities:ids,values:values},requested,0);}
fn erase(xs:List<u32>,start:u32,count:u32)->List<u32>{return ranges.erase_range<u32>(xs,start,count);}
fn gap(xs:List<u32>,start:u32,count:u32,v:u32,maximum:u32)->List<u32>{return ranges.insert_gap<u32>(xs,start,count,v,maximum);}
fn fill(xs:List<u32>,start:u32,count:u32,v:u32)->List<u32>{return buffer(xs).fill_range(start,count,v).freeze();}
fn copy(xs:List<u32>,source:u32,destination:u32,count:u32)->List<u32>{return buffer(xs).copy_within(source,destination,count).freeze();}
fn split(xs:List<u32>)->List<u32>{return buffer(xs).split_at(3,fn(a)=>fn(b)=>a.fill_range(1,4294967295,9).append(b.copy_within(0,1,4294967295))).freeze();}
fn voxel_linear(x:u32,y:u32,z:u32,width:u32,height:u32)->u32{return voxels.linear(x,y,z,width,height);}
state Chunks:Table<u32,List<u32>>=Table.empty();
event changed:u32;
enum Error{Missing,Failed,}
change put(key:u32,cells:List<u32>)->Result<Unit,Error> writes(Chunks) emits(changed){
 if Chunks.contains(key){Chunks.replace(key,cells);}else{Chunks.insert(key,cells);}
 emit changed(key);return Ok(());
}
change edit(key:u32,start:u32,count:u32,v:u32,fail:Bool)->Result<Unit,Error> reads(Chunks) writes(Chunks) emits(changed){
 let cells=Chunks.get(key).ok_or(Error.Missing)?;
 let updated=fill(cells,start,count,v);Chunks.replace(key,updated);emit changed(key);
 if fail{return Err(Error.Failed);}return Ok(());
}
query cells(key:u32)->Option<List<u32>> reads(Chunks){return Chunks.get(key);}

fn voxel_offsets(xs:List<u32>)->List<u32>{return xs.map(fn(v)=>v+1);}
fn copy_strings(xs:List<String>,source:u32,destination:u32,count:u32)->List<String>{return buffer(xs).copy_within(source,destination,count).freeze();}
fn fill_float(xs:List<f32>,start:u32,count:u32,v:f32)->List<f32>{return buffer(xs).fill_range(start,count,v).freeze();}
fn pack(xs:List<u32>)->Result<List<u32>,codecs.DecodeError>{return codecs.pack_octets(xs);}
fn unpack(xs:List<u32>,maximum:u32)->Result<List<u32>,codecs.DecodeError>{return codecs.unpack_octets(xs,maximum);}
record PairLists { first:List<u32>, second:List<u32>, }
fn twice(xs:List<u32>)->PairLists{return PairLists{first:xs,second:xs};}
fn shadowed(xs:List<u32>)->List<u32>{let xs=xs.drop(1);return xs;}
fn captured(xs:List<u32>)->List<u32>{return xs.map(fn(i)=>xs.at_or(i,9));}
fn branch_reuse(xs:List<u32>,pick:Bool)->PairLists{let a=choose(pick,xs.drop(1),xs.take(1));return PairLists{first:a,second:xs};}
fn after_map(xs:List<u32>)->PairLists{let a=buffer(xs).map(fn(i)=>i+1).freeze();return PairLists{first:a,second:xs};}
fn parallel_capture(xs:List<u32>)->List<u32>{return parallel_map(xs,1,fn(i)=>fn(value)=>xs.at_or(value,9));}
