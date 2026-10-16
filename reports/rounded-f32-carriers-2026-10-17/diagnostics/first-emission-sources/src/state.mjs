// CALLER CONTRACT: arguments must match declared types; malformed data may throw or corrupt state.
// Fixed state primitives used by emitted action bodies, without an AST evaluator.
class __Abort {constructor(value){this.value=value;}}
function __preflightError(message){throw Error(message);}
function __try(value){if(Object.hasOwn(value,'Err'))throw new __Abort(value.Err);return value.Ok;}
function __nested(value,change){if(change && Object.hasOwn(value,'Err'))throw new __Abort(value.Err);return value;}
function __equal(a,b){if(a===b)return true;if(!a||!b||typeof a!=='object'||typeof b!=='object')return false;const ak=Object.keys(a),bk=Object.keys(b);return ak.length===bk.length&&ak.every(k=>Object.hasOwn(b,k)&&__equal(a[k],b[k]));}
function __checked(op,a,b,bits){const x=BigInt(a),y=BigInt(b),n=op==='checked_add'?x+y:op==='checked_sub'?x-y:x*y;const min=bits===-32?-2147483648n:0n,max=bits===-32?2147483648n:1n<<BigInt(bits);return n<min||n>=max?{Err:'ArithmeticError.Overflow'}:{Ok:Math.abs(bits)===32?Number(n):n};}
function __okOr(value,error){return Object.hasOwn(value,'Some')?{Ok:value.Some}:{Err:error};}
function __mapValue(value,kind,method,fn){
 if(kind==='list')return value[method](fn);
 if(kind==='option')return Object.hasOwn(value,'Some')?{Some:fn(value.Some)}:{None:null};
 const tag=method==='map_err'?'Err':'Ok';return Object.hasOwn(value,tag)?{[tag]:fn(value[tag])}:value;
}
const __encoder=new TextEncoder();
function __tick(ctx){if(--ctx.fuel<0)throw Error('Ink state execution budget exhausted');}
function __keyCompare(a,b,type){
 if(type.kind==='string'){let i=0,j=0;while(i<a.length&&j<b.length){const x=a.codePointAt(i),y=b.codePointAt(j);if(x!==y)return x-y;i+=x>65535?2:1;j+=y>65535?2:1;}return (i<a.length?1:0)-(j<b.length?1:0);}
 return a<b?-1:a>b?1:0;
}
// A table's ordered key view is reused until membership changes. Values are
// fetched at traversal time, so replacement never leaves stale row payloads.
const __tableOrder=new WeakMap();
function __keyPosition(keys,key,type){let low=0,high=keys.length;while(low<high){const middle=(low+high)>>>1;if(__keyCompare(keys[middle],key,type)<0)low=middle+1;else high=middle;}return low;}
function __tableMembership(rt,index,key,present){
 const view=__tableOrder.get(rt.tables[index]);if(!view)return;
 const at=__keyPosition(view.keys,key,rt.meta.roots[index].key);
 if((at<view.keys.length&&view.keys[at]===key)===present)view.pending.delete(key);
 else view.pending.set(key,present);
}
function __orderedKeys(rt,index){
 const table=rt.tables[index],type=rt.meta.roots[index].key;let view=__tableOrder.get(table);
 if(!view){view={keys:[...table.keys()].sort((a,b)=>__keyCompare(a,b,type)),pending:new Map()};__tableOrder.set(table,view);}
 if(view.pending.size){
  const changes=[...view.pending.keys()].sort((a,b)=>__keyCompare(a,b,type)),merged=[];let i=0,j=0;
  while(i<view.keys.length||j<changes.length){
   if(j===changes.length||(i<view.keys.length&&__keyCompare(view.keys[i],changes[j],type)<0))merged.push(view.keys[i++]);
   else{const key=changes[j++];if(i<view.keys.length&&view.keys[i]===key)i++;if(view.pending.get(key))merged.push(key);}
  }
  view.keys=merged;view.pending.clear();
 }
 const keys=view.keys;
 const cell=rt.cell;
 if(cell&&cell.index===index&&table.has(cell.key)!==(cell.next!==undefined)){
  if(cell.next===undefined)return keys.filter(k=>k!==cell.key);
  const at=__keyPosition(keys,cell.key,type);return [...keys.slice(0,at),cell.key,...keys.slice(at)];
 }
 return keys;
}
function __cellGet(rt,index,key){const cell=rt.cell;return cell&&cell.index===index&&cell.key===key?cell.next:rt.tables[index].get(key);}
function __readTable(rt,index){const cell=rt.cell;if(!cell||cell.index!==index)return rt.tables[index];const table=new Map(rt.tables[index]);if(cell.next===undefined)table.delete(cell.key);else table.set(cell.key,cell.next);return table;}
// The first before-image of each cell suffices for whole-transaction rollback.
function __remember(rt,index,key,present,value){if(rt.cellMode)return;if(!rt.seen[index].has(key)){rt.seen[index].add(key);rt.undo.push([index,key,present,value]);}}
// Immutable keeps retain private values. Public results remain owned copies.
// Reverse edges come from checked source effects.
// Before-images preserve cached values across failed actions; host rollback and
// restore discard caches rather than serializing them into logical snapshots.
function __invalidateKeeps(rt,index){
 if(rt.observers?.active)rt.changedRoots.add(index);
 if(!rt.keeps||rt.cellMode)return;
 for(const keep of rt.meta.keepInvalidations[index]){
  if(!rt.keepDirty[keep]){rt.keepDirty[keep]=1;rt.keepUndoIndices[rt.keepUndoCount++]=keep;rt.keepBefore[keep]=rt.keeps[keep];}
  rt.keeps[keep]=undefined;
 }
}
function __restoreKeeps(rt){for(let i=rt.keepUndoCount-1;i>=0;i--){const keep=rt.keepUndoIndices[i];rt.keeps[keep]=rt.keepBefore[keep];}__refreshActiveViews(rt);}
function __clearKeepJournal(rt){for(let i=0;i<rt.keepUndoCount;i++){const keep=rt.keepUndoIndices[i];rt.keepDirty[keep]=0;rt.keepBefore[keep]=undefined;}rt.keepUndoCount=0;}
function __rebuildViews(rt){
 rt.activeViewRoots=new Uint8Array(rt.meta.roots.length);
 for(const view of rt.views){rt.keeps[view.keep]=undefined;if(!rt.meta.lazyMaintenance)__viewBase(rt,view);}
}
function __refreshActiveViews(rt){rt.activeViewRoots.fill(0);for(const view of rt.views)if(rt.keeps[view.keep]!==undefined)rt.activeViewRoots[view.root]=1;}
function __viewBase(rt,view){
 if(rt.keeps[view.keep]===undefined){let value=view.zero;for(const [key,row]of rt.tables[view.root])value=view.combine(value,view.contribution(key,row));rt.keeps[view.keep]=value;rt.activeViewRoots[view.root]=1;}
 return rt.keeps[view.keep];
}
function __viewValue(view,value,key,oldValue,newValue){
 if(oldValue===undefined)return view.insert?view.insert(value,key,newValue):view.combine(value,view.contribution(key,newValue));
 if(newValue===undefined)return view.remove?view.remove(value,key,oldValue):view.combine(value,view.inverse(view.contribution(key,oldValue)));
 return view.replace?view.replace(value,key,oldValue,newValue):view.combine(view.combine(value,view.inverse(view.contribution(key,oldValue))),view.contribution(key,newValue));
}
function __updateViews(rt,index,key,oldValue,newValue){
 if(!rt.activeViewRoots[index])return null;
 const updates=rt.viewNext;
 for(const view of rt.viewsByRoot[index])updates[view.keep]=rt.keeps[view.keep]===undefined?undefined:__viewValue(view,rt.keeps[view.keep],key,oldValue,newValue);
 return updates;
}
function __installViews(rt,updates,index){if(updates)for(const view of rt.viewsByRoot[index])rt.keeps[view.keep]=updates[view.keep];}
function __pendingView(rt,view){
 const keep=view.keep;
 if(rt.pendingValues[keep]===undefined){
  const cell=rt.cell;
  rt.pendingValues[keep]=__viewValue(view,__viewBase(rt,view),cell.key,cell.prior,cell.next);
  rt.pendingIndices.push(keep);
 }
 return rt.pendingValues[keep];
}
function __prepareCell(rt){if(rt.cell&&rt.activeViewRoots[rt.cell.index]){const prepare=rt.views.prepareRoots?.[rt.cell.index];if(prepare)prepare(rt,rt.cell);else for(const view of rt.viewsByRoot[rt.cell.index])if(rt.keeps[view.keep]!==undefined)__pendingView(rt,view);}}
function __invalidateSnapshotRow(rt,index,key){rt.snapshotRows?.[index].delete(key);}
function __writeCell(rt,index,key,next,prior){
 if(rt.cellMode){if(rt.cell)throw Error('checked single-cell bound exceeded');rt.cell={index,key,next,prior};}
 else{const table=rt.tables[index];__invalidateSnapshotRow(rt,index,key);if(rt.changeTracking)__recordChange(rt,index,key,prior,next);if((prior!==undefined)!==(next!==undefined))__tableMembership(rt,index,key,next!==undefined);if(next===undefined)table.delete(key);else table.set(key,next);}
}
function __commitCell(rt){
 const cell=rt.cell;if(!cell)return;
 const table=rt.tables[cell.index];__invalidateSnapshotRow(rt,cell.index,cell.key);
 if(rt.changeTracking)__recordChange(rt,cell.index,cell.key,cell.prior,cell.next);
 if((cell.prior!==undefined)!==(cell.next!==undefined))__tableMembership(rt,cell.index,cell.key,cell.next!==undefined);
 if(cell.next===undefined)table.delete(cell.key);else table.set(cell.key,cell.next);
 for(const keep of rt.meta.keepInvalidations[cell.index])rt.keeps[keep]=rt.pendingValues[keep];
 rt.cell=null;
}
// Preflight scratch has no logical state or rollback obligations. Definitions
// are the same admitted group operations used by ordinary cell maintenance.
function __prepareDirect(rt,index,key,prior,next){
 const prepare=rt.views.directRoots?.[index];
 if(prepare)prepare(rt,key,prior,next);
 else for(const view of rt.viewsByRoot[index])rt.viewNext[view.keep]=__viewValue(view,rt.keeps[view.keep],key,prior,next);
}
function __storeDirect(rt,index,key,prior,next,slot){
 const table=rt.tables[index];__invalidateSnapshotRow(rt,index,key);
 if((prior!==undefined)!==(next!==undefined))__tableMembership(rt,index,key,next!==undefined);
 if(rt.changeTracking)__recordChange(rt,index,key,prior,next);
 if(slot===undefined){if(next===undefined)table.delete(key);else table.set(key,next);}
 else{
  // The checked preflight lookup retains the dense slot until this commit.
  // No callback or source write can intervene; sparse keys retain exact identity.
  if(slot<0){if(next===undefined)table.sparse.delete(key);else table.sparse.set(key,next);}else table.dense[slot]=next;
  if(prior===undefined&&next!==undefined)table.members.add(key);else if(prior!==undefined&&next===undefined)table.members.delete(key);
 }
}
function __commitDirect(rt,index,key,prior,next,slot){
 __storeDirect(rt,index,key,prior,next,slot);
 const publishOutputs=rt.meta.outputPublication&&!rt.observers.directRoots[index]&&rt.observers.active;
 if(publishOutputs&&++rt.changedOutputEpoch===4294967296){rt.changedOutputs.fill(0);rt.changedOutputEpoch=1;}

 for(const keep of rt.meta.keepInvalidations[index]){
  const value=rt.viewByKeep[keep]?rt.viewNext[keep]:undefined;
  if(publishOutputs)rt.changedOutputs[keep]=rt.keeps[keep]!==value?rt.changedOutputEpoch:0;
  rt.keeps[keep]=value;
 }
}
function __emit(rt,channel,value){
 if(rt.eventCount++===0){rt.eventChannel=channel;rt.eventValue=value;}
 else rt.staged.push([channel,value]);
}
// Checked prefix capacities are at most 2^20. Number conversion is exact
// inside that prefix; rounding a wide word cannot move it into the prefix.
// Wide keys retain their original full-width value in the sparse fallback.
class __DenseTable{
 constructor(capacity){this.limit=capacity;this.dense=[];for(let i=0;i<capacity;i++)this.dense.push(undefined);this.sparse=new Map();this.members=new Set();}
 clear(){this.dense.fill(undefined);this.sparse.clear();this.members.clear();__tableOrder.delete(this);return this;}
 slot(key){const i=Number(key);return Number.isInteger(i)&&i>=0&&i<this.limit?i:-1;}
 get size(){return this.members.size;}
 get(key){const i=this.slot(key);return i<0?this.sparse.get(key):this.dense[i];}
 has(key){return this.get(key)!==undefined;}
 set(key,value){const i=this.slot(key),present=i<0?this.sparse.has(key):this.dense[i]!==undefined;if(i<0)this.sparse.set(key,value);else this.dense[i]=value;if(!present)this.members.add(key);return this;}
 delete(key){const i=this.slot(key);if(i<0)this.sparse.delete(key);else this.dense[i]=undefined;return this.members.delete(key);}
 keys(){return this.members.keys();}
 *values(){for(const key of this.members)yield this.get(key);}
 *entries(){for(const key of this.members)yield [key,this.get(key)];}
 [Symbol.iterator](){return this.entries();}
}
class __ColumnTable {
 constructor(root){
  this.limit=root.columnPrefix.capacity;this.keyBig=root.key.kind==='u64';
  this.fields=root.value.fields;this.exactNumbers=root.columnPrefix.exactNumbers;
  this.present=new Uint8Array(this.limit);this.count=0;this.sparse=new Map();
  this.lanes=this.fields.map(f=>f.type.kind==='u64'?(this.exactNumbers?new Float64Array(this.limit):new BigUint64Array(this.limit)):f.type.kind==='i32'?new Int32Array(this.limit):f.type.kind==='bool'?new Uint8Array(this.limit):new Uint32Array(this.limit));
  this.wide=this.fields.map(f=>f.type.kind==='u64'&&this.exactNumbers?new Map():null);
 }
 slot(key){const i=Number(key);return Number.isInteger(i)&&i>=0&&i<this.limit?i:-1;}
 get size(){return this.count+this.sparse.size;}
 has(key){const i=this.slot(key);return i<0?this.sparse.has(key):this.present[i]!==0;}
 get(key){const i=this.slot(key);if(i<0)return this.sparse.get(key);if(!this.present[i])return undefined;const row=Object.create(null);for(let j=0;j<this.fields.length;j++){const f=this.fields[j],v=this.lanes[j][i];row[f.name]=f.type.kind==='bool'?v!==0:f.type.kind==='u64'&&this.exactNumbers?(this.wide[j].get(i)??BigInt(v)):v;}return row;}
 set(key,row){const i=this.slot(key);if(i<0){this.sparse.set(key,row);return this;}for(let j=0;j<this.fields.length;j++){const f=this.fields[j],v=row[f.name];if(f.type.kind==='u64'&&this.exactNumbers){if(v<=9007199254740991n){this.lanes[j][i]=Number(v);this.wide[j].delete(i);}else{this.lanes[j][i]=0;this.wide[j].set(i,v);}}else this.lanes[j][i]=f.type.kind==='bool'?Number(v):v;}if(!this.present[i]){this.present[i]=1;this.count++;}return this;}
 delete(key){const i=this.slot(key);if(i<0)return this.sparse.delete(key);if(!this.present[i])return false;this.present[i]=0;this.count--;for(const wide of this.wide)wide?.delete(i);return true;}
 *keys(){for(let i=0;i<this.limit;i++)if(this.present[i])yield this.keyBig?BigInt(i):i;yield* this.sparse.keys();}
 *values(){for(const key of this.keys())yield this.get(key);}
 *entries(){for(const key of this.keys())yield [key,this.get(key)];}
 [Symbol.iterator](){return this.entries();}
}
function __newTables(meta,prefixes,old,spares){return meta.roots.map((root,i)=>{const prior=spares?.[i];const t=root.columnPrefix?new __ColumnTable(root):prefixes[i]?(prior instanceof __DenseTable&&prior.limit===prefixes[i]?prior.clear():new __DenseTable(prefixes[i])):new Map();if(old)for(const [k,v]of old[i])t.set(k,v);return t;});}
// Only inactive containers are reused. Consume the spare before preparation so
// a failed invariant/rebuild cannot expose its partially reconstructed contents.
// Rows remain immutable; the current logical state changes only at installation.
function __restoreTables(rt,prefixes,old){const spares=rt.restoreSpares;rt.restoreSpares=null;return __newTables(rt.meta,prefixes,old,spares);}
function __cachedKeep(ctx,rt,index,compute){
 if(rt.cell&&rt.meta.keepInvalidations[rt.cell.index].includes(index)){
  const view=rt.viewByKeep[index];
  if(view)return __pendingView(rt,view);
  if(rt.pendingValues[index]===undefined){rt.pendingValues[index]=compute(ctx,rt);rt.pendingIndices.push(index);}
  return rt.pendingValues[index];
 }
 const prior=rt.keeps[index];if(prior!==undefined)return prior;
 const view=rt.viewByKeep[index];if(view)return __viewBase(rt,view);
 const value=compute(ctx,rt);rt.keeps[index]=value;return value;
}
function __tableContains(rt,index,key){return __cellGet(rt,index,key)!==undefined;}
function __tableGet(rt,index,key){const value=__cellGet(rt,index,key);return value===undefined?{None:null}:{Some:value};}
function __tablePut(rt,index,key,next,mode=0){
 const prior=rt.tables[index].get(key),present=prior!==undefined;
 if(mode===1&&present)throw Error('insert key already present');
 if(mode===2&&!present)throw Error('replace key absent');
 if(present&&__stateRootEquals[index](prior,next))return null;
 const updates=rt.cellMode?null:__updateViews(rt,index,key,prior,next);
 __invalidateKeeps(rt,index);__remember(rt,index,key,present,prior);
 __writeCell(rt,index,key,next,prior);__installViews(rt,updates,index);return null;
}
function __tableRemove(rt,index,key){
 const value=rt.tables[index].get(key);
 if(value===undefined)return {None:null};
 const updates=rt.cellMode?null:__updateViews(rt,index,key,value,undefined);
 __invalidateKeeps(rt,index);__remember(rt,index,key,true,value);
 __writeCell(rt,index,key,undefined,value);__installViews(rt,updates,index);return {Some:value};
}
function __table(rt,index,method,args){
 const key=args[0];
 if(method==='get')return __tableGet(rt,index,key);
 if(method==='contains')return __tableContains(rt,index,key);
 const table=rt.tables[index];
 if(method==='values'||method==='keys'){const keys=__orderedKeys(rt,index);return method==='keys'?keys.slice():keys.map(k=>__cellGet(rt,index,k));}
 if(method==='intersect_table'){const current=__readTable(rt,index),other=__readTable(rt,args[0]),small=current.size<=other.size?current:other,large=small===current?other:current;const result=[];for(const k of small.keys())if(large.has(k))result.push(k);return result.sort((a,b)=>__keyCompare(a,b,rt.meta.roots[index].key));}
 if(method==='intersect_keys'){const requested=args[0],size=rt.tables[index].size;
  // Fewer requested keys than rows: look each one up instead of scanning.
  if(requested.length<size){const type=rt.meta.roots[index].key;return [...new Set(requested)].filter(k=>__cellGet(rt,index,k)!==undefined).sort((a,b)=>__keyCompare(a,b,type));}
  const selected=new Set(requested);return __orderedKeys(rt,index).filter(k=>selected.has(k));}
 if(method==='put_many'){const keys=args[0],values=args[1];if(keys.length!==values.length)return {Err:'table bulk length mismatch'};for(let i=0;i<keys.length;i++)__table(rt,index,'put',[keys[i],values[i]]);return {Ok:null};}
 if(method==='remove_many'){for(const k of args[0])__table(rt,index,'remove',[k]);return null;}
 if(method==='remove')return __tableRemove(rt,index,key);
 return __tablePut(rt,index,key,args[1],method==='insert'?1:method==='replace'?2:0);
}

