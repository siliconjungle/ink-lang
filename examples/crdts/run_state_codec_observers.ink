module run_state_codec_observers;
import "../../knowledge/libraries/run_state_codec.ink" as codec;
import "../../knowledge/libraries/run_text_crdts.ink" as runs;
import "../../knowledge/libraries/weighted_sequence.ink" as sequence;
import "../../knowledge/libraries/interval_index.ink" as intervals;
fn original_nodes(s:codec.Stored)->List<sequence.Node<u32>>{return s.nodes;}
fn roundtrip_nodes(s:codec.Stored)->List<sequence.Node<u32>>{return codec.stored(codec.loaded(s)).nodes;}
fn original_root(s:codec.Stored)->u32{return s.root;}
fn roundtrip_root(s:codec.Stored)->u32{return codec.stored(codec.loaded(s)).root;}
fn original_first(s:codec.Stored)->u32{return s.first;}
fn roundtrip_first(s:codec.Stored)->u32{return codec.stored(codec.loaded(s)).first;}
fn original_last(s:codec.Stored)->u32{return s.last;}
fn roundtrip_last(s:codec.Stored)->u32{return codec.stored(codec.loaded(s)).last;}
fn original_fallback(s:codec.Stored)->u32{return s.fallback;}
fn roundtrip_fallback(s:codec.Stored)->u32{return codec.stored(codec.loaded(s)).fallback;}
fn original_spans(s:codec.Stored)->List<runs.Span>{return s.spans;}
fn roundtrip_spans(s:codec.Stored)->List<runs.Span>{return codec.stored(codec.loaded(s)).spans;}
fn original_payload(s:codec.Stored)->List<u32>{return s.payload;}
fn roundtrip_payload(s:codec.Stored)->List<u32>{return codec.stored(codec.loaded(s)).payload;}
fn original_intervals(s:codec.Stored)->List<intervals.Node>{return s.intervals;}
fn roundtrip_intervals(s:codec.Stored)->List<intervals.Node>{return codec.stored(codec.loaded(s)).intervals;}
fn original_interval_root(s:codec.Stored)->u32{return s.interval_root;}
fn roundtrip_interval_root(s:codec.Stored)->u32{return codec.stored(codec.loaded(s)).interval_root;}
fn original_interval_valid(s:codec.Stored)->Bool{return s.interval_valid;}
fn roundtrip_interval_valid(s:codec.Stored)->Bool{return codec.stored(codec.loaded(s)).interval_valid;}
fn original_error(s:codec.Stored)->u32{return s.error;}
fn roundtrip_error(s:codec.Stored)->u32{return codec.stored(codec.loaded(s)).error;}
