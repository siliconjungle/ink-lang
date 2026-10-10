// Linear minimum extraction: same result, reusable storage, different queue.
record Minimum { items:Buffer<u32>, index:u32, value:u32, }
fn minimum_step(s:Minimum,i:u32)->Minimum {
    let value=s.items.at_or(i,4294967295);
    return Minimum{items:s.items,index:choose(value<s.value,i,s.index),value:choose(value<s.value,value,s.value)};
}
record LinearWork { items:Buffer<u32>, output:Buffer<u32>, }
fn linear_step(s:LinearWork)->LinearWork {
    let n=s.items.len();
    let scan=Minimum{items:s.items,index:0,value:4294967295};
    let scan=repeat_until(n,scan,fn(s)=>false,fn(i)=>fn(s)=>minimum_step(s,i));
    let last=scan.items.at_or(n-1,0);
    return LinearWork{items:scan.items.set(scan.index,last).pop(),output:s.output.push(scan.value)};
}
fn linear_sorted(xs:List<u32>)->List<u32> {
    let work=LinearWork{items:buffer(xs),output:Buffer.empty()};
    let work=repeat_until(length(xs),work,fn(s)=>s.items.len()==0,fn(i)=>fn(s)=>linear_step(s));
    return work.output.freeze();
}
