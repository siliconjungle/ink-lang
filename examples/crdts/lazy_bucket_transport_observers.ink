module lazy_bucket_transport_observers;
import "../../knowledge/libraries/bucket_interval_index.ink" as original;
import "../../knowledge/libraries/lazy_bucket_interval_index.ink" as fast;
fn encode(index:original.Index)->fast.Index{return fast.Index{nodes:index.nodes,roots:index.roots,valid:index.valid};}
fn decode(index:fast.Index)->original.Index{return original.Index{nodes:index.nodes,roots:index.roots,valid:index.valid};}
fn decoded(found:fast.Found)->original.Found{return original.Found{index:decode(found.index),value:found.value,start:found.start,end:found.end,hint:found.hint};}
fn original_lookup(index:original.Index,key:u64,hint:u32)->original.Found{return original.locate(index,key,hint);}
fn transported_lookup(index:original.Index,key:u64,hint:u32)->original.Found{return decoded(fast.locate(encode(index),key,hint));}
fn roundtrip(index:original.Index)->original.Index{return decode(encode(index));}
fn unchanged(index:original.Index)->original.Index{return index;}
fn reverse_roundtrip(index:fast.Index)->fast.Index{return encode(decode(index));}
fn fast_unchanged(index:fast.Index)->fast.Index{return index;}

fn original_value(index:original.Index,key:u64,hint:u32)->u32{return original_lookup(index,key,hint).value;}
fn transported_value(index:original.Index,key:u64,hint:u32)->u32{return transported_lookup(index,key,hint).value;}

fn original_start(index:original.Index,key:u64,hint:u32)->u64{return original_lookup(index,key,hint).start;}
fn transported_start(index:original.Index,key:u64,hint:u32)->u64{return transported_lookup(index,key,hint).start;}

fn original_end(index:original.Index,key:u64,hint:u32)->u64{return original_lookup(index,key,hint).end;}
fn transported_end(index:original.Index,key:u64,hint:u32)->u64{return transported_lookup(index,key,hint).end;}

fn original_hint(index:original.Index,key:u64,hint:u32)->u32{return original_lookup(index,key,hint).hint;}
fn transported_hint(index:original.Index,key:u64,hint:u32)->u32{return transported_lookup(index,key,hint).hint;}
