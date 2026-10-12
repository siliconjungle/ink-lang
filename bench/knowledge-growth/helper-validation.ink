module helper_validation;
import "../../knowledge/libraries/controlled-folds.ink" as c;
record Item{value:u32,flag:Bool,}
fn run(xs:List<Item>)->u32{
 let any=c.any<Item>(xs,fn(x)=>x.flag);
 let all=c.every<Item>(xs,fn(x)=>x.flag);
 let n=c.fold_filtered_until<Item,u32>(xs,0,fn(x)=>x.flag,fn(p)=>p.accumulated>64,fn(p)=>p.accumulated+p.item.value);
 let m=c.fold_mapped_until<Item,u32,u32>(xs,0,fn(x)=>x.value,fn(p)=>p.accumulated>64,fn(p)=>p.accumulated+p.item);
 let k=c.scan_marked<Item,u32>(c.mark<Item>(xs,fn(x)=>x.flag),0,fn(p)=>p.item.value-p.accumulated);
 return n+m+k+choose(any,1,0)+choose(all,2,0);
}
