module ecs_lifecycle;
import "../../knowledge/libraries/sparse_ecs.ink" as ecs;
import "../../knowledge/libraries/sparse_ecs_indexed.ink" as indexed;
fn run(capacity:u32,commands:List<ecs.Command>)->ecs.Snapshot{return ecs.execute(capacity,commands);}
fn run_indexed(capacity:u32,commands:List<ecs.Command>)->ecs.Snapshot{return indexed.execute(capacity,commands);}
