module shop;
import "stock.ink" as stock;
import "std:words" as words;
import "std:lists" as lists;
change put(id:stock.ItemId,n:u32)->Result<Unit,stock.Error> writes(stock.Items) emits(stock.changed){
 return stock.put(id,stock.Item{stock:words.clamp32(n,0,100)});
}
query get(id:stock.ItemId)->Option<u32> reads(stock.Items){return stock.get(id).map(fn(item)=>item.stock);}
fn prefixes(xs:List<u32>)->List<u32>{return lists.prefix32(xs);}
fn clamp(n:u32)->u32{return words.clamp32(n,2,8);}
