module action_control;
record Row { value:u32, }
record Pair { a:u32, b:u32, }
enum Error { Missing, Overflow, }
state Rows:Table<u32,Row> = Table.empty();
event seen:u32;
keep total:Int = sum(Rows.values().map(fn(row)=>Int(row.value)));

fn pair(a:u32,b:u32)->Pair { return Pair{a:a,b:b}; }
change create()->Result<Unit,Error> writes(Rows) {
    if Rows.contains(0) { return Err(Error.Overflow); }
    Rows.insert(0,Row{value:7}); return Ok(());
}
change advance(amount:u32)->Result<u32,Error> writes(Rows) emits(seen) {
    let row=Rows.get(0).ok_or(Error.Missing)?;
    let next=checked_add(row.value,amount).map_err(fn(_)=>Error.Overflow)?;
    Rows.replace(0,Row{value:next}); emit seen(next); return Ok(next);
}
change record_order()->Result<Pair,Error> writes(Rows) emits(seen) {
    return Ok(Pair{b:advance(1)?,a:advance(2)?});
}
change argument_order()->Result<Pair,Error> writes(Rows) emits(seen) {
    return Ok(pair(advance(3)?,advance(4)?));
}
change error_value()->Result<Error,Error> emits(seen) {
    emit seen(99); return Ok(Error.Missing);
}
change eager_fallback()->Result<u32,Error> reads(Rows) emits(seen) {
    let row=Rows.get(0).ok_or(error_value()?)?; return Ok(row.value);
}
change poison()->Result<Unit,Error> writes(Rows) emits(seen) {
    advance(1)?; return Err(Error.Overflow);
}
change ignore()->Result<Unit,Error> writes(Rows) emits(seen) {
    poison(); emit seen(999); return Ok(());
}
change capture()->Result<Unit,Error> writes(Rows) emits(seen) {
    let ignored=poison(); emit seen(998); return Ok(());
}
change branch(yes:Bool)->Result<u32,Error> writes(Rows) emits(seen) {
    if yes { return Ok(advance(5)?); } else { return Ok(advance(6)?); }
    return Err(Error.Missing);
}
change truth()->Result<Bool,Error> writes(Rows) emits(seen) {
    advance(100)?; return Ok(true);
}
change short_circuit()->Result<Unit,Error> writes(Rows) emits(seen) {
    if false && truth()? { return Err(Error.Overflow); }
    if true || truth()? { return Ok(()); }
    return Err(Error.Overflow);
}
change read_tentative()->Result<Int,Error> reads(total) writes(Rows) emits(seen) {
    advance(1)?; return Ok(total);
}
change empty_words()->Result<List<u32>,Error> writes(Rows) {
    Rows.remove(0); return Ok(Rows.values().map(fn(row)=>row.value));
}
change sum_changed()->Result<u32,Error> writes(Rows) {
    return Ok(sum(empty_words()?));
}
change discarded_constructors()->Result<Unit,Error> {
    Ok(3); Err(Error.Missing); Some(None); return Ok(());
}
query contextual_none()->Option<Option<u32>> { return None.map(fn(x)=>Some(x)); }
query constrained_none()->Option<Bool> { return None.map(fn(x)=>x==1); }
query total_query()->Int reads(total) { return total; }
