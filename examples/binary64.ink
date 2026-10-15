module binary64;
record Measurement { width:f64, count:u32, }
keep DefaultWidth:f64=1.0000000000000002f64;
trainable state Width:f64=DefaultWidth;
event changed:f64;
query current()->f64 reads(Width){return Width;}
query half()->f64 reads(Width){return Width/2;}
learn change replace(value:f64,abort:Bool)->Result<Unit,String> writes(Width) emits(changed){
 Width=value;emit changed(value);
 if abort{return Err("cancel width update");}return Ok(());
}
fn arithmetic(x:f64,y:f64)->f64{return (x+y)*y-x;}
fn ratio(x:f64,y:f64)->f64{return x/y;}
fn root(x:f64)->f64{return sqrt(x);}
fn rounded(x:f64)->f64{return round_ties_even(x);}
fn equal(x:f64,y:f64)->Bool{return x==y;}
fn same_measurement(x:Measurement,y:Measurement)->Bool{return x==y;}
fn flip(x:f64)->f64{return -x;}
fn bits(x:f64)->u64{return f64_bits(x);}
fn from_bits(x:u64)->f64{return f64_from_bits(x);}
fn from_int(x:Int)->f64{return f64_from_int(x);}
fn to_int(x:f64)->Option<Int>{return int_from_f64(x);}
fn to_word(x:f64)->Option<u64>{return u64_from_f64(x);}
fn widen(x:f32)->f64{return f64_from_f32(x);}
fn narrow(x:f64)->f32{return f32_from_f64(x);}
fn ratios(xs:List<f64>)->List<f64>{return xs.map(fn(x)=>x/2);}
fn total(xs:List<f64>)->f64{return sum(xs);}
fn numeric(xs:List<f32>)->List<f32>{return xs.map(fn(x)=>x*x+0.5);}
