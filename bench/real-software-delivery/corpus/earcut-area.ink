module RingArea;
record P { x:i32,y:i32, }
record Scan { last:P,area:i32, }
pub fn run(xs:List<P>)->i32{let prior:P=xs.at_or(length(xs) - 1,P{x:0,y:0});let r:Scan=foldl(xs,Scan{last:prior,area:0},fn(p)=>fn(a)=>Scan{last:p,area:a.area+(a.last.x-p.x)*(p.y+a.last.y)});return r.area;}
