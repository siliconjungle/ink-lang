module invariant_algorithms;
private state Ready:List<u32>=[];
invariant unique(Ready);

spec change replace_all(xs:List<u32>)->Unit reads(Ready) writes(Ready)
 requires unique(xs);

 ensures Ready==xs;
implementation assign for replace_all {Ready=xs;return ();}
query known_unique()->Bool reads(Ready){return unique(Ready);}
query contents()->List<u32> reads(Ready){return Ready;}
change clear()->Unit writes(Ready){Ready=[];return ();}
// Committed invariants are deliberately false inside this action. The source
// query must still observe that intermediate state; only the outer boundary is
// eligible for the invariant-backed constant implementation.
change transient()->Bool reads(Ready) writes(Ready){
 Ready=[1,1];
 let observed=known_unique();
 Ready=[];
 return observed;
}
