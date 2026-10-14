module ragged_builder_examples;
import "../../knowledge/libraries/ragged_buffer.ink" as ragged;
import "../../knowledge/libraries/ragged_builder.ink" as builder;
fn build_row(row:List<u32>,rows:ragged.Rows<u32>)->ragged.Rows<u32>{
 let pending=builder.begin<u32>(rows);
 let pending=foldl(row,pending,fn(value,pending)=>builder.push<u32>(pending,value));
 return builder.finish<u32>(pending);
}
fn built(rows:List<List<u32>>)->ragged.Rows<u32>{
 return foldl(rows,ragged.empty<u32>(),fn(row,out)=>build_row(row,out));
}
fn selected(rows:List<List<u32>>,queries:List<u32>)->List<List<u32>>{
 var out:Buffer<List<u32>>=Buffer.empty();var data:ragged.Rows<u32>=built(rows);
 for index in queries{let read=ragged.read<u32>(data,index,0);data=read.rows;out=out.push(read.values.freeze());}
 return out.freeze();
}
fn layout(rows:List<List<u32>>)->List<u32>{
 let data=built(rows);let out:Buffer<u32>=Buffer.empty();
 return foldl(data.ranges.freeze(),out,fn(span,out)=>out.push(span.start).push(span.end)).freeze();
}
