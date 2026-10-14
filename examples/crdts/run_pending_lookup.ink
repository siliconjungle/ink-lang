module run_pending_lookup;
import "../../knowledge/libraries/run_state_codec.ink" as codec;
fn actual(s:codec.Stored,key:u64,fallback:Bool)->Bool{return codec.loaded(s).pending.get_or(key,fallback);}
fn expected(s:codec.Stored,key:u64,fallback:Bool)->Bool{return foldl(s.pending,fallback,fn(entry,value)=>choose(key==entry.key,entry.value,value));}
