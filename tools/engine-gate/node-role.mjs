import {openRole} from './worker.mjs';
let api,queue=Promise.resolve();
process.on('message',message=>{queue=queue.then(async()=>{
  const {id,op,args}=message;
  try {
    let value;
    if(op==='open') {
      if(api)throw Error('role already opened');
      api=await openRole(args);
      value={importMs:api.importMs,verification:api.verification,cases:api.cases,
        realm:{kind:'node-process',pid:process.pid,node:process.version,v8:process.versions.v8,execArgv:process.execArgv}};
    }else if(op==='time')value=api.time(args.name,args.n);
    else if(op!=='close')throw Error('unknown role operation');
    process.send({id,value},error=>{if(error)throw error;if(op==='close')process.disconnect();});
  }catch(error){process.send({id,error:error.stack??String(error)});}
});});
