module WebProof27;
pub fn aligned_left_pair_u32(xs:List<u32>,ys:List<u32>,seed:u32,k:u32)->List<u32>{return xs.zip(ys,fn(a)=>fn(b)=>choose(a<seed,a+b*k,a-b)).zip(xs,fn(v)=>fn(x)=>choose(v<seed,v+x*k,v-x));}
pub fn aligned_right_pair_u32(xs:List<u32>,ys:List<u32>,seed:u32,k:u32)->List<u32>{return xs.zip(ys,fn(a)=>fn(b)=>choose(a<seed,a+b*k,a-b)).zip(ys,fn(v)=>fn(x)=>choose(v<seed,v+x*k,v-x));}
pub fn helper_calibrated_map_u32(xs:List<u32>,seed:u32,k:u32)->List<u32>{return xs.map(fn(x)=>helper_calibrate_word(x,seed,k));}
pub fn helper_indexed_calibration_u32(xs:List<u32>,seed:u32,k:u32)->List<u32>{return xs.map_indexed(fn(i)=>fn(x)=>choose(rem_or(i,2,0)==0,helper_normalize_word(helper_calibrate_word(x,seed,k),seed,k),helper_calibrate_word(x,seed,k)));}
pub fn helper_ordered_checksum_u32(xs:List<u32>,seed:u32,k:u32)->u32{return foldr(xs,seed,fn(x)=>fn(a)=>helper_step_word(helper_calibrate_word(x,seed,k),a,seed,k));}
pub fn helper_accepted_projection_u32(xs:List<u32>,seed:u32,k:u32)->List<u32>{let accepted:List<u32> =helper_accept_list(xs,seed,k);return accepted.map(fn(x)=>helper_normalize_word(helper_calibrate_word(x,seed,k),seed,k));}
pub fn helper_independent_pair_u32(xs:List<u32>,ys:List<u32>,seed:u32,k:u32)->List<u32>{return xs.zip(ys,fn(a)=>fn(b)=>helper_pair_word(a,b,seed,k));}
pub fn reference_modular_mix_u32(xs:List<u32>,seed:u32,k:u32)->List<u32>{return xs.map(fn(x)=>modular_mix_word(x,seed,k));}
fn modular_mix_word(x:u32,seed:u32,k:u32)->u32{let v0:u32=x+seed;let v1:u32=rem_or(v0*(k+1)+x,4294967291,seed);let v2:u32=rem_or(v1*(k+3)+x,4294967291,seed);let v3:u32=rem_or(v2*(k+5)+x,4294967291,seed);let v4:u32=rem_or(v3*(k+7)+x,4294967291,seed);let v5:u32=rem_or(v4*(k+9)+x,4294967291,seed);let v6:u32=rem_or(v5*(k+11)+x,4294967291,seed);let v7:u32=rem_or(v6*(k+13)+x,4294967291,seed);let v8:u32=rem_or(v7*(k+15)+x,4294967291,seed);let v9:u32=rem_or(v8*(k+17)+x,4294967291,seed);let v10:u32=rem_or(v9*(k+19)+x,4294967291,seed);let v11:u32=rem_or(v10*(k+21)+x,4294967291,seed);let v12:u32=rem_or(v11*(k+23)+x,4294967291,seed);let v13:u32=rem_or(v12*(k+25)+x,4294967291,seed);let v14:u32=rem_or(v13*(k+27)+x,4294967291,seed);let v15:u32=rem_or(v14*(k+29)+x,4294967291,seed);let v16:u32=rem_or(v15*(k+31)+x,4294967291,seed);return v16;}
fn helper_calibrate_word(x:u32,seed:u32,k:u32)->u32{return choose(x<seed,(x+7)*k,x-seed);}
fn helper_normalize_word(x:u32,seed:u32,k:u32)->u32{return choose(x>k,x-k,x+seed);}
fn helper_eligible_word(x:u32,seed:u32,k:u32)->Bool{return rem_or(x,seed,0)<k;}
fn helper_step_word(x:u32,a:u32,seed:u32,k:u32)->u32{return choose(a<seed,x+a*k,x-a);}
fn helper_pair_word(a:u32,b:u32,seed:u32,k:u32)->u32{let left:u32=helper_calibrate_word(a,seed,k);let right:u32=helper_normalize_word(b,seed,k);return choose(left<right,left+right*k,left-right*k);}
fn helper_accept_list(xs:List<u32>,seed:u32,k:u32)->List<u32>{return xs.filter(fn(x)=>helper_eligible_word(x,seed,k));}
