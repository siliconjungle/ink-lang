module reserved; record Row{id:u32,value:u32,} pub fn run(xs:List<Row>,add:u32)->List<Row>{return xs.map(fn(x)=>Row{id:x.id,value:x.value+add}).filter(fn(x)=>x.value!=0);}
