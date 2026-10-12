// Representation conversion only. Callers supply values matching metadata.
const __view = new DataView(new ArrayBuffer(4));
const __float = bits => { __view.setUint32(0, bits, true); return __view.getFloat32(0, true); };
const __bits = number => { if(Number.isNaN(number))return 0x7fc00000; __view.setFloat32(0, number, true); return __view.getUint32(0, true); };
const __identity = value => value;
// Intern declared conversion schemas once. An invocation owns one WeakMap per
// schema instead of allocating a Map for every converted record/list node.
const __conversionKeys = new Map();
function __representation(type, output) {
  const convert=__representationRaw(type,output);
  if(convert===__identity)return convert;
  // Conversion identity is invocation-local: callers may reuse a mutable host
  // object in a later call. Distinct declared schemas have distinct memo keys.
  const schema=(output?'out:':'in:')+JSON.stringify(type);
  let key=__conversionKeys.get(schema);
  if(!key){key={};__conversionKeys.set(schema,key);}
  return (value,context)=>{
    if(!context||!value||typeof value!=='object')return convert(value,context);
    let entries=context.get(key);
    if(!entries){entries=new WeakMap();context.set(key,entries);}
    if(entries.has(value))return entries.get(value);
    const result=convert(value,context);
    entries.set(value,result);return result;
  };
}
function __representationRaw(type, output) {
  switch (type.kind) {
    case 'ref': return (value,context)=>__representation(__namedTypes[type.name],output)(value,context);
    case 'id': return value=>value.toLowerCase();
    case 'int': return output ? value=>({Int:value.toString()}) : value=>BigInt(value && typeof value==='object' ? value.Int : value);
    case 'option': {
      const item=__representation(type.element,output);
      return item===__identity?__identity:(value,context)=>Object.hasOwn(value,'Some')?{Some:item(value.Some,context)}:{None:null};
    }
    case 'result': {
      const ok=__representation(type.ok,output),err=__representation(type.error,output);
      return ok===__identity&&err===__identity?__identity:(value,context)=>Object.hasOwn(value,'Ok')?{Ok:ok(value.Ok,context)}:{Err:err(value.Err,context)};
    }
    case 'f32': return output ? value => {
      const number = __float(value);
      return Number.isFinite(number) ? number : {F32Bits:value};
    } : value => typeof value === 'number' ? __bits(value) : value.F32Bits;
    case 'list': case 'vector': {
      const element = __representation(type.element, output);
      return element === __identity ? __identity : (value,context) => Array.from(value, item=>element(item,context));
    }
    case 'record': {
      const fields = type.fields.map(field => [field.name, __representation(field.type, output)]);
      return fields.every(([,convert]) => convert === __identity) ? __identity :
        (value,context) => {
          const result={};
          for(const [name,convert] of fields){
            const field=convert(value[name],context);
            // Assignment treats __proto__ specially; records require an own
            // ordinary writable data property, as Object.fromEntries supplied.
            if(name==='__proto__')Object.defineProperty(result,name,{value:field,writable:true,enumerable:true,configurable:true});
            else result[name]=field;
          }
          return result;
        };
    }
    default: return __identity;
  }
}
function __fn0(v0,v1){
const v2=v0;
const v3=v2.length;
const v4=new Array(v3);
for(let v5=0;v5<v3;v5++){
const v6=v2[v5];
const v7=v6;
const v8=v7["x"];
const v9=v6;
const v10=v9["vx"];
const v11=v1;
const v12=__bits(__float(v10) * __float(v11));
const v13=__bits(__float(v8) + __float(v12));
const v14=v6;
const v15=v14["y"];
const v16=v6;
const v17=v16["vy"];
const v18=v1;
const v19=__bits(__float(v17) * __float(v18));
const v20=__bits(__float(v15) + __float(v19));
const v21=v6;
const v22=v21["vx"];
const v23=v6;
const v24=v23["vy"];
const v25=v6;
const v26=v25["active"];
v4[v5]=({["x"]:v13,["y"]:v20,["vx"]:v22,["vy"]:v24,["active"]:v26});
}
return v4;}
function __into0(v27,v28,v29){
const v30=v27;
const v31=v30.length;
for(let v33=0;v33<v31;v33++){
const v34=v30[v33];
const v35=v34;
const v36=v35["x"];
const v37=v34;
const v38=v37["vx"];
const v39=v28;
const v40=__bits(__float(v38) * __float(v39));
const v41=__bits(__float(v36) + __float(v40));
const v42=v34;
const v43=v42["y"];
const v44=v34;
const v45=v44["vy"];
const v46=v28;
const v47=__bits(__float(v45) * __float(v46));
const v48=__bits(__float(v43) + __float(v47));
const v49=v34;
const v50=v49["vx"];
const v51=v34;
const v52=v51["vy"];
const v53=v34;
const v54=v53["active"];
v29[v33]=__intoOutput0(({["x"]:v41,["y"]:v48,["vx"]:v50,["vy"]:v52,["active"]:v54}));
}
return v31;}
const __namedTypes={"Particle":{"fields":[{"name":"x","type":{"kind":"f32"}},{"name":"y","type":{"kind":"f32"}},{"name":"vx","type":{"kind":"f32"}},{"name":"vy","type":{"kind":"f32"}},{"name":"active","type":{"kind":"bool"}}],"kind":"record","name":"Particle"}};
export const metadata = {"abi":"ink-javascript-trusted-values-v2","backend":"javascript","core_semantics":"ink-executable-core-v7","core_sha256":"de0b37ddb9679078d9aa6030d4faabfee76e27d389ab1952329aefb2be9a0ea8","destination_abi":{"aliasing":"destination-disjoint-from-all-reachable-inputs","capacity":"trusted","count_unit":"elements","name":"ink-javascript-into-v1","ownership":"caller-owned","tail":"unwritten"},"functions":[{"destination":{"abi":"ink-javascript-into-v1","count_unit":"elements","ownership":"caller-owned"},"index":0,"internal":false,"name":"run","parallel":false,"params":[{"name":"xs","type":{"element":{"fields":[{"name":"x","type":{"kind":"f32"}},{"name":"y","type":{"kind":"f32"}},{"name":"vx","type":{"kind":"f32"}},{"name":"vy","type":{"kind":"f32"}},{"name":"active","type":{"kind":"bool"}}],"kind":"record","name":"Particle"},"kind":"list"}},{"name":"dt","type":{"kind":"f32"}}],"precondition":null,"result":{"element":{"fields":[{"name":"x","type":{"kind":"f32"}},{"name":"y","type":{"kind":"f32"}},{"name":"vx","type":{"kind":"f32"}},{"name":"vy","type":{"kind":"f32"}},{"name":"active","type":{"kind":"bool"}}],"kind":"record","name":"Particle"},"kind":"list"}}],"named_types":{"Particle":{"fields":[{"name":"x","type":{"kind":"f32"}},{"name":"y","type":{"kind":"f32"}},{"name":"vx","type":{"kind":"f32"}},{"name":"vy","type":{"kind":"f32"}},{"name":"active","type":{"kind":"bool"}}],"kind":"record","name":"Particle"}},"schema":1,"state":null};
const __implementations=[__fn0];

