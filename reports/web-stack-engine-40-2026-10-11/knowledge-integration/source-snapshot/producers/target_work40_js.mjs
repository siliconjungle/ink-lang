// Optional untimed diagnostic acquisition, never production or proof authority.
import fs from 'node:fs';
import crypto from 'node:crypto';
import {pathToFileURL} from 'node:url';
const [input, output, receipt, parserPath] = process.argv.slice(2);
if (!input || !output || !receipt || !parserPath) throw Error('input output receipt parser required');
const raw=fs.readFileSync(input);if(raw.length>16_000_000)throw Error('diagnostic source byte budget');const source=new TextDecoder('utf-8',{fatal:true}).decode(raw);
const {parse}=await import(pathToFileURL(parserPath));
const ast=parse(source,{ecmaVersion:'latest',sourceType:'module'});
const pending=[[ast,0]];let nodes=0;while(pending.length){const [x,d]=pending.pop();if(!x||typeof x!=='object')continue;if(++nodes>200000||d>256)throw Error('diagnostic AST budget');for(const [k,v]of Object.entries(x)){if(['start','end','loc','range'].includes(k))continue;if(Array.isArray(v))for(const c of v)pending.push([c,d+1]);else if(v&&typeof v==='object')pending.push([v,d+1]);}}
const digest=x=>crypto.createHash('sha256').update(x).digest('hex');
const prefix='__ink_work_'+digest(raw).slice(0,16);
if(source.includes(prefix))throw Error('diagnostic name collision');
const edits=[],sites=[],unknown=[];
function insert(position,text){edits.push({position,text,order:edits.length})}
function site(node,kind){const id=sites.length;sites.push({id,kind,start:node.start,end:node.end,offset_unit:'UTF16',source_sha256:digest(source.slice(node.start,node.end))});return id}
function visit(node,inFunction=false){
 if(!node||typeof node!=='object')return;
 if(inFunction&&['ForStatement','WhileStatement','DoWhileStatement','ForOfStatement','ForInStatement'].includes(node.type)){
  const id=site(node,'loop_iterations'),body=node.body;
  if(body.type==='BlockStatement')insert(body.start+1,`${prefix}_hit(${id});`);
  else{insert(body.start,`{${prefix}_hit(${id});`);insert(body.end,'}');}
 }
 if(inFunction&&node.type==='ArrayExpression'){
  const id=site(node,'allocation_events');insert(node.start,`${prefix}_allocate(${id},`);insert(node.end,')');
 }
 if(inFunction&&node.type==='NewExpression'){
  // Instrument every completed construction, but count only standard array
  // carriers. Unknown/user constructors leave the allocation feature opaque.
  const id=site(node,'construction');const capacityOnly=node.arguments.length===0||node.arguments.length===1&&node.arguments[0].type==='Literal'&&typeof node.arguments[0].value==='number';sites[id].constructor_capacity_only=capacityOnly;insert(node.start,`${prefix}_construct(${id},`);insert(node.end,')');
 }
 if(inFunction&&node.type==='CallExpression'&&node.callee.type==='MemberExpression'){
  const p=node.callee.property;
  const method=node.callee.computed?(p.type==='Literal'?p.value:null):(p.type==='Identifier'?p.name:null);
  if(['slice','set','map','filter','concat'].includes(method)){
   if(node.optional||node.callee.optional||node.callee.object.type==='Super')unknown.push({site:node.start,reason:'optional/super copying call not instrumented'});
   else{
    const id=site(node,'copy_or_allocation_call'),object=node.callee.object;
    if(method==='map'||method==='filter')sites[id].callback_site=site(node,'native_callback_iterations');
    // Receiver and method lookup occur once, before the original arguments.
    // An IIFE preserves ordinary method this binding and argument order.
    const opening=source.indexOf('(',node.callee.end);
    if(opening<0||opening>=node.end)throw Error('call delimiter unavailable');
    insert(node.start,`((${prefix}_receiver)=>{const ${prefix}_method=${prefix}_receiver[${JSON.stringify(method)}];const ${prefix}_arguments=[`);
    edits.push({position:node.start,end:opening+1,text:'',order:edits.length});
    // The original final ')' is removed; close the captured argument vector.
    edits.push({position:node.end-1,end:node.end,text:'',order:edits.length});
    insert(node.end,`];return ${prefix}_invoke(${id},${JSON.stringify(method)},${prefix}_receiver,${prefix}_method,${prefix}_arguments);})(${source.slice(object.start,object.end)})`);
   }
  }
 }
 for(const [key,value]of Object.entries(node)){
  if(['start','end','loc','range'].includes(key))continue;
  if(Array.isArray(value))for(const child of value)visit(child,inFunction||['FunctionDeclaration','FunctionExpression','ArrowFunctionExpression'].includes(node.type));
  else if(value&&typeof value==='object')visit(value,inFunction||['FunctionDeclaration','FunctionExpression','ArrowFunctionExpression'].includes(node.type));
 }
}
visit(ast);
// Copy receiver rewrites can contain other instrumentable receivers. Reject
// overlapping replacement regions rather than silently losing their events.
const removals=edits.filter(e=>e.end!==undefined);
for(const r of removals)if(edits.some(e=>e!==r&&r.position<e.position&&e.position<r.end))throw Error('nested receiver instrumentation requires unsupported overlap');
const grouped=new Map();for(const e of edits){const a=grouped.get(e.position)??[];a.push(e);grouped.set(e.position,a)}
let instrumented=source;
for(const [position,items]of [...grouped].sort((a,b)=>b[0]-a[0])){
 const removal=items.find(e=>e.end!==undefined),text=items.filter(e=>e.end===undefined).sort((a,b)=>a.order-b.order).map(e=>e.text).join('');
 instrumented=instrumented.slice(0,position)+text+instrumented.slice(removal?.end??position);
}
const prelude=`
const ${prefix}_sites=${JSON.stringify(sites)};
let ${prefix}_counts=[],${prefix}_unknown=[];
function ${prefix}_hit(i){${prefix}_counts[i]=(${prefix}_counts[i]??0)+1;}
function ${prefix}_allocate(i,x){${prefix}_hit(i);return x;}
function ${prefix}_construct(i,x){if(Array.isArray(x)||ArrayBuffer.isView(x)||x instanceof ArrayBuffer){${prefix}_hit(i);if(ArrayBuffer.isView(x)&&!${prefix}_sites[i].constructor_capacity_only)${prefix}_unknown.push({site:i,components:['copy_bytes'],reason:'typed constructor ingress/copy extent not captured'});}else ${prefix}_unknown.push({site:i,components:['allocation_events'],reason:'constructor allocation behavior unknown'});return x;}
function ${prefix}_invoke(i,name,receiver,method,args){
 // Invoke the original native operation once. A diagnostic callback records
 // actual visits (including sparse-array skipped entries), preserving original
 // this/arguments and exception order. Opaque custom methods are left alone.
 const proto=Object.getPrototypeOf(receiver);
 const standard=Array.isArray(receiver)?proto===Array.prototype&&method===Array.prototype[name]:(ArrayBuffer.isView(receiver)&&typeof receiver.BYTES_PER_ELEMENT==='number'?method===Object.getPrototypeOf(Uint8Array.prototype)[name]:receiver instanceof ArrayBuffer&&method===ArrayBuffer.prototype[name]);
 if(standard&&(name==='map'||name==='filter')&&typeof args[0]==='function'){const callback=args[0];args[0]=function(...values){${prefix}_hit(${prefix}_sites[i].callback_site);return Reflect.apply(callback,this,values);};}
 const value=Reflect.apply(method,receiver,args);
 if(!standard){${prefix}_unknown.push({site:i,components:['allocation_events','copy_bytes','loop_iterations'],reason:'copy method implementation/carrier unknown'});return value;}
 if(name==='concat')${prefix}_unknown.push({site:i,components:['copy_bytes'],reason:'native concat carrier copy bytes unknown'});
 if(name==='set'){
  if(ArrayBuffer.isView(receiver)&&ArrayBuffer.isView(args[0])&&receiver.BYTES_PER_ELEMENT===args[0].BYTES_PER_ELEMENT)${prefix}_copy_bytes+=args[0].byteLength;
  else ${prefix}_unknown.push({site:i,components:['copy_bytes'],reason:'set byte extent or conversion unknown'});
 }else if(Array.isArray(value)||ArrayBuffer.isView(value)||value instanceof ArrayBuffer){
  ${prefix}_hit(i);
  if(name==='slice'&&(ArrayBuffer.isView(value)||value instanceof ArrayBuffer))${prefix}_copy_bytes+=value.byteLength;
  else if(name==='slice')${prefix}_unknown.push({site:i,components:['copy_bytes'],reason:'JS Array copy bytes/physical storage unknown'});
 }
 return value;
}
let ${prefix}_copy_bytes=0;
export function ${prefix}_reset(){${prefix}_counts=[];${prefix}_unknown=[];${prefix}_copy_bytes=0;}
export function ${prefix}_snapshot(){return {sites:${prefix}_counts.slice(),copy_bytes:${prefix}_copy_bytes,unknown:${prefix}_unknown.slice()};}
`;
// Parse instrumented output before freezing it. Unsupported edits fail closed.
parse(prelude+instrumented,{ecmaVersion:'latest',sourceType:'module'});
fs.writeFileSync(output,prelude+instrumented,{flag:'wx'});
fs.writeFileSync(receipt,JSON.stringify({schema:1,target:'javascript',artifact_sha256:digest(raw),instrumented_sha256:digest(fs.readFileSync(output)),instrumenter_sha256:digest(fs.readFileSync(new URL(import.meta.url))),parser_sha256:digest(fs.readFileSync(parserPath)),prefix,sites,unknown,scope:'Untimed literal emitted-site instrumentation; allocation events are completed carrier constructions, not V8 physical allocator calls; JS Array bytes unknown'},null,2)+'\n',{flag:'wx'});
