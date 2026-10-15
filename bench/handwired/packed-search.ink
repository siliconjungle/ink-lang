module packed_search;
import "std:bit_automata" as bits;
fn counts_packed(data:List<u32>,ids:List<u32>,row_count:u32,masks:List<u32>,accept:u32)->List<u32>{
 return bits.counts_columns<512>(data,ids,row_count,masks,accept);
}
