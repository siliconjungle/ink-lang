module broadphase;
import "../../knowledge/libraries/broadphase.ink" as k;
fn all_pairs(boxes:List<k.Box>)->List<k.Pair>{return k.all_pairs(boxes);}
fn sweep(boxes:List<k.Box>)->List<k.Pair>{return k.sweep(boxes);}
fn bvh(boxes:List<k.Box>)->List<k.Pair>{return k.bvh(boxes);}
fn radix(keys:List<u32>,order:List<u32>)->List<u32>{return k.radix(keys,order);}
