const fs=require('fs'),path=require('path'),os=require('os'),crypto=require('crypto');
const {chromium}=require('playwright');
const dir=__dirname;
const files=['baseline.mjs','planned.mjs'];
const modules=files.map(f=>fs.readFileSync(path.join(dir,f)));
const output=path.join(__dirname,'rerun-'+Date.now()+'.json');
(async()=>{
 const results=[];
 for(let processId=0;processId<3;processId++){
  const browser=await chromium.launch({channel:'chrome',headless:true});
  try{
   const page=await browser.newPage();
   const data=await page.evaluate(async({urls,processId})=>{
    const [baseline,planned]=await Promise.all(urls.map(u=>import(u)));
    const a=new Uint32Array(4096),b=new Uint32Array(4096);let seed=831731;
    const rand=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return seed>>>0};
    for(let i=0;i<a.length;i++){a[i]=rand();b[i]=rand()}
    a.set([0,1,0xffffffff,0x80000000,0x7fffffff]);b.set([0xffffffff,0,1,0x80000000,32]);
    const rows=[];
    const run=(fn,n)=>{let sum=0;const t=performance.now();for(let i=0;i<n;i++){const j=i&4095;sum=(sum+Number(fn(a[j],b[j])))>>>0}const ms=performance.now()-t;window.sink=sum;return {ms,checksum:sum}};
    for(const name of ['cancelled','mask_join','bounded','shifted']){
     const f=[baseline.functions[name],planned.functions[name]];
     for(let i=0;i<a.length;i++)if(f[0](a[i],b[i])!==f[1](a[i],b[i]))throw Error('Mismatch '+name+' '+i);
     for(let i=0;i<12;i++)run(f[i%2],300000);
     const calibration=run(f[0],500000).ms;
     const count=Math.max(500000,Math.min(8000000,Math.ceil(500000*40/Math.max(calibration,0.1))));
     for(let round=0;round<15;round++){
      const order=(round+processId)%2?[1,0]:[0,1];const pair={};
      for(const variant of order)pair[variant?'planned':'baseline']=run(f[variant],count);
      if(pair.baseline.checksum!==pair.planned.checksum)throw Error('Checksum mismatch');
      rows.push({name,round,count,first:order[0]?'planned':'baseline',...pair});
     }
    }
    return {processId,rows,checks:4096*4,userAgent:navigator.userAgent};
   },{processId,urls:modules.map(m=>'data:text/javascript;base64,'+m.toString('base64'))});
   results.push({...data,browserVersion:await browser.version()});
   console.log('Completed browser process',processId);
  }finally{await browser.close()}
 }
 const median=xs=>{xs=[...xs].sort((a,b)=>a-b);return xs[Math.floor(xs.length/2)]};
 const summary=['cancelled','mask_join','bounded','shifted'].map(name=>{
  const perProcess=results.map(p=>{const rows=p.rows.filter(r=>r.name===name);return {processId:p.processId,baseline_ns:median(rows.map(r=>r.baseline.ms*1e6/r.count)),planned_ns:median(rows.map(r=>r.planned.ms*1e6/r.count)),paired_speedup:median(rows.map(r=>r.baseline.ms/r.planned.ms))}});
  return {name,perProcess,speedup:median(perProcess.map(p=>p.paired_speedup))};
 });
 const result={schema:1,recorded_at:new Date().toISOString(),scope:'Development scalar microbenchmarks; not application or held-out generalisation evidence',runtime:'Fixed JavaScript; compile-time proof-checked planner selection',contention:'Shared machine, as authorised. Other workloads not stopped.',load_average:os.loadavg(),cpu:os.cpus()[0].model,files:files.map((name,i)=>({name,sha256:crypto.createHash('sha256').update(modules[i]).digest('hex')})),method:'Three fresh Chrome processes, 12 warmups per case, 15 alternating-order pairs; varying unsigned inputs, consumed checksums; exported trusted-value functions. Shifted is an unchanged control.',summary,results};
 fs.writeFileSync(output,JSON.stringify(result,null,2));console.log(JSON.stringify(summary,null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
