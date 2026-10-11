module composable_library_benchmark;
import "../../knowledge/libraries/collections.ink" as collections;
import "../../examples/libraries/main.ink" as examples;
fn baseline_join(a:List<collections.Entry<u32,u32>>,b:List<collections.Entry<u32,Bool>>)->List<collections.Joined<u32,u32,Bool>>{return examples.joined(a,b);}
fn indexed_join(a:List<collections.Entry<u32,u32>>,b:List<collections.Entry<u32,Bool>>)->List<collections.Joined<u32,u32,Bool>>{return examples.joined_indexed(a,b);}
fn shared_totals(xs:List<u32>)->collections.Totals<u32,u32>{return examples.paired(xs);}
fn separate_totals(xs:List<u32>)->collections.Totals<u32,u32>{let first:u32=sum(xs);let second:u32=foldl(xs,1,fn(x)=>fn(total)=>total*3+x);return collections.Totals<u32,u32>{first:first,second:second};}
fn bounded_top_k(xs:List<u32>,k:u32)->List<u32>{return examples.smallest(xs,k);}
fn sorted_top_k(xs:List<u32>,k:u32)->List<u32>{return xs.sort().take(k);}
