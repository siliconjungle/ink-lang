module vector_representation;
enum Error{Failed,}
record Row{u:Vec2<u32>,i:Vec3<i32>,f:Vec4<f32>,}
state Rows:Table<u64,Row> = Table.empty();
event changed:Row;
change put(key:u64,row:Row,fail:Bool)->Result<Unit,Error> writes(Rows) emits(changed){Rows.remove(key);Rows.insert(key,row);emit changed(row);if fail{return Err(Error.Failed);}return Ok(());}
query get(key:u64)->Option<Row> reads(Rows){return Rows.get(key);}
query add(a:Vec2<u32>,b:Vec2<u32>)->Vec2<u32>{return vec2(a.x+b.x,a.y+b.y);}
query mul(a:Vec3<i32>,b:Vec3<i32>)->Vec3<i32>{return vec3(a.x*b.x,a.y*b.y,a.z*b.z);}
query sub(a:Vec4<f32>,b:Vec4<f32>)->Vec4<f32>{return vec4(a.x-b.x,a.y-b.y,a.z-b.z,a.w-b.w);}
query component(a:Vec4<f32>)->f32{return a.z;}
query make(a:u32,b:u32)->Vec2<u32>{return vec2(a,b);}
query equal(a:Row,b:Row)->Bool{return a==b;}
query list_equal(a:List<Row>,b:List<Row>)->Bool{return a==b;}
