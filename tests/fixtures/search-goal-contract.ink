module search_goal_contract;
import "std:search" as search;
record Context { word:u64, token:String, iterations:u32, value:f64, }
adaptive fn priority(candidate:search.Candidate,context:Context)->f64 {
 let index=search.field(candidate.state,candidate.state.root,"sentinel").fold(fn(index)=>index,fn(unit)=>4294967295);
 let token=search.node(candidate.state,index).value;
 let frequency=candidate.frequencies.at_or(0,search.Frequency{entry:"",calls:0});
 return choose(token==context.token && context.word==18446744073709551615 && frequency.calls==18446744073709551615,7.0f64,-7.0f64);
}
fn invalid(candidate:search.Candidate,context:Context)->f64 {return 0.0f64/0.0f64;}
fn expensive(candidate:search.Candidate,context:Context)->f64 {
 return repeat_until(context.iterations,0.0f64,fn(value)=>false,fn(index)=>fn(value)=>value+1.0f64);
}
