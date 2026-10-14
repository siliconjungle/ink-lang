module set_interface;
import "../../../knowledge/libraries/collections.ink" as sets;
record Item{name:String,weights:List<u32>,}
fn make(xs:List<u32>)->sets.Set<u32>{return sets.set<u32>(xs);}
fn size(value:sets.Set<u32>)->Int{return sets.size<u32>(value);}
fn has(value:sets.Set<u32>,item:u32)->Bool{return sets.has<u32>(value,item);}
fn distinct(value:sets.Set<u32>)->Bool{return sets.known_distinct<u32>(value);}
fn elements(value:sets.Set<u32>)->List<u32>{return sets.elements<u32>(value);}
fn union(a:sets.Set<u32>,b:sets.Set<u32>)->sets.Set<u32>{return sets.union<u32>(a,b);}
fn intersection(a:sets.Set<u32>,b:sets.Set<u32>)->sets.Set<u32>{return sets.intersection<u32>(a,b);}
fn difference(a:sets.Set<u32>,b:sets.Set<u32>)->sets.Set<u32>{return sets.difference<u32>(a,b);}
fn words(xs:List<String>)->sets.Set<String>{return sets.set<String>(xs);}
fn records(xs:List<Item>)->sets.Set<Item>{return sets.set<Item>(xs);}
fn floats(xs:List<f32>)->sets.Set<f32>{return sets.set<f32>(xs);}
fn float_bits(value:sets.Set<f32>)->List<u32>{return sets.elements<f32>(value).map(fn(x)=>f32_bits(x));}
fn numeric(xs:List<u32>)->List<u32>{return xs.map(fn(x)=>x+1);}
private state Current:sets.Set<u32>=sets.set<u32>([]);
event Saved:sets.Set<u32>;
change save(value:sets.Set<u32>)->Result<Unit,String> writes(Current) emits(Saved){Current=value;emit Saved(value);return Ok(());}
change abort(value:sets.Set<u32>)->Result<Unit,String> writes(Current) emits(Saved){Current=value;emit Saved(value);return Err("aborted");}
query current()->List<u32> reads(Current){return sets.elements<u32>(Current);}
