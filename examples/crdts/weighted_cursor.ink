module weighted_cursor_examples;
import "../../knowledge/libraries/weighted_cursor.ink" as cursor;
import "../../knowledge/libraries/weighted_sequence.ink" as sequence;
record Edit{kind:u32,slot:u32,before:u32,value:u32,extent:u32,weight:u32,position:u32,visible:Bool,}
record Both{cached:cursor.Tree<u32>,ordinary:sequence.Tree<u32>,valid:Bool,}
fn step(b:Both,e:Edit)->Both{
 if e.kind==0{return Both{..b,cached:cursor.insert_before<u32>(b.cached,e.before,e.value,e.extent,e.weight),ordinary:sequence.insert_before<u32>(b.ordinary,e.before,e.value,e.extent,e.weight)};}
 if e.kind==1{return Both{..b,cached:cursor.set_weight<u32>(b.cached,e.slot,e.weight),ordinary:sequence.set_weight<u32>(b.ordinary,e.slot,e.weight)};}
 if e.kind==2{return Both{..b,cached:cursor.set_extent<u32>(b.cached,e.slot,e.extent,e.weight),ordinary:sequence.set_extent<u32>(b.ordinary,e.slot,e.extent,e.weight)};}
 if e.kind==3{
  let a=cursor.seek<u32>(b.cached,e.position,e.visible);let p=sequence.seek<u32>(b.ordinary,e.position,e.visible);
  return Both{cached:a.tree,ordinary:p.tree,valid:b.valid && a.node==p.node && a.rank==p.rank && a.offset==p.offset};
 }
 let a=cursor.rank<u32>(b.cached,e.slot,e.visible);let p=sequence.rank<u32>(b.ordinary,e.slot,e.visible);
 return Both{cached:a.tree,ordinary:p.tree,valid:b.valid && a.node==p.node && a.rank==p.rank && a.offset==p.offset};
}
fn same(edits:List<Edit>)->Bool{
 let b=foldl(edits,Both{cached:cursor.empty<u32>(0),ordinary:sequence.empty<u32>(0),valid:true},fn(e,b)=>step(b,e));
 let valid=b.valid && b.cached.root==b.ordinary.root && b.cached.first==b.ordinary.first && b.cached.last==b.ordinary.last;
 return valid && b.cached.nodes.freeze()==b.ordinary.nodes.freeze();
}
