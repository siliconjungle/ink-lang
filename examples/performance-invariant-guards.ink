module performance_invariant_guards;
private state Rows:List<u32>=[];
invariant unique(Rows);

spec change install(xs:List<u32>)->Unit reads(Rows) writes(Rows)
 requires unique(xs);
 ensures Rows==xs;
implementation checked_install for install {
 let valid=unique(xs);
 if valid {Rows=xs;}
 return ();
}
query is_valid()->Bool reads(Rows){return unique(Rows);}
query contents()->List<u32> reads(Rows){return Rows;}
change clear()->Unit writes(Rows){Rows=[];return ();}
