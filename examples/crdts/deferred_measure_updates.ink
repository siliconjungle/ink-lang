module deferred_measure_examples;
import "../../knowledge/libraries/blocked_measure_sequence.ink" as base;
import "../../knowledge/libraries/deferred_measure_updates.ink" as deferred;
record Change{slot:u32,weight:u32,}
record Image{nodes:List<base.Node<u32>>,blocks:List<base.Block>,children:List<u32>,root:u32,first:u32,last:u32,}
fn tree(count:u32)->base.Tree<u32>{return repeat_until(count,base.empty<u32>(0),fn(t)=>false,fn(i,t)=>base.insert_before<u32>(t,0,i+1,1,1,0));}
fn image(count:u32,changes:List<Change>,fast:Bool)->Image{
 let t=tree(count);var p:deferred.Pending<u32>=deferred.begin<u32>(t);
 for c in changes{p=choose(fast,deferred.set_weight<u32>(p,c.slot,c.weight),deferred.begin<u32>(base.set_weight<u32>(p.tree,c.slot,c.weight)));}
 let t=deferred.finish<u32>(p);return Image{nodes:t.nodes.freeze(),blocks:t.blocks.freeze(),children:t.children.freeze(),root:t.root,first:t.first,last:t.last};
}
