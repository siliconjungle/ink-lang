module ink.std.lists;
fn sum32(xs:List<u32>)->u32{return sum(xs);}
fn count32(xs:List<u32>)->u64{return count(xs);}
fn prefix32(xs:List<u32>)->List<u32>{return xs.scan();}
fn sorted32(xs:List<u32>)->List<u32>{return xs.sort();}
fn sum64(xs:List<u64>)->u64{return sum(xs);}
fn prefix64(xs:List<u64>)->List<u64>{return xs.scan();}
fn sorted64(xs:List<u64>)->List<u64>{return xs.sort();}
