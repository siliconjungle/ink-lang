use compiled_state::{State,l_Particle};
use block_mesh::{Voxel,VoxelVisibility,UnitQuadBuffer,visible_block_faces,RIGHT_HANDED_Y_UP_CONFIG};
use block_mesh::ndshape::RuntimeShape;
use std::ffi::c_void;
#[derive(Clone,Copy)] struct Cell(u32);
impl Voxel for Cell {fn get_visibility(&self)->VoxelVisibility {if self.0==0 {VoxelVisibility::Empty}else{VoxelVisibility::Opaque}}}
enum Mesh { Ink(Vec<[u32;4]>), Block(UnitQuadBuffer) }
#[no_mangle] pub unsafe extern "C" fn mesh_run(xs:*const u32,n:usize,side:u32,which:u32)->*mut c_void {
 let xs=std::slice::from_raw_parts(xs,n);
 let mesh=if which<2 {
  let out=if which==0 {State::new().function_l_faces(xs.to_vec(),side)} else {State::new().function_l_faces_linear(xs.to_vec(),side)};
  // Keep the native Face carrier, via a layout-neutral array conversion.
  Mesh::Ink(out.into_iter().map(|f|[f.l_x,f.l_y,f.l_z,f.l_direction]).collect())
 }else{
  let voxels:Vec<_>=xs.iter().map(|&x|Cell(x)).collect();
  let mut out=UnitQuadBuffer::new();
  visible_block_faces(&voxels,&RuntimeShape::<u32,3>::new([side;3]),[0;3],[side-1;3],&RIGHT_HANDED_Y_UP_CONFIG.faces,&mut out);
  Mesh::Block(out)
 };
 Box::into_raw(Box::new(mesh)).cast()
}
#[no_mangle] pub unsafe extern "C" fn mesh_size(p:*const c_void)->usize {match &*p.cast::<Mesh>() {Mesh::Ink(v)=>v.len(),Mesh::Block(v)=>v.num_quads()}}
#[no_mangle] pub unsafe extern "C" fn mesh_snapshot(p:*const c_void,out:*mut u32) {
 let count=mesh_size(p);let dest=std::slice::from_raw_parts_mut(out,count*4);
 match &*p.cast::<Mesh>(){
 Mesh::Ink(v)=>for (i,q) in v.iter().enumerate(){dest[i*4..i*4+4].copy_from_slice(q);},
 Mesh::Block(v)=>{
 let mut i=0;for (g,qs) in v.groups.iter().enumerate(){let normal=RIGHT_HANDED_Y_UP_CONFIG.faces[g].signed_normal().to_array();let d=if normal[0]<0{0}else if normal[0]>0{1}else if normal[1]<0{2}else if normal[1]>0{3}else if normal[2]<0{4}else{5};
 for q in qs{dest[i*4..i*4+4].copy_from_slice(&[q.minimum[0],q.minimum[1],q.minimum[2],d]);i+=1;}}
 }}
}
#[no_mangle] pub unsafe extern "C" fn mesh_free(p:*mut c_void){drop(Box::from_raw(p.cast::<Mesh>()));}
struct World {state:State,particles:Vec<l_Particle>,owned:bool}
#[no_mangle] pub extern "C" fn ink_ecs_new(n:usize,owned:u32)->*mut c_void{Box::into_raw(Box::new(World{state:State::new(),particles:(0..n).map(|i|l_Particle{l_position:i as u32,l_velocity:(i%7)as u32}).collect(),owned:owned!=0})).cast()}
#[no_mangle] pub unsafe extern "C" fn ink_ecs_step(p:*mut c_void){let w=&mut *p.cast::<World>();let xs=std::mem::take(&mut w.particles);w.particles=if w.owned{w.state.function_l_particles_owned(xs)}else{w.state.function_l_particles(xs)};}
#[no_mangle] pub unsafe extern "C" fn ink_ecs_read(p:*const c_void,i:usize)->u32{(&*p.cast::<World>()).particles[i].l_position}
#[no_mangle] pub unsafe extern "C" fn ink_ecs_free(p:*mut c_void){drop(Box::from_raw(p.cast::<World>()));}
#[no_mangle] pub unsafe extern "C" fn ink_encode(xs:*const u32,n:usize)->*mut c_void{let xs=std::slice::from_raw_parts(xs,n).to_vec();Box::into_raw(Box::new(State::new().function_l_encode(xs))).cast()}
#[no_mangle] pub unsafe extern "C" fn ink_decode(xs:*const c_void,maximum:usize)->*mut c_void{let xs=(&*xs.cast::<Vec<u32>>()).clone();Box::into_raw(Box::new(State::new().function_l_decode(xs,maximum as u32).unwrap())).cast()}
#[no_mangle] pub unsafe extern "C" fn ink_words(p:*const c_void)->*const u32{(&*p.cast::<Vec<u32>>()).as_ptr()}
#[no_mangle] pub unsafe extern "C" fn ink_size(p:*const c_void)->usize{(&*p.cast::<Vec<u32>>()).len()*4}
#[no_mangle] pub unsafe extern "C" fn ink_free(p:*mut c_void){drop(Box::from_raw(p.cast::<Vec<u32>>()));}
#[no_mangle] pub unsafe extern "C" fn ink_encode_adaptive(xs:*const u32,n:usize)->*mut c_void{let xs=std::slice::from_raw_parts(xs,n).to_vec();Box::into_raw(Box::new(State::new().function_l_encode_adaptive(xs))).cast()}
#[no_mangle] pub unsafe extern "C" fn ink_decode_adaptive(xs:*const c_void,maximum:usize)->*mut c_void{let xs=(&*xs.cast::<Vec<u32>>()).clone();Box::into_raw(Box::new(State::new().function_l_decode_adaptive(xs,maximum as u32).unwrap())).cast()}
#[no_mangle] pub unsafe extern "C" fn ink_ecs_storage(p:*const c_void)->usize{(&*p.cast::<World>()).particles.as_ptr() as usize}
