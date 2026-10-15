module literal_search;
record Cursor{offset:u32,matches:u32,done:Bool,}
fn advance(text:String,needle:String,width:u32,state:Cursor)->Cursor{
 if state.done{return state;}
 return string_find(text,needle,state.offset).fold(
  fn(at)=>Cursor{offset:at+width,matches:state.matches+1,done:false},
  fn(u)=>Cursor{..state,done:true});
}
fn count_literal(text:String,needle:String)->u32{
 let width=string_byte_len(needle);
 if width==0{return 0;}
 return repeat_until(string_byte_len(text),Cursor{offset:0,matches:0,done:false},
  fn(state)=>state.done,fn(i,state)=>advance(text,needle,width,state)).matches;
}
fn counts(texts:List<String>,needle:String)->List<u32>{
 return texts.map(fn(text)=>count_literal(text,needle));
}
