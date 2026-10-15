module encoded_search;
record Cursor{state:u32,matches:u32,}
fn advance(data:List<u32>,id:u32,transitions:List<u32>,width:u32,i:u32,s:Cursor)->Cursor{
 let code=data.at_or(id*512+i,0);
 let next=transitions.at_or(s.state*256+choose(code<256,code,0),0);
 return Cursor{state:choose(next==width,0,next),matches:s.matches+choose(next==width,1,0)};
}
fn counts_encoded(data:List<u32>,ids:List<u32>,transitions:List<u32>,width:u32)->List<u32>{
 return ids.map(fn(id)=>repeat(512,Cursor{state:0,matches:0},fn(i,s)=>advance(data,id,transitions,width,i,s)).matches);
}
