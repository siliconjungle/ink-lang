
const __ink_work_c42c1f8d00598286_sites=[{"id":0,"kind":"copy_or_allocation_call","start":102,"end":148,"offset_unit":"UTF16","source_sha256":"76e727a98305d1d164f13ae2982a57e356c7f6ffa5a8bf6bc040ce424a1df7bb","callback_site":1},{"id":1,"kind":"native_callback_iterations","start":102,"end":148,"offset_unit":"UTF16","source_sha256":"76e727a98305d1d164f13ae2982a57e356c7f6ffa5a8bf6bc040ce424a1df7bb"},{"id":2,"kind":"copy_or_allocation_call","start":136,"end":145,"offset_unit":"UTF16","source_sha256":"79a8b086afd3081c128ab12d7147e920bcf743df091b4634cdfbd320067fb3d4"},{"id":3,"kind":"loop_iterations","start":258,"end":326,"offset_unit":"UTF16","source_sha256":"54260cf6cd1bf9c0dcd47cc3dd965481ee559ccf923d584f2683661c980b8e5c"}];
let __ink_work_c42c1f8d00598286_counts=[],__ink_work_c42c1f8d00598286_unknown=[];
function __ink_work_c42c1f8d00598286_hit(i){__ink_work_c42c1f8d00598286_counts[i]=(__ink_work_c42c1f8d00598286_counts[i]??0)+1;}
function __ink_work_c42c1f8d00598286_allocate(i,x){__ink_work_c42c1f8d00598286_hit(i);return x;}
function __ink_work_c42c1f8d00598286_construct(i,x){if(Array.isArray(x)||ArrayBuffer.isView(x)||x instanceof ArrayBuffer){__ink_work_c42c1f8d00598286_hit(i);if(ArrayBuffer.isView(x)&&!__ink_work_c42c1f8d00598286_sites[i].constructor_capacity_only)__ink_work_c42c1f8d00598286_unknown.push({site:i,components:['copy_bytes'],reason:'typed constructor ingress/copy extent not captured'});}else __ink_work_c42c1f8d00598286_unknown.push({site:i,components:['allocation_events'],reason:'constructor allocation behavior unknown'});return x;}
function __ink_work_c42c1f8d00598286_invoke(i,name,receiver,method,args){
 // Invoke the original native operation once. A diagnostic callback records
 // actual visits (including sparse-array skipped entries), preserving original
 // this/arguments and exception order. Opaque custom methods are left alone.
 const proto=Object.getPrototypeOf(receiver);
 const standard=Array.isArray(receiver)?proto===Array.prototype&&method===Array.prototype[name]:(ArrayBuffer.isView(receiver)&&typeof receiver.BYTES_PER_ELEMENT==='number'?method===Object.getPrototypeOf(Uint8Array.prototype)[name]:receiver instanceof ArrayBuffer&&method===ArrayBuffer.prototype[name]);
 if(standard&&(name==='map'||name==='filter')&&typeof args[0]==='function'){const callback=args[0];args[0]=function(...values){__ink_work_c42c1f8d00598286_hit(__ink_work_c42c1f8d00598286_sites[i].callback_site);return Reflect.apply(callback,this,values);};}
 const value=Reflect.apply(method,receiver,args);
 if(!standard){__ink_work_c42c1f8d00598286_unknown.push({site:i,components:['allocation_events','copy_bytes','loop_iterations'],reason:'copy method implementation/carrier unknown'});return value;}
 if(name==='concat')__ink_work_c42c1f8d00598286_unknown.push({site:i,components:['copy_bytes'],reason:'native concat carrier copy bytes unknown'});
 if(name==='set'){
  if(ArrayBuffer.isView(receiver)&&ArrayBuffer.isView(args[0])&&receiver.BYTES_PER_ELEMENT===args[0].BYTES_PER_ELEMENT)__ink_work_c42c1f8d00598286_copy_bytes+=args[0].byteLength;
  else __ink_work_c42c1f8d00598286_unknown.push({site:i,components:['copy_bytes'],reason:'set byte extent or conversion unknown'});
 }else if(Array.isArray(value)||ArrayBuffer.isView(value)||value instanceof ArrayBuffer){
  __ink_work_c42c1f8d00598286_hit(i);
  if(name==='slice'&&(ArrayBuffer.isView(value)||value instanceof ArrayBuffer))__ink_work_c42c1f8d00598286_copy_bytes+=value.byteLength;
  else if(name==='slice')__ink_work_c42c1f8d00598286_unknown.push({site:i,components:['copy_bytes'],reason:'JS Array copy bytes/physical storage unknown'});
 }
 return value;
}
let __ink_work_c42c1f8d00598286_copy_bytes=0;
export function __ink_work_c42c1f8d00598286_reset(){__ink_work_c42c1f8d00598286_counts=[];__ink_work_c42c1f8d00598286_unknown=[];__ink_work_c42c1f8d00598286_copy_bytes=0;}
export function __ink_work_c42c1f8d00598286_snapshot(){return {sites:__ink_work_c42c1f8d00598286_counts.slice(),copy_bytes:__ink_work_c42c1f8d00598286_copy_bytes,unknown:__ink_work_c42c1f8d00598286_unknown.slice()};}
export function run(direct,name,args,expected){const x={gpu:false};let observable=0;const capture=()=>((__ink_work_c42c1f8d00598286_receiver)=>{const __ink_work_c42c1f8d00598286_method=__ink_work_c42c1f8d00598286_receiver["map"];const __ink_work_c42c1f8d00598286_arguments=[a=>ArrayBuffer.isView(a)?((__ink_work_c42c1f8d00598286_receiver)=>{const __ink_work_c42c1f8d00598286_method=__ink_work_c42c1f8d00598286_receiver["slice"];const __ink_work_c42c1f8d00598286_arguments=[];return __ink_work_c42c1f8d00598286_invoke(2,"slice",__ink_work_c42c1f8d00598286_receiver,__ink_work_c42c1f8d00598286_method,__ink_work_c42c1f8d00598286_arguments);})(a):a];return __ink_work_c42c1f8d00598286_invoke(0,"map",__ink_work_c42c1f8d00598286_receiver,__ink_work_c42c1f8d00598286_method,__ink_work_c42c1f8d00598286_arguments);})(args);const consume=value=>{const a=x.gpu?value.value:value;let code;if(Array.isArray(expected)){code=a.length>>>0;for(let i=0;i<a.length;i++){__ink_work_c42c1f8d00598286_hit(3);code=(code+Math.imul((i+1)>>>0,a[i]))>>>0}}else code=Number(a)>>>0;observable=(observable+code)>>>0};const a=capture();const value=direct.functions[name](...a);consume(value);return {value,captured:a,checksum:observable};}
