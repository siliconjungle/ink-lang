module lexer_runs;
import "../../knowledge/libraries/workload_kernels.ink" as k;
fn baseline(xs:List<u32>)->List<k.Token>{return k.lex(xs);}
fn runs(xs:List<u32>)->List<k.Token>{return lex_runs(xs);}

// Experimental explicit run scanner; it shares the published micro-language.
// Character-specific loops follow the organization of production lexers such
// as Oxc. No claim of JavaScript parsing or an admitted algorithm rewrite.
record Cursor { index:u32, output:Buffer<k.Token>, }
fn alpha(c:u32)->Bool {let lower=c|32;return (lower>=97 && lower<=122) || c==95;}
fn digit(c:u32)->Bool {return c>=48 && c<=57;}
fn accepts(c:u32,kind:u32)->Bool {return if kind==1 {alpha(c)||digit(c)} else {digit(c)};}
fn lex_runs(xs:List<u32>)->List<k.Token> {
 let s=Cursor{index:0,output:Buffer.empty()};
 return repeat_until(length(xs),s,fn(s)=>s.index>=length(xs),fn(i)=>fn(s)=>scan_token(xs,s)).output.freeze();
}
fn scan_token(xs:List<u32>,s:Cursor)->Cursor {
 let start=s.index;let c=xs.at_or(start,0);
 if c==32 || c==9 || c==10 || c==13 {return Cursor{index:start+1,output:s.output};}
 let kind:u32=if alpha(c) {1} else {if digit(c) {2} else {3}};
 let end=if kind==3 {start+1} else {
  repeat_until(length(xs)-start-1,start+1,fn(end)=>!accepts(xs.at_or(end,0),kind),fn(i)=>fn(end)=>end+1)
 };
 return Cursor{index:end,output:s.output.push(k.Token{start:start,end:end,kind:kind})};
}
