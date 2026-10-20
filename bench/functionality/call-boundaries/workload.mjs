import {equal} from '../../../tools/engine-gate/worker.mjs';
const f=Math.fround;
const numbers=n=>Array.from({length:n},(_,i)=>f((i-17)/32));
const bodies=n=>Array.from({length:n},(_,i)=>({x:f(i/8),y:f(-i/16),vx:f((i%7-3)/4),vy:f((i%5-2)/8)}));
const move=(bs,dt)=>bs.map(b=>({x:f(b.x+f(b.vx*dt)),y:f(b.y+f(b.vy*dt)),vx:b.vx,vy:b.vy}));
const view=new DataView(new ArrayBuffer(4));
function publicValue(v){
 if(v&&typeof v==='object'){
  if(Object.hasOwn(v,'F32Bits')){view.setUint32(0,v.F32Bits,true);const n=view.getFloat32(0,true);return Number.isFinite(n)?n:v;}
  if(Array.isArray(v))return v.map(publicValue);
  return Object.fromEntries(Object.entries(v).map(([k,v])=>[k,publicValue(v)]));
 }
 return v;
}
function prepared(m,name,args,bound=[0]){
 const c=m.compiledValues[name],handles=args.map((v,i)=>c.params[i].capture(v));
 return {c,token:m.prepareCompiled(name,bound.map(i=>[i,handles[i]])),args:handles.filter((_,i)=>!bound.includes(i))};
}
function into(m,p,out){
 if(m.callPreparedCompiledInto){const n=m.callPreparedCompiledInto(p.token,p.args,out);return {count:n,output:out};}
 const value=p.c.result.materialize(m.callPreparedCompiled(p.token,p.args));
 for(let i=0;i<value.length;i++)out[i]=publicValue(value[i]);
 return {count:value.length,output:out};
}
export const cases=[
 {name:'scalar-f32',lifetime:'complete public scalar call; no preparation',create:m=>()=>m.functions.scalar(.75,-.25)},
 {name:'scalar-owned-f32',lifetime:'complete owned scalar call including input array and bounded canonical output',create:m=>()=>m.callOwned('scalar',[.75,-.25])},
 ...[8,100].flatMap(n=>[
  {name:'shift-public-'+n,lifetime:'complete public list call; borrowed inputs and owned output',create:m=>{const xs=numbers(n);return()=>m.functions.shift(xs,.25);}},
  {name:'shift-into-'+n,lifetime:'complete public destination call; caller storage reused',create:m=>{const xs=numbers(n),out=new Float32Array(n);return()=>({count:m.functionsInto.shift(xs,.25,out),output:out});}},
  {name:'move-public-'+n,lifetime:'complete public record-map call; borrowed inputs and owned output',create:m=>{const bs=bodies(n);return()=>m.functions.move(bs,.125);}},
  {name:'shift-prepared-'+n,lifetime:'sealed captures and preparation outside timing; complete invocation and destination write; previous API materializes',create:m=>{const p=prepared(m,'shift',[numbers(n),.25]),out=new Float32Array(n);return()=>into(m,p,out);}},
  {name:'move-prepared-'+n,lifetime:'sealed captures and preparation outside timing; detached record elements written to reused array; previous API materializes',create:m=>{const p=prepared(m,'move',[bodies(n),.125]),out=new Array(n);return()=>into(m,p,out);}},
 ]),
 {name:'indexed-prepared-100',lifetime:'sealed stable keys and residual index reused; complete invocation and destination write',create:m=>{const p=prepared(m,'indexed',[Array.from({length:64},(_,i)=>i*3),Array.from({length:100},(_,i)=>i)]),out=new Array(100);return()=>into(m,p,out);}},
 {name:'shift-prepare-call-8',lifetime:'capture, prepare, invoke and destination write all timed',create:m=>{const xs=numbers(8),out=new Float32Array(8);return()=>into(m,prepared(m,'shift',[xs,.25]),out);}},
];
export function verify(m){
 let independentChecks=0;
 for(const n of [0,1,8,100]){
  const xs=numbers(n),bs=bodies(n),shift=xs.map(x=>f(x+.25)),movement=move(bs,.125);
  equal(m.functions.shift(xs,.25),shift);equal(m.functions.move(bs,.125),movement);independentChecks+=2;
  for(const [name,args,expected] of [['shift',[xs,.25],shift],['move',[bs,.125],movement]]){
   const p=prepared(m,name,args),out=new Array(n+2).fill('tail');
   for(let i=0;i<3;i++){const r=into(m,p,out);equal(r.count,n);equal(r.output.slice(0,n),expected);equal(r.output.slice(n),['tail','tail']);independentChecks++;}
  }
 }
 equal(m.functions.scalar(.75,-.25),f(f(.75*-.25)+.75));equal(m.callOwned('scalar',[.75,-.25]),{F32Bits:0x3f100000});independentChecks+=2;
 const p=prepared(m,'indexed',[[1,2,7],[0,1,7,9]]),out=new Array(4);equal(into(m,p,out),{count:4,output:[false,true,true,false]});independentChecks++;
 const raw=[{x:0,y:-0,vx:{F32Bits:0x7f812345},vy:1}];
 const rawExpected=[{x:{F32Bits:0x7fc00000},y:0,vx:{F32Bits:0x7f812345},vy:1}];
 equal(m.functions.move(raw,0),rawExpected);independentChecks++;
 const rp=prepared(m,'move',[raw,0]),ro=new Array(1);equal(into(m,rp,ro),{count:1,output:rawExpected});independentChecks++;
 const dynamic=prepared(m,'shift',[[1,-0,3],0]),dc=m.compiledValues.shift;
 for(const amount of [-.25,.5,-2]){dynamic.args=[dc.params[1].capture(amount)];const output=new Float32Array(3);equal(into(m,dynamic,output),{count:3,output:[1,-0,3].map(x=>f(x+amount))});independentChecks++;}
 return {independentChecks};
}
