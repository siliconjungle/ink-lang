module continuous_learning;
import "std:learning_session" as session;
record Model { weight:f32, updates:u32, }
record Observation { input:f32, target:f32, rate:f32, }
record Controls { capacity:u32, budget:u32, publish_every:u32, paused:Bool, drop_newest:Bool, }
record Status { version:u32, ticket:u32, active:Bool, processed:u32, pending:u32, next:u32, published_through:u32, dropped:u32, paused:Bool, budget:u32, }
trainable state Training:Result<session.Session<Model,Observation>,String> = session.create<Model,Observation>(Model{weight:0.0,updates:0},Observation{input:0.0,target:0.0,rate:0.1},session.Settings{capacity:4,budget:2,publish_every:2,paused:false,overflow:session.Overflow.Reject});
event published:Status;
fn valid(m:Model)->Bool {return is_finite(m.weight) && m.weight>=-8.0 && m.weight<=8.0;}
fn accept(old:Model,next:Model)->Bool {return next.updates>old.updates;}
fn update(m:Model,o:Observation)->Result<Model,String> {
 if m.updates==4294967295 {return Err("model update limit");}
 let error=m.weight*o.input-o.target;
 let next=Model{weight:m.weight-o.rate*(o.input*error+error*o.input),updates:m.updates+1};
 if !valid(next) {return Err("model domain");}
 return Ok(next);
}
fn advanced(s:session.Session<Model,Observation>,ticket:u32,steps:u32)->Result<session.Session<Model,Observation>,String> {return session.advance<Model,Observation>(s,ticket,steps,update,valid);}
fn promoted(s:session.Session<Model,Observation>,ticket:u32,flush:Bool)->Result<session.Session<Model,Observation>,String> {return session.publish<Model,Observation>(s,ticket,flush,valid,accept);}
fn replaced(s:session.Session<Model,Observation>,model:Model)->Result<session.Session<Model,Observation>,String> {return session.replace_serving<Model,Observation>(s,model,valid);}
// Snapshot type validation alone does not prove this application's model domain.
fn readable(value:Result<session.Session<Model,Observation>,String>)->Result<session.Session<Model,Observation>,String> {
 let s=value?;
 if !session.shape<Model,Observation>(s) || !valid(s.serving) || !valid(s.candidate) {return Err("session domain");}
 return Ok(s);
}
fn pending(s:session.Session<Model,Observation>)->u32 {return length(s.queue);}
fn status_of(s:session.Session<Model,Observation>)->Status {
 return Status{version:s.version,ticket:s.ticket,active:s.active,processed:s.processed,pending:length(s.queue),next:s.next,published_through:s.published_through,dropped:s.dropped,paused:s.settings.paused,budget:s.settings.budget};
}
adaptive query predict(input:f32)->Result<f32,String> reads(Training) {
 let s=readable(Training)?;return Ok(s.serving.weight*input);
}
query status()->Result<Status,String> reads(Training) {let s=readable(Training)?;return Ok(status_of(s));}
query models()->Result<List<Model>,String> reads(Training) {let s=readable(Training)?;return Ok([s.serving,s.candidate]);}
learn change enqueue(id:u32,o:Observation)->Result<Bool,String> reads(Training) writes(Training)
 requires(is_finite(o.input) && is_finite(o.target) && is_finite(o.rate) && o.rate>0.0 && o.rate<=0.25,"observation domain") {
 let result=session.enqueue<Model,Observation>(readable(Training)?,id,o)?;
 Training=Ok(result.session);return Ok(result.accepted);
}
learn change configure(settings:Controls)->Result<Unit,String> reads(Training) writes(Training) {
 Training=Ok(session.configure<Model,Observation>(readable(Training)?,session.Settings{capacity:settings.capacity,budget:settings.budget,publish_every:settings.publish_every,paused:settings.paused,overflow:choose(settings.drop_newest,session.Overflow.DropNewest,session.Overflow.Reject)})?);return Ok(());
}
learn change begin()->Result<Status,String> reads(Training) writes(Training) {
 let s=session.begin<Model,Observation>(readable(Training)?)?;Training=Ok(s);return Ok(status_of(s));
}
learn change work(ticket:u32,steps:u32)->Result<Status,String> reads(Training) writes(Training) {
 let s=advanced(readable(Training)?,ticket,steps)?;Training=Ok(s);return Ok(status_of(s));
}
learn change publish(ticket:u32,flush:Bool)->Result<Status,String> reads(Training) writes(Training) emits(published) {
 let s=promoted(readable(Training)?,ticket,flush)?;Training=Ok(s);let status=status_of(s);emit published(status);return Ok(status);
}
learn change cancel()->Result<Unit,String> reads(Training) writes(Training) {
 Training=Ok(session.cancel<Model,Observation>(readable(Training)?)?);return Ok(());
}
learn change discard(through:u32)->Result<Unit,String> reads(Training) writes(Training) {
 Training=Ok(session.discard<Model,Observation>(readable(Training)?,through)?);return Ok(());
}
learn change replace(model:Model)->Result<Unit,String> reads(Training) writes(Training) {
 Training=Ok(replaced(readable(Training)?,model)?);return Ok(());
}
// Another application action can request a complete bounded work/publication turn.
learn change pump()->Result<Status,String> reads(Training) writes(Training) emits(published) {
 let initial=readable(Training)?;
 if initial.settings.paused || pending(initial)==0 {return Ok(status_of(initial));}
 if !initial.active {let started=begin()?;}
 let current=readable(Training)?;
 let advanced=work(current.ticket,current.settings.budget)?;
 let after=readable(Training)?;
 if after.processed>=after.settings.publish_every || after.processed==pending(after) {return publish(after.ticket,true);}
 return Ok(advanced);
}
learn change abort_turn()->Result<Unit,String> reads(Training) writes(Training) emits(published) {
 let result=pump()?;return Err("cancel entire turn");
}
fn batch(xs:List<f32>)->List<f32> {return xs.map(fn(x)=>x*x+0.5);}
