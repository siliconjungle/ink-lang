module typed_frames;
record Row { amount:u32, }
enum Error { Duplicate, Missing, }
state Rows:Table<u32,Row> = Table.empty();
event seen:u32;

change insert(key:u32,amount:u32)->Result<Unit,Error> writes(Rows) {
    if Rows.contains(key) { return Err(Error.Duplicate); }
    Rows.insert(key,Row{amount:amount}); return Ok(());
}
query shadow(outer:u32,take:Bool)->List<Option<u32>> reads(Rows) {
    let original=outer;
    if take { let branch:u32=999; branch; } else { let branch:u32=123; branch; }
    return Rows.values().map(fn(outer)=>Some(outer.amount+original));
}
query nested(outer:u32)->List<List<u32>> reads(Rows) {
    return Rows.values().map(fn(outer)=>Rows.values().map(fn(inner)=>outer.amount+inner.amount));
}
query read(key:u32)->Result<u32,Error> reads(Rows) {
    return Ok(Rows.get(key).ok_or(Error.Missing)?.amount);
}
query errors()->List<Result<u32,Error>> reads(Rows) {
    return Rows.values().map(fn(row)=>read(row.amount));
}
change emit_list(offset:u32)->Result<Unit,Error> reads(Rows) emits(seen) {
    let shifted=Rows.values().map(fn(offset)=>offset.amount);
    if true { let branch:u32=999; branch; }
    emit seen(sum(shifted)+offset);
    return Ok(());
}
change abort_after_callback()->Result<Unit,Error> writes(Rows) emits(seen) {
    let values=Rows.values().map(fn(row)=>row.amount);
    Rows.remove(1); emit seen(sum(values)); return Err(Error.Missing);
}
