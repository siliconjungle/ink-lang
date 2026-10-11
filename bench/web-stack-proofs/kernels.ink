module WebStackProofs;
pub fn quadratic(xs:List<u32>,seed:u32,k:u32)->List<u32>{return xs.map(fn(x)=>repeat(4096,x,fn(i)=>fn(a)=>(a+k)*(a+k)-a*a-2*a*k+a));}
pub fn cubic(xs:List<u32>,seed:u32,k:u32)->List<u32>{return xs.map(fn(x)=>repeat(1024,x,fn(i)=>fn(a)=>(a+k)*(a+k)*(a+k)-a*a*a-3*a*a*k-3*a*k*k+a));}
pub fn bilinear(xs:List<u32>,seed:u32,k:u32)->List<u32>{return xs.map(fn(x)=>repeat(1024,x,fn(i)=>fn(a)=>(a+k)*(a-k)-a*a+a));}
pub fn map_quadratic(xs:List<u32>,seed:u32,k:u32)->List<u32>{return xs.map(fn(x)=>(x+k)*(x+k)-x*x-2*x*k);}
pub fn map_cubic(xs:List<u32>,seed:u32,k:u32)->List<u32>{return xs.map(fn(x)=>(x+k)*(x+k)*(x+k)-x*x*x-3*x*x*k-3*x*k*k);}
pub fn cross_bool(xs:List<u32>,seed:u32,k:u32)->List<u32>{return xs.map(fn(x)=>x<seed).map(fn(b)=>choose(b,k,k+1));}
pub fn self_zip(xs:List<u32>,seed:u32,k:u32)->List<u32>{return xs.zip(xs,fn(x)=>fn(y)=>x+y);}

pub fn zero_scan(xs:List<u32>,seed:u32,k:u32)->List<u32>{return xs.map(fn(x)=>x-x).scan();}
pub fn frontier_guarded_write(xs:List<u32>,seed:u32,k:u32)->List<u32>{return xs.map(fn(x)=>choose(x==seed,seed,x)+k);}
pub fn frontier_repeat_restore(xs:List<u32>,seed:u32,k:u32)->List<u32>{return xs.map(fn(x)=>repeat(512,x,fn(i)=>fn(a)=>x)+k);}
pub fn ordered_fold(xs:List<u32>,seed:u32,k:u32)->u32{return foldr(xs.map(fn(x)=>x*k),seed,fn(x)=>fn(a)=>x-a);}
