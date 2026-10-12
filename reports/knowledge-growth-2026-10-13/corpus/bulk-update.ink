module frozen_software;
record Entity { id:u32,value:u32,active:Bool, }
pub fn run(xs:List<Entity>,delta:u32)->List<Entity>{return xs.map(fn(x)=>Entity{id:x.id,value:choose(x.active,x.value+delta,x.value),active:x.active});}
