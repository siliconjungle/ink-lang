module indexed_keys;
id KeyId;
enum Error{Missing,Present,Failed,}
state Rows:Table<u64,u64> =Table.empty();
state Strings:Table<String,u64> =Table.empty();
state Ids:Table<KeyId,u64> =Table.empty();
state Signed:Table<i32,u64> =Table.empty();
state Words:Table<u32,u64> =Table.empty();
state Flags:Table<Bool,u64> =Table.empty();
event seen:u64;
change put(a:u64,value:u64)->Result<Unit,Error> writes(Rows){Rows.remove(a);Rows.insert(a,value);return Ok(());}
change rr(a:u64,b:u64,value:u64,fail:Bool)->Result<u64,Error> writes(Rows) emits(seen){if Rows.contains(a){Rows.replace(a,value);let middle=Rows.get(a).ok_or(Error.Missing)?;if Rows.contains(b){Rows.replace(b,middle+1);emit seen(middle);if fail{return Err(Error.Failed);}return Ok(middle);}return Err(Error.Missing);}return Err(Error.Missing);}
change rd(a:u64,b:u64,value:u64)->Result<Unit,Error> writes(Rows){if Rows.contains(a){Rows.replace(a,value);Rows.remove(b);return Ok(());}return Err(Error.Missing);}
change ri(a:u64,b:u64,value:u64)->Result<Unit,Error> writes(Rows){if Rows.contains(a){Rows.replace(a,value);if Rows.contains(b){return Err(Error.Present);}else{Rows.insert(b,value+1);return Ok(());}return Err(Error.Present);}return Err(Error.Missing);}
change dr(a:u64,b:u64,value:u64)->Result<Unit,Error> writes(Rows){Rows.remove(a);if Rows.contains(b){Rows.replace(b,value);return Ok(());}return Err(Error.Missing);}
change dd(a:u64,b:u64)->Result<Unit,Error> writes(Rows){Rows.remove(a);Rows.remove(b);return Ok(());}
change di(a:u64,b:u64,value:u64)->Result<Unit,Error> writes(Rows){Rows.remove(a);if Rows.contains(b){return Err(Error.Present);}else{Rows.insert(b,value);return Ok(());}return Err(Error.Present);}
change ir(a:u64,b:u64,value:u64)->Result<Unit,Error> writes(Rows){if Rows.contains(a){return Err(Error.Present);}else{Rows.insert(a,value);if Rows.contains(b){Rows.replace(b,value+1);return Ok(());}return Err(Error.Missing);}return Err(Error.Present);}
change id(a:u64,b:u64,value:u64)->Result<Unit,Error> writes(Rows){if Rows.contains(a){return Err(Error.Present);}else{Rows.insert(a,value);Rows.remove(b);return Ok(());}return Err(Error.Present);}
change ii(a:u64,b:u64,value:u64,fail:Bool)->Result<Unit,Error> writes(Rows) emits(seen){if Rows.contains(a){return Err(Error.Present);}else{Rows.insert(a,value);if Rows.contains(b){return Err(Error.Present);}else{Rows.insert(b,value+1);emit seen(value);if fail{return Err(Error.Failed);}return Ok(());}return Err(Error.Present);}return Err(Error.Present);}
query get(a:u64)->Option<u64> reads(Rows){return Rows.get(a);}
query total()->u64 reads(Rows){return sum(Rows.values());}
change string_pair(a:String,b:String,value:u64)->Result<Unit,Error> writes(Strings){Strings.remove(a);Strings.remove(b);if Strings.contains(a){return Err(Error.Present);}Strings.insert(a,value);if Strings.contains(b){return Err(Error.Present);}else{Strings.insert(b,value+1);return Ok(());}return Err(Error.Present);}
change id_pair(a:KeyId,b:KeyId,value:u64)->Result<Unit,Error> writes(Ids){Ids.remove(a);Ids.remove(b);if Ids.contains(a){return Err(Error.Present);}Ids.insert(a,value);if Ids.contains(b){return Err(Error.Present);}else{Ids.insert(b,value+1);return Ok(());}return Err(Error.Present);}
change signed_pair(a:i32,b:i32,value:u64)->Result<Unit,Error> writes(Signed){Signed.remove(a);Signed.remove(b);if Signed.contains(a){return Err(Error.Present);}Signed.insert(a,value);if Signed.contains(b){return Err(Error.Present);}else{Signed.insert(b,value+1);return Ok(());}return Err(Error.Present);}
change word_pair(a:u32,b:u32,value:u64)->Result<Unit,Error> writes(Words){Words.remove(a);Words.remove(b);if Words.contains(a){return Err(Error.Present);}Words.insert(a,value);if Words.contains(b){return Err(Error.Present);}else{Words.insert(b,value+1);return Ok(());}return Err(Error.Present);}
change flag_pair(a:Bool,b:Bool,value:u64)->Result<Unit,Error> writes(Flags){Flags.remove(a);Flags.remove(b);if Flags.contains(a){return Err(Error.Present);}Flags.insert(a,value);if Flags.contains(b){return Err(Error.Present);}else{Flags.insert(b,value+1);return Ok(());}return Err(Error.Present);}
query string_get(a:String)->Option<u64> reads(Strings){return Strings.get(a);}
query id_get(a:KeyId)->Option<u64> reads(Ids){return Ids.get(a);}
query signed_get(a:i32)->Option<u64> reads(Signed){return Signed.get(a);}
query word_get(a:u32)->Option<u64> reads(Words){return Words.get(a);}
query flag_get(a:Bool)->Option<u64> reads(Flags){return Flags.get(a);}
query joined()->u64 reads(Rows,Strings,Ids,Signed,Words,Flags){return sum(Rows.values())+sum(Strings.values())+sum(Ids.values())+sum(Signed.values())+sum(Words.values())+sum(Flags.values());}
