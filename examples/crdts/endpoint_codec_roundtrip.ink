module endpoint_codec_roundtrip;
import "../../knowledge/libraries/endpoint_batch_state_codec.ink" as codec;
fn roundtrip(s:codec.Stored)->codec.Stored{return codec.stored(codec.loaded(s));}
