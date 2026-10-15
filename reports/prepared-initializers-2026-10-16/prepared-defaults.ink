module prepared_defaults;
record Config { label:String, values:List<f32>, next:Option<Config>, }
fn default_config()->Config {
 return Config{label:"prepared 😀",values:[0.5,-0.0],next:Some(Config{label:"child",values:[1.0],next:None})};
}
keep Seed:Config=default_config();
keep Failed:Result<Config,String>=Err("default unavailable");
trainable state Left:Config=Seed;
trainable state Right:Config=Seed;
trainable state Maybe:Result<Config,String>=Failed;
state Unrelated:u32=0;
query left()->Config reads(Left){return Left;}
query right()->Config reads(Right){return Right;}
query maybe()->Result<Config,String> reads(Maybe){return Maybe;}
query seed()->Config reads(Seed){return Seed;}
query scoped(xs:List<u32>)->List<Config> reads(Left){return xs.map(fn(Seed)=>Left);}
learn change set_left(value:Config)->Result<Unit,String> writes(Left){Left=value;return Ok(());}
learn change copy()->Result<Unit,String> reads(Left) writes(Right){Right=Left;return Ok(());}
learn change set_maybe(value:Config)->Result<Unit,String> writes(Maybe){Maybe=Ok(value);return Ok(());}
learn change cancel(value:Config)->Result<Unit,String> writes(Left,Right,Maybe){
 Left=value;Right=value;Maybe=Ok(value);return Err("cancel");
}
change unrelated(value:u32)->Result<Unit,String> writes(Unrelated){Unrelated=value;return Ok(());}
fn numeric(xs:List<f32>)->List<f32>{return xs.map(fn(x)=>x*x+0.5);}
