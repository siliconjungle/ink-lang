module interval_adjacent_examples;
import "../../knowledge/libraries/interval_index.ink" as intervals;
import "../../knowledge/libraries/interval_adjacent_finger.ink" as cursor;
record Entry{start:u64,end:u64,value:u32,}
record Query{key:u64,hint:u32,}
record Reading{index:intervals.Index,values:Buffer<u32>,}
fn built(entries:List<Entry>)->intervals.Index{
 var index:intervals.Index=intervals.empty();for e in entries{index=intervals.insert(index,e.start,e.end,e.value);}return index;
}
fn read_step(r:Reading,q:Query,use_hint:Bool)->Reading{
 if !use_hint{let f=intervals.locate(r.index,q.key);return Reading{index:f.index,values:r.values.push(f.value)};}
 let f=cursor.locate(r.index,q.key,q.hint);return Reading{index:f.index,values:r.values.push(f.value)};
}
fn values(entries:List<Entry>,queries:List<Query>,use_hint:Bool)->List<u32>{
 var r:Reading=Reading{index:built(entries),values:Buffer.empty()};
 for q in queries{r=read_step(r,q,use_hint);}return r.values.freeze();
}
fn split_hint()->List<u32>{
 let index=intervals.insert(intervals.empty(),10,30,1);let f=cursor.locate(index,25,0);let hint=f.hint;
 let index=intervals.insert(intervals.changed_end(f.index,10,20),20,30,2);
 let f=cursor.locate(index,25,hint);let value=f.value;let refreshed=f.hint;
 let f=cursor.locate(f.index,25,refreshed);return [value,f.value,refreshed];
}

record Rolling{index:intervals.Index,hint:u32,values:Buffer<u32>,}
fn rolling(entries:List<Entry>,keys:List<u64>)->List<u32>{
 var r:Rolling=Rolling{index:built(entries),hint:0,values:Buffer.empty()};
 for key in keys{let f=cursor.locate(r.index,key,r.hint);r=Rolling{index:f.index,hint:f.hint,values:r.values.push(f.value)};}
 return r.values.freeze();
}
