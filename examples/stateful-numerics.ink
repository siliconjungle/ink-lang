module numerical_state;
enum Error {Missing,Failed,}
record Sample { value:f32, point:Vec2<f32>, trail:List<f32>, word:i32, signed:Vec2<i32>, words:Vec2<u32>, }
record Envelope { items:List<Sample>, maybe:Option<Sample>, answer:Result<Sample,Error>, }
state Rows:Table<i32,Envelope> = Table.empty();
event seen:Envelope;
keep total:f32 = sum(Rows.values().map(fn(row)=>sum(row.items.map(fn(item)=>item.value))));
fn pass(row:Envelope)->Envelope {return row;}
fn stepped(v:Vec2<f32>,dt:f32)->Vec2<f32> {return repeat(3,v,fn(i)=>fn(p)=>vec2(p.x+dt,p.y-dt));}
query equal(x:f32,y:f32)->Bool {return x==y;}
query same(x:Envelope,y:Envelope)->Bool {return x==y;}
query negated(x:f32)->f32 {return -x;}
query increment(x:i32)->i32 {return x+1;}
query checked(x:i32,y:i32)->Result<i32,Error> {return checked_add(x,y).map_err(fn(error)=>Error.Failed);}
query exact(x:i32)->Int {return Int(x);}
query component(v:Vec2<f32>)->f32 {return v.y;}
query constructed(x:f32,y:f32)->Vec2<f32> {return vec2(x,y);}
query step(v:Vec2<f32>,dt:f32)->Vec2<f32> {return stepped(v,dt);}
query get(key:i32)->Option<Envelope> reads(Rows) {return Rows.get(key);}
query rows()->List<Envelope> reads(Rows) {return Rows.values();}
query aggregate()->f32 reads(total) {return total;}
change put(key:i32,row:Envelope,fail:Bool)->Result<f32,Error> writes(Rows) emits(seen) {
 let copied:Envelope=pass(row);
 if Rows.contains(key){Rows.replace(key,copied);}else{Rows.insert(key,copied);}
 emit seen(copied);
 if fail{return Err(Error.Failed);}
 let sample:Sample=copied.maybe.ok_or(Error.Missing)?;
 return Ok(sample.value);
}
change erase(key:i32)->Result<Unit,Error> writes(Rows) {Rows.remove(key);return Ok(());}
fn gpu_words(xs:List<i32>)->List<i32> {return xs.map(fn(x)=>x+1);}
query minimum()->i32 {return -2147483648;}
query int_vector(x:i32)->Vec2<i32> {return vec2(x,-2147483648);}
query word_vector(x:u32)->Vec2<u32> {return vec2(x,4294967295);}
query added(x:f32,y:f32)->f32 {return x+y;}
query multiplied(x:f32,y:f32)->f32 {return x*y;}
query contextual(x:f32)->Bool {return (1+2)==x;}
query summed(xs:List<f32>)->f32 {return sum(xs);}
fn division(x:i32,y:i32)->i32 {return quot_or(x,y,-99);}
query divided(x:i32,y:i32)->i32 {return division(x,y);}
change store_product(key:i32,x:f32,y:f32,row:Envelope)->Result<f32,Error> writes(Rows) emits(seen) {
 let prior:Sample=row.maybe.ok_or(Error.Missing)?;
 let computed:Sample=Sample{value:x*y,point:prior.point,trail:prior.trail,word:prior.word,signed:prior.signed,words:prior.words};
 let stored:Envelope=Envelope{items:row.items,maybe:Some(computed),answer:Ok(computed)};
 if Rows.contains(key){Rows.replace(key,stored);}else{Rows.insert(key,stored);}
 emit seen(stored);return Ok(computed.value);
}
query signed_negated(x:i32)->i32 {return -x;}
query checked_subtracted(x:i32,y:i32)->Result<i32,Error> {return checked_sub(x,y).map_err(fn(error)=>Error.Failed);}
query checked_multiplied(x:i32,y:i32)->Result<i32,Error> {return checked_mul(x,y).map_err(fn(error)=>Error.Failed);}
query signed_sum(xs:List<i32>)->i32 {return sum(xs);}
query triple(v:Vec3<i32>)->Vec3<i32> {return vec3(v.z,v.y,v.x);}
query four(v:Vec4<f32>)->Vec4<f32> {return vec4(v.w,v.z,v.y,v.x);}
