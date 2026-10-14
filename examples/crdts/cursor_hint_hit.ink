module cursor_hint_hit;
import "../../knowledge/libraries/interval_index.ink" as base;
import "../../knowledge/libraries/interval_cursor.ink" as cursor;
fn hit(index:base.Index,key:u64,hint:u32)->Bool{let n=index.nodes.at_or(hint,base.nil());return index.valid && hint!=0 && hint<index.nodes.len() && n.value!=0 && n.start<=key && (n.end==0 || key<n.end);}
fn fast(index:base.Index,key:u64,hint:u32)->cursor.Found{let n=index.nodes.at_or(hint,base.nil());return cursor.Found{index:index,value:n.value,start:n.start,end:n.end,hint:hint};}
fn selected(index:base.Index,key:u64,hint:u32)->cursor.Found{return cursor.locate(index,key,hint);}
record Compared{hit:Bool,fast:u32,selected:u32,}
fn compared(hint:u32)->Compared{
 let index=base.insert(base.empty(),1,5,7);let valid=hit(index,2,hint);
 let index=base.insert(base.empty(),1,5,7);let a=fast(index,2,hint).value;
 let index=base.insert(base.empty(),1,5,7);let b=selected(index,2,hint).value;
 return Compared{hit:valid,fast:a,selected:b};
}
