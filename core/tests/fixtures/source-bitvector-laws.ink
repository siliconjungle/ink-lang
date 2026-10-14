module source_bitvector_laws;
fn pack(high:u64,low:u64)->u64{return wrapping_shl(high,32) | low;}
fn high(value:u64)->u64{return wrapping_shr(value,32);}
fn cap(value:u64)->u64{return choose(value>255,255,value);}
record Row{value:u32,tag:u64,}
law packed_high(a:u64,b:u64){
 requires first: a<=4294967295;
 requires second: b<=4294967295;
 high(pack(a,b))==a;
 proof by provided;
}
law packed_low(a:u64,b:u64){
 requires second: b<=4294967295;
 (pack(a,b)&4294967295)==b;
 proof by provided;
}
law high_namespace(value:u64,baseline:u64){
 requires high_nonzero: high(value)!=0;
 requires low_baseline: baseline<=4294967295;
 (baseline<value)==true;
 proof by provided;
}
law increment_u32(value:u32){
 requires room: value<4294967295;
 (value+1>value)==true;
 proof by provided;
}
law bounded_field(r:Row){
 requires room: r.value<4294967295;
 (r.value+1>r.value)==true;
 proof by provided;
}
law masked_cap(value:u64){
 cap(value&255)==(value&255);
 proof by provided;
}
law shift_width32(value:u32,amount:u32){
 wrapping_shl(value,amount)==wrapping_shl(value,amount&31);
 proof by provided;
}
law shift_width64(value:u64,amount:u32){
 wrapping_shr(value,amount)==wrapping_shr(value,amount&63);
 proof by provided;
}
law xor_cancel(value:u64,mask:u64){
 ((value^mask)^mask)==value;
 proof by provided;
}
