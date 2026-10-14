// Shared source-observation adapter for throughput and lifecycle controls.
function word(value){if(typeof value==='number'&&!Number.isSafeInteger(value))throw Error('u64 requires an exact integer');if(!['number','bigint','string'].includes(typeof value)||typeof value==='string'&&!/^(0|[1-9][0-9]*)$/.test(value))throw Error('invalid u64');const n=BigInt(value);if(n<0n||n>18446744073709551615n)throw Error('invalid u64');return n;}
export function createFrontierAdapter(f,lane,{cloneJson,applyPatch,diff,OP_SET,OP_REMOVE,mainState,releasedState}){
 const isState=lane.includes('state'),isCommit=lane.endsWith('commit'),factory=lane.includes('main')?mainState:releasedState;
 let rows=cloneJson(f.initial),engine=isState?factory(rows):null,version=BigInt(f.rows),outbox=[];
 function invoke_json(name,args){
  if(name==='total')return{result:Object.values(rows).reduce((n,r)=>n+(r.active?r.value:0),0)>>>0,committed:false,version,events:[]};
  const key=args[0],value=name==='put'?args[1]:undefined,fail=args.at(-1),saved=fail&&lane.startsWith('frontier-core-')&&lane!=='frontier-core-patch'?cloneJson(rows[key]):rows[key];
  if(lane==='frontier-core-patch')rows=applyPatch(rows,value?[[OP_SET,[key],value]]:[[OP_REMOVE,[key]]],{cloneValues:true});
  else if(isState&&!isCommit){engine.commitPatch(value?[[OP_SET,[key],lane.includes('prepared')?value:cloneJson(value)]]:[[OP_REMOVE,[key]]]);rows=engine.get();}
  else{
   const target={...rows};if(value)target[key]=lane.includes('prepared')?value:cloneJson(value);else delete target[key];
   if(isState){engine.commit(target);rows=engine.get();}
   else{const patch=diff(rows,target,lane==='frontier-core-dirty'?{dirtyPaths:[[key]]}:undefined);rows=applyPatch(rows,patch,{cloneValues:true});}
  }
  if(fail){const inverse=saved?[[OP_SET,[key],saved]]:[[OP_REMOVE,[key]]];if(engine){engine.commitPatch(inverse);rows=engine.get();}else rows=applyPatch(rows,inverse);return{result:{Err:'Error.Failed'},committed:false,version,events:[]};}
  if(version===18446744073709551615n){const inverse=saved?[[OP_SET,[key],saved]]:[[OP_REMOVE,[key]]];if(engine){engine.commitPatch(inverse);rows=engine.get();}else rows=applyPatch(rows,inverse);throw Error('commit sequence exhausted');}
  version++;const event={commit:version,position:0n,channel:'seen',value:value?.value??0};outbox.push({...event});return{result:{Ok:null},committed:true,version,events:[event]};
 }
 return{invoke_json,acknowledge_through(commit,position){commit=word(commit);position=word(position);const last=outbox.at(-1);if(!last)return;if(last.commit<commit||(last.commit===commit&&last.position<=position)){outbox.length=0;return;}outbox=outbox.filter(e=>e.commit>commit||(e.commit===commit&&e.position>position));},get rows(){return rows;},get version(){return version;},get outbox(){return outbox.map(e=>({...e}));},dispose(){engine?.clear();}};
}
