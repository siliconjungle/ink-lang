module measured_library;

// Neither variable subtraction nor a derived measure is a compiler strategy.
fn steps(n:u32,stride:u32)->u32 decreases n; {
 if stride>0 && n>=stride {return steps(n-stride,stride)+1;}
 return 0;
}
fn distance(limit:u32,index:u32)->u32 {return limit-index;}
fn forward(limit:u32,index:u32)->u32 decreases distance(limit,index); {
 if index<limit {return forward(limit,index+1)+1;}
 return 0;
}
fn generic<T>(n:u32,value:T)->T decreases n; {
 if n>0 {return generic<T>(n-1,value);}
 return value;
}
fn lex(a:u32,b:u32,reset:u32)->u32 decreases [a,b]; {
 if b>0{return lex(a,b-1,reset)+1;}
 if a>0{return lex(a-1,reset,reset)+1;}
 return 0;
}
