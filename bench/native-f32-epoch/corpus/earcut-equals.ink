module Points;record V{x:i32,y:i32,}record Pair{a:V,b:V,}pub fn run(xs:List<Pair>)->List<Bool>{return xs.map(fn(p)=>p.a.x==p.b.x&&p.a.y==p.b.y);}
