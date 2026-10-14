module interval_examples;
import "../../knowledge/libraries/interval_index.ink" as index;
record Interval{start:u64,end:u64,value:u32,}
record Request{key:u64,}
record Working{index:index.Index,results:Buffer<u32>,}
fn looked_up(w:Working,key:u64)->Working{
 let f=index.locate(w.index,key);let value=f.value;
 return Working{index:f.index,results:w.results.push(value)};
}
fn built(intervals:List<Interval>)->index.Index{
 var i:index.Index=index.empty();for x in intervals{i=index.insert(i,x.start,x.end,x.value);}
 return i;
}
fn lookup(intervals:List<Interval>,keys:List<u64>)->List<u32>{
 var w:Working=Working{index:built(intervals),results:Buffer.empty()};
 for key in keys{w=looked_up(w,key);}
 return w.results.freeze();
}
fn valid(intervals:List<Interval>)->Bool{var i:index.Index=index.empty();for x in intervals{i=index.insert(i,x.start,x.end,x.value);}return i.valid;}
