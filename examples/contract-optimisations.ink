module contract_optimisations;
spec fn zero(xs:List<u64>)->u64 ensures result==0;
implementation scan for zero{return sum(xs.map(fn(x)=>x*0));}
spec fn copy(xs:List<u32>)->List<u32> ensures result==xs;
implementation mapped for copy{return xs.map(fn(x)=>x+0);}
spec fn sorted(xs:List<u64>)->List<u64> requires xs.sort()==xs; ensures result==xs;
implementation sort_again for sorted{return xs.sort();}
record Job{id:u32,value:u32,}
spec fn ids_are_unique(xs:List<Job>)->Bool
  requires unique_ids(xs);
  ensures result==true;
implementation check_ids for ids_are_unique{return unique_ids(xs);}
