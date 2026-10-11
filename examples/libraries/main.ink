module library_examples;
import "../../knowledge/libraries/collections.ink" as collections;
import "../../knowledge/libraries/integers.ink" as integers;
fn divided(a:u32,b:u32)->Result<u32,integers.DivisionError>{return integers.checked_div<u32>(a,b);}
fn divided64(a:u64,b:u64)->Result<u64,integers.DivisionError>{return integers.checked_div<u64>(a,b);}
fn signed_divided(a:i32,b:i32)->Result<i32,integers.DivisionError>{return integers.checked_div<i32>(a,b);}
fn signed_remainder(a:i32,b:i32)->Result<i32,integers.DivisionError>{return integers.checked_rem<i32>(a,b);}
fn unique(xs:List<u32>)->List<u32>{return collections.set<u32>(xs);}
fn union(a:List<u32>,b:List<u32>)->List<u32>{return collections.union<u32>(a,b);}
fn intersect(a:List<u32>,b:List<u32>)->List<u32>{return collections.intersection<u32>(a,b);}
fn group(rows:List<collections.Entry<u32,u32>>)->List<collections.Group<u32,u32>>{return collections.group<u32,u32>(rows);}
fn joined(a:List<collections.Entry<u32,u32>>,b:List<collections.Entry<u32,Bool>>)->List<collections.Joined<u32,u32,Bool>>{return collections.join<u32,u32,Bool>(a,b);}
fn transformed(xs:List<u32>,offset:u32)->List<u32>{return collections.map<u32,u32>(xs,fn(item)=>item+offset);}
fn total(xs:List<u32>)->u32{return collections.reduce<u32,u32>(xs,0,fn(state)=>state.accumulated+state.item);}
