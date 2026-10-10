module composed; fn compute(xs:List<u32>)->List<u32>{return xs.map(fn(x)=>(x+x+x)*1+0).map(fn(y)=>repeat(10,y,fn(i)=>fn(a)=>a+1));}
