module General40;
pub fn general40_scan_chain(xs:List<u32>,ys:List<u32>,seed:u32,k:u32)->List<u32>{return xs.map(fn(x)=>scan_word(x,seed,k)).scan();}fn calibrate_word(x:u32,k:u32)->u32{return quot_or(x,k,0)+x;}
fn scan_word(x:u32,seed:u32,k:u32)->u32{return calibrate_word(x,k)+seed;}
