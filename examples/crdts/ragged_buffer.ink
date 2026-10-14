module ragged_buffer_examples;
import "../../knowledge/libraries/ragged_buffer.ink" as ragged;
fn built(items:List<List<u32>>)->ragged.Rows<u32>{
 var rows:ragged.Rows<u32>=ragged.empty<u32>();
 for item in items{rows=ragged.append<u32>(rows,buffer(item));}return rows;
}
record Reading{rows:ragged.Rows<u32>,output:Buffer<List<u32>>,}
fn selected(items:List<List<u32>>,queries:List<u32>)->List<List<u32>>{
 var r:Reading=Reading{rows:built(items),output:Buffer.empty()};
 for index in queries{let p=ragged.read<u32>(r.rows,index,0);r=Reading{rows:p.rows,output:r.output.push(p.values.freeze())};}
 return r.output.freeze();
}
fn layout(items:List<List<u32>>)->List<u32>{
 let rows=built(items);var result:Buffer<u32>=Buffer.empty();
 for range in rows.ranges.freeze(){result=result.push(range.start).push(range.end);}return result.freeze();
}
