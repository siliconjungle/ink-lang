module frontier_keys;
id ItemId;
enum Error{Failed,}
record Item{label:String,owner:ItemId,amount:i32,}
state Strings:Table<String,Item> =Table.empty();
state Ids:Table<ItemId,String> =Table.empty();
state Signed:Table<i32,String> =Table.empty();
state Words:Table<u32,String> =Table.empty();
event item:Item;
change put_string(key:String,row:Item,fail:Bool)->Result<Unit,Error> writes(Strings) emits(item){Strings.remove(key);Strings.insert(key,row);emit item(row);if fail{return Err(Error.Failed);}return Ok(());}
change put_id(key:ItemId,value:String)->Result<Unit,Error> writes(Ids){Ids.remove(key);Ids.insert(key,value);return Ok(());}
change put_signed(key:i32,value:String)->Result<Unit,Error> writes(Signed){Signed.remove(key);Signed.insert(key,value);return Ok(());}
change put_word(key:u32,value:String)->Result<Unit,Error> writes(Words){Words.remove(key);Words.insert(key,value);return Ok(());}
change erase_string(key:String)->Result<Unit,Error> writes(Strings){Strings.remove(key);return Ok(());}
query get_string(key:String)->Option<Item> reads(Strings){return Strings.get(key);}
query get_id(key:ItemId)->Option<String> reads(Ids){return Ids.get(key);}
query same(a:Item,b:Item)->Bool{return a==b;}
fn greeting()->String{return "hello 🌍";}
query literal()->String{return greeting();}
