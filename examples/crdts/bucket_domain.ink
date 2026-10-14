module bucket_domain_examples;
fn bucket(key:u64)->u64{return wrapping_shr(key,32);}
fn same(start:u64,width:u32)->Bool{return bucket(start)==bucket(start+word_widen_u32_to_u64(width)-1);}
fn fits(start:u64,width:u32)->Bool{return width!=0 && (start & 4294967295)+word_widen_u32_to_u64(width)-1<=4294967295;}
