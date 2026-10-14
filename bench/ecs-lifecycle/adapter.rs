#[no_mangle]
pub unsafe extern "C" fn ink_ecs_run(capacity:u32,commands:*const u32,count:usize,output:*mut u32,output_capacity:usize)->usize {
 let input=std::slice::from_raw_parts(commands,count*4);
 let commands=input.chunks_exact(4).map(|c|Command{l_kind:c[0],l_slot:c[1],l_generation:c[2],l_value:c[3]}).collect();
 let snapshot=State::new().function_l_run(capacity,commands);
 write_snapshot(snapshot,output,output_capacity)
}
unsafe fn write_snapshot(snapshot:Snapshot,output:*mut u32,output_capacity:usize)->usize {
 let out=std::slice::from_raw_parts_mut(output,output_capacity);let mut at=0;
 for value in snapshot.l_generations {out[at]=value;at+=1;}
 out[at]=snapshot.l_rows.len() as u32;at+=1;
 for row in snapshot.l_rows {for value in [row.l_slot,row.l_generation,row.l_position,row.l_velocity,row.l_has_position as u32,row.l_has_velocity as u32]{out[at]=value;at+=1;}}
 out[at]=snapshot.l_query.len() as u32;at+=1;
 for value in snapshot.l_query {out[at]=value;at+=1;}
 at
}

#[no_mangle]
pub unsafe extern "C" fn ink_ecs_indexed(capacity:u32,commands:*const u32,count:usize,output:*mut u32,output_capacity:usize)->usize {
 let input=std::slice::from_raw_parts(commands,count*4);
 let commands=input.chunks_exact(4).map(|c|Command{l_kind:c[0],l_slot:c[1],l_generation:c[2],l_value:c[3]}).collect();
 write_snapshot(State::new().function_l_run_indexed(capacity,commands),output,output_capacity)
}
