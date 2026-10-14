module deferred_delta_examples;
fn adjusted(total:u32,old:u32,new:u32)->u32{return total-old+new;}
fn sequential(total:u32,old_a:u32,new_a:u32,old_b:u32,new_b:u32)->u32{return adjusted(adjusted(total,old_a,new_a),old_b,new_b);}
fn combined(total:u32,old_a:u32,new_a:u32,old_b:u32,new_b:u32)->u32{return adjusted(total,old_a+old_b,new_a+new_b);}
