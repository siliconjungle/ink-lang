// Experimental boundary adapter. No compiler rule or default uses it.
// Native parsing is eligible only when native re-encoding equals every input
// character. Otherwise the existing exact-token parser handles the input.
const parse=JSON.parse,stringify=JSON.stringify,encoder=new TextEncoder();
const paths=Object.freeze(Array.from({length:6},(_,i)=>Object.freeze([0,...Array(i).fill(1),...(i<5?[0]:[]),0])));
export function parseCanonical(json,codec,text,options={}){
 const fallback=()=>json.parseCompiled(codec,text,options);
 const limits={bytes:16777216,nodes:1000000,depth:128,...options};
 for(const key of ['bytes','nodes','depth'])if(!Number.isSafeInteger(limits[key])||limits[key]<0||limits[key]>{bytes:16777216,nodes:1000000,depth:128}[key])return fallback();
 if(codec.identity!==json.values.descriptor.identity||typeof text!=='string'||!text.isWellFormed()||text.length>limits.bytes||encoder.encode(text).length>limits.bytes)return fallback();
 // Native parsed objects inherit these prototypes. A host-installed serializer
 // could otherwise make textual equality describe its replacement value.
 if('toJSON' in Object.prototype||'toJSON' in Array.prototype)return fallback();
 let value;
 try{value=parse(text);if(stringify(value)!==text)return fallback();}catch{return fallback();}
 const builder=codec.builder(options);let remaining=limits.nodes;
 const begin=i=>builder.openPath(paths[i]);
 const end=()=>builder.close();
 const visit=(value,depth)=>{
  if(depth>limits.depth||--remaining<0)throw Error('JSON node or depth limit');
  if(value===null){builder.emptyPath(paths[0]);return;}
  if(typeof value==='boolean'){builder.scalarPath(paths[1],value);return;}
  if(typeof value==='number'){builder.scalarPath(paths[2],String(value));return;}
  if(typeof value==='string'){builder.scalarPath(paths[3],value);return;}
  if(Array.isArray(value)){
   begin(4);builder.open(0);for(const item of value)visit(item,depth+1);builder.close();end();return;
  }
  begin(5);builder.open(0);
  for(const key of Object.keys(value)){
   builder.open(0);builder.scalar(key);visit(value[key],depth+1);builder.close();
  }
  builder.close();end();
 };
 try{visit(value,0);return builder.finish();}catch{builder.abort();return fallback();}
}
