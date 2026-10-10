module flow;
enum Error { Failed, Missing, }
record Pair { a:u64, b:u64, }
state Rows:Table<u64,u64> = Table.empty();
event seen:u64;
fn add(a:u64,b:u64)->u64 {return a+b;}
change put(key:u64,value:u64)->Result<Unit,Error> writes(Rows) emits(seen) {
  if Rows.contains(key) {Rows.replace(key,value);} else {Rows.insert(key,value);}
  emit seen(value); return Ok(());
}
change trim(key:u64,fail:Bool)->Result<Unit,Error> writes(Rows) emits(seen) {
  Rows.remove(key); Rows.remove(key);
  emit seen(key);
  if fail {return Err(Error.Failed);} return Ok(());
}
change erase(key:u64,fail:Bool)->Result<Unit,Error> writes(Rows) emits(seen) {
  emit seen(11); trim(key,fail); emit seen(22); return Ok(());
}
query lookup(key:u64)->Option<u64> reads(Rows) {return Rows.get(key);}
query get(key:u64)->Option<u64> reads(Rows) {return lookup(key).map(fn(x)=>x+1);}
query read(key:u64)->Result<u64,Error> reads(Rows) {return Rows.get(key).ok_or(Error.Missing);}
query require(key:u64)->Result<u64,Error> reads(Rows) {let value:u64=read(key)?; return Ok(value+1);}
query mapped(key:u64)->Result<u64,Error> reads(Rows) {
  return require(key).map(fn(x)=>x+1).map_err(fn(e)=>Error.Failed);
}
change local(key:u64)->Result<Unit,Error> reads(Rows) emits(seen) {
  let value=read(key); emit seen(key); return Ok(());
}
change propagate(key:u64)->Result<Unit,Error> writes(Rows) emits(seen) {
  emit seen(99); let value:u64=require(key)?; Rows.remove(key); return Ok(());
}
change word(value:u64)->Result<u64,Error> emits(seen) {emit seen(value);return Ok(value);}
change args()->Result<u64,Error> emits(seen) {return Ok(add(word(10)?,word(20)?));}
change fields()->Result<Pair,Error> emits(seen) {return Ok(Pair{b:word(20)?,a:word(10)?});}
change error_value()->Result<Error,Error> emits(seen) {emit seen(55);return Ok(Error.Failed);}
change eager(key:u64)->Result<u64,Error> reads(Rows) emits(seen) {
  return Rows.get(key).ok_or(error_value()?);
}
change mark(value:u64,fail:Bool)->Result<Bool,Error> emits(seen) {
  emit seen(value); if fail {return Err(Error.Failed);}return Ok(true);
}
change lazy(flag:Bool,fail:Bool)->Result<Unit,Error> emits(seen) {
  let left:Bool=flag && mark(1,fail)?;
  let right:Bool=flag || mark(2,fail)?;
  return Ok(());
}
change take(key:u64)->Result<Option<u64>,Error> writes(Rows) {return Ok(Rows.remove(key));}
