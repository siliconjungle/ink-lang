module composition;
import "../abstract-interfaces/library.ink" as lib;
fn items(xs:List<lib.Hidden<u32>>)->List<u32>{return xs.map(fn(v)=>lib.observe<u32>(v));}
fn nested(xs:List<lib.Hidden<u32>>)->List<List<u32>>{return xs.map(fn(v)=>[v].map(fn(x)=>lib.observe<u32>(x)));}
fn maybe(v:Option<lib.Hidden<u32>>)->u32{return v.fold(fn(x)=>lib.observe<u32>(x),fn(_)=>0);}
fn either(v:Result<lib.Hidden<u32>,lib.Hidden<u32>>)->u32{return v.fold(fn(x)=>lib.observe<u32>(x),fn(x)=>lib.observe<u32>(x));}
fn numeric(xs:List<u32>)->List<u32>{return xs.map(fn(x)=>x+1);}
spec fn positive(x:u32)->u32 requires x>0; ensures result==x;
implementation positive_impl for positive{return x;}
fn indexed()->List<u32>{let xs:List<u32>=[0,0];return xs.map_indexed(fn(i)=>fn(x)=>positive(i+1));}
fn zipped()->List<u32>{let xs:List<u32>=[1,0];let ys:List<u32>=[1];return xs.zip(ys,fn(x)=>fn(y)=>positive(x));}
fn folded()->u32{let xs:List<u32>=[1,2];return foldl(xs,1,fn(x)=>fn(a)=>positive(a)+x);}
fn stopped()->u32{return fold_until([1,0],1,fn(x)=>fn(a)=>true,fn(x)=>fn(a)=>positive(a)-1);}
fn repeated()->u32{return repeat(1,1,fn(i)=>fn(a)=>positive(a)-1);}
fn until()->u32{return repeat_until(3,1,fn(a)=>a==0,fn(i)=>fn(a)=>positive(a)-1);}
