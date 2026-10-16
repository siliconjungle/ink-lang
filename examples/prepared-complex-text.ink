module prepared_complex_text;
import "std:prepared_complex_text" as complex;
import "std:prepared_text" as text;
state Paragraph:Option<complex.Prepared>=None;
state Width:f64=10f64;
event installed:u32;
change install(data:complex.Data)->Result<u32,String> writes(Paragraph) emits(installed) {
 emit installed(0);let prepared=complex.prepare(data,1000000)?;Paragraph=Some(prepared);return Ok(0);
}
change resize(width:f64)->u32 writes(Width) {Width=width;return 0;}
query current(lineHeight:f64)->Result<text.Layout,String> reads(Paragraph,Width) {
 return Paragraph.fold(fn(p)=>complex.layout(p,Width,lineHeight),fn(u)=>Err("no prepared paragraph"));
}
fn prepare(data:complex.Data,maximumSize:u32)->Result<complex.Prepared,String> {return complex.prepare(data,maximumSize);}
fn count_lines(data:complex.Data,width:f64)->Result<u32,String> {let p=complex.prepare(data,1000000)?;return complex.line_count(p,width);}
fn lines(data:complex.Data,width:f64)->Result<List<text.Line>,String> {let p=complex.prepare(data,1000000)?;return complex.lines(p,width);}
fn stats(data:complex.Data,width:f64)->Result<text.Stats,String> {let p=complex.prepare(data,1000000)?;return complex.stats(p,width);}
fn layout(data:complex.Data,width:f64,lineHeight:f64)->Result<text.Layout,String> {let p=complex.prepare(data,1000000)?;return complex.layout(p,width,lineHeight);}
fn line(data:complex.Data,cursor:text.Cursor,width:f64)->Result<Option<text.Line>,String> {let p=complex.prepare(data,1000000)?;return complex.line_from(p,cursor,width);}
fn count_prepared(p:complex.Prepared,width:f64)->Result<u32,String> {return complex.line_count(p,width);}
fn numeric(xs:List<f32>)->List<f32> {return xs.map(fn(x)=>x*x+0.5);}
