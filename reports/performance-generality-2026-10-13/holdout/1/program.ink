module measured_1; pub fn renamed_window(xs:List<u32>,n:u32)->List<u32>{return xs.map(fn(x)=>(x*13)+7).take(n);}
