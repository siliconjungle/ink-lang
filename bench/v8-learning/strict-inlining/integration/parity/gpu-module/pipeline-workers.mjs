// Bounded pure-task workers. Message transport/setup are part of the measured
// worker boundary. No caller buffer is transferred or detached.
export function createWorkerPool(root,count,{timeoutMs=30000}={}) {
  if(!Number.isInteger(count)||count<1||count>16)throw Error('parallelism must be 1..16');
  const workers=[],queue=[];let closed=false,next=0;
  function discard(slot,error) {
    if(slot.dead)return;slot.dead=true;slot.worker.terminate();
    if(slot.job){clearTimeout(slot.job.timer);slot.job.reject(error);slot.job=null;}
    pump();
  }
  function pump() {
    if(closed)return;
    for(const slot of workers)if(!slot.dead&&!slot.job&&queue.length) {
      const job=queue.shift();slot.job=job;
      job.timer=setTimeout(()=>discard(slot,Error('pure worker timed out')),timeoutMs);
      try{slot.worker.postMessage({id:job.id,root:String(root),plan:job.plan,backend:job.backend,identity:job.identity})}
      catch(error){clearTimeout(job.timer);slot.job=null;job.reject(error);queueMicrotask(pump);}
    }
    if(workers.every(w=>w.dead))while(queue.length)queue.shift().reject(Error('pure workers unavailable'));
  }
  try {
    for(let i=0;i<count;i++) {
      const worker=new Worker(new URL('pipeline-worker.mjs',root),{type:'module',name:`Ink pure ${i}`}),slot={worker,job:null,dead:false,warm:new Set()};workers.push(slot);
      worker.onmessage=({data})=>{
        const job=slot.job;if(!data||!job||data.id!==job.id){discard(slot,Error('invalid pure worker receipt'));return;}
        clearTimeout(job.timer);slot.job=null;
        if(data.error){job.reject(Error(data.error));discard(slot,Error(data.error));}else {slot.warm.add(job.backend);job.resolve(data.result);}pump();
      };
      worker.onerror=event=>{event.preventDefault?.();discard(slot,Error(event.message??'pure worker failed'))};
      worker.onmessageerror=()=>discard(slot,Error('pure worker transport failed'));
    }
  }catch(error){for(const slot of workers)slot.worker.terminate();throw error;}
  return {
    get available(){return !closed&&workers.some(w=>!w.dead)},
    get warmBackends(){const alive=workers.filter(w=>!w.dead);return ['cpu','javascript'].filter(b=>alive.length&&alive.every(w=>w.warm.has(b))).map(b=>b+'-worker')},
    get capacity(){return closed?0:workers.filter(w=>!w.dead).length},
    run(plan,backend,identity) {
      if(closed)return Promise.reject(Error('pure worker pool is closed'));
      if(queue.length>=64)return Promise.reject(Error('pure worker queue budget'));
      return new Promise((resolve,reject)=>{queue.push({id:++next,plan,backend,identity,resolve,reject});pump()});
    },
    close(){if(closed)return;closed=true;while(queue.length)queue.shift().reject(Error('pure worker pool is closed'));for(const slot of workers)discard(slot,Error('pure worker pool is closed'))},
  };
}
