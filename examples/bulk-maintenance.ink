module bulk_maintenance;
state Rows: Table<u64, u64> = Table.empty();
keep total: u64 = sum(Rows.values());
change put(key: u64, value: u64) -> Result<Unit, String> writes(Rows) {
    Rows.put(key, value); return Ok(());
}
change batch(keys: List<u64>, values: List<u64>) -> Result<Unit, String> writes(Rows) {
    Rows.put_many(keys, values)?; return Ok(());
}
change erase(keys: List<u64>) -> Result<Unit, String> writes(Rows) {
    Rows.remove_many(keys); return Ok(());
}
change fail(keys: List<u64>, values: List<u64>) -> Result<Unit, String> writes(Rows) {
    Rows.put_many(keys, values)?; return Err("rollback");
}
query quantity_total() -> u64 reads(total) { return total; }
query keys() -> List<u64> reads(Rows) { return Rows.keys(); }
