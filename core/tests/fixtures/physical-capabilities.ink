module physical_capabilities;
record Particle { position:u32, velocity:u32, active:Bool, }
fn guarded(xs:List<u32>,i:u32)->u32 {return choose(i<length(xs),xs.at_or(i,999),777);}
fn total(xs:List<u32>)->u32 {return repeat_until(length(xs),0,fn(a)=>false,fn(i)=>fn(a)=>a+xs.at_or(i,999));}
fn shadow(xs:List<u32>,i:u32)->u32 {let j=i; let i:u32=4294967295; return choose(j<length(xs),xs.at_or(i,999),777);}
fn wrap(xs:List<u32>,i:u32)->u32 {return choose(0==i+1,xs.at_or(i,999),777);}
fn signed(xs:List<u32>,i:i32)->u32 {return choose(i<0,xs.at_or(4294967295,999),777);}
fn particles(xs:List<Particle>)->List<Particle>{return xs.map(fn(p)=>Particle{position:p.position+p.velocity,velocity:p.velocity,active:p.active});}
fn snapshot(xs:List<Particle>)->List<Particle>{let ys=xs.map(fn(p)=>Particle{position:p.position+1,velocity:p.velocity,active:p.active});return xs.concat(ys);}
fn bulk(xs:List<u32>,a:u32,b:u32,n:u32)->List<u32>{return buffer(xs).copy_within(a,b,n).fill_range(b,n,4294967295).split_at(a,fn(l)=>fn(r)=>l.append(r)).freeze();}
fn flags(xs:List<Bool>)->List<Bool>{return buffer(xs).split_at(64,fn(a)=>fn(b)=>a.append(b)).freeze();}
fn projected(xs:List<Particle>)->List<u32>{return xs.map(fn(p)=>p.position+p.velocity).map(fn(v)=>v*2);}
fn reduced(xs:List<Particle>)->u32{return foldr(xs.map(fn(p)=>p.position+p.velocity),0,fn(x)=>fn(a)=>x+a);}
record Batch { rows:List<Particle>, }
record Signal { value:f32, stamp:u64, }
enum Error { Missing, }
state Items:Table<u32,Particle> = Table.empty();
change put(k:u32,p:Particle)->Result<Unit,Error> writes(Items){if Items.contains(k){Items.replace(k,p);}else{Items.insert(k,p);}return Ok(());}
query all()->List<Particle> reads(Items){return Items.values();}
query updated()->List<Particle> reads(Items){return Items.values().map(fn(p)=>Particle{position:p.position+1,velocity:p.velocity,active:p.active});}
fn signals(xs:List<Signal>)->List<Signal>{return xs.map(fn(p)=>Signal{value:p.value,stamp:p.stamp});}
fn batched(xs:List<Particle>)->Batch{return Batch{rows:xs};}
fn buffer_guarded(xs:List<u32>,i:u32)->u32{let b=buffer(xs);return choose(i<b.len(),b.at_or(i,999),777);}
fn typed_alias(xs:List<u32>)->u32{let a:u64=4294967295;let b:u64=a+1;return choose(b==0,xs.at_or(4294967295,999),777);}
