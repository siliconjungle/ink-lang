module source_row_undo;
id Marker;
enum Status { Ready, Paused, }
enum Error { Failed, }
record Detail { bias:Int, active:Bool, }
record Row {
    name:String,
    value:Int,
    detail:Detail,
    note:Option<String>,
    words:List<u64>,
    status:Status,
    marker:Marker,
    response:Result<Int,Status>,
    count:u32,
}
state Rows:Table<u64,Row> = Table.empty();
event changed:Row;
keep total:Int = sum(Rows.values().filter(fn(row)=>row.detail.active).map(fn(row)=>row.value+row.detail.bias));
change put(key:u64,row:Row)->Result<Unit,Error> writes(Rows) emits(changed) {
    if Rows.contains(key) { Rows.replace(key,row); }
    else { Rows.insert(key,row); }
    emit changed(row);
    return Ok(());
}
change fail(key:u64,row:Row)->Result<Unit,Error> writes(Rows) emits(changed) {
    put(key,row)?;
    Rows.remove(key);
    put(key,row)?;
    return Err(Error.Failed);
}
query row(key:u64)->Option<Row> reads(Rows) { return Rows.get(key); }
query value()->Int reads(total) { return total; }
