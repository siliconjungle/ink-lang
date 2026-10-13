module parallel_execution;

fn work(x:u32)->u32 {
    return repeat(1024,x,fn(i)=>fn(a)=>a*1664525+1013904223+i);
}
fn sequential(xs:List<u32>)->List<u32> {
    return xs.map(fn(x)=>work(x));
}
fn parallel(xs:List<u32>)->List<u32> {
    return parallel_map(xs,256,fn(i)=>fn(x)=>work(x));
}
fn partitioned(xs:List<u32>,at:u32)->List<u32> {
    let b=buffer(xs);
    let b=b.split_at(at,fn(left)=>fn(right)=>
        left.map_parallel(256,fn(i)=>fn(x)=>work(x))
            .append(right.map_parallel(256,fn(i)=>fn(x)=>work(x))));
    return b.freeze();
}
fn countdown(n:u32,acc:u32)->u32 {
    return choose(n>0,countdown(n-1,acc+1),acc);
}
fn factorial(n:u32)->u32 {
    return choose(n==0,1,n*factorial(n-1));
}
fn list_total(xs:List<u32>)->u32 {
    return choose(length(xs)==0,0,xs.at_or(0,0)+list_total(xs.drop(1)));
}
fn scratch(x:u32)->u32 {
    let b:Buffer<u32> =buffer_fill(8,0);
    let b=repeat(8,b,fn(i)=>fn(b)=>b.set(i,x+i));
    let b=b.map_parallel(8,fn(i)=>fn(x)=>x*3+i);
    let b=b.swap(0,7).truncate(4);
    return b.at_or(0,99)+b.at_or(9,7);
}
fn scratch_many(xs:List<u32>)->List<u32> {
    return parallel_map(xs,256,fn(i)=>fn(x)=>scratch(x));
}

query identity(x:u32)->u32 {return x;}

fn swap_countdown(n: u64, a: u32, b: u32) -> u32 {
  let a = a + 1;
  return choose(n > 0, swap_countdown(n - 1, b, a), a);
}

fn partition_scratch(x:u32,at:u32)->u32 {
    let b:Buffer<u32> =buffer_fill(8,0);
    let b=repeat(8,b,fn(i)=>fn(b)=>b.set(i,x+i));
    let b=b.split_at(at,fn(left)=>fn(right)=>
        left.map_parallel(1,fn(i)=>fn(v)=>v*3+i)
            .append(right.map_parallel(1,fn(i)=>fn(v)=>v*5+i)));
    return b.at_or(0,11)+b.at_or(7,13)+b.len();
}
fn partition_scratch_many(xs:List<u32>,at:u32)->List<u32> {
    return parallel_map(xs,1,fn(i)=>fn(x)=>partition_scratch(x,at));
}
fn push_scratch(x:u32)->u32 {
    let b:Buffer<u32> =Buffer.empty();
    return b.push(x).append(buffer_fill(63,x)).split_at(x,fn(a)=>fn(b)=>b.append(a)).at_or(63,9);
}
fn push_scratch_many(xs:List<u32>)->List<u32> {
    return xs.map(fn(x)=>push_scratch(x));
}
fn stopping_scratch_many(xs:List<u32>)->List<u32> {
    return xs.map(fn(x)=>repeat_until(8,buffer_fill(8,x),fn(b)=>b.len()<=3,fn(i)=>fn(b)=>b.pop()).len());
}
fn signed_partition_scratch(xs:List<i32>,at:u32)->List<i32> {
    return xs.map(fn(x)=>buffer_fill(64,x).split_at(at,fn(a)=>fn(b)=>a.map_parallel(1,fn(i)=>fn(v)=>v*3).append(b)).at_or(0,-7));
}
fn float_partition_scratch(xs:List<f32>,at:u32)->List<f32> {
    return xs.map(fn(x)=>buffer_fill(64,x).split_at(at,fn(a)=>fn(b)=>a.map_parallel(1,fn(i)=>fn(v)=>v+1.5).append(b)).at_or(0,9.5));
}
fn bool_partition_scratch(xs:List<Bool>,at:u32)->List<Bool> {
    return xs.map(fn(x)=>buffer_fill(64,x).split_at(at,fn(a)=>fn(b)=>a.map_parallel(1,fn(i)=>fn(v)=>v==false).append(b)).at_or(0,false));
}
