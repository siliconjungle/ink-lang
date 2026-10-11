module language_foundations;

type Word = u32;
type Words = List<Word>;
record Point { x:Word, y:Word, }
type Position = Point;
type Sequence<T> = List<T>;
record Pair<A,B> { left:A, right:B, }
fn identity<T>(x:T)->T {return x;}
fn pair<T>(x:T)->Pair<T,T> {return Pair<T,T>{left:identity<T>(x),right:x};}
fn generic_pair(x:Word)->Pair<Word,Word> {return pair<Word>(x);}
fn generic_text()->String {return identity<String>("generic");}
fn generic_head<T>(xs:Sequence<T>,fallback:T)->T {return xs.at_or(0,fallback);}
fn first()->Word {return generic_head<Word>([7,8],0);}
fn exact_count(xs:Words)->Int {return count(xs);}
fn negated(x:Int)->Int {return -x;}
fn masks(x:Word,y:Word)->Word {return (~x & y) | (x ^ y);}
fn shifted(x:Word,k:Word)->Word {return wrapping_shl(x,k);}
fn signed_shift(x:i32,k:Word)->i32 {return wrapping_shr(x,k);}
fn rotated(x:u64,k:Word)->u64 {return rotate_left(x,k);}
query bits(x:Word,k:Word)->Word {return rotate_right(~x,k);}
fn literal_checked(x:Word)->Result<Word,ArithmeticError> {return checked_add(1,x);}
query action_checked(x:Word)->Result<Word,ArithmeticError> {return checked_add(1,x);}
enum Error { Overflow, Failed, }

fn early(c:Bool,x:Word)->Word {
    if !c { return x; }
    let y=x+1;
    return y;
}
fn scoped(c:Bool,x:Word)->Word {
    if c { let x=99; }
    return x;
}
fn conditional(c:Bool,x:Word)->Word {
    return if c {x+1} else {x-1};
}
fn owners(c:Bool)->Words {
    let b:Buffer<Word> = buffer([1,2,3]);
    if c { return b.push(4).freeze(); }
    return b.freeze();
}
fn empty()->Words { return []; }
fn literal()->Words { return [1,2,3,]; }
fn exact(x:Int)->Int { return x*x+1; }
fn converted(x:i32)->Int { return Int(x); }
fn exact_total(xs:List<Int>)->Int { return sum(xs); }
fn some(x:Word)->Option<Word> { return Some(x); }
fn none()->Option<Word> { return None; }
fn checked(x:Word)->Result<Word,Error> {
    return checked_add(x,1).map_err(fn(error)=>Error.Overflow);
}
fn mapped(x:Option<Word>)->Option<Word> { return x.map(fn(v)=>v+1); }
fn recovered(x:Option<Word>)->Result<Word,Error> { return x.ok_or(Error.Overflow); }
fn text()->String { return "hello"; }
fn unit()->Unit { return (); }
fn point(x:Word)->Position { return Position{x:x,y:x+1}; }
fn equal(a:Position,b:Position)->Bool { return a==b; }

state Rows:Table<Word,Word> = Table.empty();
event seen:Word;
change bad()->Result<Word,Error> writes(Rows) emits(seen) {
    Rows.remove(0);
    emit seen(9);
    return Err(Error.Failed);
}
change good()->Result<Word,Error> writes(Rows) emits(seen) {
    return Ok(if true {7} else {bad()?});
}
query values()->Words { return [1,2,3]; }

fn range_sum()->Word {var total:Word=0;for i in 2..5{total=total+i;}return total;}
fn loop_ordered(xs:Words)->Word {var total:Word=0;for x in xs{total=total*10+x;}return total;}
fn collect<T>(xs:List<T>)->List<T> {var b:Buffer<T>=Buffer.empty();for x in xs{b=b.push(x);}return b.freeze();}
fn collected(xs:Words)->Words {return collect<Word>(xs);}
fn bool_count(xs:List<Bool>)->Word {return foldl(xs,0,fn(x)=>fn(acc)=>if x{acc+1}else{acc});}
fn nested()->Word {var total:Word=0;for i in 0..3{for j in 0..2{total=total+i+j;}}return total;}
fn bounded(n:Word)->Word {var x:Word=0;while x<n limit 4{x=x+1;}return x;}
query assigned(c:Bool)->Word {var x:Word=7;if c{x=9;let x=99;}return x;}
enum Message<T>{Empty,Value(T),Pair(T,T),}
fn message_value(x:Message<Word>)->Word {return match x {Message.Empty=>0,Message.Value(v)=>v,Message.Pair(a,b)=>a+b,};}
fn message(x:Word,y:Word)->Word {return message_value(Message<Word>.Pair(x,y));}
fn message_empty()->Word {return message_value(Message<Word>.Empty);}
fn optional(x:Option<Word>)->Word {return match x {Some(v)=>v,None=>9,};}
fn result_value(x:Result<Word,Word>)->Word {return match x {Ok(v)=>v,Err(e)=>e+1,};}
fn apply<T,U>(x:T,f:fn(T)->U)->U {return f(x);}
fn transform<T,U>(xs:List<T>,f:fn(T)->U)->List<U> {return xs.map(f);}
fn captured(x:Word,offset:Word)->Word {return apply<Word,Word>(x,fn(item)=>item+offset);}
fn transformed(xs:Words,offset:Word)->Words {return transform<Word,Word>(xs,fn(item)=>item+offset);}
query matched(x:Message<Word>)->Word {return match x {Message.Empty=>0,Message.Value(v)=>v,Message.Pair(a,b)=>a+b,};}
query matched_option(x:Option<Word>)->Word {return match x {Some(v)=>v,None=>9,};}
query action_callback(x:Word,offset:Word)->Word {return apply<Word,Word>(x,fn(item)=>item+offset);}
fn triplet()->Array<Word,3>{return array<Word,3>([1,2,3]);}
fn fixed_values(i:Word)->Words{return triplet().with(i,7).values();}
fn fixed_read(i:Word)->Word{return triplet().at_or(i,9);}
fn fixed_length<T,const N:u32>(xs:Array<T,N>)->Word{return N;}
fn shape()->Word{return fixed_length<Word,3>(triplet());}
fn lexicographic(a:Word,b:Word)->Word{
 if b>0{return lexicographic(a,b-1)+1;}
 if a>0{return lexicographic(a-1,2)+1;}
 return 0;
}
fn propagated(x:Result<Word,Word>)->Result<Word,Word>{let v:Word=x?;return Ok(v+1);}
