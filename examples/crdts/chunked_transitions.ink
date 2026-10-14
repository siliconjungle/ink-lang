module chunked_transitions;
import "../../knowledge/libraries/chunked_sequence.ink" as chunks;

record Compared { flattened:u64, chunked:u64, bulk:u64, }
fn compare(blocks:List<List<u64>>,initial:u64)->Compared {
    let flattened=foldl(chunks.flatten<u64>(blocks),initial,fn(value,acc)=>acc+value);
    let chunked=chunks.execute<u64,u64>(blocks,initial,fn(value,acc)=>acc+value);
    let bulk=chunks.execute_bulk<u64,u64>(blocks,initial,fn(block,acc)=>acc+sum(block));
    return Compared{flattened:flattened,chunked:chunked,bulk:bulk};
}
