module adaptive_structure;

// Two authored encodings of the low eight bits. The target and observations
// belong to this application; the compiler does not invent a reward.
enum Representation { Expanded, Packed, }
enum Error { Domain, }
record Costs { expanded:u64, packed:u64, observations:u64, }
record Metrics { latency:u64, energy:u64, memory:u64, }
record GoalWeights { latency:u64, energy:u64, memory:u64, }
record Goal { weights:GoalWeights, version:u64, }
trainable state Choice:Representation = Representation.Expanded;
trainable state History:Costs = Costs{expanded:0,packed:0,observations:0};
trainable state Target:Goal = Goal{weights:GoalWeights{latency:1,energy:0,memory:0},version:0};
state Rows:Table<u64,u64> = Table.empty();
event changed:u64;

fn expanded(x:u64)->u64 {
 return choose((x&1)!=0,1,0)+choose((x&2)!=0,2,0)
      + choose((x&4)!=0,4,0)+choose((x&8)!=0,8,0)
      + choose((x&16)!=0,16,0)+choose((x&32)!=0,32,0)
      + choose((x&64)!=0,64,0)+choose((x&128)!=0,128,0);
}
fn evaluate(representation:Representation,x:u64,offset:u64)->u64 {
 return choose(representation==Representation.Packed,x&255,expanded(x))+offset;
}
adaptive query serve(key:u64,x:u64)->u64 reads(Choice,Rows) {
 let offset=Rows.get(key).unwrap_or(0);
 return evaluate(Choice,x,offset);
}
query choice()->Representation reads(Choice) {return Choice;}
query costs()->Costs reads(History) {return History;}
query target()->Goal reads(Target) {return Target;}
fn objective(observation:Metrics,weights:GoalWeights)->u64 {
 return observation.latency*weights.latency+observation.energy*weights.energy+observation.memory*weights.memory;
}
fn valid_metrics(m:Metrics)->Bool {return m.latency<=1000000 && m.energy<=1000000 && m.memory<=1000000;}
fn valid_weights(w:GoalWeights)->Bool {return w.latency<=1000 && w.energy<=1000 && w.memory<=1000;}
// The objective is ordinary authored logic. A controller or another learner can
// call retarget. New versions invalidate old feedback and reset accumulated cost.
learn change retarget(weights:GoalWeights,expected:u64)->Result<u64,Error>
 reads(Target) writes(Target,History) {
 let old=Target;
 if old.version!=expected || old.version==18446744073709551615
    || !valid_weights(weights) {
   return Err(Error.Domain);
 }
 let version=old.version+1;
 Target=Goal{weights:weights,version:version};
 History=Costs{expanded:0,packed:0,observations:0};
 return Ok(version);
}
// Paired observations use the same version and units. Bounds keep exact u64
// objective totals representable; no sample grants compiler rewrite authority.
learn change observe(expanded:Metrics,packed:Metrics,version:u64)->Result<Unit,Error>
 reads(History,Target) writes(History,Choice) {
 let old=History;
 let goal=Target;
 if version!=goal.version || !valid_weights(goal.weights)
    || !valid_metrics(expanded) || !valid_metrics(packed) || old.observations>=1000000
    || old.expanded>old.observations*3000000000
    || old.packed>old.observations*3000000000 {
   return Err(Error.Domain);
 }
 let expanded_cost=objective(expanded,goal.weights);
 let packed_cost=objective(packed,goal.weights);
 let next=Costs{expanded:old.expanded+expanded_cost,packed:old.packed+packed_cost,observations:old.observations+1};
 History=next;
 Choice=choose(next.packed<next.expanded,Representation.Packed,Representation.Expanded);
 return Ok(());
}
change put(key:u64,value:u64,fail:Bool)->Result<Unit,Error>
 writes(Rows) emits(changed) {
 Rows.put(key,value);emit changed(value);
 if fail {return Err(Error.Domain);}
 return Ok(());
}
// Independent eligible work makes actual GPU dispatch testable; stateful
// serving and learning still run on the CPU host.
fn batch(xs:List<f32>)->List<f32> {return xs.map(fn(x)=>x*x+0.5);}
