module view_sweep;
record Row { b: u32, flag: Bool, }
enum Error { Failed, }
state Rows: Table<u64, Row> = Table.empty();
keep active_units: Int = sum(Rows.values().filter(fn(r) => r.flag).map(fn(r) => Int(r.b)));
keep active_rows: Int = count(Rows.values().filter(fn(r) => r.flag));
change put(key: u64, row: Row) -> Result<Unit, Error> writes(Rows) {
    if Rows.contains(key) { Rows.replace(key, row); } else { Rows.insert(key, row); }
    return Ok(());
}
change del(key: u64) -> Result<Unit, Error> writes(Rows) { Rows.remove(key); return Ok(()); }
query units() -> Int reads(active_units) { return active_units; }
query rows() -> Int reads(active_rows) { return active_rows; }
