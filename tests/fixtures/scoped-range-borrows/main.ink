module scoped_range_borrows;
import "../../../knowledge/libraries/buffer-views.ink" as views;
record Cell { value:u32, retained:Bool, }
fn read(items:List<u32>,start:u32,count:u32,index:u32)->u32 {
 let owner=buffer(items);
 let result=owner.borrow_range(start,count,fn(view)=>view.at_or(index,99));
 return result+owner.len();
}
fn nested(items:List<u32>)->u32 {
 let owner=buffer(items);
 return owner.borrow_range(1,3,fn(view)=>view.borrow_range(1,2,fn(inner)=>inner.at_or(0,99)));
}
fn text(items:List<String>,start:u32,count:u32,index:u32)->String {return views.at<String>(items,start,count,index,"fallback");}
fn cell(items:List<Cell>,start:u32,count:u32,index:u32)->Cell {return views.at<Cell>(items,start,count,index,Cell{value:99,retained:false});}
fn window_sum(items:List<u32>,start:u32,count:u32)->u32 {return views.sum_window(items,start,count);}
fn numeric(items:List<u32>)->List<u32> {return items.map(fn(item)=>item+1);}
private state Current:List<u32>=[];
event Seen:u32;
change set(items:List<u32>,start:u32,count:u32)->Result<u32,String> writes(Current) emits(Seen) {
 Current=items;let result=views.sum_window(items,start,count);emit Seen(result);return Ok(result);
}
change abort(items:List<u32>,start:u32,count:u32)->Result<u32,String> writes(Current) emits(Seen) {
 Current=items;let result=views.sum_window(items,start,count);emit Seen(result);return Err("aborted");
}
query current(start:u32,count:u32)->u32 reads(Current) {return views.sum_window(Current,start,count);}
