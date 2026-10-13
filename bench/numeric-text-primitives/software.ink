module software_kernels;
import "std:math" as math;
import "std:text" as text;
record Point {x:f32,y:f32,}
pub fn gl_length(xs:List<Point>)->List<f32>{return xs.map(fn(p)=>sqrt(p.x*p.x+p.y*p.y));}
pub fn normalise(xs:List<Vec3<f32>>)->List<Option<Vec3<f32>>>{return xs.map(fn(v)=>math.normalise3(v));}
pub fn rounding(xs:List<f32>)->List<f32>{return xs.map(fn(x)=>round_ties_even(x));}
pub fn sine(xs:List<f32>)->List<Option<f32>>{return xs.map(fn(x)=>math.sin_approx(x));}
pub fn exponential(xs:List<f32>)->List<Option<f32>>{return xs.map(fn(x)=>math.exp_approx(x));}
pub fn logarithm(xs:List<f32>)->List<Option<f32>>{return xs.map(fn(x)=>math.log_approx(x));}
pub fn text_search(xs:List<String>,needle:String)->List<Option<u32>>{return xs.map(fn(s)=>string_find(s,needle,0));}
pub fn text_slices(xs:List<String>,start:u32,end:u32)->List<Option<String>>{return xs.map(fn(s)=>string_slice(s,start,end));}
pub fn popcounts(xs:List<u32>)->List<u32>{return xs.map(fn(x)=>popcount(x));}
