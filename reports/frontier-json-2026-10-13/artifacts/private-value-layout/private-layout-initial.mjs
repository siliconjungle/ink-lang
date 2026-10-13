// Experimental private carrier. Stable, well-typed canonical source inputs only.
// This is a layout probe, not compiler admission or a public logical-value API.
export function privateLayout(codec,makeBudget,{tagged=false,flatRows=false}={}){
 const plans=new Map(),float=new DataView(new ArrayBuffer(4));
 const key=t=>JSON.stringify(codec.resolve(t));
 const enter=(r,d,n=4)=>r.enter(d,n);
 const arrayCarrier=(input,seen=new Set())=>{const t=codec.resolve(input),id=key(t);if(seen.has(id))return false;seen.add(id);return ['list','vector'].includes(t.kind)||t.kind==='record'&&(t.fields.length>1||t.fields.length===1&&arrayCarrier(t.fields[0].type,seen));};
 const tree=(input,seen)=>{
  const t=codec.resolve(input),id=key(t);
  if(seen.has(id))return {kind:'leaf',plan:build(t),size:1};
  const next=new Set(seen);next.add(id);
  if(t.kind==='record'&&t.fields.length===1){const child=tree(t.fields[0].type,next);return {kind:'alias',name:t.fields[0].name,child,size:child.size};}
  if(t.kind==='result'){const yes=tree(t.ok,next),no=tree(t.error,next);return {kind:'result',yes,no,size:yes.size+no.size};}
  if(t.kind==='option'){const yes=tree(t.element,next);return {kind:'option',yes,size:1+yes.size};}
  return {kind:'leaf',plan:build(t),size:1};
 };
 function build(input){
  const t=codec.resolve(input),id=key(t);if(plans.has(id))return plans.get(id);
  if(plans.size>=4096)throw Error('private layout schema limit');
  const p={type:t,pack:null,unpack:null};plans.set(id,p);
  if(t.kind==='record'&&t.fields.length!==1){
   const fields=t.fields.map(f=>({name:f.name,p:build(f.type)}));
   p.pack=(v,r,d)=>{enter(r,d);return fields.length?fields.map(f=>f.p.pack(v[f.name],r,d+1)):null;};
   p.unpack=(v,r,d)=>{enter(r,d);const out={};fields.forEach((f,i)=>Object.defineProperty(out,f.name,{value:f.p.unpack(v[i],r,d+1),enumerable:true,writable:true,configurable:true}));return out;};
  }else if(t.kind==='list'||t.kind==='vector'){
   const child=build(t.element),fs=codec.resolve(t.element).fields;
   const width=flatRows&&codec.resolve(t.element).kind==='record'&&fs.length>1?fs.length:1;
   p.pack=(v,r,d)=>{enter(r,d,8);if(v.length>r.remaining)throw Error('wire sequence size');const out=new Array(v.length*width);for(let i=0;i<v.length;i++){const x=child.pack(v[i],r,d+1);if(width===1)out[i]=x;else for(let j=0;j<width;j++)out[i*width+j]=x[j];}return out;};
   p.unpack=(v,r,d)=>{enter(r,d,8);const n=v.length/width;if(!Number.isInteger(n)||n>r.remaining)throw Error('wire sequence size');const out=new Array(n);for(let i=0;i<n;i++)out[i]=child.unpack(width===1?v[i]:v.slice(i*width,(i+1)*width),r,d+1);return out;};
  }else if(['record','option','result'].includes(t.kind)){
   const root=tree(t,new Set()),leaves=[];
   const enumerate=n=>{if(n.kind==='alias')enumerate(n.child);else if(n.kind==='result'){enumerate(n.yes);enumerate(n.no);}else if(n.kind==='option'){leaves.push(null);enumerate(n.yes);}else leaves.push(n.plan);};enumerate(root);
   if(leaves.length>4096)throw Error('private constructor count limit');
   const markerMap=new Map(),markers=leaves.map((leaf,i)=>{
    if(!tagged||leaf&&!(leaf.type.kind==='unit'||leaf.type.kind==='record'&&leaf.type.fields.length===0||leaf.type.kind==='bool'))return null;
    const vals=leaf?.type.kind==='bool'?[false,true]:[null];return vals.map(v=>{const s=Symbol();markerMap.set(s,[i,v]);return s;});
   });
   const box=(i,v)=>{
    if(!tagged)return [i,v];
    if(markers[i])return markers[i][leaves[i]?.type.kind==='bool'&&v?1:0];
    const kind=leaves[i].type.kind;
    if(['string','id','enum'].includes(kind))return String.fromCharCode(i)+v;
    if(arrayCarrier(leaves[i].type)){v.unshift(i);return v;} // Leaf capture owns this array.
    return [i,v];
   };
   const unbox=v=>{
    if(!tagged)return v;
    if(markerMap.has(v))return markerMap.get(v);
    if(typeof v==='string')return [v.charCodeAt(0),v.slice(1)];
    if(!Array.isArray(v))throw Error('private constructor carrier');
    const i=v[0],kind=leaves[i]?.type.kind;
    return [i,leaves[i]&&arrayCarrier(leaves[i].type)?v.slice(1):v[1]];
   };
   const packTree=(n,v,r,d,base,boxed)=>{
    if(n.kind==='alias'){enter(r,d);return packTree(n.child,v[n.name],r,d+1,base,boxed);}
    if(n.kind==='result'){enter(r,d,5);return Object.hasOwn(v,'Ok')?packTree(n.yes,v.Ok,r,d+1,base,boxed):packTree(n.no,v.Err,r,d+1,base+n.yes.size,boxed);}
    if(n.kind==='option'){enter(r,d,5);return Object.hasOwn(v,'None')?box(base,null):packTree(n.yes,v.Some,r,d+1,base+1,boxed);}
    const item=n.plan.pack(v,r,d);return boxed?box(base,item):item;
   };
   const unpackTree=(n,v,i,r,d)=>{
    if(n.kind==='alias'){enter(r,d);return {[n.name]:unpackTree(n.child,v,i,r,d+1)};}
    if(n.kind==='result'){enter(r,d,5);return i<n.yes.size?{Ok:unpackTree(n.yes,v,i,r,d+1)}:{Err:unpackTree(n.no,v,i-n.yes.size,r,d+1)};}
    if(n.kind==='option'){enter(r,d,5);return i===0?{None:null}:{Some:unpackTree(n.yes,v,i-1,r,d+1)};}
    return n.plan.unpack(v,r,d);
   };
   p.pack=(v,r,d)=>packTree(root,v,r,d,0,root.size>1);
   p.unpack=(v,r,d)=>{const [i,payload]=root.size>1?unbox(v):[0,v];return unpackTree(root,payload,i,r,d);};
  }else{
   const sizes={unit:4,bool:5,u32:8,i32:8,u64:12,f32:8,string:4,id:4,enum:4,int:4};
   if(!(t.kind in sizes))throw Error('unsupported private scalar');
   p.pack=(v,r,d)=>{enter(r,d,sizes[t.kind]);if(['string','id','enum'].includes(t.kind)){r.text(v);return v;}if(t.kind==='int'){const text=typeof v==='bigint'?String(v):v.Int;r.text(text);return BigInt(text);}if(t.kind==='f32'){if(typeof v==='number'){float.setFloat32(0,v,true);return float.getUint32(0,true);}return v.F32Bits;}return v;};
   p.unpack=(v,r,d)=>{enter(r,d,sizes[t.kind]);if(['string','id','enum'].includes(t.kind)){r.text(v);return v;}if(t.kind==='int'){const text=String(v);r.text(text);return {Int:text};}if(t.kind==='f32')return {F32Bits:v};return v;};
  }
  return p;
 }
 const root=build(codec.descriptor.root);
 return {pack:(v,options)=>root.pack(v,makeBudget(options),0),unpack:(v,options)=>root.unpack(v,makeBudget(options),0),plans:plans.size};
}
