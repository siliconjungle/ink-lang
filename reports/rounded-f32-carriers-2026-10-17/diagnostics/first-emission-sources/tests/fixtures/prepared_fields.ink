module PreparedFields;
record Source { keys:List<u32>, bias:u32, }
record Context { fixed:Source, query:u32, }
record CheckedContext { fixed:Source, query:u32, checked:u32, }
fn source(keys:List<u32>)->Source {return Source{keys:keys,bias:0};}
fn context(keys:List<u32>,q:u32)->Context {let fixed=source(keys);return Context{fixed:fixed,query:q};}
fn lookup(c:Context)->Bool {
 let index:Map<u32,Bool>=foldr(c.fixed.keys,Map.empty(),fn(k)=>fn(m)=>m.set(k,true));
 return index.contains(c.query+c.fixed.bias);
}
fn relay(c:Context)->Bool {return lookup(c);}
fn mixed(keys:List<u32>,q:u32)->Bool {let c=context(keys,q);return relay(c);}
fn direct(keys:List<u32>,q:u32)->Bool {return relay(context(keys,q));}
fn looped(keys:List<u32>,qs:List<u32>)->List<Bool> {return qs.map(fn(q)=>relay(context(keys,q)));}
fn swapped(keys:List<u32>,q:u32)->Bool {
 let c=choose(q==0,context(keys,1),context([q],q+1));return relay(c);
}
fn bounded(q:u32)->u32 {
 let check:Map<u32,Bool>=foldr([q],Map.empty(),fn(k)=>fn(m)=>m.set(k,true));
 return choose(check.contains(q),q,q);
}
fn unused(keys:List<u32>,q:u32,checked:u32)->Context {return context(keys,q);}
fn strict(keys:List<u32>,q:u32)->Bool {return relay(unused(keys,q,bounded(q)));}
fn checked_record(keys:List<u32>,q:u32)->Bool {
 let c=CheckedContext{fixed:source(keys),query:q,checked:bounded(q)};
 return relay(Context{fixed:c.fixed,query:c.query});
}
fn projected(keys:List<u32>,q:u32)->List<u32> {let fixed=unused(keys,q,bounded(q)).fixed;return fixed.keys;}
fn shadowed(keys:List<u32>,q:u32)->Bool {
 let c=context(keys,q);
 let keys=[q];let c=context(keys,q+1);return relay(c);
}
record Doubles { values:List<f64>, query:u32, }
fn doubles(values:List<f64>,q:u32)->List<f64> {
 let c=Doubles{values:values,query:q};let negated=c.values.map(fn(v)=>-v);
 return negated.concat([f64_from_u32(c.query)]);
}

// Ordinary source preconditions remain before the mixed-record preparation.
spec fn checked(keys:List<u32>,q:u32,allowed:Bool)->Bool requires allowed; ensures true;
implementation checked_body for checked {return relay(context(keys,q));}
