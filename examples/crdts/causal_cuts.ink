module causal_cut_examples;
import "../../knowledge/libraries/causal_ranges.ink" as causal;
import "../../knowledge/libraries/causal_cuts.ink" as cuts;

fn boundaries(parents:List<List<u32>>)->List<Bool> {
    var graph:causal.Graph=causal.empty();
    for frontier in parents {graph=causal.append(graph,frontier);}
    return cuts.critical(graph).cuts;
}
