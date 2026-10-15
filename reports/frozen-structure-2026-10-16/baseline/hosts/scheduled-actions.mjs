// Cooperative scheduling over a compiled (optionally durable) action host.
// Model, queue, objective, work budget and publication are ordinary source logic.
export class ScheduledActions {
  #host; #plan; #result; #idle; #running=false; #active=false; #paused=false; #revision=0;
  #done; #turn=Promise.resolve(); #wake; #woken=false;
  constructor({host, plan, onResult=()=>{}, idleMs=50}) {
    if(typeof host?.invoke!=='function'||typeof plan!=='function'||typeof onResult!=='function')
      throw new TypeError('Scheduled actions require a host, plan and result callback');
    if(!Number.isInteger(idleMs)||idleMs<1||idleMs>60000)throw new RangeError('Idle delay must be 1..60000 ms');
    this.#host=host;this.#plan=plan;this.#result=onResult;this.#idle=idleMs;
  }
  get running(){return this.#running;}
  get paused(){return this.#paused;}
  wake(){this.#woken=true;this.#wake?.();}
  setPaused(paused){if(typeof paused!=='boolean')throw new TypeError('Pause must be boolean');this.#paused=paused;this.#revision++;this.wake();}
  async pause(){this.setPaused(true);await this.#turn;}
  resume(){this.setPaused(false);}
  requestStop(){this.#running=false;this.#revision++;this.wake();}
  async stop(){this.requestStop();await this.#done;}
  run({signal}={}) {
    if(this.#active)throw Error('Scheduled actions are already running');
    this.#running=true;this.#active=true;
    const abort=()=>{this.#running=false;this.#revision++;this.wake();};
    signal?.addEventListener('abort',abort,{once:true});
    this.#done=(async()=>{
      try {
        while(this.#running&&!signal?.aborted) {
          let delay=this.#idle;
          if(!this.#paused) {
            this.#turn=this.#step(this.#revision);
            delay=await this.#turn;
          }
          if(this.#running&&!signal?.aborted)await this.#wait(delay);
          // Even a plan/result callback that repeatedly calls wake must yield to
          // serving requests and timers instead of forming a microtask spin.
          if(this.#running&&!signal?.aborted)await new Promise(resolve=>setTimeout(resolve,1));
        }
      } finally {
        this.#running=false;this.#active=false;this.#wake?.();
        signal?.removeEventListener('abort',abort);
      }
    })();
    return this.#done;
  }
  async #step(revision) {
    const request=await this.#plan(this.#host);
    if(!this.#running||this.#paused||revision!==this.#revision)return this.#idle;
    if(request==null)return this.#idle;
    if(typeof request.id!=='string'||!request.id.length||request.id.length>256
       ||typeof request.call!=='string'||!request.call.length||!Array.isArray(request.args))
      throw new TypeError('A scheduled request needs id, call and args');
    const delay=request.delayMs??1;
    if(!Number.isInteger(delay)||delay<1||delay>60000)throw new RangeError('Action delay must be 1..60000 ms');
    const reply=await this.#host.invoke(request.id,request.call,request.args);
    await this.#result(reply,request);
    return delay;
  }
  #wait(ms) {
    if(this.#woken){this.#woken=false;return Promise.resolve();}
    return new Promise(resolve=>{
      let timer;
      const finish=()=>{clearTimeout(timer);if(this.#wake===finish)this.#wake=undefined;this.#woken=false;resolve();};
      this.#wake=finish;timer=setTimeout(finish,ms);
    });
  }
}
