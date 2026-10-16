function __defEqual(a,b){const pending=[[a,b]];while(pending.length){const [x,y]=pending.pop();if(x===y)continue;if(!x||!y||typeof x!=='object'||typeof y!=='object'||x.datatype!==y.datatype||x.constructor!==y.constructor||x.arguments.length!==y.arguments.length)return false;for(let i=0;i<x.arguments.length;i++)pending.push([x.arguments[i],y.arguments[i]]);}return true;}
function __defDecode(v,sort,budget,depth=0){
 if(depth>64||--budget.nodes<0)throw Error('definition input resource limit');
 if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).length!==1)throw Error('invalid definition value');
 if(sort==='Bool'){if(typeof v.Bool!=='boolean')throw Error('expected Bool');return v.Bool;}
 if(sort==='U64'){if(typeof v.U64!=='string'||!/^(0|[1-9][0-9]{0,19})$/.test(v.U64))throw Error('expected exact U64');const n=BigInt(v.U64);if(n>18446744073709551615n)throw Error('U64 overflow');return n;}
 const id=sort.Data,d=v.Data;if(!d||d.datatype!==id||!Number.isInteger(d.constructor)||!Array.isArray(d.arguments)||Object.keys(d).sort().join(',')!=='arguments,constructor,datatype')throw Error('expected datatype');
 const fields=__defTypes[id]?.[d.constructor];if(!fields||fields.length!==d.arguments.length||fields.length>64)throw Error('constructor or field count mismatch');
 return {datatype:id,constructor:d.constructor,arguments:d.arguments.map((v,i)=>__defDecode(v,fields[i],budget,depth+1))};
}
function __defEncode(v){if(typeof v==='boolean')return {Bool:v};if(typeof v==='bigint')return {U64:String(v)};return {Data:{datatype:v.datatype,constructor:v.constructor,arguments:v.arguments.map(__defEncode)}};}
export function invoke(functionId,args){const entry=__defExports.get(functionId);if(!entry||!Array.isArray(args)||entry.params.length!==args.length)throw Error('unknown export or argument count mismatch');const budget={nodes:100000};const values=args.map((v,i)=>__defDecode(v,entry.params[i],budget));return __defEncode(entry.fn({fuel:100000000},...values));}

export function invokeNative(functionId,args){const entry=__defExports.get(functionId);if(!entry||entry.params.length!==args.length)throw Error('unknown export or argument count mismatch');return entry.fn({fuel:100000000},...args);}
