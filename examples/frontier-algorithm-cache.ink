module frontier_algorithm_cache;

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

record Search {
    grid:Buffer<u32>, queue:Buffer<Entry>, costs:Map<u32,u32>,
    closed:Map<u32,Bool>, parents:Map<u32,u32>,
    width:u32, goal:u32, found:Bool, distance:u32, expanded:u32,
}
fn difference(a:u32,b:u32)->u32 { return choose(a>b,a-b,b-a); }
fn heuristic(node:u32,goal:u32,width:u32)->u32 {
    return difference(rem_or(node,width,0),rem_or(goal,width,0))
        + difference(quot_or(node,width,0),quot_or(goal,width,0));
}
fn relax(s:Search,from:u32,to:u32)->Search {
    let next=s.costs.get_or(from,0)+1;
    let eligible=s.grid.at_or(to,1)==0 && s.closed.contains(to)==false
        && next<s.costs.get_or(to,4294967295);
    return choose(eligible,
        Search{grid:s.grid,queue:heap_push(s.queue,Entry{node:to,priority:next+heuristic(to,s.goal,s.width)}),
            costs:s.costs.set(to,next),closed:s.closed,parents:s.parents.set(to,from),
            width:s.width,goal:s.goal,found:s.found,distance:s.distance,expanded:s.expanded},s);
}
fn expand(s:Search,node:u32)->Search {
    let n=s.grid.len();
    let x=rem_or(node,s.width,0);
    let west=choose(x>0,node-1,node);
    let east=choose(x+1<s.width && node+1<n,node+1,node);
    let north=choose(node>=s.width,node-s.width,node);
    let south=choose(node+s.width<n,node+s.width,node);
    let s=Search{grid:s.grid,queue:s.queue,costs:s.costs,closed:s.closed.set(node,true),parents:s.parents,
        width:s.width,goal:s.goal,found:false,distance:0,expanded:s.expanded+1};
    let s=relax(s,node,west);
    let s=relax(s,node,east);
    let s=relax(s,node,north);
    return relax(s,node,south);
}
fn search_step(s:Search)->Search {
    let entry=s.queue.at_or(0,Entry{node:0,priority:0});
    let node=entry.node;
    let seen=s.closed.contains(node);
    let distance=s.costs.get_or(node,4294967295);
    let s=Search{grid:s.grid,queue:heap_pop(s.queue),costs:s.costs,closed:s.closed,parents:s.parents,
        width:s.width,goal:s.goal,found:node==s.goal,distance:distance,expanded:s.expanded};
    return choose(s.found || seen,s,expand(s,node));
}
record PathWork { parents:Map<u32,u32>, path:Buffer<u32>, node:u32, done:Bool, }
fn path_step(s:PathWork,start:u32)->PathWork {
    let parent=s.parents.get_or(s.node,start);
    return PathWork{parents:s.parents,path:s.path.push(s.node),node:parent,done:s.node==start};
}
fn reverse(path:Buffer<u32>)->List<u32> {
    let n=path.len();
    let path=repeat_until(quot_or(n,2,0),path,fn(path)=>false,fn(i)=>fn(path)=>path.swap(i,n-1-i));
    return path.freeze();
}
record Route { found:Bool, distance:u32, expanded:u32, limited:Bool, path:List<u32>, }
fn finish(s:Search,start:u32)->Route {
    let limited=s.found==false && s.queue.len()>0;
    let path=PathWork{parents:s.parents,path:Buffer.empty(),node:s.goal,done:s.found==false};
    let path=repeat_until(s.grid.len(),path,fn(p)=>p.done,fn(i)=>fn(p)=>path_step(p,start));
    return Route{found:s.found,distance:s.distance,expanded:s.expanded,limited:limited,path:reverse(path.path)};
}
// Four-neighbour unit-cost A*. Zero cells are walkable. A caller supplies the
// maximum queue pops; limited=true distinguishes an unfinished search.
fn astar(grid:List<u32>,width:u32,start:u32,goal:u32,limit:u32)->Route {
    let valid=width>0 && length(grid)>0 && rem_or(length(grid),width,1)==0
        && start<length(grid) && goal<length(grid)
        && grid.at_or(start,1)==0 && grid.at_or(goal,1)==0;
    return choose(valid,search(grid,width,start,goal,limit),
        Route{found:false,distance:0,expanded:0,limited:false,path:grid.filter(fn(x)=>false)});
}
fn search(grid:List<u32>,width:u32,start:u32,goal:u32,limit:u32)->Route {
    let costs:Map<u32,u32> = Map.empty();
    let queue:Buffer<Entry> = Buffer.empty();
    let s=Search{grid:buffer(grid),queue:heap_push(queue,Entry{node:start,priority:heuristic(start,goal,width)}),
        costs:costs.set(start,0),closed:Map.empty(),parents:Map.empty(),
        width:width,goal:goal,found:false,distance:0,expanded:0};
    let s=repeat_until(limit,s,fn(s)=>s.found || s.queue.len()==0,fn(i)=>fn(s)=>search_step(s));
    return finish(s,start);
}

record GridInput { grid:List<u32>, width:u32, start:u32, goal:u32, limit:u32, }
state Inputs:Table<u64,GridInput> = Table.empty();
change put(key:u64,value:GridInput,fail:Bool)->Result<Unit,Bool> writes(Inputs){Inputs.remove(key);Inputs.insert(key,value);if fail{return Err(true);}return Ok(());}
change erase(key:u64,fail:Bool)->Result<Unit,Bool> writes(Inputs){Inputs.remove(key);if fail{return Err(true);}return Ok(());}
query route()->Option<Route> reads(Inputs){return Inputs.get(0).map(fn(row)=>astar(row.grid,row.width,row.start,row.goal,row.limit));}
query get(key:u64)->Option<GridInput> reads(Inputs){return Inputs.get(key);}
