module llvm_learning_smoke;
fn cancelled(x:u32,y:u32)->u32{return (x+y)-x;}
fn mask_join(x:u32,m:u32)->u32{return (x&m)|(x&word_not(m));}
fn shifted(x:u32,k:u32)->u32{return wrapping_shl(x,k);}
fn wide(x:u64,k:u32)->u64{return wrapping_shl(x,k);}
fn bounded(x:u32,m:u32)->Bool{return (x&m)<=m;}
