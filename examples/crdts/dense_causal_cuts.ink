module dense_causal_cut_examples;
import "../../knowledge/libraries/causal_ranges.ink" as causal;
import "../../knowledge/libraries/causal_cuts.ink" as sparse;
import "../../knowledge/libraries/dense_causal_cuts.ink" as dense;
fn graph(parents:List<List<u32>>)->causal.Graph {
 var g:causal.Graph=causal.empty();for frontier in parents{g=causal.append(g,frontier);}return g;
}
fn boundaries(parents:List<List<u32>>)->List<Bool>{return dense.critical(graph(parents)).cuts;}
fn original(parents:List<List<u32>>)->List<Bool>{return sparse.critical(graph(parents)).cuts;}
