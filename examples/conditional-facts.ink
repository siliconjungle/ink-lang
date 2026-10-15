module conditional_facts;

// These are ordinary guards, not trusted annotations. Offline fact discovery
// proposes whole-function equalities and replays their RUP proofs.
fn bounded(x:u32,y:u32)->u32 {
    return choose(x<y && y<=256,word_and(x,255),x);
}
fn excluded(x:u32)->Bool {
    return choose(x!=4,(x+3)!=7,true);
}
fn wrap64(x:u64)->Bool {
    return choose(x!=0,(x+3)!=3,true);
}
fn reversed(x:u64)->Bool {
    return choose(x!=4,(3-x)!=(3-4),true);
}
// Multiplication by two is not injective modulo 2^32. At 2^31+4 this
// function is false even though x differs from 4.
fn collision(x:u32)->Bool {
    return choose(x!=4,(x*2)!=8,true);
}
fn mapped(xs:List<u32>)->List<u32> {
    return xs.map(fn(x)=>bounded(x,256)+1);
}
