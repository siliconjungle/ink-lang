// Source-bound extraction of the actual frozen benchmark boundary expressions.
// Untimed diagnostic execution only; no production artifact is modified.
import fs from 'node:fs';
import crypto from 'node:crypto';
import {pathToFileURL} from 'node:url';
const [runnerPath,parserPath,outputPath,receiptPath]=process.argv.slice(2);
if(!receiptPath)throw Error('runner parser adapter receipt required');
const raw=fs.readFileSync(runnerPath),source=new TextDecoder('utf-8',{fatal:true}).decode(raw);
const {parse}=await import(pathToFileURL(parserPath));
const tree=parse(source,{ecmaVersion:'latest',sourceType:'module'}),found={capture:[],consume:[]};
const pending=[tree];let count=0;
while(pending.length){const node=pending.pop();if(!node||typeof node!=='object')continue;if(++count>200000)throw Error('boundary AST budget');
 if(node.type==='VariableDeclarator'&&node.id?.type==='Identifier'&&Object.hasOwn(found,node.id.name)&&node.init?.type==='ArrowFunctionExpression')found[node.id.name].push(node.init);
 for(const [key,value]of Object.entries(node)){if(['start','end','loc','range'].includes(key))continue;if(Array.isArray(value))pending.push(...value);else if(value&&typeof value==='object')pending.push(value);}
}
if(found.capture.length!==1||found.consume.length!==1)throw Error('ambiguous/missing actual benchmark boundary');
const capture=source.slice(found.capture[0].start,found.capture[0].end),consume=source.slice(found.consume[0].start,found.consume[0].end);
// Declared CPU-JS variant. The exact boundary expressions are unchanged; only
// the surrounding timer loop, lookup and post-timer checker are excluded.
const adapter=`export function run(direct,name,args,expected){const x={gpu:false};let observable=0;const capture=${capture};const consume=${consume};const a=capture();const value=direct.functions[name](...a);consume(value);return {value,captured:a,checksum:observable};}\n`;
parse(adapter,{ecmaVersion:'latest',sourceType:'module'});
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
fs.writeFileSync(outputPath,adapter,{flag:'wx'});
fs.writeFileSync(receiptPath,JSON.stringify({schema:1,kind:'ink-javascript-boundary-extraction-v1',runner_sha256:hash(raw),producer_sha256:hash(fs.readFileSync(new URL(import.meta.url))),parser_sha256:hash(fs.readFileSync(parserPath)),adapter_sha256:hash(adapter),expressions:Object.fromEntries(Object.entries(found).map(([key,[node]])=>[key,{start:node.start,end:node.end,source_sha256:hash(source.slice(node.start,node.end))}])),scope:'Exact frozen capture/consume expressions; actual CPU JavaScript captured-owned/value call boundary; outer timer iteration/setup/post-timer validation excluded; no timings.'},null,2)+'\n',{flag:'wx'});
