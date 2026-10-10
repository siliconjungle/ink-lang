module stock;
id ItemId;
record Item{stock:u32,}
enum Error{Missing,Overflow,}
state Items:Table<ItemId,Item> = Table.empty();
event changed:u32;
change put(id:ItemId,item:Item)->Result<Unit,Error> writes(Items) emits(changed){
 if Items.contains(id){Items.replace(id,item);}else{Items.insert(id,item);}
 emit changed(item.stock);return Ok(());
}
query get(id:ItemId)->Option<Item> reads(Items){return Items.get(id);}
