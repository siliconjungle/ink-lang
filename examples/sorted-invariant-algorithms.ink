module sorted_invariant_algorithms;
fn order(xs:List<u32>)->List<u32>{return xs.sort();}
fn first(xs:List<u32>)->u32{return xs.at_or(0,0);}
private state Ready:List<u32>=[];
invariant order(Ready)==Ready;
spec change replace_all(xs:List<u32>)->Unit reads(Ready) writes(Ready)
 requires order(xs)==xs;
 ensures Ready==xs;
implementation assign for replace_all {Ready=xs;return ();}
query sorted_copy()->List<u32> reads(Ready){return order(Ready);}
query minimum()->u32 reads(Ready){return first(order(Ready));}
query contents()->List<u32> reads(Ready){return Ready;}
change clear()->Unit writes(Ready){Ready=[];return ();}
