import {performance} from 'node:perf_hooks';
import {readFileSync,statSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const [path,countArg,seedArg]=process.argv.slice(2);const count=Number(countArg??50000),seed=Number(seedArg??1);const start=performance.now();const module=await import(pathToFileURL(path));const imported=performance.now();const inputs=Array.from({length:16},(_,i)=>[Math.fround((i-8+seed/16)/17)]);const weights=Array.from({length:16},(_,i)=>[Math.fround(0.03125+i/4096),Math.fround(0.999-i/32768)]);const records=[];
for(const stride of [0,8,1]){
 const init=performance.now();const state=module.createState();const serve=state.bind('serve',{resultOnly:true}),retune=state.bind('retune',{resultOnly:true});retune(weights[0]);const initialized=performance.now();
 const run=n=>{let sum=0;for(let i=0;i<n;i++){if(stride&&i%stride===0)retune(weights[(i>>>3)&15]);const value=serve(inputs[i&15]);for(let j=0;j<value.length;j++)sum+=value[j];}return sum;};
 run(10000);const before=performance.now();const checksum=run(count);const seconds=(performance.now()-before)/1000;const snapshot=Buffer.from(await state.checkpoint()).toString('hex');records.push({stride,count,seconds,checksum,snapshot,initialization_ms:initialized-init});
}
console.log(JSON.stringify({schema:1,node:process.version,executable:process.execPath,path,count,seed,import_ms:imported-start,program_bytes:statSync(path).size,records}));
