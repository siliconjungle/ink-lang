module run_log_codec_proofs;
import "../../knowledge/libraries/endpoint_batch_state_codec_runs.ink" as codec;
fn roundtrip(stored:codec.Stored)->codec.Stored{return codec.stored(codec.loaded(stored));}
