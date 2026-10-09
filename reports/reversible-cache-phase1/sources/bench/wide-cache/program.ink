module wide_cache;
record Row {value:Int, }
enum Error {Exists, Missing, }
state Rows:Table<u64,Row> = Table.empty();
keep exact_total:Int=sum(Rows.values().map(fn(row)=>row.value));
change put(key:u64,value:Int)->Result<Unit,Error> writes(Rows){
    if Rows.contains(key){return Err(Error.Exists);}
    Rows.insert(key,Row {value:value});return Ok(());
}
change set(value:Int)->Result<Unit,Error> writes(Rows){
    let row=Rows.get(1).ok_or(Error.Missing)?;
    Rows.replace(1,Row {value:value});return Ok(());
}
query total()->Int reads(exact_total){return exact_total;}
