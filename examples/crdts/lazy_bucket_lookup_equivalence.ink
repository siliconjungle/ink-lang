module lazy_bucket_lookup_equivalence;
import "../../knowledge/libraries/bucket_interval_index.ink" as original;
import "../../knowledge/libraries/interval_index.ink" as base;
import "../../knowledge/libraries/interval_cursor.ink" as cursor;
fn eager(index:original.Index,key:u64,hint:u32)->original.Found{return original.locate(index,key,hint);}
fn lazy(index:original.Index,key:u64,hint:u32)->original.Found{
 let n=index.nodes.at_or(hint,base.nil());
 if index.valid && hint!=0 && hint<index.nodes.len() && n.value!=0 && n.start<=key && (n.end==0 || key<n.end){return original.Found{index:index,value:n.value,start:n.start,end:n.end,hint:hint};}
 let root=index.roots.get_or(original.bucket(key),0);let f=cursor.locate(base.Index{nodes:index.nodes,root:root,valid:index.valid},key,hint);
 return original.Found{index:original.Index{nodes:f.index.nodes,roots:index.roots,valid:f.index.valid},value:f.value,start:f.start,end:f.end,hint:f.hint};
}
