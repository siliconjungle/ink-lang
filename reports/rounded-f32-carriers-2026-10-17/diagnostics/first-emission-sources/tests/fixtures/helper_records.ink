module helper_records;
record Lane { a:f64,b:f64,index:u32,stop:Bool,label:String,values:List<f64>, }
record Nested { lane:Lane,extra:f64, }
record Owned { values:Buffer<f64>, }
fn advance(r:Lane)->Lane {
    return Lane{..r,a:r.b,b:-r.a};
}
fn drive(x:f64,y:f64,n:u32)->Lane {
    let r=Lane{a:x,b:y,index:0,stop:false,label:"lane",values:[x,y]};
    return repeat_until(n,r,fn(s)=>s.stop,fn(i)=>fn(s)=>advance(Lane{..s,index:i,stop:i==7}));
}
fn projected(x:f64,y:f64,n:u32)->List<f64> {
    let r=drive(x,y,n);let alias=r;
    let r=Lane{..r,a:alias.b,b:alias.a};
    return [r.a,alias.a,r.b,alias.b,r.values.at_or(n,x),f64_from_u32(r.index)];
}
fn pick(n:Nested)->List<f64> {return [n.lane.a,n.lane.b,n.extra];}
fn branch(r:Lane,n:u32)->Lane {
    let changed=choose(n==0,Lane{..r,a:-r.b},Lane{..r,b:-r.a});
    let alias=changed;
    return choose(n==1,alias,advance(Lane{..changed,values:alias.values}));
}
fn selected(x:f64,y:f64,n:u32)->Lane {
    let r=Lane{a:x,b:y,index:n,stop:false,label:"branch",values:[x,y]};
    return branch(r,n);
}
fn nested(x:f64,y:f64,n:u32)->List<f64> {
    let r=Lane{a:x,b:y,index:n,stop:false,label:"nested",values:[x,y]};
    let outer=Nested{lane:r,extra:-y};return pick(outer);
}
fn kept(xs:List<f64>,r:Lane)->Lane {return Lane{..r,values:r.values.concat(xs)};}
fn aliases(x:f64,y:f64,n:u32)->List<f64> {
    let xs=[x,y];let r=Lane{a:x,b:y,index:n,stop:false,label:"alias",values:xs};
    let out=repeat_until(n,r,fn(s)=>false,fn(i)=>fn(s)=>kept([f64_from_u32(i)],s));
    return xs.concat(out.values);
}
fn last(o:Owned)->List<f64> {return o.values.push(-0f64).freeze();}
fn owned(x:f64,y:f64,n:u32)->List<f64> {
    let values:Buffer<f64>=Buffer.empty();
    let o=Owned{values:values.push(x).push(y)};return last(o);
}
fn fallible(x:f64,y:f64,n:u32)->Result<Lane,String>
    requires(n<10,"outside range") {
    return Ok(drive(x,y,n));
}
