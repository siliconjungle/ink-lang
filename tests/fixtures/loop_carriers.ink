module loop_carriers;
fn moved_before_for()->List<u32>{
 var owner:Buffer<u32>=buffer([1,2,3]);let values=owner.freeze();
 var total:u32=0;for value in values{total=total+value;}return [total];
}
fn two_owner_phases()->List<u32>{
 let a:List<u32>=[3,4];let b:List<u32>=[5,6];
 var first:Buffer<u32>=Buffer.empty();for value in a{first=first.push(value);}
 var second:Buffer<u32>=first;for value in b{second=second.push(value);}return second.freeze();
}
fn moved_before_while()->List<u32>{
 var owner:Buffer<u32>=buffer([7]);let values=owner.freeze();
 var index:u32=0;while index<3 limit 8{index=index+1;}return values.concat([index]);
}
fn shadowed_mutable()->List<u32>{
 var owner:Buffer<u32>=buffer([8]);let values=owner.freeze();
 let items:List<u32>=[1,2];var total:u32=2;for value in items{var owner:u32=value;owner=owner+1;total=total+owner;}
 return values.concat([total]);
}
fn shadowed_loop_item()->List<u32>{
 var item:Buffer<u32>=buffer([9]);let values=item.freeze();
 let items:List<u32>=[4,5];var total:u32=0;for item in items{total=total+item;}return values.concat([total]);
}
fn condition_only_capture()->List<u32>{
 var maximum:u32=4;var index:u32=0;var total:u32=0;
 while index<maximum limit 8{index=index+1;total=total+index;}return [maximum,index,total];
}
fn nested_loops()->List<u32>{
 var owner:Buffer<u32>=buffer([10]);let values=owner.freeze();
 let a:List<u32>=[1,2];let b:List<u32>=[3,4];var total:u32=0;for i in a{for j in b{total=total+i*j;}}return values.concat([total]);
}
fn shadowed_callback()->List<u32>{
 var owner:Buffer<u32>=buffer([11]);let values=owner.freeze();var total:u32=0;
 let items:List<u32>=[1,2];let zero:u32=0;for value in items{total=total+foldl([value],zero,fn(owner,sum)=>sum+owner);}
 return values.concat([total]);
}
fn readonly_owner()->List<u32>{
 var owner:Buffer<u32>=buffer([3,7]);var total:u32=0;
 let indices:List<u32>=[0,1];for index in indices{total=total+owner.at_or(index,0);}return owner.freeze().concat([total]);
}
enum Error{Rejected,}
private state Saved:List<u32>=[];
event items:u32;
fn item_count(values:List<u32>)->u32{return length(values);}
change save(mode:u32,reject:Bool)->Result<List<u32>,Error> writes(Saved) emits(items){
 let values=choose(mode==0,moved_before_for(),choose(mode==1,two_owner_phases(),nested_loops()));
 Saved=values;emit items(item_count(values));return choose(reject,Err(Error.Rejected),Ok(values));
}
query saved()->List<u32> reads(Saved){return Saved;}
