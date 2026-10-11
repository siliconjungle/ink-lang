module WebStackProofs2;
pub fn quartic_repeat(xs:List<u32>,seed:u32,k:u32)->List<u32>{return xs.map(fn(x)=>repeat(1024,x,fn(i)=>fn(a)=>(a+k)*(a+k)*(a+k)*(a+k)-a*a*a*a-4*a*a*a*k-6*a*a*k*k-4*a*k*k*k+a));}
pub fn quartic_map(xs:List<u32>,seed:u32,k:u32)->List<u32>{return xs.map(fn(x)=>(x+k)*(x+k)*(x+k)*(x+k)-x*x*x*x-4*x*x*x*k-6*x*x*k*k-4*x*k*k*k);}
pub fn quintic_repeat(xs:List<u32>,seed:u32,k:u32)->List<u32>{return xs.map(fn(x)=>repeat(1024,x,fn(i)=>fn(a)=>(a+k)*(a+k)*(a+k)*(a+k)*(a+k)-a*a*a*a*a-5*a*a*a*a*k-10*a*a*a*k*k-10*a*a*k*k*k-5*a*k*k*k*k+a));}
pub fn weighted_zip_fold(xs:List<u32>,seed:u32,k:u32)->u32{return foldr(xs.zip(xs,fn(x)=>fn(y)=>x*k+y*seed),seed,fn(x)=>fn(a)=>x-a);}
pub fn mapped_filter_fold(xs:List<u32>,seed:u32,k:u32)->u32{return foldr(xs.map(fn(x)=>x*k).filter(fn(x)=>x<seed),seed,fn(x)=>fn(a)=>x-a);}
pub fn weighted_zip_sum(xs:List<u32>,seed:u32,k:u32)->u32{return sum(xs.zip(xs,fn(x)=>fn(y)=>x*k+y*seed));}
