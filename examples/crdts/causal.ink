module causal_examples;
import "../../knowledge/libraries/causal_ranges.ink" as graph;
record Ranges{removed:List<graph.Range>,added:List<graph.Range>,valid:Bool,}
fn diff(nodes:List<List<u32>>,left:List<u32>,right:List<u32>)->Ranges{
 var g:graph.Graph=graph.empty();for parents in nodes{g=graph.append(g,parents);}
 let d=graph.difference(g,left,right);
 return Ranges{removed:d.removed.freeze(),added:d.added.freeze(),valid:d.valid};
}
