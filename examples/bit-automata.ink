module bit_automata_example;
import "std:bit_automata" as bits;

// Construct once and reuse the resulting masks across inputs.
fn compile_literal(symbols:List<u32>)->Option<bits.Literal>{return bits.literal(symbols);}
fn counts(words:List<u32>,ids:List<u32>,rows:u32,masks:List<u32>,accept:u32)->List<u32>{
 return bits.counts_columns<512>(words,ids,rows,masks,accept);
}
fn count_symbols(symbols:List<u32>,masks:List<u32>,accept:u32)->u32{
 return bits.count_symbols(symbols,masks,accept);
}
