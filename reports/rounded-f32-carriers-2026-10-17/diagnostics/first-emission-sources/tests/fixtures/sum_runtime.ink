module sum_runtime;
record Box { value:Result<u32,Result<String,Bool>>, }
enum Error { Failed, }
state Items:Table<u32,Box> = Table.empty();
event changed:Box;
fn identity(x:Result<u32,Result<String,Bool>>)->Result<u32,Result<String,Bool>>{return x;}
fn mapped(x:Result<u32,Result<String,Bool>>)->Result<u32,Result<String,Bool>>{return x.map(fn(v)=>v+1);}
fn errors(x:Result<u32,Result<String,Bool>>)->Result<u32,Result<String,Bool>>{return x.map_err(fn(v)=>v);}
fn folded(x:Result<u32,Result<String,Bool>>)->u32{return x.fold(fn(v)=>v,fn(e)=>e.fold(fn(s)=>7,fn(b)=>9));}
change put(key:u32,value:Box,fail:Bool)->Result<Unit,Error> writes(Items) emits(changed){Items.put(key,value);emit changed(value);if fail{return Err(Error.Failed);}return Ok(());}
query get(key:u32)->Option<Box> reads(Items){return Items.get(key);}

fn wide(x:Result<u32,Result<String,Bool>>)->Result<u64,Result<String,Bool>>{return x.map(fn(v)=>42);}
fn left(x:Result<Result<u32,Result<Bool,Int>>,Result<String,Bool>>)->Result<Result<u32,Result<Bool,Int>>,Result<String,Bool>>{return x;}
change nested(key:u32,x:Result<u32,Result<String,Bool>>)->Result<u32,Result<String,Bool>> writes(Items) emits(changed){let value=x?;let row=Box{value:Ok(value)};Items.put(key,row);emit changed(row);return Ok(value);}
change outer(key:u32,x:Result<u32,Result<String,Bool>>)->Result<u32,Result<String,Bool>> writes(Items) emits(changed){let value=nested(key,x)?;return Ok(value);}

fn many(x:Result<u32,Result<String,Bool>>)->List<Result<u32,Result<String,Bool>>>{return list(x,x);}

record Shared{whole:Result<u32,Result<List<u32>,Bool>>,tail:Result<List<u32>,Bool>,}
query shared()->Shared {let tail:Result<List<u32>,Bool>=Ok(list(1));return Shared{whole:Err(tail),tail:tail};}

enum Tree{End,Branch(List<Tree>),}
fn leafs(x:Result<f32,Result<Int,Tree>>)->Result<f32,Result<Int,Tree>>{return x;}
fn equal(a:Result<f32,Result<Int,Tree>>,b:Result<f32,Result<Int,Tree>>)->Bool{return a==b;}

record Reused{first:Result<String,Bool>,second:Result<String,Bool>,}
query reused(key:u32)->Reused reads(Items){let row=Items.get(key).fold(fn(row)=>row,fn(u)=>Box{value:Err(Ok("absent"))});let first:Result<String,Bool>=row.value.fold(fn(n)=>Ok("number"),fn(e)=>e);let second:Result<String,Bool>=row.value.fold(fn(n)=>Ok("number"),fn(e)=>e);return Reused{first:first,second:second};}

// A format adapter targets ordinary recursive source types, not a JSON primitive.
enum Json{Null,Boolean(Bool),Number(String),Text(String),Array(List<Json>),Object(List<JsonMember>),}
record JsonMember{key:String,value:Json,}
fn json_identity(document:Json)->Json{return document;}
query json_echo(document:Json)->Json{return document;}
