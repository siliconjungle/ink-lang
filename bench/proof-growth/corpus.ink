module ProofGrowth;
record Node{key:u32,flag:Bool,label:String,weight:f32,}
record Particle{x:f32,y:f32,mass:f32,alive:Bool,label:String,}
record Bounds{min_x:f32,max_x:f32,min_y:f32,max_y:f32,}
fn weight(node:Node)->u32{return node.key*17+3;}
fn enabled(node:Node)->Bool{return node.flag;}
pub fn helper_pipeline(xs:List<Node>,cut:u32)->u32{return foldl(xs.filter(fn(x)=>enabled(x) && x.key>=cut).map(fn(x)=>weight(x)),19,fn(x)=>fn(acc)=>x-acc);}
pub fn drawing_layers(xs:List<Node>,cut:u32)->u32{return foldl(xs.filter(fn(x)=>x.flag && x.key>=cut).map(fn(x)=>x.key*17+3),19,fn(x)=>fn(acc)=>x-acc);}
pub fn mapped_left(xs:List<Node>,cut:u32)->u32{return foldl(xs.map(fn(x)=>x.key*17+3).filter(fn(x)=>x>=cut),19,fn(x)=>fn(acc)=>x-acc);}
pub fn checksum(xs:List<Node>)->u32{return foldr(xs.map(fn(x)=>weight(x)),19,fn(x)=>fn(acc)=>x-acc);}
pub fn first_label(xs:List<Node>,cut:u32)->String{return foldr(xs,"missing",fn(x)=>fn(acc)=>choose(enabled(x) && x.key>=cut,x.label,acc));}
pub fn first_value(xs:List<Node>,cut:u32)->f32{return foldr(xs,-0.0,fn(x)=>fn(acc)=>choose(x.flag && x.key>=cut,x.weight,acc));}
pub fn any_visible(xs:List<Node>,cut:u32)->Bool{return foldr(xs,false,fn(x)=>fn(acc)=>choose(x.flag && x.key>=cut,true,acc));}
pub fn particle_bounds(xs:List<Particle>)->Bounds{return foldl(xs.filter(fn(x)=>x.alive).map(fn(x)=>Bounds{min_x:x.x,max_x:x.x,min_y:x.y,max_y:x.y}),Bounds{min_x:1000000.0,max_x:-1000000.0,min_y:1000000.0,max_y:-1000000.0},fn(x)=>fn(acc)=>Bounds{min_x:choose(x.min_x<acc.min_x,x.min_x,acc.min_x),max_x:choose(x.max_x>acc.max_x,x.max_x,acc.max_x),min_y:choose(x.min_y<acc.min_y,x.min_y,acc.min_y),max_y:choose(x.max_y>acc.max_y,x.max_y,acc.max_y)});}
pub fn chained(xs:List<Node>,cut:u32)->u32{return foldl(xs.filter(fn(x)=>x.flag).map(fn(x)=>x.key).map(fn(x)=>x*17+3).filter(fn(x)=>x>=cut),19,fn(x)=>fn(acc)=>x-acc);}
pub fn numeric_left(xs:List<u32>)->u32{return foldl(xs.map(fn(x)=>x*17+3),19,fn(x)=>fn(acc)=>x-acc);}
