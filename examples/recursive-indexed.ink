module recursive_indexed;
enum Error{Failed,}
record Node{value:u64,children:List<Node>,next:Option<Node>,}
record Left{label:String,right:Option<Right>,}
record Right{weight:u32,left:Option<Left>,}
state Nodes:Table<u64,Node> =Table.empty();
state Links:Table<String,Left> =Table.empty();
event node:Node;
fn top(row:Node)->u64{return row.value;}
change put(key:u64,row:Node,fail:Bool)->Result<Unit,Error> writes(Nodes) emits(node){Nodes.remove(key);Nodes.insert(key,row);emit node(row);if fail{return Err(Error.Failed);}return Ok(());}
change link(key:String,row:Left)->Result<Unit,Error> writes(Links){Links.remove(key);Links.insert(key,row);return Ok(());}
change replace_pair(a:u64,b:u64,row:Node)->Result<Unit,Error> writes(Nodes){if Nodes.contains(a){Nodes.replace(a,row);if Nodes.contains(b){Nodes.replace(b,row);return Ok(());}return Err(Error.Failed);}return Err(Error.Failed);}
query get(key:u64)->Option<Node> reads(Nodes){return Nodes.get(key);}
query children(key:u64)->Option<List<Node>> reads(Nodes){return Nodes.get(key).map(fn(row)=>row.children);}
query next(key:u64)->Option<Node> reads(Nodes){return Nodes.get(key).fold(fn(row)=>row.next,fn(unit)=>None);}
query link_right(key:String)->Option<Right> reads(Links){return Links.get(key).fold(fn(row)=>row.right,fn(unit)=>None);}
query total()->u64 reads(Nodes){return sum(Nodes.values().map(fn(row)=>top(row)));}
query same(a:Node,b:Node)->Bool{return a==b;}
