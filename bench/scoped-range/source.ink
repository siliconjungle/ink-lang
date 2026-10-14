module range_benchmark;
fn copied(items:List<u32>,start:u32,count:u32,windows:u32)->u32 {
 return repeat_until(windows,0,fn(total)=>false,fn(i)=>fn(total)=>total+foldl(items.drop(start).take(count),0,fn(item)=>fn(acc)=>acc+item));
}
fn borrowed(items:List<u32>,start:u32,count:u32,windows:u32)->u32 {
 if count==0||start>=length(items){return repeat_until(windows,0,fn(total)=>false,fn(i)=>fn(total)=>total);}
 let owner=buffer(items);
 return repeat_until(windows,0,fn(total)=>false,fn(i)=>fn(total)=>total+owner.borrow_range(start,count,fn(view)=>
  repeat_until(view.len(),0,fn(acc)=>false,fn(index)=>fn(acc)=>acc+view.at_or(index,0))));
}
