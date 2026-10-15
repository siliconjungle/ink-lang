module programmable_objective;
import "std:objective" as objective;

// This model belongs to the application. Different source functions can use
// nonlinear objectives, learned networks or complete explicit simulation state.
record Preference { variant:String, penalty:f64, }
record Context {
 latency_weight:f64, memory_weight:f64, switch_penalty:f64,
 preferences:List<Preference>,
}
fn valid(context:Context)->Bool {
 return is_finite(context.latency_weight) && context.latency_weight>=0.0f64
     && is_finite(context.memory_weight) && context.memory_weight>=0.0f64
     && is_finite(context.switch_penalty) && context.switch_penalty>=0.0f64
     && foldl(context.preferences,true,fn(p)=>fn(ok)=>ok && is_finite(p.penalty));
}
fn preference(variant:String,preferences:List<Preference>)->f64 {
 return foldl(preferences,0.0f64,fn(p)=>fn(total)=>total+choose(p.variant==variant,p.penalty,0.0f64));
}
fn rank_one(candidate:objective.Candidate,context:Context)->objective.Rank {
   let extra=f64_from_u64(candidate.peak_bytes)*context.memory_weight
       +choose(candidate.current,0.0f64,context.switch_penalty)
       +preference(candidate.variant,context.preferences);
   return objective.rank(candidate.variant,
       candidate.total_low_ns*context.latency_weight+extra,
       candidate.total_high_ns*context.latency_weight+extra);
}
adaptive fn rank(candidates:List<objective.Candidate>,context:Context)->List<objective.Rank> {
 if !valid(context) {return [];}
 return candidates.map(fn(candidate)=>rank_one(candidate,context)).filter(fn(score)=>objective.valid(score));
}
