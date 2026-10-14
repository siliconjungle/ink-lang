import * as ink from './flat.mjs';
const entry=ink.compiledValues.set_document,codec=entry.params[0],json=new ink.JsonCodec(ink.valueCodecs.identity.result);
const document=Object.fromEntries(Array.from({length:512},(_,i)=>['k'+String(i).padStart(5,'0'),i]));
document.unknown={nested:['雪',true,null,3],enabled:false};
const input=json.parseCompiled(codec,JSON.stringify(document)),key=entry.params[1].capture('k00000'),value=codec.capture(json.parse('777'));
const result=ink.callCompiled('set_document',[input,key,value]);
let checksum=0;for(let i=0;i<30000;i++)checksum^=json.stringifyCompiled(entry.result,result,{unwrapResult:true}).length;
console.log(checksum);
