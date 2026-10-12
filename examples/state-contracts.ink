module unique_state;
record Job{id:u32,value:u32,}
private state Ready:List<Job>=[];
invariant unique_ids(Ready);
spec change replace_all(xs:List<Job>)->Unit reads(Ready) writes(Ready)
 requires unique_ids(xs);
 ensures Ready==xs;
implementation replace for replace_all {Ready=xs;return ();}
query length_ready()->Int reads(Ready){return count(Ready);}
query contents()->List<Job> reads(Ready){return Ready;}
query same_bag(xs:List<Job>)->Bool reads(Ready){return multiset(Ready)==multiset(xs);}
query add_bag(xs:List<Job>,item:Job)->Bool reads(Ready){return multiset(Ready)==multiset(xs)+singleton(item);}
change clear()->Unit writes(Ready){Ready=[];return ();}
