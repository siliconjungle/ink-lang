import fs from'node:fs';import{createRequire}from'node:module';
const acorn=createRequire(import.meta.url)(process.argv[2]);if(acorn.version!=='8.15.0')throw Error('parser version');
const ast=acorn.parse(fs.readFileSync(process.argv[3],'utf8'),{ecmaVersion:2020}),stack=[ast],nodes=[];
while(stack.length){const node=stack.pop();if(!node||typeof node!=='object')continue;if(Array.isArray(node)){for(let i=node.length-1;i>=0;i--)stack.push(node[i]);continue;}
 if(typeof node.type==='string'&&Number.isInteger(node.start))nodes.push({key:node.start,flag:node.type==='Identifier',label:node.name??node.type,weight:node.end-node.start});
 const children=Object.entries(node).filter(([key,v])=>!['start','end','loc'].includes(key)&&v&&typeof v==='object').map(([,v])=>v);for(let i=children.length-1;i>=0;i--)stack.push(children[i]);
}
fs.writeFileSync(process.argv[4],JSON.stringify(nodes)+'\n');
