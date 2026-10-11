module snapshot_examples;
import "../knowledge/libraries/snapshots.ink" as snapshots;
record Row {id:u32,x:u32,y:u32,score:u32,flags:u32,}
record Nested {values:List<u32>,maybe:Option<List<u32>>,bits:f32,}
fn reconcile(before:List<Row>,after:List<Row>)->List<Row>{return snapshots.reconcile<Row>(before,after);}
fn nested(before:List<Nested>,after:List<Nested>)->List<Nested>{return snapshots.reconcile<Nested>(before,after);}
fn bits(before:List<f32>,after:List<f32>)->List<f32>{return snapshots.reconcile<f32>(before,after);}
fn selected(xs:List<Row>)->List<Row>{return snapshots.collect<Row,Row>(xs,fn(r)=>r.x!=0,fn(r)=>Row{id:r.id,x:r.x+1,y:r.y,score:r.score,flags:r.flags});}
fn scalar_equal(a:f32,b:f32)->Bool{return a==b;}
fn record_equal(a:Nested,b:Nested)->Bool{return a==b;}
fn shared_ranges(xs:List<Nested>,at:u32,added:Nested)->List<Nested>{return buffer(xs).split_at(at,fn(a)=>fn(b)=>a.push(added).append(b)).freeze();}

fn selected_baseline(xs:List<Row>)->List<Row>{return xs.map(fn(r)=>Row{id:r.id,x:r.x+1,y:r.y,score:r.score,flags:r.flags}).filter(fn(r)=>r.x!=1);}

record FloatFirst{value:f32,other:u32,}
record FloatSecond{value:u32,other:f32,}
fn schemas(a:FloatFirst,b:FloatSecond)->Bool{return a.value==1.0 && a.other==2 && b.value==1 && b.other==2.0;}
fn eager(a:Row,b:Row)->Bool{return Row{id:a.id,x:a.x,y:a.y,score:a.score,flags:a.flags}==Row{id:b.id,x:b.x,y:b.y,score:b.score,flags:b.flags};}
