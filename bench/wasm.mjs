import fs from 'node:fs';
const [plainPath,knowledgePath,outputPath]=process.argv.slice(2);
if(!outputPath)throw new Error('usage: wasm.mjs PLAIN.wasm KNOWLEDGE.wasm OUTPUT.json');
const modules=[];
for(const file of [plainPath,knowledgePath]){
    const binary=fs.readFileSync(file);
    if(!WebAssembly.validate(binary))throw new Error('invalid wasm '+file);
    const {instance}=await WebAssembly.instantiate(binary,{});
    modules.push({file,exports:instance.exports,bytes:binary.length});
}
const mask=(1n<<64n)-1n;
let seed=0x123456789abcdefn;
function rand(){seed^=(seed<<13n)&mask;seed^=seed>>7n;seed^=(seed<<17n)&mask;seed&=mask;return seed;}
const fixtures=[[],[0n],[mask],[0n,1n,mask,1n<<63n,(1n<<63n)-1n]];
for(let i=0;i<200;i++)fixtures.push(Array.from({length:Number(rand()%257n)},()=>i%2?rand()&1023n:rand()));
const cases=['sum_values','affine','squares','filter_sum','pipeline','expanded','count_under'];
function reference(name,xs,a,b,t){let s=0n;for(const x of xs){switch(name){case 'sum_values':s+=x;break;case 'affine':s+=(x*a+b)&mask;break;case 'squares':s+=x*x;break;case 'filter_sum':if(x<t)s+=x;break;case 'pipeline':{const y=(x*a+b)&mask;if(y<t)s+=y*y+7n;break;}case 'expanded':s+=(x+3n)*(x+3n);break;case 'count_under':if(x<t)s++;break;}s&=mask;}return s;}
let checks=0;
for(const [i,xs] of fixtures.entries()){
    const a=i%3?rand():3n,b=i%3?rand():11n,t=i%3?rand():512n;
    for(const module of modules){
        const e=module.exports;const ptr=Number(e.__heap_base.value);if(ptr%8)throw new Error('unaligned heap');
        const required=ptr+xs.length*8;
        if(required>e.memory.buffer.byteLength)e.memory.grow(Math.ceil((required-e.memory.buffer.byteLength)/65536));
        new BigUint64Array(e.memory.buffer,ptr,xs.length).set(xs);
        for(const name of cases){
            const args=name==='affine'?[a,b]:name==='pipeline'?[a,b,t]:['filter_sum','count_under'].includes(name)?[t]:[];
            const got=BigInt.asUintN(64,e['lang_fn_'+name](ptr,xs.length,...args));
            const want=reference(name,xs,a,b,t);
            if(got!==want)throw new Error(`${module.file}: ${name} fixture ${i}: ${got} != ${want}`);
            checks++;
        }
    }
}
const result={status:'passed',checks,fixtures:fixtures.length,node:process.version,v8:process.versions.v8,modules:modules.map(({file,bytes})=>({file,bytes})),scope:'pure u64 kernels with SIMD, not stateful Wasm or snapshot interchange'};
fs.writeFileSync(outputPath,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