function __freeze(v) { if(v && typeof v==='object') {Object.values(v).forEach(__freeze);Object.freeze(v);} return v; }
__freeze(metadata);
const __inputTypes=[[{"element":{"fields":[{"name":"x","type":{"kind":"f32"}},{"name":"y","type":{"kind":"f32"}},{"name":"vx","type":{"kind":"f32"}},{"name":"vy","type":{"kind":"f32"}},{"name":"active","type":{"kind":"bool"}}],"kind":"record","name":"Particle"},"kind":"list"},{"kind":"f32"}]];

// Descriptor work occurs once at module initialisation, never per word-list call.
export const functions = Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal).map(f=> {
  const input=__inputTypes[f.index].map(t=>__representation(t,false));
  const output=__representation(f.result,true);
  const body=__implementations[f.index];
  const implementation=f.precondition==null?body:(...args)=>{if(__implementations[f.precondition](...args)!==true)throw Error('contract precondition failed');return body(...args);};
  const needsInput=input.some(c=>c!==__identity);
  const entry=!needsInput && output===__identity ? implementation :
    (...args)=>{const context=new WeakMap();return output(implementation(...(needsInput ? args.map((v,i)=>input[i](v,context)) : args)));};
  return [f.name,entry];
})));
export function call(name,args) { return functions[name](...args); }
const __intoOutput0=__representation(metadata.functions[0].result.element,true);
const __intoImplementations=[__into0];

export const functionsInto=Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal&&f.result.kind==='list').map(f=>{
  const input=__inputTypes[f.index].map(t=>__representation(t,false));
  const body=__intoImplementations[f.index];
  const implementation=f.precondition==null?body:(...args)=>{if(__implementations[f.precondition](...args.slice(0,f.params.length))!==true)throw Error('contract precondition failed');return body(...args);};
  const entry=input.every(c=>c===__identity)?implementation:(...values)=>{const context=new WeakMap();return implementation(...input.map((convert,i)=>convert(values[i],context)),values[f.params.length]);};
  return [f.name,entry];
})));
export function callInto(name,args,destination){return functionsInto[name](...args,destination);}
