module abstract_library;
abstract refined record Hidden<T>{item:T,valid:Bool,} invariant value.valid;
fn wrap<T>(item:T)->Hidden<T>{return Hidden<T>{item:item,valid:true};}
fn observe<T>(v:Hidden<T>)->T{return v.item;}
fn through<T>(v:Hidden<T>,read:fn(Hidden<T>)->T)->T{return read(v);}
fn transform<T>(v:Hidden<T>,apply:fn(T)->T)->Hidden<T>{return Hidden<T>{item:apply(v.item),valid:v.valid};}
fn validate<T>(v:Hidden<T>)->Bool{return v.valid;}
