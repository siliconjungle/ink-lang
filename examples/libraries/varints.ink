module varints;
import "../../knowledge/libraries/packed_varint_stream.ink" as stream;
record Decoding{reader:stream.Reader,values:Buffer<u64>,}
fn encode(values:List<u64>)->Result<List<u32>,stream.Error>{
 var writer:stream.Writer=stream.begin();for value in values{writer=stream.write(writer,value);}return stream.finish(writer);
}
fn decode_step(s:Decoding)->Decoding{let word=stream.read(s.reader);return Decoding{reader:word.reader,values:s.values.push(word.value)};}
fn decode(words:List<u32>,maximum_words:u32,maximum_octets:u32)->Result<List<u64>,stream.Error>{
 let reader=stream.open(words,maximum_octets);
 if !reader.valid{return Err(choose(reader.error==2,stream.Error.Limit,stream.Error.Invalid));}
 let decoded=repeat_until(maximum_words,Decoding{reader:reader,values:Buffer.empty()},fn(s)=>!s.reader.valid || s.reader.position==s.reader.length,fn(i,s)=>decode_step(s));
 if !decoded.reader.valid{return Err(stream.Error.Invalid);}
 if decoded.reader.position!=decoded.reader.length{return Err(stream.Error.Limit);}
 return Ok(decoded.values.freeze());
}
