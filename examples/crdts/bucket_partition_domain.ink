module bucket_partition_domain_examples;
fn bucket(key:u64)->u64{return wrapping_shr(key,32);}
fn contained(start:u64,end:u64)->Bool{return (start<end || end==0) && bucket(start)==bucket(end-1);}
fn interior(start:u64,end:u64,cut:u64)->Bool{return contained(start,end) && start<cut && (end==0 || cut<end);}
fn preserved(start:u64,end:u64,cut:u64)->Bool{return contained(start,cut) && contained(cut,end);}
