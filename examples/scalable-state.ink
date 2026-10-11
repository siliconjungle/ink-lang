module scalable;
record Row { name: String, quantity: u64, small:u32, signed:i32, exact: Int, weight: f32, }
state Rows: Table<u64, Row> = Table.empty();
state Selected: Table<u64, Unit> = Table.empty();
event changed: u64;
keep total: u64 = sum(Rows.values().map(fn(row) => row.quantity));
change put(key: u64, row: Row) -> Result<Unit, String> writes(Rows) emits(changed) {
    Rows.put(key, row);
    emit changed(key);
    return Ok(());
}
change batch(keys: List<u64>, rows: List<Row>) -> Result<Unit, String> writes(Rows) {
    Rows.put_many(keys, rows)?;
    return Ok(());
}
change select(keys: List<u64>, values: List<Unit>) -> Result<Unit, String> writes(Selected) {
    return Selected.put_many(keys, values);
}
change remove(keys: List<u64>) -> Result<Unit, String> writes(Rows) {
    Rows.remove_many(keys);
    return Ok(());
}
change fail(keys: List<u64>, rows: List<Row>) -> Result<Unit, String> writes(Rows) emits(changed) {
    batch(keys, rows)?;
    emit changed(7);
    Rows.remove_many(keys);
    return Err("failed after bulk updates");
}
query keys() -> List<u64> reads(Rows) { return Rows.keys(); }
query values() -> List<Row> reads(Rows) { return Rows.values(); }
query intersection() -> List<u64> reads(Rows, Selected) { return Rows.shared_keys(Selected); }
query restrict(keys: List<u64>) -> List<u64> reads(Rows) { return Rows.intersect_keys(keys); }
query quantity_total() -> u64 reads(total) { return total; }

query scan_total() -> u64 reads(Rows) { return Rows.sum_by(fn(row) => row.quantity); }
query scan_exact() -> Int reads(Rows) { return Rows.sum_by(fn(row) => row.exact); }
query scan_weight() -> f32 reads(Rows) { return Rows.sum_by(fn(row) => row.weight); }
query count_big(threshold: u64) -> Int reads(Rows) { return Rows.count_where(fn(row) => row.quantity > threshold); }
query shifted(amount: u64) -> u64 reads(Rows) { return Rows.sum_by(fn(row) => row.quantity + amount); }

query scan_small()->u32 reads(Rows){return Rows.sum_by(fn(row)=>row.small);}
query scan_signed()->i32 reads(Rows){return Rows.sum_by(fn(row)=>row.signed);}
