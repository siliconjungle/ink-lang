module invariant_value_state;
refined record Zero { value:u64, } invariant value.value==0;
private state Current:Zero=Zero{value:0};
event Saved:Zero;

change set(value:Zero)->Result<Unit,String> writes(Current) emits(Saved) {
 Current=value;
 emit Saved(value);
 return Ok(());
}
change abort(value:Zero)->Result<Unit,String> writes(Current) emits(Saved) {
 Current=value;
 emit Saved(value);
 return Err("aborted");
}
query read()->Zero reads(Current) {return Current;}
