module interprocedural_facts;
fn shifted(value:u32)->u32{return value+3;}
fn nested(value:u32)->u32{return shifted(value);}
fn fits(value:u32,upper:u32)->Bool{return value<upper && upper<=256;}
fn observed(x:u32)->Bool{return choose(x!=4,nested(x)!=7,true);}
fn bounded(x:u32,upper:u32)->u32{return choose(fits(x,upper),word_and(x,255),x);}
fn collide(value:u32)->u32{return value*2;}
fn collision(x:u32)->Bool{return choose(x!=4,collide(x)!=8,true);}
