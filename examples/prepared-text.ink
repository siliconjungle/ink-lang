module prepared_text;
import "std:prepared_text" as text;
state Paragraph:Option<text.Prepared>=None;
state Width:f64=10f64;
event installed:u32;
change install(data:text.Data,epsilon:f64)->Result<u32,String> writes(Paragraph) emits(installed) {
 emit installed(0);
 let prepared=text.prepare(data,epsilon,1000000)?;
 Paragraph=Some(prepared);return Ok(0);
}
change resize(width:f64)->u32 writes(Width) {Width=width;return 0;}
query current(lineHeight:f64)->Result<text.Layout,String> reads(Paragraph,Width) {
 return Paragraph.fold(fn(p)=>text.layout(p,Width,lineHeight),fn(u)=>Err("no prepared paragraph"));
}
fn prepare(data:text.Data,epsilon:f64,maximum:u32)->Result<text.Prepared,String> {return text.prepare(data,epsilon,maximum);}
fn count_lines(data:text.Data,epsilon:f64,width:f64)->Result<u32,String> {let prepared=text.prepare(data,epsilon,1000000)?;return text.line_count(prepared,width);}
fn lines(data:text.Data,epsilon:f64,width:f64)->Result<List<text.Line>,String> {let prepared=text.prepare(data,epsilon,1000000)?;return text.lines(prepared,width);}
fn stats(data:text.Data,epsilon:f64,width:f64)->Result<text.Stats,String> {let prepared=text.prepare(data,epsilon,1000000)?;return text.stats(prepared,width);}
fn layout(data:text.Data,epsilon:f64,width:f64,lineHeight:f64)->Result<text.Layout,String> {let prepared=text.prepare(data,epsilon,1000000)?;return text.layout(prepared,width,lineHeight);}
fn line(data:text.Data,epsilon:f64,cursor:text.Cursor,width:f64)->Result<Option<text.Line>,String> {let prepared=text.prepare(data,epsilon,1000000)?;return text.line_from(prepared,cursor,width);}
fn count_prepared(prepared:text.Prepared,width:f64)->Result<u32,String> {return text.line_count(prepared,width);}
fn numeric(xs:List<f32>)->List<f32> {return xs.map(fn(x)=>x*x+0.5);}
