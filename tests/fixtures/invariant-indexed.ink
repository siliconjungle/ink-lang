module invariant_indexed;

refined record Indexed { items:List<u32>, index:u32, }
 invariant value.index<length(value.items);

spec fn known(value:Indexed)->Bool ensures result;
implementation observe for known {return value.index<length(value.items);}

fn lookup(value:Indexed,fallback:u32)->u32 {
 return value.items.at_or(value.index,fallback);
}
fn other(value:Indexed,index:u32,fallback:u32)->u32 {
 return value.items.at_or(index,fallback);
}
