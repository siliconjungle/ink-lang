module bend_inspired;

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
