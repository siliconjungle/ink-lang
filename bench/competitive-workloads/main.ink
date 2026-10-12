module competitive_workloads;
import "../../knowledge/libraries/voxel_surface.ink" as mesh;
import "../../knowledge/libraries/codecs.ink" as codecs;
import "../../knowledge/libraries/adaptive_word_codec.ink" as adaptive;
record Particle { position:u32, velocity:u32, }
fn faces(cells:List<u32>,side:u32)->List<mesh.Face>{return mesh.visible_faces(cells,side);}
fn particles(xs:List<Particle>)->List<Particle>{return xs.map(fn(p)=>Particle{position:p.position+p.velocity,velocity:p.velocity});}
fn particles_owned(xs:List<Particle>)->List<Particle>{return buffer(xs).map(fn(p)=>Particle{position:p.position+p.velocity,velocity:p.velocity}).freeze();}
fn encode(xs:List<u32>)->List<u32>{return codecs.encode_runs(xs);}
fn decode(xs:List<u32>,maximum:u32)->Result<List<u32>,codecs.DecodeError>{return codecs.decode_runs(xs,maximum);}
fn pack(xs:List<u32>)->Result<List<u32>,codecs.DecodeError>{return codecs.pack_octets(xs);}
fn unpack(xs:List<u32>,maximum:u32)->Result<List<u32>,codecs.DecodeError>{return codecs.unpack_octets(xs,maximum);}

fn faces_linear(cells:List<u32>,side:u32)->List<mesh.Face>{return mesh.visible_faces_linear(cells,side);}
fn encode_adaptive(xs:List<u32>)->List<u32>{return adaptive.encode(xs);}
fn decode_adaptive(xs:List<u32>,maximum:u32)->Result<List<u32>,codecs.DecodeError>{return adaptive.decode(xs,maximum);}

fn offsets(xs:List<u32>)->List<u32>{return xs.map(fn(v)=>v+1);}
