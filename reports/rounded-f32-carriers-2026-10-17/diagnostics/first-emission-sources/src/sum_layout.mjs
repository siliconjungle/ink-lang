// Private tag/payload cells implement fixed, checked sum codec meanings.
// Helpers never accept public values and never choose a representation.
function __sumKey(type){
 const k=type.kind;
 if(k==='ref'||k==='record'&&typeof type.name==='string')return JSON.stringify(['named',type.name]);
 const tree=t=>JSON.parse(__sumKey(t));
 switch(k){
  case 'list':case 'vector':case 'option':return JSON.stringify([k,type.size??null,tree(type.element)]);
  case 'result':return JSON.stringify([k,tree(type.ok),tree(type.error)]);
  case 'record':return JSON.stringify([k,type.fields.map(f=>[f.name,tree(f.type)])]);
  case 'enum':return JSON.stringify([k,type.variants]);
  default:return JSON.stringify([k]);
 }
}
const __sumNodes=new Map();
function __sumNode(type){
 const key=__sumKey(type);let node=__sumNodes.get(key);if(node)return node;
 node={selected:__sumSpecs.has(key),result:type.kind==='result',error:null};__sumNodes.set(key,node);
 if(node.result)node.error=__sumNode(type.error);return node;
}
const __sumRoots=new Map([...__sumSpecs].map(([key,type])=>[key,__sumNode(type)]));
function __sumMake(key,ok,value){
 const node=__sumRoots.get(key);if(!node)return ok?{Ok:value}:{Err:value};
 if(ok)return {tag:0,payload:value};
 const original=value;
 let tail=node.error,index=1;
 while(tail.result){
  if(tail.selected)return {tag:index+value.tag,payload:value.payload,tail:original};
  if(Object.hasOwn(value,'Ok'))return {tag:index,payload:value.Ok,tail:original};
  value=value.Err;tail=tail.error;index++;
 }
 return {tag:index,payload:value,tail:original};
}
function __sumRestore(node,index,payload){
 if(!node.result)return payload;
 if(node.selected)return {tag:index,payload};
 return index===0?{Ok:payload}:{Err:__sumRestore(node.error,index-1,payload)};
}
const __sumViews=new WeakMap();
function __sumView(key,value){
 const node=__sumRoots.get(key);if(!node)return value;
 let views=__sumViews.get(value);if(!views){views=new Map();__sumViews.set(value,views);}
 if(views.has(key))return views.get(key);
 const view=value.tag===0?{Ok:value.payload}:{Err:Object.hasOwn(value,'tail')?value.tail:__sumRestore(node.error,value.tag-1,value.payload)};
 views.set(key,view);return view;
}
