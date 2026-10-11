module ink.knowledge.snapshots;

// Equality of stored values, including exact binary32 bits. Scalar IEEE
// equality alone would discard a signed-zero or NaN-payload change.
record Stored<T>{value:T,}
fn same<T>(a:T,b:T)->Bool {return Stored<T>{value:a}==Stored<T>{value:b};}

// Produce only final logical state. Owned slots are private; unchanged values
// can share their immutable representation with the previous snapshot.
fn reconcile<T>(before:List<T>,after:List<T>)->List<T>{
    if before==after {return before;}
    var out:Buffer<T>=buffer(before).truncate(length(after));
    var index:u32=0;
    for row in after {
        if index>=length(before) {out=out.push(row);}
        else {
            let previous:T=before.at_or(index,row);
            if !same<T>(previous,row) {out=out.set(index,row);}
        }
        index=index+1;
    }
    return out.freeze();
}

// Selection precedes construction. There is no intermediate mapped list and
// the builder is never invoked for a rejected element.
fn collect<T,U>(xs:List<T>,keep:fn(T)->Bool,build:fn(T)->U)->List<U>{
    var out:Buffer<U>=Buffer.empty();
    for item in xs {if keep(item) {out=out.push(build(item));}}
    return out.freeze();
}
