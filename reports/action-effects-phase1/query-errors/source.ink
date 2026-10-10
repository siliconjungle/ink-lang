module query_errors;
record Row { value:u32, }
enum Error { Missing, }
enum OtherError { Bad, }
state Rows:Table<u32,Row> = Table.empty();
event seen:u32;
keep failed:Result<Unit,OtherError> = Err(OtherError.Bad)?;
query ordinary()->Result<Unit,OtherError> {return Err(OtherError.Bad);}
query raising()->Result<Unit,OtherError> {return Err(OtherError.Bad)?;}
change ignored()->Result<Unit,Error> writes(Rows) emits(seen) {
 Rows.remove(0);raising();emit seen(1);return Ok(());
}
change captured()->Result<Unit,Error> {
 let result=raising();return Ok(());
}
change propagated()->Result<Unit,OtherError> writes(Rows) emits(seen) {
 Rows.remove(0);emit seen(2);raising()?;return Ok(());
}
change keep_value()->Result<Unit,Error> reads(failed) {
 failed;return Ok(());
}
change keep_propagated()->Result<Unit,OtherError> reads(failed) {
 failed?;return Ok(());
}
query callback()->List<Result<Unit,OtherError>> reads(Rows) {
 return Rows.values().map(fn(row)=>raising());
}
change create()->Result<Unit,Error> writes(Rows) {
 if Rows.contains(0) {return Err(Error.Missing);}
 Rows.insert(0,Row{value:7});return Ok(());
}
query read()->Option<Row> reads(Rows){return Rows.get(0);}
