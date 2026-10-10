module ink.std.words;
fn min32(a:u32,b:u32)->u32{return choose(a<b,a,b);}
fn max32(a:u32,b:u32)->u32{return choose(a>b,a,b);}
fn clamp32(value:u32,low:u32,high:u32)->u32{return min32(max32(value,low),high);}
fn min64(a:u64,b:u64)->u64{return choose(a<b,a,b);}
fn max64(a:u64,b:u64)->u64{return choose(a>b,a,b);}
