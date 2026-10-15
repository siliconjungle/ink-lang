module ink.knowledge.learning_session;
// Authored lifecycle, independent of a particular model, objective or optimizer.
enum Overflow { Reject, DropNewest, }
record Settings { capacity:u32, budget:u32, publish_every:u32, paused:Bool, overflow:Overflow, }
record Item<O> { id:u32, observation:O, }
record Session<M,O> {
 serving:M, candidate:M, fallback:O, settings:Settings,
 version:u32, base:u32, ticket:u32, active:Bool, processed:u32,
 queue:List<Item<O>>, next:u32, published_through:u32, dropped:u32,
}
record Enqueued<M,O> { session:Session<M,O>, accepted:Bool, }
record Order { previous:u32, valid:Bool, }
fn settings_valid(s:Settings)->Bool {
 return s.capacity>0 && s.capacity<=4096 && s.budget>0 && s.budget<=1024
  && s.publish_every>0 && s.publish_every<=s.capacity;
}
fn shape<M,O>(s:Session<M,O>)->Bool {
 let order=foldl(s.queue,Order{previous:s.published_through,valid:true},fn(item)=>fn(order)=>Order{previous:item.id,valid:order.valid && item.id>order.previous && item.id<s.next});
 return settings_valid(s.settings) && length(s.queue)<=s.settings.capacity && s.next>0
  && s.published_through<s.next && s.base<=s.version && s.processed<=length(s.queue)
  && (s.active || s.processed==0) && order.valid;
}
fn create<M,O>(model:M,fallback:O,settings:Settings)->Result<Session<M,O>,String> {
 if !settings_valid(settings) {return Err("session settings");}
 return Ok(Session<M,O>{serving:model,candidate:model,fallback:fallback,settings:settings,version:0,base:0,ticket:0,active:false,processed:0,queue:[],next:1,published_through:0,dropped:0});
}
fn configure<M,O>(s:Session<M,O>,settings:Settings)->Result<Session<M,O>,String> {
 if !shape<M,O>(s) || !settings_valid(settings) || length(s.queue)>settings.capacity {return Err("session settings");}
 return Ok(Session<M,O>{..s,settings:settings});
}
fn enqueue<M,O>(s:Session<M,O>,id:u32,observation:O)->Result<Enqueued<M,O>,String> {
 if !shape<M,O>(s) || id!=s.next || s.next==4294967295 {return Err("observation sequence");}
 if length(s.queue)==s.settings.capacity {
  if s.settings.overflow==Overflow.Reject || s.dropped==4294967295 {return Err("observation queue full");}
  return Ok(Enqueued<M,O>{session:Session<M,O>{..s,next:s.next+1,dropped:s.dropped+1},accepted:false});
 }
 return Ok(Enqueued<M,O>{session:Session<M,O>{..s,queue:s.queue.concat([Item<O>{id:id,observation:observation}]),next:s.next+1},accepted:true});
}
fn begin<M,O>(s:Session<M,O>)->Result<Session<M,O>,String> {
 if !shape<M,O>(s) || s.active || s.settings.paused || length(s.queue)==0 || s.ticket==4294967295 {return Err("session cannot begin");}
 return Ok(Session<M,O>{..s,candidate:s.serving,base:s.version,ticket:s.ticket+1,active:true,processed:0});
}
fn advance_one<M,O>(s:Session<M,O>,update:fn(M,O)->Result<M,String>,valid:fn(M)->Bool)->Result<Session<M,O>,String> {
 let item=s.queue.at_or(s.processed,Item<O>{id:0,observation:s.fallback});
 let candidate=update(s.candidate,item.observation)?;
 if !valid(candidate) {return Err("candidate domain");}
 return Ok(Session<M,O>{..s,candidate:candidate,processed:s.processed+1});
}
fn advance<M,O>(s:Session<M,O>,ticket:u32,steps:u32,update:fn(M,O)->Result<M,String>,valid:fn(M)->Bool)->Result<Session<M,O>,String> {
 if !shape<M,O>(s) || !s.active || s.settings.paused || ticket!=s.ticket || s.base!=s.version
  || steps==0 || steps>s.settings.budget {return Err("session work boundary");}
 let count=choose(steps<length(s.queue)-s.processed,steps,length(s.queue)-s.processed);
 let initial:Result<Session<M,O>,String>=Ok(s);
 return repeat_until(count,initial,fn(result)=>false,fn(i)=>fn(result)=>result.fold(fn(current)=>advance_one<M,O>(current,update,valid),fn(error)=>Err(error)));
}
fn publish<M,O>(s:Session<M,O>,ticket:u32,flush:Bool,valid:fn(M)->Bool,accept:fn(M,M)->Bool)->Result<Session<M,O>,String> {
 if !shape<M,O>(s) || !s.active || s.settings.paused || ticket!=s.ticket || s.base!=s.version
  || s.version==4294967295 || s.processed==0 || (!flush && s.processed<s.settings.publish_every) {return Err("session publication boundary");}
 if !valid(s.candidate) || !accept(s.serving,s.candidate) {return Err("candidate rejected");}
 let last=s.queue.at_or(s.processed-1,Item<O>{id:0,observation:s.fallback}).id;
 return Ok(Session<M,O>{..s,serving:s.candidate,version:s.version+1,base:s.version+1,active:false,processed:0,queue:s.queue.filter(fn(item)=>item.id>last),published_through:last});
}
fn cancel<M,O>(s:Session<M,O>)->Result<Session<M,O>,String> {
 if !shape<M,O>(s) {return Err("session shape");}
 return Ok(Session<M,O>{..s,candidate:s.serving,base:s.version,active:false,processed:0});
}
fn discard<M,O>(s:Session<M,O>,through:u32)->Result<Session<M,O>,String> {
 if !shape<M,O>(s) || s.active || through>=s.next {return Err("session discard boundary");}
 let remaining=s.queue.filter(fn(item)=>item.id>through);
 let removed=length(s.queue)-length(remaining);
 if removed>4294967295-s.dropped {return Err("session discard limit");}
 return Ok(Session<M,O>{..s,queue:remaining,dropped:s.dropped+removed});
}
// Keep an in-flight candidate stale, so its promotion fails rather than replacing
// a newer serving version. Explicit cancellation/restart is the rebase policy.
fn replace_serving<M,O>(s:Session<M,O>,model:M,valid:fn(M)->Bool)->Result<Session<M,O>,String> {
 if !shape<M,O>(s) || s.version==4294967295 || !valid(model) {return Err("serving replacement domain");}
 return Ok(Session<M,O>{..s,serving:model,version:s.version+1});
}
