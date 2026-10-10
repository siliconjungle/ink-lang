module transitions;
      record Key { word:u64, special:Bool, }
      fn identity(word:u64)->u64 {let word:u64=word+1;return word-1;}
      fn pick(row:Key)->u64 {return choose(row.special,identity(row.word),row.word);}
      fn key_of(word:u64)->u64 {
        let word:Key=Key{word:word,special:word==18446744073709551615};
        return pick(word);
      }
enum Error{Failed,}
state Rows:Table<u64,u64> = Table.empty();
event seen:u64;
change put(key:u64,value:u64)->Result<Unit,Error> writes(Rows) emits(seen){
 if Rows.contains(key){Rows.replace(key,value);}else{Rows.insert(key,value);}
 emit seen(value);return Ok(());
}
change erase(key:u64,fail:Bool)->Result<Unit,Error> writes(Rows) emits(seen){
 Rows.remove(key_of(key)); Rows.remove(key_of(key));
 emit seen(key);
 if fail{return Err(Error.Failed);}return Ok(());
}
query get(key:u64)->Option<u64> reads(Rows){return Rows.get(key);}
