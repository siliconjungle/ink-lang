import fs from 'node:fs';
const [plain,checked,semantics,output]=process.argv.slice(2);
const mask=(1n<<64n)-1n;let seed=918244n,checks=0;
function rand(){seed^=seed<<13n&mask;seed^=seed>>7n;seed^=seed<<17n&mask;seed&=mask;return seed;}
const fixtures=[[],[0n],[mask],[0n,1n,mask,1n<<63n,(1n<<63n)-1n]];
for(let i=0;i<256;i++)fixtures.push(Array.from({length:Number(rand()%150n)},()=>i%2?rand()&1023n:rand()));
// Forces allocator memory growth well beyond the module's initial memory.
fixtures.push(Array.from({length:200000},(_,i)=>BigInt(i)));
const modules=[];
async function load(file){const bytes=fs.readFileSync(file),module=await WebAssembly.compile(bytes);if(WebAssembly.Module.imports(module).length)throw Error('unexpected host imports');const e=(await WebAssembly.instantiate(module,{})).exports;modules.push({file,bytes:bytes.length,initial_pages:e.memory.buffer.byteLength/65536,exports:e});return e;}
function put(e,xs,offset=0){const ptr=Number(e.__heap_base.value)+offset;const size=ptr+xs.length*8;if(size>e.memory.buffer.byteLength)e.memory.grow(Math.ceil((size-e.memory.buffer.byteLength)/65536));new BigUint64Array(e.memory.buffer,ptr,xs.length).set(xs);return ptr;}
function equal(got,want,label){if(BigInt.asUintN(64,got)!==(want&mask))throw Error(label+': '+got+' != '+want);checks++;}
function unchanged(e,ptr,xs){const view=new BigUint64Array(e.memory.buffer,ptr,xs.length);for(let i=0;i<xs.length;i++)if(view[i]!==xs[i])throw Error('input overwritten');checks++;}
for(const file of [plain,checked]){
    const e=await load(file);
    for(const [i,xs] of fixtures.entries()){
        const a=i%3?rand():3n,b=i%3?rand():11n,ptr=put(e,xs);
        const expected={two_maps:0n,three_maps:0n,shadow_maps:0n,mapped_count:BigInt(xs.length)};
        for(const x of xs){expected.two_maps+=(x*a+b)&mask;expected.three_maps+=(((x*a+b)&mask)-b)&mask;expected.shadow_maps+=((x+b)&mask)*a&mask;}
        for(const [name,want] of Object.entries(expected)){equal(e['lang_fn_'+name](ptr,xs.length,a,b),want,file+': '+name);unchanged(e,ptr,xs);}
    }
}
const e=await load(semantics);
for(const xs of fixtures.slice(0,40)){
    const ptr=put(e,xs),z=rand(),a=rand(),b=rand();
    equal(e.lang_fn_ordered(ptr,xs.length,z),xs.reduceRight((r,x)=>(x-r)&mask,z),'ordered');
    equal(e.lang_fn_shadow(ptr,xs.length),7n+BigInt(xs.length),'shadow');
    equal(e.lang_fn_caller(ptr,xs.length,a,b),xs.reduce((s,x)=>s+((x*a+b)&mask),b),'nested call');
    const ys=[1n,mask,5n];const yptr=put(e,ys,xs.length*8+8);
    equal(e.lang_fn_dual(ptr,xs.length,yptr,ys.length),xs.reduce((s,x)=>s+((x+ys.reduce((s,y)=>s+((y+1n)&mask),0n))&mask),0n),'two borrowed inputs');
    unchanged(e,ptr,xs);unchanged(e,yptr,ys);
}
for(const m of modules){m.final_pages=m.exports.memory.buffer.byteLength/65536;delete m.exports;}
const result={status:'passed',checks,fixtures:fixtures.length,modules,node:process.version,v8:process.versions.v8,scope:'import-free pure Wasm; mathematical values, input preservation, repeated calls, right-fold order, shadowing, nested temporary ownership and memory growth'};
fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