function __rollback(rt,mark){for(let i=rt.undo.length-1;i>=mark;i--){const [index,key,present,value]=rt.undo[i];const table=rt.tables[index];__invalidateSnapshotRow(rt,index,key);if(table.has(key)!==present)__tableMembership(rt,index,key,present);if(present)table.set(key,value);else table.delete(key);}rt.undo.length=mark;}
function __recordChange(rt,index,key,prior,next){rt.changeLog.push([index,key,prior,next]);}
function __fixedTableBytes(root,table){
 const writer=__snapshotWriter(__snapshotLimits());
 const rows=[...table.entries()].sort((a,b)=>__keyCompare(a[0],b[0],root.key));
 writer.integer(rows.length,8);
 for(const [key,value]of rows){writer.value(key,root.snapshotKey??root.key);writer.value(value,root.snapshotValue??root.value);}
 return writer.finish();
}
function __createState(meta,implementations,captures=null,views=[],prefixes=[]){
 const rt={meta,tables:__newTables(meta,prefixes),version:meta.compactCommits?0:0n,outbox:__eventLog(meta),staged:[],busy:false,undo:[],seen:meta.roots.map(()=>new Set()),host:null,keeps:new Array(meta.keeps.length),keepDirty:meta.keeps.length?new Uint8Array(meta.keeps.length):null,keepUndoIndices:meta.keeps.length?new Uint32Array(meta.keeps.length):null,keepUndoCount:0};
 const fixed=typeof __stateFrozenFactories==='undefined'?[]:__stateFrozenFactories;
 const fixedBytes=[];
 for(let i=0;i<fixed.length;i++)if(fixed[i]){for(const [key,value]of fixed[i]())rt.tables[i].set(key,value);fixedBytes[i]=__fixedTableBytes(meta.roots[i],rt.tables[i]);}
 function checkFixed(tables){for(let i=0;i<fixedBytes.length;i++)if(fixedBytes[i]){const bytes=__fixedTableBytes(meta.roots[i],tables[i]);if(bytes.length!==fixedBytes[i].length||!bytes.every((v,n)=>v===fixedBytes[i][n]))throw Error('snapshot changes frozen state: '+meta.roots[i].name);}}
 rt.views=views;rt.viewsByRoot=meta.roots.map((_,root)=>views.filter(v=>v.root===root));__rebuildViews(rt);
 rt.viewByKeep=new Array(meta.keeps.length);for(const view of views)rt.viewByKeep[view.keep]=view;
 rt.pendingIndices=[];rt.pendingValues=new Array(meta.keeps.length);
 rt.eventCount=0;rt.eventChannel=null;rt.eventValue=null;
 rt.viewNext=new Array(meta.keeps.length);rt.cell=null;rt.cellMode=false;rt.ctx={fuel:100000000};
 rt.keepBefore=meta.keeps.length?new Array(meta.keeps.length):null;
 rt.changedRoots=new Set();rt.changedOutputs=new Array(meta.keeps.length).fill(0);rt.changedOutputEpoch=0;
 rt.snapshotRows=meta.snapshotRows?meta.roots.map(()=>new Map()):null;
 rt.restoreSpares=null;rt.changeTracking=false;rt.changeLog=[];rt.changeEpoch=0;rt.changeTokens=new Map();
 const actionMap=new Map(meta.actions.map(a=>[a.name,{...a,inputs:captures?captures[a.index]:a.params.map(p=>__stateCapture(p.type)),output:__stateResult(a.result)}]));
 const eventOutput=new Map(meta.events.map(e=>[e.name,__stateResult(e.type)]));
 rt.eventOutput=eventOutput;
 const prepared=new WeakMap();
 const observers=rt.observers=__createObservers((name,args)=>{
  const a=actionMap.get(name);if(!a||a.change)throw Error('subscription requires a readonly query');
  const captured=a.inputs.map((convert,i)=>convert(args[i]));
  const publicArgs=captured.map((v,i)=>__stateResult(a.params[i].type)(v));
  const scalar=['u64','u32','i32','bool','string','unit','enum','id'].includes(a.result.kind);
  return {scalar,committed:scalar&&a.directKeep!==null&&a.directKeep!==undefined?{state:rt,keep:a.directKeep}:null,direct:scalar&&a.directKeep!==null&&a.directKeep!==undefined?()=>rt.keeps[a.directKeep]:null,roots:a.roots,outputs:rt.meta.outputPublication&&a.directKeep!==null&&a.directKeep!==undefined?[a.directKeep]:[],read:!a.precondition&&a.params.length===0?readZero(a,true):()=>run(a,publicArgs,null,null,true),capture:scalar?v=>v:__stateCapture(a.result),output:scalar?v=>v:a.output,equal:__stateQueryEquals[a.index]};
 });
 function invoke(name,args){const a=actionMap.get(name);if(!a)throw Error(`unknown action ${name}`);return run(a,args);}
 function readZero(a,resultOnly){
  const implementation=implementations[a.index],output=a.output,fresh=a.freshResult;
  if(resultOnly&&fresh&&__stateDirectReadFactories[a.index])return __stateDirectReadFactories[a.index](rt);
  if(a.directKeep!==null&&a.directKeep!==undefined)return ()=>{
   if(rt.busy)throw Error('state operation already in progress');
   const value=rt.keeps[a.directKeep],result=fresh?value:output(value);
   return resultOnly?result:{result,committed:false,version:__versionWord(rt.version),events:[]};
  };
  return ()=>{
   if(rt.busy)throw Error('state operation already in progress');rt.busy=true;rt.ctx.fuel=100000000;
   try{const value=implementation(rt.ctx,rt),result=fresh?value:output(value);return resultOnly?result:{result,committed:false,version:__versionWord(rt.version),events:[]};}
   finally{rt.busy=false;}
  };
 }
 function read(a,args,inputs,output,resultOnly,owned=false){
  if(rt.busy)throw Error('state operation already in progress');
  const captured=owned?args:(inputs||a.inputs).map((convert,i)=>convert(args[i]));
  const ctx=rt.ctx;ctx.fuel=100000000;
  if(a.precondition && implementations[actionMap.get(a.precondition).index](ctx,rt,...captured)!==true)throw Error('contract precondition failed');
  rt.busy=true;
  try{const value=implementations[a.index](ctx,rt,...captured),result=a.freshResult?value:(output||a.output)(value);return resultOnly?result:{result,committed:false,version:__versionWord(rt.version),events:[]};}
  finally{rt.busy=false;}
 }
 function begin(a){
  if(rt.busy)throw Error('state operation already in progress');
  rt.ctx.fuel=100000000;
  rt.actionMark=rt.undo.length;rt.actionVersion=rt.version;rt.actionOutbox=rt.outbox;rt.actionOutboxLength=rt.outbox.length;rt.actionChangeMark=rt.changeLog.length;
  rt.busy=true;rt.cellMode=a.singleCell&&!rt.host;rt.staged.length=0;rt.eventCount=0;rt.changedRoots.clear();rt.actionSuccessful=false;
 }
 function complete(a,value,output,resultOnly){
  const result=a.freshResult?value:(output||a.output)(value);
  const version=rt.actionVersion;
  if(a.fallible && (a.flatFailure?value.tag!==0:Object.hasOwn(value,'Err'))){rt.changeLog.length=rt.actionChangeMark;__rollback(rt,rt.actionMark);__restoreKeeps(rt);if(rt.host?.strict)rt.host.failure=Object.assign(Error('transaction action failed'),{action:a.name,result});return resultOnly?result:{result,committed:false,version:__versionWord(version),events:[]};}
  if(version===18446744073709551615n)throw Error('commit sequence exhausted');
  const next=rt.meta.compactCommits?__nextCommit(version):version+1n;
  const publicNext=resultOnly?null:__versionWord(next);
  __prepareCell(rt);
  const events=resultOnly?null:new Array(rt.eventCount);
  if(rt.eventCount){
   const channel=rt.eventChannel,value=rt.eventValue;
   rt.outbox.push({commit:next,position:0n,channel,value});
   if(events)events[0]={commit:publicNext,position:0n,channel,value:eventOutput.get(channel)(value)};
   for(let i=0;i<rt.staged.length;i++){
    const [channel,value]=rt.staged[i],position=BigInt(i+1);
    rt.outbox.push({commit:next,position,channel,value});
    if(events)events[i+1]={commit:publicNext,position,channel,value:eventOutput.get(channel)(value)};
   }
  }
  __commitCell(rt);rt.version=next;rt.actionSuccessful=true;
  return resultOnly?result:{result,committed:true,version:publicNext,events};
 }
 function abort(e){
  rt.changeLog.length=rt.actionChangeMark;__rollback(rt,rt.actionMark);__restoreKeeps(rt);rt.version=rt.actionVersion;rt.outbox=rt.actionOutbox;rt.outbox.length=rt.actionOutboxLength;if(rt.host?.strict)rt.host.failure=e;throw e;
 }
 function end(){
  const successful=rt.actionSuccessful,single=rt.cellMode;
  rt.cell=null;rt.cellMode=false;rt.staged.length=0;rt.eventCount=0;rt.eventChannel=null;rt.eventValue=null;
  for(const keep of rt.pendingIndices)rt.pendingValues[keep]=undefined;rt.pendingIndices.length=0;
  if(!single){__clearKeepJournal(rt);for(const seen of rt.seen)seen.clear();if(!rt.host)rt.undo.length=0;}
  rt.actionOutbox=null;rt.busy=false;
  if(successful)observers.commit(rt.changedRoots);
 }
 function run(a,args,inputs=null,output=null,resultOnly=false,owned=false){
  if(a.kernels&&!rt.host){
   if(rt.busy)throw Error('state operation already in progress');
   const captured=owned?args:(inputs||a.inputs).map((convert,i)=>convert(args[i]));
   return a.kernels[resultOnly?1:0](...captured);
  }
  if(!a.change)return read(a,args,inputs,output,resultOnly,owned);
  if(rt.busy)throw Error('state operation already in progress');
  const captured=owned?args:(inputs||a.inputs).map((convert,i)=>convert(args[i]));
  const ctx=rt.ctx;ctx.fuel=100000000;
  if(a.precondition && implementations[actionMap.get(a.precondition).index](ctx,rt,...captured)!==true)throw Error('contract precondition failed');
  begin(a);
  try{return complete(a,implementations[a.index](ctx,rt,...captured),output,resultOnly);}
  catch(e){return abort(e);}
  finally{end();}
 }

 for(const a of actionMap.values())if(__statePreflightFactories[a.index]){
  // run() supplies module-owned captured values; bound native entries still capture composites.
  a.kernels=[false,true].map(only=>__statePreflightFactories[a.index](run,a,a.inputs,a.output,only,rt,begin,complete,abort,end,true));
 }
 return Object.freeze({
  subscribeValues(queries,callback,options){if(rt.busy||rt.host)throw Error('subscription requires transaction boundary');return observers.subscribeValues(queries,callback,options);},
  subscribeGroup(queries,callback,options){if(rt.busy||rt.host)throw Error('subscription requires transaction boundary');return observers.subscribeGroup(queries,callback,options);},
  subscribe(...args){if(rt.busy||rt.host)throw Error('subscription requires transaction boundary');return observers.subscribe(...args);},
  batch:observers.batch,flushSubscriptions:observers.flush,takeSubscriptionErrors:observers.takeErrors,
  transaction(callback){
   if(typeof callback!=='function'||Object.prototype.toString.call(callback)==='[object AsyncFunction]')throw TypeError('transaction callback must be synchronous');this.beginTransaction();rt.host.strict=true;
   try{const value=callback(this);if(value&&typeof value.then==='function')throw TypeError('state transaction callback must be synchronous');this.commitTransaction();return value;}catch(e){this.rollbackTransaction();throw e;}
  },
  invoke,invoke_json:invoke,
  prepare(name,args){const a=actionMap.get(name);if(!a)throw Error(`unknown action ${name}`);const captured=a.inputs.map((convert,i)=>convert(args[i])),token=Object.freeze({});prepared.set(token,{action:a,args:captured});return token;},
  invokePrepared(token){const packet=prepared.get(token);if(!packet)throw Error('invalid prepared state call');return run(packet.action,packet.args,null,null,false,true);},
  // A prebound typed entrypoint: scalar arguments obey the native caller contract.
  // Composite arguments still capture owned input; events remain in the outbox.
  bind(name,{resultOnly=false}={}){
   const a=actionMap.get(name);if(!a)throw Error(`unknown action ${name}`);
   const inputs=a.params.map((p,i)=>['u32','i32','u64','bool','unit','string','f32','f64','id','enum','int'].includes(p.type.kind)?__representation(p.type,false):a.inputs[i]);
   if(!a.change&&!a.precondition&&inputs.length===0)return readZero(a,resultOnly);
   return (__statePreflightFactories[a.index]||__stateBoundFactories[a.index])(run,a,inputs,a.output,resultOnly,rt,begin,complete,abort,end);
  },
  beginTransaction(){if(rt.busy||rt.host||rt.undo.length)throw Error('transaction already in progress');rt.host={version:rt.version,outbox:rt.outbox,length:rt.outbox.length,keeps:rt.keeps.slice(),changeMark:rt.changeLog.length,notificationMark:observers.hold()};return true;},
  commitTransaction(){if(rt.busy||!rt.host)throw Error('no state transaction');if(rt.host.failure)throw rt.host.failure;rt.host=null;rt.undo.length=0;observers.release();},
  rollbackTransaction(){if(rt.busy||!rt.host)throw Error('no state transaction');__rollback(rt,0);rt.version=rt.host.version;rt.outbox=rt.host.outbox;rt.outbox.length=rt.host.length;rt.keeps=rt.host.keeps;__refreshActiveViews(rt);rt.changeLog.length=rt.host.changeMark;rt.changeEpoch++;const mark=rt.host.notificationMark;rt.host=null;observers.rollback(mark);},
  changeToken(){
   if(rt.busy||rt.host)throw Error('change token requires transaction boundary');
   const token=Object.freeze({});rt.changeTracking=true;rt.changeTokens.set(token,{epoch:rt.changeEpoch,index:rt.changeLog.length,version:__versionWord(rt.version)});return token;
  },
  releaseChangeToken(token){rt.changeTokens.delete(token);if(!rt.changeTokens.size){rt.changeTracking=false;rt.changeLog.length=0;}},
  changesSince(token){
   if(rt.busy||rt.host)throw Error('changes require transaction boundary');
   const mark=rt.changeTokens.get(token);if(!mark||mark.epoch!==rt.changeEpoch)throw Error('invalid change token lineage');
   const roots=new Map();
   for(let i=mark.index;i<rt.changeLog.length;i++){
    const [root,key,before,after]=rt.changeLog[i];let cells=roots.get(root);if(!cells)roots.set(root,cells=new Map());
    const prior=cells.get(key);if(prior)prior.after=after;else cells.set(key,{before,after});
   }
   const changes=[];
   const codecs=rt.changeOutputs??=meta.roots.map(schema=>({key:__stateResult(schema.key),row:__stateResult(schema.value)}));
   for(const [root,cells]of roots){const schema=meta.roots[root],keyOut=codecs[root].key,rowOut=codecs[root].row;
    for(const [key,{before,after}]of cells){if(before===undefined&&after===undefined||before!==undefined&&after!==undefined&&__stateRootEquals[root](before,after))continue;
     changes.push({table:schema.name,key:keyOut(key),before:before===undefined?{None:null}:{Some:rowOut(before)},after:after===undefined?{None:null}:{Some:rowOut(after)}});
    }
   }
   return {from:mark.version,to:__versionWord(rt.version),changes};
  },
  get version(){return __versionWord(rt.version);},
  get outbox(){return rt.outbox.map(e=>({...e,commit:__versionWord(e.commit),value:eventOutput.get(e.channel)(e.value)}));},
  acknowledgeThrough(commit,position){if(rt.busy)throw Error('state operation already in progress');commit=__stateWord(commit);position=__stateWord(position);const last=rt.outbox.at(-1);if(!last)return;const lastCommit=__versionWord(last.commit);if(lastCommit<commit||(lastCommit===commit&&last.position<=position)){if(rt.host)rt.outbox=__eventLog(meta);else rt.outbox.length=0;return;}rt.outbox=rt.outbox.filter(e=>{const c=__versionWord(e.commit);return c>commit||(c===commit&&e.position>position);});},
  async invokeAsync(name,args){
   if(typeof __parallelInvokeAsync!=='function')return invoke(name,args);
   if(rt.busy||rt.host)throw Error('parallel state call requires transaction boundary');const captured=structuredClone(args);rt.busy=true;observers.hold();let completed=false;
   try{const snapshot=await __snapshotEncode(meta,rt);const reply=await __parallelInvokeAsync(name,captured,snapshot);const s=await __snapshotDecode(meta,reply.snapshot);checkFixed(s.tables);const candidate={...rt,tables:__restoreTables(rt,prefixes,s.tables),keeps:rt.keeps.map(()=>undefined)};__rebuildViews(candidate);const previousTables=rt.tables;rt.tables=candidate.tables;rt.restoreSpares=previousTables.map(table=>table instanceof __DenseTable?table:null);rt.version=__storedCommit(meta,s.version);rt.outbox=__eventLog(meta,s.outbox);rt.keeps=candidate.keeps;rt.activeViewRoots=candidate.activeViewRoots;if(rt.snapshotRows)rt.snapshotRows=meta.roots.map(()=>new Map());rt.changeEpoch++;rt.changeLog.length=0;completed=true;return reply.value;}finally{rt.busy=false;if(completed)observers.commit(meta.roots.map((_,i)=>i));observers.release();}
  },
  checkpoint(limits){if(rt.busy)throw Error('checkpoint requires transaction boundary');return __snapshotEncode(meta,rt,limits);},
  async restore(bytes,limits){if(rt.host)throw Error('restore during transaction');if(rt.busy)throw Error('restore requires transaction boundary');rt.busy=true;rt.ctx.fuel=100000000;observers.hold();let restored=false;try{const s=await __snapshotDecode(meta,bytes,limits);checkFixed(s.tables);const candidate={...rt,tables:__restoreTables(rt,prefixes,s.tables),version:__storedCommit(meta,s.version),outbox:s.outbox,keeps:rt.keeps.map(()=>undefined)};__rebuildViews(candidate);for(const name of meta.invariantChecks||[]){const a=actionMap.get(name);if(implementations[a.index](rt.ctx,candidate)!==true)throw Error('snapshot violates state invariant');}const previousTables=rt.tables;rt.tables=candidate.tables;rt.restoreSpares=previousTables.map(table=>table instanceof __DenseTable?table:null);rt.version=__storedCommit(meta,s.version);rt.outbox=__eventLog(meta,s.outbox);rt.keeps=candidate.keeps;rt.activeViewRoots=candidate.activeViewRoots;if(rt.snapshotRows)rt.snapshotRows=meta.roots.map(()=>new Map());rt.changeEpoch++;rt.changeLog.length=0;restored=true;}finally{rt.busy=false;if(restored)observers.commit(meta.roots.map((_,i)=>i));observers.release();}},
 });
}
