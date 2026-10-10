module values;
fn accumulate_100(x:u32)->u32{return repeat(100,x,fn(i)=>fn(acc)=>acc+i);}
fn accumulate_10000(x:u32)->u32{return repeat(10000,x,fn(i)=>fn(acc)=>acc+i);}
fn accumulate_60000(x:u32)->u32{return repeat(60000,x,fn(i)=>fn(acc)=>acc+i);}
