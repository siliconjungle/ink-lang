module frontier_heap_cache;

// Ordinary source implementations: no heap or pathfinding compiler primitive.
record Entry { node:u32, priority:u32, }
record HeapWork { heap:Buffer<Entry>, index:u32, done:Bool, }
fn entry_less(a:Entry,b:Entry)->Bool {
    return a.priority<b.priority || (a.priority==b.priority && a.node<b.node);
}
fn bubble(s:HeapWork)->HeapWork {
    let parent=quot_or(s.index-1,2,0);
    let child=s.heap.at_or(s.index,Entry{node:0,priority:0});
    let above=s.heap.at_or(parent,Entry{node:0,priority:0});
    return choose(entry_less(child,above),
        HeapWork{heap:s.heap.swap(s.index,parent),index:parent,done:false},
        HeapWork{heap:s.heap,index:s.index,done:true});
}
fn heap_push(heap:Buffer<Entry>,entry:Entry)->Buffer<Entry> {
    let index=heap.len();
    let work=HeapWork{heap:heap.push(entry),index:index,done:false};
    let work=repeat_until(32,work,fn(s)=>s.done || s.index==0,fn(i)=>fn(s)=>bubble(s));
    return work.heap;
}
fn sink(s:HeapWork)->HeapWork {
    let n=s.heap.len();
    let left=s.index*2+1;
    let right=left+1;
    let left_entry=s.heap.at_or(left,Entry{node:0,priority:4294967295});
    let right_entry=s.heap.at_or(right,Entry{node:0,priority:4294967295});
    let next=choose(right<n && entry_less(right_entry,left_entry),right,left);
    let below=s.heap.at_or(next,Entry{node:0,priority:4294967295});
    let current=s.heap.at_or(s.index,Entry{node:0,priority:0});
    return choose(next<n && entry_less(below,current),
        HeapWork{heap:s.heap.swap(s.index,next),index:next,done:false},
        HeapWork{heap:s.heap,index:s.index,done:true});
}
fn heap_pop(heap:Buffer<Entry>)->Buffer<Entry> {
    let n=heap.len();
    let last=heap.at_or(n-1,Entry{node:0,priority:0});
    let work=HeapWork{heap:heap.set(0,last).pop(),index:0,done:false};
    let work=repeat_until(32,work,fn(s)=>s.done || s.heap.len()==0,fn(i)=>fn(s)=>sink(s));
    return work.heap;
}
fn heap_build(xs:List<u32>)->Buffer<Entry> {
    let heap:Buffer<Entry> = Buffer.empty();
    return repeat_until(length(xs),heap,fn(heap)=>false,
        fn(i)=>fn(heap)=>heap_push(heap,Entry{node:i,priority:xs.at_or(i,0)}));
}
record SortWork { heap:Buffer<Entry>, output:Buffer<u32>, }
fn sort_step(s:SortWork)->SortWork {
    let entry=s.heap.at_or(0,Entry{node:0,priority:0});
    return SortWork{heap:heap_pop(s.heap),output:s.output.push(entry.priority)};
}
fn heap_sorted(xs:List<u32>)->List<u32> {
    let s=SortWork{heap:heap_build(xs),output:Buffer.empty()};
    let s=repeat_until(length(xs),s,fn(s)=>s.heap.len()==0,fn(i)=>fn(s)=>sort_step(s));
    return s.output.freeze();
}


state Inputs:Table<u64,List<u32>> = Table.empty();
change put(key:u64,value:List<u32>,fail:Bool)->Result<Unit,Bool> writes(Inputs){Inputs.remove(key);Inputs.insert(key,value);if fail{return Err(true);}return Ok(());}
change erase(key:u64,fail:Bool)->Result<Unit,Bool> writes(Inputs){Inputs.remove(key);if fail{return Err(true);}return Ok(());}
query sorted()->Option<List<u32>> reads(Inputs){return Inputs.get(0).map(fn(row)=>heap_sorted(row));}
query get(key:u64)->Option<List<u32>> reads(Inputs){return Inputs.get(key);}
