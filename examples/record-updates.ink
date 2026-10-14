module record_updates;

record Pair<T> { left:T, right:T, }
record Owner { data:Buffer<u32>, tag:u32, }
enum Error { Base, First, Second, }

fn replace<T>(pair:Pair<T>,value:T)->Pair<T> {
    return Pair<T>{..pair,right:value};
}
fn updated(pair:Pair<u32>,value:u32)->Pair<u32> {
    return replace<u32>(pair,value);
}
fn combined<T>(values:List<T>,zero:T,plus:fn(T,T)->T)->T {
    return foldl(values,zero,fn(value,total)=>plus(total,value));
}
fn total(values:List<u32>)->u32 {
    return combined<u32>(values,0,fn(a,b)=>a+b);
}
fn owned()->List<u32> {
    let owner=Owner{data:buffer([1,2]),tag:7};
    let data=owner.data.push(owner.tag);
    let changed=Owner{..owner,data:data,tag:9};
    return changed.data.push(changed.tag).freeze();
}

private state Calls:u32=0;
event visited:u32;

change base(fail:Bool)->Result<Pair<u32>,Error> writes(Calls) emits(visited) {
    Calls=Calls+1;
    emit visited(1);
    return choose(fail,Err(Error.Base),Ok(Pair<u32>{left:1,right:2}));
}
change component(fail:Bool,error:Error,tag:u32)->Result<u32,Error>
    writes(Calls) emits(visited) {
    Calls=Calls+1;
    emit visited(tag);
    return choose(fail,Err(error),Ok(tag));
}
change changed(a:Bool,b:Bool,c:Bool)->Result<Pair<u32>,Error>
    writes(Calls) emits(visited) {
    return Ok(Pair<u32>{
        ..base(a)?,
        right:component(b,Error.First,2)?,
        left:component(c,Error.Second,3)?,
    });
}
query calls()->u32 reads(Calls) {return Calls;}
