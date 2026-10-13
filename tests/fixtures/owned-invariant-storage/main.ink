module owned_invariant_storage;
import "../../../knowledge/libraries/owned-values.ink" as owner;
abstract refined record Item { value:u32, } invariant value.value<10;
fn copy(items:List<Item>)->List<Item>{return owner.copy<Item>(items);}
fn values(items:List<Item>)->List<u32>{return owner.copy<Item>(items).map(fn(item)=>item.value);}
fn numeric(items:List<u32>)->List<u32>{return items.map(fn(item)=>item+1);}
private state Current:List<Item>=[];
event Saved:List<Item>;
change set(items:List<Item>)->Result<Unit,String> writes(Current) emits(Saved){Current=owner.copy<Item>(items);emit Saved(Current);return Ok(());}
change abort(items:List<Item>)->Result<Unit,String> writes(Current) emits(Saved){Current=owner.copy<Item>(items);emit Saved(Current);return Err("aborted");}
query current()->List<u32> reads(Current){return Current.map(fn(item)=>item.value);}
