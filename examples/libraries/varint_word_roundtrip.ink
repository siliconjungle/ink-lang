module varint_word_roundtrip;
import "../../knowledge/libraries/packed_varint_stream.ink" as stream;
// A scalar observer for proving one complete packed-stream word roundtrip.
fn recovered(value:u64)->u64{
 let writer=stream.write(stream.begin(),value);
 let words=stream.finish(writer).fold(fn(words)=>words,fn(error)=>[]);
 let reader=stream.open(words,10);
 let result=stream.read(reader);
 return result.value;
}
