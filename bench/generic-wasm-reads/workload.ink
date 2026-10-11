module FrontierDiffRecheck;
import "./snapshots.ink" as snapshots;

// Fixed-length u32 arrays and rows. Edit indexes are sorted, unique and in range.
record Edit { index:u32, value:u32, }
record Row { id:u32, x:u32, y:u32, score:u32, flags:u32, }
record RowEdit { index:u32, id:u32, x:u32, y:u32, score:u32, flags:u32, }

fn scalar_diff(before:List<u32>,after:List<u32>)->List<Edit>{
    return after.map_indexed(fn(i)=>fn(x)=>Edit{index:i,value:x})
        .filter(fn(e)=>before.at_or(e.index,0)!=e.value);
}
fn scalar_hint(before:List<u32>,after:List<u32>,dirty:List<u32>)->List<Edit>{
    return dirty.map(fn(i)=>Edit{index:i,value:after.at_or(i,0)})
        .filter(fn(e)=>before.at_or(e.index,0)!=e.value);
}
fn scalar_apply(before:List<u32>,edits:List<Edit>)->List<u32>{
    return foldr(edits,buffer(before),fn(e)=>fn(out)=>out.set(e.index,e.value)).freeze();
}
// An alternative source algorithm for an actual GPU replay comparison.
// It probes the edit list for every output element: O(rows * edits).
fn scalar_apply_probe(before:List<u32>,edits:List<Edit>)->List<u32>{
    return before.map_indexed(fn(i)=>fn(x)=>foldr(edits,x,
        fn(e)=>fn(rest)=>choose(e.index==i,e.value,rest)));
}
fn row_changed(a:Row,b:Row)->Bool{
    return a.id!=b.id || a.x!=b.x || a.y!=b.y || a.score!=b.score || a.flags!=b.flags;
}
fn rows_diff(before:List<Row>,after:List<Row>)->List<RowEdit>{
    return after.map_indexed(fn(i)=>fn(r)=>RowEdit{index:i,id:r.id,x:r.x,y:r.y,score:r.score,flags:r.flags})
        .filter(fn(e)=>row_changed(before.at_or(e.index,Row{id:0,x:0,y:0,score:0,flags:0}),Row{id:e.id,x:e.x,y:e.y,score:e.score,flags:e.flags}));
}
fn rows_hint(before:List<Row>,after:List<Row>,dirty:List<u32>)->List<RowEdit>{
    return dirty.map(fn(i)=>RowEdit{index:i,id:after.at_or(i,Row{id:0,x:0,y:0,score:0,flags:0}).id,x:after.at_or(i,Row{id:0,x:0,y:0,score:0,flags:0}).x,y:after.at_or(i,Row{id:0,x:0,y:0,score:0,flags:0}).y,score:after.at_or(i,Row{id:0,x:0,y:0,score:0,flags:0}).score,flags:after.at_or(i,Row{id:0,x:0,y:0,score:0,flags:0}).flags})
        .filter(fn(e)=>row_changed(before.at_or(e.index,Row{id:0,x:0,y:0,score:0,flags:0}),Row{id:e.id,x:e.x,y:e.y,score:e.score,flags:e.flags}));
}
fn rows_apply(before:List<Row>,edits:List<RowEdit>)->List<Row>{
    return foldr(edits,buffer(before),fn(e)=>fn(out)=>out.set(e.index,Row{id:e.id,x:e.x,y:e.y,score:e.score,flags:e.flags})).freeze();
}

fn scalar_final(before:List<u32>,after:List<u32>)->List<u32>{return snapshots.reconcile<u32>(before,after);}
fn rows_final(before:List<Row>,after:List<Row>)->List<Row>{return snapshots.reconcile<Row>(before,after);}
