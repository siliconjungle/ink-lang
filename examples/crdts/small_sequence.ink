module small_sequence_observer;
import "../../knowledge/libraries/small_sequence.ink" as small;
fn restored(values:List<u32>)->List<u32>{return small.view<u32>(small.encoded<u32>(values,0));}
fn extended(kind:u32,first:u32,second:u32,many:List<u32>,value:u32)->List<u32>{return small.view<u32>(small.push<u32>(small.Small<u32>{kind:kind,first:first,second:second,many:many},value));}
fn reference(kind:u32,first:u32,second:u32,many:List<u32>,value:u32)->List<u32>{return small.view<u32>(small.Small<u32>{kind:kind,first:first,second:second,many:many}).concat([value]);}
