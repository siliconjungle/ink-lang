module authored_measures;
import "library.ink" as measured;
fn steps(n:u32,stride:u32)->u32 {return measured.steps(n,stride);}
fn forward(limit:u32,index:u32)->u32 {return measured.forward(limit,index);}
fn generic(n:u32,value:String)->String {return measured.generic<String>(n,value);}
fn lex(a:u32,b:u32,reset:u32)->u32 {return measured.lex(a,b,reset);}
fn numeric(xs:List<u32>)->List<u32> {return xs.map(fn(x)=>x+1);}
