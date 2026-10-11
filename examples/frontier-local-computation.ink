module frontier_local;
enum Error{Failed,}
state Rows:Table<u64,List<u32>> =Table.empty();
fn edit(xs:List<u32>,a:u32,b:u32,n:u32)->List<u32>{
    let work=buffer(xs);let work=work.swap(a,b);let work=work.set(a,99);
    let work=work.push(7);let work=work.pop();return work.truncate(n).freeze();
}
fn filled(n:u32,value:u32)->List<u32>{let work=buffer_fill(n,value);return work.freeze();}
fn scan(xs:List<u32>,limit:u32,bias:u32)->List<u32>{
    let work:Buffer<u32> =Buffer.empty();
    let work=repeat_until(limit,work,fn(work)=>work.len()>=length(xs),
        fn(i)=>fn(work)=>work.push(xs.at_or(i,0)+bias));
    return work.freeze();
}
fn indexed(n:u32,start:u32)->u32{return repeat_until(n,start,fn(value)=>value>=1000,fn(i)=>fn(value)=>value+i);}
fn constant(start:u32)->u32{return repeat(7,start,fn(i)=>fn(value)=>value+i);}
fn ordered(a:i32,b:i32,remove:i32)->List<i32>{
    let work:Map<i32,u32> =Map.empty();let work=work.set(a,1);let work=work.set(b,2);
    let work=work.set(a,3);let work=work.remove(remove);return work.keys();
}
fn bool_values(a:Bool,b:Bool)->List<f32>{
    let work:Map<Bool,f32> =Map.empty();let work=work.set(a,1.5);let work=work.set(b,-0.0);
    return work.values();
}
change put(key:u64,xs:List<u32>,limit:u32,bias:u32,fail:Bool)->Result<Unit,Error> writes(Rows){
    let row=scan(xs,limit,bias);Rows.remove(key);Rows.insert(key,row);
    if fail{return Err(Error.Failed);}return Ok(());
}
query get(key:u64)->Option<List<u32>> reads(Rows){return Rows.get(key);}
query edited(xs:List<u32>,a:u32,b:u32,n:u32)->List<u32>{return edit(xs,a,b,n);}
query fill(n:u32,value:u32)->List<u32>{return filled(n,value);}
query scanned(xs:List<u32>,limit:u32,bias:u32)->List<u32>{return scan(xs,limit,bias);}
query iterated(n:u32,start:u32)->u32{return indexed(n,start);}
query repeated(start:u32)->u32{return constant(start);}
query keys(a:i32,b:i32,remove:i32)->List<i32>{return ordered(a,b,remove);}
query booleans(a:Bool,b:Bool)->List<f32>{return bool_values(a,b);}
