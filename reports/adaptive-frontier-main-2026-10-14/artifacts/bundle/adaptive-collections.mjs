import {createAdaptiveState} from './adaptive-state.mjs';
/** Explicit composition of independently owned compiled states. A call/migration
 * touches one collection. No inferred partition, shared state, or cross-collection
 * transaction is claimed. Global checkpoints must be coordinated by the app.
 */
export async function createAdaptiveCollections(configs){
 const entries=Object.entries(configs);
 if(!entries.length||entries.length>64||entries.some(([id])=>!/^[A-Za-z0-9_-]{1,64}$/.test(id)))throw Error('adaptive collection budget/identity');
 const hosts=new Map();
 try{for(const [id,config]of entries)hosts.set(id,await createAdaptiveState(config));}
 catch(error){await Promise.allSettled([...hosts.values()].map(h=>h.close()));throw error;}
 const get=id=>{const host=hosts.get(id);if(!host)throw Error('unknown collection');return host;};
 return {
  call(id,name,args=[],features={}){return get(id).call(name,args,features);},
  checkpoint(id){return get(id).checkpoint();},
  restore(id,bytes){return get(id).restore(bytes);},
  acknowledge(id,commit,position){return get(id).acknowledge(commit,position);},
  status(){return Object.fromEntries([...hosts].map(([id,h])=>[id,h.status()]));},
  async close(){await Promise.allSettled([...hosts.values()].map(h=>h.close()));}
 };
}
