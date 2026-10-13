module D3Cumsum;
record Scan { sum:u32,output:List<u32>, }
pub fn run(xs:List<u32>)->List<u32>{let r:Scan=foldl(xs,Scan{sum:0,output:[]},fn(x)=>fn(a)=>Scan{sum:a.sum+x,output:a.output.concat([a.sum+x])});return r.output;}
