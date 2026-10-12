module access_point_cache;
enum Error { Missing, Failed, }
record Key { id:u64, }
state Items:Table<u64,u64> = Table.empty();
event changed:u64;

fn identity(key:u64)->u64 { let alias=key; return alias; }

change put(key:u64,value:u64)->Result<Unit,Error> writes(Items) emits(changed) {
    let alias=identity(key);
    Items.put(alias,value);
    emit changed(alias);
    return Ok(());
}

change edit(key:Key,value:u64,fail:Bool)->Result<Unit,Error> writes(Items) emits(changed) {
    let alias=identity(key.id);
    put(alias,value)?;
    if fail { return Err(Error.Failed); }
    return Ok(());
}

change from_state(key:u64,value:u64)->Result<Unit,Error> writes(Items) {
    let target=Items.get(key).ok_or(Error.Missing)?;
    Items.put(target,value);
    return Ok(());
}

change remove_many(keys:List<u64>)->Result<Unit,Error> writes(Items) {
    Items.remove_many(keys);
    return Ok(());
}

query watched()->Option<u64> reads(Items) { return Items.get(identity(0)); }
query scan()->List<u64> reads(Items) { return Items.values(); }
