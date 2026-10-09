// Platform-independent checks run identically in Node and an actual browser.
export async function validateFilteredWasm(load, filenames){
    const mask=(1n<<64n)-1n;let seed=912822n,checks=0;
    function rand(){seed^=seed<<13n&mask;seed^=seed>>7n;seed^=seed<<17n&mask;seed&=mask;return seed;}
    const fixtures=[[],[0n],[mask],[0n,1n,mask,1n<<63n,(1n<<63n)-1n]];
    for(let i=0;i<256;i++)fixtures.push(Array.from({length:Number(rand()%150n)},()=>i%2?rand()&1023n:rand()));
    fixtures.push(Array.from({length:200000},(_,i)=>BigInt(i)));
    const modules=[];
    async function module(file){const bytes=await load(file),compiled=await WebAssembly.compile(bytes);if(WebAssembly.Module.imports(compiled).length)throw Error('unexpected host imports');const e=(await WebAssembly.instantiate(compiled,{})).exports;modules.push({file,bytes:bytes.byteLength,initial_pages:e.memory.buffer.byteLength/65536,exports:e});return e;}
    function put(e,xs){const ptr=Number(e.__heap_base.value),required=ptr+xs.length*8;if(required>e.memory.buffer.byteLength)e.memory.grow(Math.ceil((required-e.memory.buffer.byteLength)/65536));new BigUint64Array(e.memory.buffer,ptr,xs.length).set(xs);return ptr;}
    function equal(got,want,label){if(BigInt.asUintN(64,got)!==(want&mask))throw Error(label+': '+got+' != '+want);checks++;}
    function unchanged(e,ptr,xs){const view=new BigUint64Array(e.memory.buffer,ptr,xs.length);for(let i=0;i<xs.length;i++)if(view[i]!==xs[i])throw Error('borrowed input overwritten');checks++;}
    // Parameters are generated once so plain/checked modules see identical cases.
    const parameters=fixtures.map((_,i)=>[i%3?rand():3n,i%3?rand():11n,[0n,mask,512n,1n<<63n,rand()][i%5]]);
    for(const file of filenames.slice(0,2)){
        const e=await module(file);
        for(const [i,xs] of fixtures.entries()){
            const [a,b,limit]=parameters[i],ptr=put(e,xs);
            const expected={mapped_filter_sum:0n,filter_map_sum:0n,mapped_filter_count:0n,constant_filter_sum:b<limit?b*BigInt(xs.length):0n};
            for(const x of xs){const y=(x*a+b)&mask;if(y<limit){expected.mapped_filter_sum+=y;expected.mapped_filter_count++;}if(x<limit)expected.filter_map_sum+=y;}
            for(const [name,want] of Object.entries(expected)){equal(e['lang_fn_'+name](ptr,xs.length,a,b,limit),want,file+': '+name);unchanged(e,ptr,xs);}
        }
    }
    const e=await module(filenames[2]);
    for(const [i,xs] of fixtures.slice(0,60).entries()){
        const ptr=put(e,xs),initial=rand(),bias=rand(),limit=parameters[i][2];
        equal(e.lang_fn_lazy(ptr,xs.length),7n,'lazy numeric branch');
        if(e.lang_fn_bool_choice(ptr,xs.length)!==1)throw Error('lazy Boolean branch');checks++;
        equal(e.lang_fn_order(ptr,xs.length,initial),xs.reduceRight((rest,x)=>(x<rest?x-rest:rest-x)&mask,initial),'conditional right fold');
        equal(e.lang_fn_nested(ptr,xs.length,bias,limit),xs.reduce((s,x)=>s+(x<limit?xs.reduce((total,y)=>total+(y<x?y:0n),0n)&mask:bias),0n),'nested collection in conditional');
        unchanged(e,ptr,xs);
    }
    for(const m of modules){m.final_pages=m.exports.memory.buffer.byteLength/65536;delete m.exports;}
    return {status:'passed',checks,fixtures:fixtures.length,modules,scope:'import-free filtered Wasm; modular values, captures, conditional laziness, nested temporary ownership, input preservation and memory growth'};
}
