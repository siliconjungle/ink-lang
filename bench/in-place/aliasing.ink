module in_place_aliasing;
record P { a:List<u32>, b:List<u32>, }
record S { seen:Bool, last:u32, output:List<u32>, }
fn first(xs:List<u32>)->List<u32>{return xs;}
fn total(xs:List<u32>)->u32{return foldl(xs,0,fn(x)=>fn(a)=>a+x);}
pub fn kept(xs:List<u32>)->P{let ys=xs.concat(xs);let zs=ys;return P{a:zs,b:ys.concat([2])};}
pub fn called(xs:List<u32>)->P{let ys=xs.concat(xs);let zs=first(ys);return P{a:zs,b:ys.concat([2])};}
pub fn twice(xs:List<u32>)->P{let ys=xs.concat(xs);return P{a:ys.concat([2]),b:ys.concat([3])};}
pub fn branchy(xs:List<u32>,k:u32)->P{let ys=xs.concat(xs);return choose(k>3,P{a:ys.concat([2]),b:xs},P{a:ys,b:ys.concat([4])});}
pub fn record_alias(xs:List<u32>)->P{let p=P{a:xs.concat(xs),b:xs};let q=p;return P{a:q.a.concat([5]),b:p.a};}
pub fn fold_fresh(xs:List<u32>)->List<u32>{return foldl(xs,[],fn(x)=>fn(a)=>a.concat([x]));}
pub fn fold_param(xs:List<u32>,zs:List<u32>)->P{let r:List<u32>=foldl(xs,zs,fn(x)=>fn(a)=>a.concat([x]));return P{a:r,b:zs};}
pub fn leaked(xs:List<u32>,zs:List<u32>)->P{let r:List<u32>=foldl(xs,[],fn(x)=>fn(a)=>choose(x>3,zs,a.concat([x])));return P{a:r.concat([9]),b:zs};}
pub fn distinct(xs:List<u32>)->List<u32>{return foldl(xs,S{seen:false,last:0,output:[]},fn(x)=>fn(a)=>choose(!a.seen || a.last!=x,S{seen:true,last:x,output:a.output.concat([x])},a)).output;}
pub fn prefixes(xs:List<u32>)->P{return foldl(xs,P{a:[],b:[]},fn(x)=>fn(s)=>P{a:s.a.concat([x]),b:s.a});}
pub fn prefixes_swapped(xs:List<u32>)->P{return foldl(xs,P{a:[],b:[]},fn(x)=>fn(s)=>P{b:s.a,a:s.a.concat([x])});}
pub fn read_then_move(xs:List<u32>)->u32{let ys=xs.concat(xs);let n=total(ys);return total(ys.concat([n]));}
pub fn captured(xs:List<u32>)->List<u32>{let ys=xs.concat(xs);return xs.map(fn(x)=>total(ys.concat([x])));}
pub fn dedupe(xs:List<u32>)->List<u32>{var out:List<u32>=[];for x in xs {if !(foldl(out,false,fn(y)=>fn(a)=>a || y==x)){out=out.concat([x]);}}return out;}
