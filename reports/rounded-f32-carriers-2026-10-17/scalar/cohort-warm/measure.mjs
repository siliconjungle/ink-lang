import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {performance} from 'node:perf_hooks';
const [image,controls,variant,pairArg]=process.argv.slice(2);
const before=performance.now(),p=await import(pathToFileURL(image)),imported=performance.now();
const read=name=>JSON.parse(readFileSync(controls+'/'+name,'utf8'));
const normalize=v=>typeof v==='bigint'?String(v):typeof v==='number'&&Number.isInteger(v)?(Object.is(v,-0)?'negative zero':String(v)):Array.isArray(v)?v.map(normalize):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).map(([k,x])=>[k,normalize(x)])):v;
const cases=read('cases.json');for(const c of cases)assert.deepEqual(p.call(c.name,c.args),c.expected,c.name);
const control=p.createState();let outcomes=0,restores=0;
for(const step of read('history.json')){
 if(step.restore){await control.restore(step.restore);restores++;continue;}
 assert.deepEqual(normalize(control.invoke(step.call,step.args)),normalize(step.expected));
 assert.deepEqual(Array.from(await control.checkpoint()),step.snapshot);outcomes++;
}
function consume(v){
 if(typeof v==='number')return v;
 if(typeof v==='bigint')return Number(v);
 if(typeof v==='boolean')return v?1:0;
 if(typeof v==='string'){let sum=0;for(let i=0;i<v.length;i++)sum+=v.charCodeAt(i);return sum;}
 if(v===null)return 0;
 let sum=0;for(const x of Object.values(v))sum+=consume(x);return sum;
}
const scalars=Array.from({length:16},(_,i)=>[(i-8)/32,0.25+i/128,0.125-i/256]);
const records=[];
async function measure(name,count,operation,snapshot=null,setupMs=0){
 const first=operation(0);for(let i=0;i<count;i++)consume(operation(i));
 const samples=[],checksums=[];
 for(let sample=0;sample<5;sample++){
  let sum=0;const before=performance.now();for(let i=0;i<count;i++)sum+=consume(operation(i));
  samples.push(performance.now()-before);checksums.push(sum);
 }
 records.push({name,count,samples_ms:samples,median_ms:[...samples].sort((a,b)=>a-b)[2],checksums,first:normalize(first),snapshot:snapshot?Buffer.from(await snapshot()).toString('hex'):null,setup_ms:setupMs});
}
for(const name of ['tree','chain','observe','stop','bounded','order']){
 const params=p.metadata.functions.find(f=>f.name===name).params.length;
 await measure('pure/'+name,10000,i=>p.functions[name](...scalars[i&15].slice(0,params)));
}
for(const pick of [false,true])await measure('branch/'+pick,10000,i=>p.functions.branch(...scalars[i&15].slice(0,2),pick));
for(const n of [0,16,128,1024]){
 const xs=Array.from({length:16},(_,phase)=>Array.from({length:n},(_,i)=>(i%17-8+phase/16)/32));
 const ys=Array.from({length:16},(_,phase)=>Array.from({length:n},(_,i)=>(i%13+phase/16)/32));
 const rows=xs.map((row,phase)=>row.map((x,i)=>({x,y:ys[phase][i],z:0.125})));
 await measure('dot/'+n,n>128?128:n>16?512:3000,i=>p.functions.dot(xs[i&15],ys[i&15]));
 await measure('rows/'+n,n>128?128:n>16?512:3000,i=>p.functions.rows(rows[i&15]));
}
for(const stride of [0,8,1]){
 const started=performance.now(),state=p.createState(),read=state.bind('read',{resultOnly:true}),fit=state.bind('fit',{resultOnly:true});
 state.bind('tune',{resultOnly:true})(0.125);
 const setup=performance.now()-started;
 await measure('state/read-learning/'+stride,4096,i=>{const s=scalars[i&15];if(stride&&i%stride===0)fit(...s,false);return read(s[1],s[2]);},()=>state.checkpoint(),setup);
}
for(const fail of [false,true]){
 const state=p.createState();state.bind('tune',{resultOnly:true})(0.125);
 await measure('state/frame/'+fail,32768,i=>state.invoke('frame',[scalars[i&15][1],scalars[i&15][2],fail]),()=>state.checkpoint());
}
console.log(JSON.stringify({schema:1,variant,pair:Number(pairArg),node:process.version,v8:process.versions.v8,image,image_bytes:statSync(image).size,core_sha256:p.metadata.core_sha256,import_ms:imported-before,values:cases.length,outcomes,restores,records,max_rss_kib:process.resourceUsage().maxRSS}));
