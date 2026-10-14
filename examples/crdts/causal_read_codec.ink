module causal_read_codec;
import "../../knowledge/libraries/view_pair_causal_workspace.ink" as causal;
fn restored(read:causal.Read)->causal.Read{
 let nodes=buffer(read.nodes);let frontiers=buffer(read.frontiers);
 return causal.Read{nodes:nodes.freeze(),frontiers:frontiers.freeze()};
}
fn identity_read(read:causal.Read)->causal.Read{return read;}
